//SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

struct userPositionRequest {
    uint256 amount; // amount of main token or liquidity pool token.
    bool amountIsLiquidityPool; //true if user wants to directly share the liquidity pool token amount, false to add liquidity to AMM
    address positionOwner; // position extension or address(0) [msg.sender].
    uint256 amount0Min;
    uint256 amount1Min;
}
struct userPosition {
    address uniqueOwner; // address representing the owner of the position.
    uint256 creationBlock; // block when this position was created.
    uint256 liquidityPoolTokenAmount; // amount of liquidity pool token in the position.
    uint256 mainTokenAmount; // amount of main token in the position (used only if free is false).
    uint256 reward; // position reward (used only if free is false).
    uint256 lockedrewardStreamFlow; // position locked reward per block (used only if free is false).
}
struct FarmingSettingsRequest {
    uint256 startTime; // farming setup start block.
    uint256 blockDuration; // duration of setup
    uint256 rewardStreamFlow; // farming setup reward per single block.
    uint256 minStakeable; // minimum amount of staking tokens.
    uint256 maxStakeable; // maximum amount stakeable in the setup 
    address ammPlugin; // amm plugin address used for this setup (eg. uniswap amm plugin address).
    address liquidityPoolTokenAddress; // address of the liquidity pool token
    address mainTokenAddress; // eg. buidl address.
    address ethereumAddress;
    bool involvingETH; // if the setup involves ETH or not.
}

struct FarmingSettings {
    bool active; // if the setup is active or not.
    uint256 delayStartTime;
    uint256 startTime; // farming setup start block.
    uint256 endTime; // farming setup end block.
    uint256 blockDuration; // duration of setup
    uint256 rewardStreamFlow; // farming setup reward per single block.
    uint256 totalSupply; // If free it's the LP amount, if locked is currentlyStaked.
    uint256 minStakeable; // minimum amount of staking tokens.
    uint256 maxStakeable; // maximum amount stakeable in the setup 
    address ammPlugin; // amm plugin address used for this setup (eg. uniswap amm plugin address).
    address liquidityPoolTokenAddress; // address of the liquidity pool token
    address mainTokenAddress; // eg. buidl address.
    address ethereumAddress;
    bool involvingETH; // if the setup involves ETH or not.
}

