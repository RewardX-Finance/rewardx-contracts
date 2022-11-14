const { expect } = require("chai");
const { Framework } = require("@superfluid-finance/sdk-core");
const { ethers } = require("hardhat");
const deployTestFramework = require("@superfluid-finance/ethereum-contracts/scripts/deploy-test-framework");
const TestToken = require("@superfluid-finance/ethereum-contracts/build/contracts/TestToken.json");

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
    [owner, account1, account2] = await ethers.getSigners();

    sfDeployer = await deployTestFramework();

    // GETTING SUPERFLUID FRAMEWORK SET UP

    // deploy the framework locally
    contractsFramework = await sfDeployer.getFramework();

    const provider = new ethers.providers.AlchemyProvider(
        "matic",
        "https://polygon-mainnet.g.alchemy.com/v2/NRowM2rZoB0OnxGhptDTW01aP318v7_2"
      );

    // initialize framework
    sf = await Framework.create({
        chainId: 137,
        provider: provider,
        resolverAddress: contractsFramework.resolver,
        protocolReleaseVersion: "test"
    });

    // DEPLOYING DAI and DAI wrapper super token
    tokenDeployment = await sfDeployer.deployWrapperSuperToken(
        "Fake DAI Token",
        "fDAI",
        18,
        ethers.utils.parseEther("100000000").toString()
    );

    daix = await sf.loadSuperToken("fDAIx");
    dai = new ethers.Contract(daix.underlyingToken.address, TestToken.abi, owner);
    

    // minting and wrapping test DAI to all accounts
    await dai.mint(owner.address, thousandEther);
    await dai.mint(account1.address, thousandEther);
    await dai.mint(account2.address, thousandEther);

    // approving DAIx to spend DAI (Super Token object is not an ethers contract object and has different operation syntax)
    await dai.approve(daix.address, ethers.constants.MaxInt256);
    await dai.connect(account1).approve(daix.address, ethers.constants.MaxInt256);
    await dai.connect(account2).approve(daix.address, ethers.constants.MaxInt256);
    // Upgrading all DAI to DAIx
    const ownerUpgrade = daix.upgrade({amount: thousandEther});
    const account1Upgrade = daix.upgrade({amount: thousandEther});
    const account2Upgrade = daix.upgrade({amount: thousandEther});

    await ownerUpgrade.exec(owner);
    await account1Upgrade.exec(account1);
    await account2Upgrade.exec(account2);

    //DEPLOY YOUR CONTRACT 
    //you can find this example at https://github.com/superfluid-finance/super-examples/tree/main/projects/money-streaming-intro/test
    let MoneyRouter = await ethers.getContractFactory("MoneyRouter", owner);
    moneyRouter = await MoneyRouter.deploy(
        sf.settings.config.cfaV1ForwarderAddress,
        owner.address
    );
    await moneyRouter.deployed();
});

//Write your tests...