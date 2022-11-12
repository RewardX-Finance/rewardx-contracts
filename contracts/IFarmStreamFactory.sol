//SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

interface IFarmStreamFactory {

    event ExtensionCloned(address indexed);

    function feePercentageInfo() external view returns (uint256, address);
    function farmDefaultExtension() external view returns(address);
    function cloneFarmDefaultExtension() external returns(address);
    function getFarmTokenCollectionURI() external view returns (string memory);
    function getFarmTokenURI() external view returns (string memory);
}