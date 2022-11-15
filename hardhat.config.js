require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
//module.exports = {
  //solidity: "0.8.17",
//};
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: "https://polygon-mainnet.infura.io/v3/384e453bd0e14fb4af9256c495db7470",
        gas: 2100000,
        gasPrice: 8000000000,
        chainId: 137,
      }
    }
  },

  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000000
  }
}