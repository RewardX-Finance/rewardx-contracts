import { ISuperToken } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";

interface IUSDCx is ISuperToken {
    function getOwner() external view returns (address);

    function issue(uint256) external;
}