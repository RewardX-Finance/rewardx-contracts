const helpers = require("@nomicfoundation/hardhat-network-helpers")
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs")
const { expect } = require("chai")
const { ethers } = require("hardhat")
//const { Framework, SuperToken } = require("@superfluid-finance/sdk-core")
//const frameworkDeployer = require("@superfluid-finance/ethereum-contracts/scripts/deploy-test-framework")
//const TestToken = require("@superfluid-finance/ethereum-contracts/build/contracts/TestToken.json");
const { BigNumber } = require('ethers');
//import {ethers} from "ethers";
//const BigNumber = require("big-number");

describe("Farming", function () {
  async function deploySetups() {
    const Sushi_Swap_Router = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
    const Quick_Swap_Router = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";

    // Deploy AMM plugins 
    // sushiswap plugin
    const SushiPlugin = await ethers.getContractFactory("SushiPlugin");
    const sushi = await SushiPlugin.deploy(Sushi_Swap_Router);
    //console.log(sushi.address);
    // quickswap plugin
    const QuickPlugin = await ethers.getContractFactory("QuickSwapPlugin");
    const quick = await SushiPlugin.deploy(Quick_Swap_Router);
    //console.log(quick.address);

    // farming contract
    const FarmingSetup = await ethers.getContractFactory("FarmStream");
    const Farming = await FarmingSetup.deploy();
    //console.log(Farming.address);

    const owner = "0x3E14dC1b13c488a8d5D310918780c983bD5982E7";
    const RIC = "0x263026e7e53dbfdce5ae55ade22493f828922965";

    
    // reward stream manager 
    const rewardStream = await ethers.getContractFactory("RewardStreamManager");
    const streamManager = await rewardStream.deploy(
      owner,
      RIC,
      Farming.address
    ,
    {gasLimit: 5000000});

    //const input = "1000000000000000000";
    const input = "100";
    const amount = ethers.BigNumber.from(input);

    const inputt = "20000000000000000000000";
    const amountt = ethers.BigNumber.from(inputt);

    const fee = "10000000000000000000";
    const lp = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
    const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const feeReceiver = "0x3936a3496E73b1d12b05e8c2E4CA3e2Aaf36004c";
    const setup = {
      startTime: 86400,
      blockDuration: 86400,
      rewardStreamFlow: amount,
      minStakeable: ethers.BigNumber.from(0),
      maxStakeable: amountt,
      ammPlugin: sushi.address,
      liquidityPoolTokenAddress: "0x0000000000000000000000000000000000000000",
      mainTokenAddress: usdc,
      ethereumAddress: "0x59e3a85a31042b88f3c009efb62936ceb4e760c3",
      involvingETH: false,
    };

    /*console.log(usdcx,
      setup,
      feeReceiver,
      fee,
      owner.address,
      streamManager.address,
      lp);
      */

    [a, b, c] = await ethers.getSigners()
    let txFarmContract = await Farming.init(
      RIC,
      setup,
      feeReceiver,
      fee,
      a.address,
      streamManager.address,
      lp
  );

  //console.log(txFarmContract);

  let receive = await txFarmContract.wait();
  let txSetup = await Farming.setup();

  //console.log(txSetup);

  return {
    Farming,
    streamManager,
  };
  }
  
  it("create Farming", async function() {
    //deploy setup Farming
    const {Farming, streamManager} = await helpers.loadFixture(deploySetups);

    let txSetup = await Farming.setup();

    const RIC = "0x263026e7e53dbfdce5ae55ade22493f828922965";
    const RICholder = "0x2f069f429d036aebd2dc13de8b63c16ae9f8bb1a";
    const RICtoken = await ethers.getContractAt("IRIC",RIC)
    const impersonateRICSigner = await ethers.getImpersonatedSigner(RICholder);

    let balanceRIC = await RICtoken.balanceOf(RICholder);

    let sendRic = await RICtoken.connect(impersonateRICSigner).transfer(streamManager.address,balanceRIC);


    console.log(RICtoken.balanceOf(streamManager.address));

    // open Farming position
    const lpHolder = "0x59e3a85a31042b88f3c009efb62936ceb4e760c3";
    const lp = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
    const lptoken = await ethers.getContractAt("IUSDC", lp);

    const impersonatedSignerLP = await ethers.getImpersonatedSigner(lpHolder);
    const lpHolderBalance = lptoken.balanceOf(lpHolder);

    const positionRequest = {
      amount: lpHolderBalance,
      amountIsLiquidityPool: true,
      positionOwner: lpHolder,
      amount0Min: ethers.BigNumber.from(0),
      amount1Min: ethers.BigNumber.from(0),
    };

    let openPosition = await Farming.connect(impersonatedSignerLP).openPosition(positionRequest);

    //let closePosition = await Farming.connect(secondAddressSigner).unlock(positionId, false);    
  });
});