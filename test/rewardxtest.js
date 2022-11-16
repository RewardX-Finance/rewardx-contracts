const helpers = require("@nomicfoundation/hardhat-network-helpers")
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs")
const { expect } = require("chai")
const { ethers } = require("hardhat")
const { Framework, SuperToken } = require("@superfluid-finance/sdk-core")
const frameworkDeployer = require("@superfluid-finance/ethereum-contracts/scripts/deploy-test-framework")
const TestToken = require("@superfluid-finance/ethereum-contracts/build/contracts/TestToken.json");
const { BigNumber } = require('ethers');

let sfDeployer;
let contractsFramework;
let sf;
let moneyRouter;
let dai;
let daix;

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

  //sfDeployer = await frameworkDeployer.deployTestFramework()

  // GETTING SUPERFLUID FRAMEWORK SET UP

  // deploy the framework locally
  //contractsFramework = await sfDeployer.getFramework()
  // Use the mainnet

// Specify your own API keys
// Each is optional, and if you omit it the default
// API key for that service will be used.

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
    //console.log(sushi.address);
    // quickswap plugin
    const QuickPlugin = await ethers.getContractFactory("QuickSwapPlugin");
    const quick = await SushiPlugin.deploy(Quick_Swap_Router);
    //console.log(quick.address);
    // superfluid setup
    const supertokenHolder = "0x23de5ff9907d465e874fafab51b73a4b8f19945a";
    const superToken = "0x27e1e4E6BC79D93032abef01025811B7E4727e85";
    // farming contract
    const FarmingSetup = await ethers.getContractFactory("FarmStream");
    const Farming = await FarmingSetup.deploy();
    //console.log(Farming.address);

    
    // reward stream manager 
    const rewardStream = await ethers.getContractFactory("RewardStreamManager");
    const streamManager = await rewardStream.deploy(
      "0x3E14dC1b13c488a8d5D310918780c983bD5982E7",
      "0x263026e7e53dbfdce5ae55ade22493f828922965",
      Farming.address
    ,
    {gasLimit: 5000000});

    /*
    const usdcHolder = "0xf89d7b9c864f589bbf53a82105107622b35eaa40";
    const secondAddressSigner = await ethers.getSigner(usdcHolder)
    const usdcamount = "8799067894";
    const usdcAdjAmount = ethers.BigNumber.from(usdcamount);
    let convertUSDC = await streamManager.connect(secondAddressSigner).convertInSuperToken(usdcAdjAmount,"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
    console.log(convertUSDC);
    */
    console.log(streamManager.address);

    //const usdcxABI = "./utils/usdcxABI.json";
    //const adjUSDCABI = JSON.parse(usdcxABI);


    //const superUSDCWrapper = "0xCAa7349CEA390F89641fe306D93591f87595dc1F";

    //const superWrapper = new ethers.Contract(adjUSDCABI, superUSDCWrapper);


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
      rewardStreamFlow: 1,
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

     console.log("2"); 
    const RIC = "0x263026e7e53dbfdce5ae55ade22493f828922965";
    const RICholder = "0x2f069f429d036aebd2dc13de8b63c16ae9f8bb1a";
    const RICtoken = await ethers.getContractAt("IRIC",RIC)
    const impersonateRICSigner = await ethers.getImpersonatedSigner(RICholder);

    let balanceRIC = await RICtoken.balanceOf(RICholder);



    let txFarmContract = await Farming.init(
      RIC,
      setup,
      feeReceiver,
      fee,
      owner.address,
      streamManager.address,
      lp
  );

  console.log(txFarmContract);

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

    const lpHolder = "0x59e3a85a31042b88f3c009efb62936ceb4e760c3";
    const lp = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
    const lptoken = await ethers.getContractAt("IUSDC", lp);

    const impersonatedSignerLP = await ethers.getImpersonatedSigner(lpHolder);
    const lpHolderBalance = lptoken.balanceOf(lpHolder);

    const usdcholder = "0x72A53cDBBcc1b9efa39c834A540550e23463AAcB";
    const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const impersonatedSignerUsdc = await ethers.getImpersonatedSigner(usdcholder);

    const weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
    const Wethtoken = await ethers.getContractAt("IUSDC",weth)

    const USDCtoken = await ethers.getContractAt("IUSDC",usdc)

    let approveWeth = await Wethtoken.connect(impersonatedSignerUsdc).approve(Farming.address, ethers.BigNumber.from(10));
    let approveUSDC = await USDCtoken.connect(impersonatedSignerUsdc).approve(Farming.address, ethers.BigNumber.from(10));
    console.log("diocane");
    let test = await approveUSDC.wait();
    let test2 = await approveWeth.wait();



    // open Farming position
    const positionRequest = {
      amount: ethers.BigNumber.from(1),
      amountIsLiquidityPool: false,
      positionOwner: usdcholder,
      amount0Min: ethers.BigNumber.from(0),
      amount1Min: ethers.BigNumber.from(0),
    };

    let openPosition = await Farming.connect(impersonatedSignerUsdc).openPosition(positionRequest);

  });
});