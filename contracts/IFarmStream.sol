//SPDX-License-Identifier: MIT
pragma solidity >0.8.0;
pragma abicoder v2;

import "./FarmData.sol";

interface IFarmStream {

    function ONE_HUNDRED() external view returns(uint256);
    function rewardTokenAddress() external view returns(address);
    function position(uint256 positionId) external view returns (userPosition memory);
    function setup() external view returns (FarmingSettings memory);
    function setFarmingSetups(FarmingSettingsRequest memory farmingSetup) external;
    function openPosition(userPositionRequest calldata request) external payable returns(uint256 positionId);
}