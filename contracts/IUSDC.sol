import "./IERC20.sol";

interface IUSDC is IERC20 {
    function getOwner() external view returns (address);

    function issue(uint256) external;
}