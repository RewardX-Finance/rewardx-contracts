//SPDX-License-Identifier: MIT
pragma solidity >0.8.0;
pragma abicoder v2;

import "./IAMM.sol";
import "./IFarmStream.sol";
import "./IRewardStreamManager.sol";
import "./IFarmStreamFactory.sol";
import "./IERC20.sol";
import {
    ISuperfluid, ISuperToken, ISuperApp, ISuperAgreement, SuperAppDefinitions
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import "hardhat/console.sol";


contract FarmStream is IFarmStream {
    // percentage for math precision purpose
    uint256 public override constant ONE_HUNDRED = 1e18;
    // protocol fee wallet receiver 
    address public feeReceiver;
    // protocol fee %
    uint256 public penaltyFee;
    // Farming contract owner
    address public owner;
    // event that tracks contracts deployed for the given reward token
    event RewardToken(address indexed rewardTokenAddress);
    // new or transferred farming position event
    event Transfer(uint256 indexed positionId, address indexed from, address indexed to);
    // event that tracks involved tokens for this contract
    event SetupToken(address indexed mainToken, address indexed involvedToken);
    // event that tracks farm tokens
    event FarmToken(uint256 indexed objectId, address indexed liquidityPoolToken, uint256 setupIndex, uint256 endTime);
    // factory address that will create clones of this contract
    address public factory;
    // Farming setup once created
    FarmingSettings public Farm;
    // external contract managing the reward token streaming using Superfluid prtocol
    address public rewardStreamManager;
    // address of the reward token
    address public override rewardTokenAddress;
    // address receiver in case of an emergency flush
    address public emergencyFlushReceiver;
    // mapping containing all the positions
    mapping(uint256 => userPosition) private _positions;
    // mapping the positions number 
    uint256 private _setupPositionsCount;

    /** Modifiers. */

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    /** @dev byPositionOwner modifier used to check for unauthorized accesses. */
    modifier byPositionOwner(uint256 positionId) {
        require(_positions[positionId].uniqueOwner == msg.sender && _positions[positionId].creationBlock != 0, "Not owned");
        _;
    }

    receive() external payable {}

    /** Initialize Farming contract */

    function init(address _rewardTokenAddress, FarmingSettingsRequest memory farmingSetup, address _feeReceiver, uint256 _penaltyFee, address _owner, address _rewardStreamManager, address liquidityPool) external {
        require(factory == address(0), "Already initialized");
        factory = msg.sender;
        emit RewardToken(rewardTokenAddress = _rewardTokenAddress);

        feeReceiver = _feeReceiver;
        penaltyFee = _penaltyFee;
        owner = _owner;
        rewardStreamManager = _rewardStreamManager;

        _setFarmingSetup(farmingSetup,liquidityPool);
    }

    function setFarmingSetups(FarmingSettingsRequest memory farmingSetup, address liquidityPoolAddress) public override onlyOwner {
        require (Farm.ammPlugin == address(0));
        _setFarmingSetup(farmingSetup, liquidityPoolAddress);
    }

    /** Public methods */

    /** @dev returns the position with the given id.
      * @param positionId id of the position.
      * @return farming position with the given id.
     */
    function position(uint256 positionId) public override view returns (userPosition memory) {
        return _positions[positionId];
    }

    function setup() public override view returns (FarmingSettings memory) {
        return (Farm);
    }

    function openPosition(userPositionRequest memory request) public override payable returns(uint256 positionId) {
        console.log("Super token balance");

        if(!Farm.active) {
            _activateSetup();
        }


        require(Farm.active, "Setup not active");
        //require(Farm.startTime <= block.timestamp && Farm.endTime > block.timestamp, "Invalid setup");
        require(Farm.startTime <= block.timestamp , "Invalid setup1");
        require(Farm.endTime > block.timestamp, "Invalid setup2");

        // retrieve the unique owner
        address uniqueOwner = (request.positionOwner != address(0)) ? request.positionOwner : msg.sender;
        // create the position id
        positionId = uint256(keccak256(abi.encode(uniqueOwner, block.timestamp, Farm.rewardStreamFlow)));
        require(_positions[positionId].creationBlock == 0, "Invalid open");
        // create the lp data for the amm
        (LiquidityPoolData memory liquidityPoolData, uint256 mainTokenAmount) = _addLiquidity(request);
        // calculate the reward
        uint256 reward;
        uint256 lockedRewardStreamPerBlock;

        (reward, lockedRewardStreamPerBlock) = calculateLockedFarmingReward(mainTokenAmount);
        require(lockedRewardStreamPerBlock > 0, "Insufficient staked amount");
        IRewardStreamManager(rewardStreamManager).createRewardStream(positionId,uniqueOwner, lockedRewardStreamPerBlock);

        Farm.totalSupply = Farm.totalSupply + mainTokenAmount;

        _positions[positionId] = userPosition({
            uniqueOwner: uniqueOwner,
            liquidityPoolTokenAmount: liquidityPoolData.amount,
            mainTokenAmount: mainTokenAmount,
            reward: reward,
            lockedrewardStreamFlow: lockedRewardStreamPerBlock,
            creationBlock: block.timestamp
        });
        _setupPositionsCount += 1;
        emit Transfer(positionId, address(0), uniqueOwner);
    }

    
    function unlock(uint256 positionId, bool unwrapPair) public payable byPositionOwner(positionId) {
        // retrieve liquidity mining position
        userPosition storage userPosition = _positions[positionId];
        require(msg.sender == userPosition.uniqueOwner);
        Farm.totalSupply -= userPosition.mainTokenAmount;
        bool isUnlock = Farm.endTime > block.timestamp ? true : false;
        _removeLiquidity(positionId, unwrapPair, userPosition.liquidityPoolTokenAmount, isUnlock);
        _setupPositionsCount -= 1;
        delete _positions[positionId];
    }

    function calculateLockedFarmingReward(uint256 mainTokenAmount) public view returns(uint256 reward, uint256 relativeRewardStream) {
        FarmingSettings memory setup = Farm;
        // check if main token amount is less than the stakeable liquidity
        require(mainTokenAmount <= setup.maxStakeable - setup.totalSupply, "Invalid liquidity");
        uint256 remainingBlocks = block.timestamp >= setup.endTime ? 0 : setup.endTime - block.timestamp;
        // get amount of remaining blocks
        require(remainingBlocks > 0, "ended");
        // get total reward still available (= 0 if rewardStreamFlow = 0)
        require(setup.rewardStreamFlow * remainingBlocks > 0, "No rewards");
        // calculate relativerewardStreamFlow
        relativeRewardStream = (setup.rewardStreamFlow * ((mainTokenAmount * 1e18) / setup.maxStakeable)) / 1e18;
        // check if rewardStreamFlow is greater than 0
        require(relativeRewardStream > 0, "Invalid rpb");
        // calculate reward by multiplying relative reward per block and the remaining blocks
        reward = relativeRewardStream * remainingBlocks;
    }

    function emergencyFlush(address[] calldata tokens, uint256[] calldata amounts) public onlyOwner {
        require(_setupPositionsCount == 0 && !Farm.active && Farm.totalSupply == 0, "Not Empty");
        require(tokens.length == amounts.length, "length");
        for(uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amount = amounts[i];
            require(emergencyFlushReceiver != address(0));
            if(token == address(0)) {
                (bool result,) = emergencyFlushReceiver.call{value : amount}("");
                require(result, "ETH");
            } else {
                _safeTransfer(token, emergencyFlushReceiver, amount);
            }
        }
    }

    /** Private methods */

    function _setFarmingSetup(FarmingSettingsRequest memory request, address liquidityPoolAddress) private {
        FarmingSettingsRequest memory settingsRequest = request;
        
        require(
            settingsRequest.ammPlugin != address(0) &&
            liquidityPoolAddress != address(0) &&
            settingsRequest.liquidityPoolTokenAddress == address(0) &&
            settingsRequest.rewardStreamFlow > 0 &&
            settingsRequest.maxStakeable > 0,
            "Invalid configuration"
        );

        (,,address[] memory tokenAddresses) = IAMM(settingsRequest.ammPlugin).byLiquidityPool(liquidityPoolAddress);
        settingsRequest.ethereumAddress = address(0);
        if (settingsRequest.involvingETH) {
            (settingsRequest.ethereumAddress,,) = IAMM(settingsRequest.ammPlugin).data();
        }
        bool mainTokenFound = false;
        bool ethTokenFound = false;
        for(uint256 z = 0; z < tokenAddresses.length; z++) {
            if(tokenAddresses[z] == settingsRequest.mainTokenAddress) {
                mainTokenFound = true;
                if(tokenAddresses[z] == settingsRequest.ethereumAddress) {
                    ethTokenFound = true;
                }
            } else {
                emit SetupToken(settingsRequest.mainTokenAddress, tokenAddresses[z]);
                if(tokenAddresses[z] == settingsRequest.ethereumAddress) {
                    ethTokenFound = true;
                }
            }
        }
        require(mainTokenFound, "No main token");
        require(!settingsRequest.involvingETH || ethTokenFound, "No ETH token");

        Farm = FarmingSettings(false, settingsRequest.startTime, 0, 0,settingsRequest.blockDuration, settingsRequest.rewardStreamFlow, 0, 0 ,0, settingsRequest.ammPlugin, liquidityPoolAddress, settingsRequest.mainTokenAddress, settingsRequest.ethereumAddress, settingsRequest.involvingETH);
    
    }

    function _transferToMeAndCheckAllowance(userPositionRequest memory request) private returns(IAMM amm, uint256 liquidityPoolAmount, uint256 mainTokenAmount) {
        FarmingSettings memory setup = Farm;
        require(request.amount > 0, "No amount");
        // retrieve the values
        amm = IAMM(setup.ammPlugin);
        liquidityPoolAmount = request.amountIsLiquidityPool ? request.amount : 0;
        mainTokenAmount = request.amountIsLiquidityPool ? 0 : request.amount;
        address[] memory tokens;
        uint256[] memory tokenAmounts;
        // if liquidity pool token amount is provided, the position is opened by liquidity pool token amount
        if(request.amountIsLiquidityPool) {
            _safeTransferFrom(setup.liquidityPoolTokenAddress, msg.sender, address(this), liquidityPoolAmount);
            (tokenAmounts, tokens) = amm.byLiquidityPoolAmount(setup.liquidityPoolTokenAddress, liquidityPoolAmount);
        } else {
            // else it is opened by the tokens amounts
            (liquidityPoolAmount, tokenAmounts, tokens) = amm.byTokenAmount(setup.liquidityPoolTokenAddress, setup.mainTokenAddress, mainTokenAmount);
        }

        // iterate the tokens and perform the transferFrom and the approve
        for(uint256 i = 0; i < tokens.length; i++) {
            if(tokens[i] == setup.mainTokenAddress) {
                mainTokenAmount = tokenAmounts[i];
                require(mainTokenAmount >= setup.minStakeable, "Invalid liquidity");
                if(request.amountIsLiquidityPool) {
                    break;
                }
            }
            if(request.amountIsLiquidityPool) {
                continue;
            }
            if(setup.involvingETH && setup.ethereumAddress == tokens[i]) {
                require(msg.value == tokenAmounts[i], "Incorrect eth value");
            } else {
                _safeTransferFrom(tokens[i], msg.sender, address(this), tokenAmounts[i]);
                _safeApprove(tokens[i], setup.ammPlugin, tokenAmounts[i]);
            }
        }
    }

    function _addLiquidity(userPositionRequest memory request) private returns(LiquidityPoolData memory liquidityPoolData, uint256 tokenAmount) {
        (IAMM amm, uint256 liquidityPoolAmount, uint256 mainTokenAmount) = _transferToMeAndCheckAllowance(request);
        // liquidity pool data struct for the AMM
        liquidityPoolData = LiquidityPoolData(
            Farm.liquidityPoolTokenAddress,
            request.amountIsLiquidityPool ? liquidityPoolAmount : mainTokenAmount,
            Farm.mainTokenAddress,
            request.amountIsLiquidityPool,
            Farm.involvingETH,
            address(this)
        );
        tokenAmount = mainTokenAmount;
        // amount is lp check
        if (liquidityPoolData.amountIsLiquidityPool || !(Farm.involvingETH)) {
            require(msg.value == 0, "ETH not involved");
        }
        if (liquidityPoolData.amountIsLiquidityPool) {
            return(liquidityPoolData, tokenAmount);
        }
        // retrieve the poolTokenAmount from the amm
        if(liquidityPoolData.involvingETH) {
            (liquidityPoolData.amount,,) = amm.addLiquidity{value : msg.value}(liquidityPoolData);
        } else {
            (liquidityPoolData.amount,,) = amm.addLiquidity(liquidityPoolData);
        }
    }

    /** @dev helper function used to remove liquidity from a free position or to burn item farm tokens and retrieve their content.
      * @param positionId id of the position.
      * @param unwrapPair whether to unwrap the liquidity pool tokens or not.
      * @param isUnlock if we're removing liquidity from an unlock method or not.
     */
    function _removeLiquidity(uint256 positionId, bool unwrapPair, uint256 removedLiquidity, bool isUnlock) private {
        // create liquidity pool data struct for the AMM
        LiquidityPoolData memory lpData = LiquidityPoolData(
            Farm.liquidityPoolTokenAddress,
            removedLiquidity,
            Farm.mainTokenAddress,
            true,
            Farm.involvingETH,
            msg.sender
        );
        // retrieve the position
        userPosition storage farmingPosition = _positions[positionId];

        require(farmingPosition.liquidityPoolTokenAmount != 0);

        // retrieve the position
        IRewardStreamManager(rewardStreamManager).deleteRewardStream(positionId,msg.sender);
        // pay the fees!
        if (isUnlock && penaltyFee > 0) {
            uint256 fee = (lpData.amount * ((penaltyFee * 1e18) / ONE_HUNDRED)) / 1e18;
            _safeTransfer(Farm.liquidityPoolTokenAddress, feeReceiver, fee);
            lpData.amount = lpData.amount - fee;
        }
        // check if the user wants to unwrap its pair or not
        if (unwrapPair) {
            // remove liquidity using AMM
            _safeApprove(lpData.liquidityPoolAddress, Farm.ammPlugin, lpData.amount);
            IAMM(Farm.ammPlugin).removeLiquidity(lpData);
        } else {
            // send back the liquidity pool token amount without the fee
            _safeTransfer(lpData.liquidityPoolAddress, lpData.receiver, lpData.amount);
        }
        farmingPosition.liquidityPoolTokenAmount = 0;

        if (Farm.active && !isUnlock) {
            _deactivateSetup();
        }
    }

    function _deactivateSetup() private {
        if (Farm.active && block.timestamp >= Farm.endTime) {
            Farm.active = false;
        }
    }

    function _activateSetup() private {
        //require(block.timestamp > Farm.delayStartTime, "Too early");
        console.log("Super token balance");

        Farm.active = _ensureCheck(Farm.rewardStreamFlow * Farm.blockDuration);
        // update new setup
        Farm.startTime = block.timestamp;
        Farm.endTime = block.timestamp + Farm.blockDuration;
        Farm.totalSupply = 0;
    }

    /** @dev function used to safely approve ERC20 transfers.
      * @param erc20TokenAddress address of the token to approve.
      * @param to receiver of the approval.
      * @param value amount to approve for.
     */
    function _safeApprove(address erc20TokenAddress, address to, uint256 value) internal virtual {
        bytes memory returnData = _call(erc20TokenAddress, abi.encodeWithSelector(IERC20(erc20TokenAddress).approve.selector, to, value));
        require(returnData.length == 0 || abi.decode(returnData, (bool)), 'APPROVE_FAILED');
    }

    /** @dev function used to safe transfer ERC20 tokens.
      * @param erc20TokenAddress address of the token to transfer.
      * @param to receiver of the tokens.
      * @param value amount of tokens to transfer.
     */
    function _safeTransfer(address erc20TokenAddress, address to, uint256 value) internal virtual {
        bytes memory returnData = _call(erc20TokenAddress, abi.encodeWithSelector(IERC20(erc20TokenAddress).transfer.selector, to, value));
        require(returnData.length == 0 || abi.decode(returnData, (bool)), 'TRANSFER_FAILED');
    }

    /** @dev this function safely transfers the given ERC20 value from an address to another.
      * @param erc20TokenAddress erc20 token address.
      * @param from address from.
      * @param to address to.
      * @param value amount to transfer.
     */
    function _safeTransferFrom(address erc20TokenAddress, address from, address to, uint256 value) private {
        bytes memory returnData = _call(erc20TokenAddress, abi.encodeWithSelector(IERC20(erc20TokenAddress).transferFrom.selector, from, to, value));
        require(returnData.length == 0 || abi.decode(returnData, (bool)), 'TRANSFERFROM_FAILED');
    }

    /** @dev calls the contract at the given location using the given payload and returns the returnData.
      * @param location location to call.
      * @param payload call payload.
      * @return returnData call return data.
     */
    function _call(address location, bytes memory payload) private returns(bytes memory returnData) {
        assembly {
            let result := call(gas(), location, 0, add(payload, 0x20), mload(payload), 0, 0)
            let size := returndatasize()
            returnData := mload(0x40)
            mstore(returnData, size)
            let returnDataPayloadStart := add(returnData, 0x20)
            returndatacopy(returnDataPayloadStart, 0, size)
            mstore(0x40, add(returnDataPayloadStart, size))
            switch result case 0 {revert(returnDataPayloadStart, size)}
        }
    }

    /** @dev ensures the transfer from the contract to the extension.
      * @param amount amount to transfer.
     */
    
    function _ensureCheck(uint256 amount) private view returns(bool) {
        uint256 balanceForStream = ISuperToken(rewardTokenAddress).balanceOf(rewardStreamManager);
        console.log("Super token balance", balanceForStream);
        
        if(balanceForStream >= amount) {
            return true;
        }
        return false;
    }
}