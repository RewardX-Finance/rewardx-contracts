import { ISuperToken } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";

interface IRIC is ISuperToken {
    function getOwner() external view returns (address);
}