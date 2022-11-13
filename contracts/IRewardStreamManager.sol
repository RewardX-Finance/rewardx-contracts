//SPDX-License-Identifier: MIT
pragma solidity >=0.7.0;
pragma abicoder v2;

import "./FarmData.sol";

interface IRewardStreamManager {

    function init(bool byMint, address host, address treasury) external;
    function createRewardStream(uint256 positionId, address rewardStreamReceiver, uint256 flowRate) external;
    function deleteRewardStream(uint256 positionId, address rewardStreamReceiver) external;
    function closeFarming() external;
}