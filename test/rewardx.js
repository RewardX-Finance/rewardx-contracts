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
  // Use the mainnet

// Specify your own API keys
// Each is optional, and if you omit it the default
// API key for that service will be used.
const provider = ethers.getDefaultProvider("matic", {
    infura: "https://polygon-mainnet.infura.io/v3/384e453bd0e14fb4af9256c495db7470",
});

  //const alchemyProvider = new ethers.providers.JsonRpcProvider("matic", "https://polygon-mainnet.infura.io/v3/dc6d7f844ddc4a5194af1c325aeceec8");

  console.log("1");

  /*
 
  sf = await Framework.create({
    chainId: 137,
    provider: provider,
    //resolverAddress: contractsFramework.resolver, // (empty)
    //protocolReleaseVersion: "v1"
  })
  
  console.log("2");
/*
  // DEPLOYING DAI and DAI wrapper super token
  tokenDeployment = await sfDeployer.deployWrapperSuperToken(
      "Fake DAI Token",
      "fDAI",
      18,
      ethers.utils.parseEther("100000000").toString()
  )

  console.log("3");
*/


  //daix = await sf.loadSuperToken("fDAIx")
  console.log("4");
/*
  dai = new ethers.Contract(
      daix.underlyingToken.address,
      TestToken.abi,
      owner
  )
  console.log("5");

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
*/
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

    usdcx = "0xCAa7349CEA390F89641fe306D93591f87595dc1F";
    
    // reward stream manager 
    const rewardStream = await ethers.getContractFactory("RewardStreamManager");
    const streamManager = await rewardStream.deploy(
      "0x3E14dC1b13c488a8d5D310918780c983bD5982E7",
      usdcx,
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

    

    

    console.log(usdcx);

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

    let txFarmContract = await Farming.init(
      usdcx,
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

  console.log(Farming.address);
  return {
    Farming,
    streamManager,
  };

  }

  it("create Farming", async function() {
    //deploy setup Farming
    const {Farming, streamManager} = await helpers.loadFixture(deploySetups);
    let txSetup = await Farming.setup();

    console.log("7");

    // import USDC ABI
    var fs = require('fs');
    var jsonFile = "./utils/usdcABI.json";
    
    var parsed= JSON.parse(fs.readFileSync(jsonFile));

    var abi = parsed.abi;

    tokenContract = new ethers.Contract(abi, "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");

    // approve USDC and convert it in USDCx
    const usdcHolder = "0xf89d7b9c864f589bbf53a82105107622b35eaa40";
    const seconddAddressSigner = await ethers.getSigner(usdcHolder)


    const usdccamount = "8799067894";
    const usdccAdjAmount = ethers.BigNumber.from(usdccamount);

    let approveUSDC = await tokenContract.connect(seconddAddressSigner).approve(streamManager.address,usdccAdjAmount);

    let convertUSDC = await streamManager.connect(seconddAddressSigner).convertInSuperToken(usdccAdjAmount,"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
    console.log(convertUSDC);

    console.log("8");


    // open Farming position
    const lpHolder = "0x59e3a85a31042b88f3c009efb62936ceb4e760c3";
    const secondAddressSigner = await ethers.getSigner(lpHolder)

    const positionRequest = {
      amount: 267547218951771,
      amountIsLiquidityPool: true,
      positionOwner: lpHolder,
      amount0Min: ethers.BigNumber.from(0),
      amount1Min: ethers.BigNumber.from(0),
    };

    let openPosition = await Farming.connect(secondAddressSigner).openPosition(positionRequest);


    //let closePosition = await Farming.connect(secondAddressSigner).unlock(positionId, false);




    
  });
});