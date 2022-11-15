// initializing the CFA Library
pragma solidity >0.8.0;

import {
    ISuperfluid, ISuperToken, ISuperApp, ISuperAgreement, SuperAppDefinitions
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import { 
    IConstantFlowAgreementV1 
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";

import {
    CFAv1Library
} from "@superfluid-finance/ethereum-contracts/contracts/apps/CFAv1Library.sol";

import "./IERC20.sol";
import "hardhat/console.sol";



contract RewardStreamManager {

    using CFAv1Library for CFAv1Library.InitData;
    
    //initialize cfaV1 variable
    CFAv1Library.InitData public cfaV1;

    ISuperToken immutable public rewardToken;
    address public farmingContract;

    event RewardStreamCreated(uint256 creationTime, address indexed rewardReceiver, uint256 flowRate);
    event RewardStreamClosed(uint256 closeTime, address indexed rewardReceiver);

    address constant public usdcxtest = 0xCAa7349CEA390F89641fe306D93591f87595dc1F;
    
    constructor(
        ISuperfluid host,
        ISuperToken _rewardToken, 
        address _farmingContract
    ) {
    
        //initialize InitData struct, and set equal to cfaV1
        cfaV1= CFAv1Library.InitData(
        host,
            //here, we are deriving the address of the CFA using the host contract
            IConstantFlowAgreementV1(
                address(host.getAgreementClass(
                    keccak256("org.superfluid-finance.agreements.ConstantFlowAgreement.v1")
                ))
            )
        ); 
        farmingContract = _farmingContract;
        rewardToken = _rewardToken;
    }

    /** @dev byPositionOwner modifier used to check for unauthorized accesses. */
    modifier byFarmingContract() {
        require(msg.sender == farmingContract , "Not owned");
        _;
    }
    
    
    function convertInSuperToken(uint256 amount, address token) external returns
    (uint256) {
        // approving
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        IERC20(token).approve(usdcxtest, amount);
        // wrapping
        ISuperToken(rewardToken).upgradeTo(address(this), amount, "");

        uint256 balance = ISuperToken(rewardToken).balanceOf(address(this));
        console.log("balance",balance, msg.sender );

        return (balance);
    }

    function createRewardStream(address rewardStreamReceiver, uint256 flowRate) external byFarmingContract {
        int96 adjustedFlowRate = adjustFlowRate(flowRate);
        cfaV1.createFlow(rewardStreamReceiver, rewardToken, adjustedFlowRate);
    }

    function adjustFlowRate(uint256 flowRate) internal pure returns (int96) {
        int96 test = int96(uint96(flowRate));
        return test;
    }

    function deleteRewardStream(address rewardStreamReceiver) external byFarmingContract {
        cfaV1.deleteFlow(address(this), rewardStreamReceiver, rewardToken);    
    }
}