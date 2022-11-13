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

contract RewardStreamManager {

    using CFAv1Library for CFAv1Library.InitData;
    
    //initialize cfaV1 variable
    CFAv1Library.InitData public cfaV1;

    ISuperToken public rewardToken;
    address public farmingContract;

    event RewardStreamCreated(uint256 creationTime, address indexed rewardReceiver, uint256 flowRate);
    event RewardStreamClosed(uint256 closeTime, address indexed rewardReceiver);
    
    function init(
        ISuperfluid host,
        ISuperToken _rewardToken, 
        address _farmingContract
    ) external {
    
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