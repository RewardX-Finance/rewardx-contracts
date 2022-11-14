const helpers = require("@nomicfoundation/hardhat-network-helpers")
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs")
const { expect } = require("chai")
const { ethers } = require("hardhat")
const { Framework } = require("@superfluid-finance/sdk-core")
const frameworkDeployer = require("@superfluid-finance/ethereum-contracts/scripts/deploy-test-framework")
const TestToken = require("@superfluid-finance/ethereum-contracts/build/contracts/TestToken.json");
const { BigNumber } = require('ethers');
//import {ethers} from "ethers";
//const BigNumber = require("big-number");


let sfDeployer;
let contractsFramework;
let sf;
let moneyRouter;
let dai;
let daix;
let usdcx;

// Test Accounts
let owner;
let account1;
let account2;

// Constants
//for usage in IDA projects
const expecationDiffLimit = 10; // sometimes the IDA distributes a little less wei than expected. Accounting for potential discrepency with 10 wei margin
//useful for denominating large units of tokens when minting
const thousandEther = ethers.utils.parseEther("10000");

before(async function () {
  // get hardhat accounts
  ;[owner, account1, account2] = await ethers.getSigners()

  sfDeployer = await frameworkDeployer.deployTestFramework()

  // GETTING SUPERFLUID FRAMEWORK SET UP

  // deploy the framework locally
  contractsFramework = await sfDeployer.getFramework()

  const alchemyProvider = new ethers.providers.AlchemyProvider("matic", "https://polygon-mainnet.g.alchemy.com/v2/NRowM2rZoB0OnxGhptDTW01aP318v7_2");

  console.log("1");

  sf = await Framework.create({
    chainId: 137,
    provider: alchemyProvider,
    //resolverAddress: contractsFramework.resolver, // (empty)
    //protocolReleaseVersion: "v1"
  })
  console.log("2");


  // DEPLOYING DAI and DAI wrapper super token
  tokenDeployment = await sfDeployer.deployWrapperSuperToken(
      "Fake DAI Token",
      "fDAI",
      18,
      ethers.utils.parseEther("100000000").toString()
  )

  daix = await sf.loadSuperToken("fDAIx")
  dai = new ethers.Contract(
      daix.underlyingToken.address,
      TestToken.abi,
      owner
  )
  usdcx = await sf.loadSuperToken("fDAIx")

  // minting test DAI
  await dai.mint(owner.address, thousandEther)
  await dai.mint(account1.address, thousandEther)
  await dai.mint(account2.address, thousandEther)

  // approving DAIx to spend DAI (Super Token object is not an ethers contract object and has different operation syntax)
  await dai.approve(daix.address, ethers.constants.MaxInt256)
  await dai
      .connect(account1)
      .approve(daix.address, ethers.constants.MaxInt256)
  await dai
      .connect(account2)
      .approve(daix.address, ethers.constants.MaxInt256)
  // Upgrading all DAI to DAIx
  const ownerUpgrade = daix.upgrade({ amount: thousandEther })
  const account1Upgrade = daix.upgrade({ amount: thousandEther })
  const account2Upgrade = daix.upgrade({ amount: thousandEther })

  await ownerUpgrade.exec(owner)
  await account1Upgrade.exec(account1)
  await account2Upgrade.exec(account2)

})

describe("Farming", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  
  async function deploySetups() {
    const Sushi_Swap_Router = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
    const Quick_Swap_Router = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";

    
    // Deploy AMM plugins 
    // sushiswap plugin
    const SushiPlugin = await ethers.getContractFactory("SushiPlugin");
    const sushi = await SushiPlugin.deploy(Sushi_Swap_Router);
    console.log(sushi.address);
    // quickswap plugin
    const QuickPlugin = await ethers.getContractFactory("QuickSwapPlugin");
    const quick = await SushiPlugin.deploy(Quick_Swap_Router);
    console.log(quick.address);


    // superfluid setup
    const supertokenHolder = "0x23de5ff9907d465e874fafab51b73a4b8f19945a";
    const superToken = "0x27e1e4E6BC79D93032abef01025811B7E4727e85";

    // farming contract
    const FarmingSetup = await ethers.getContractFactory("FarmStream");
    const Farming = await FarmingSetup.deploy();
    console.log(Farming.address);

    
    // reward stream manager 
    const rewardStream = await ethers.getContractFactory("RewardStreamManager");
    const streamManager = await rewardStream.deploy(
      "0x3E14dC1b13c488a8d5D310918780c983bD5982E7",
      daix.address,
      Farming.address
    ,
    {gasLimit: 5000000});

    console.log(daix.address);

    console.log(streamManager.address);


    const input = "1000000000000000000";
    const amount = ethers.BigNumber.from(input);

    const inputt = "20000000000000000000000";
    const amountt = ethers.BigNumber.from(inputt);

    const fee = "10000000000000000000";
    const lp = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
    const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const lpHolder = "0x59e3a85a31042b88f3c009efb62936ceb4e760c3";
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


    console.log(daix.address,
      setup,
      feeReceiver,
      fee,
      owner.address,
      streamManager.address,
      lp);

    let txFarmContract = await Farming.init(
      usdcx.address,
      setup,
      feeReceiver,
      fee,
      owner.address,
      streamManager.address,
      lp
  );

  let receive = await txFarmContract.wait();

  console.log(Farming.address);
  }

  it("create Farming", async function() {
    const Farming = await helpers.loadFixture(deploySetups);
  });
});