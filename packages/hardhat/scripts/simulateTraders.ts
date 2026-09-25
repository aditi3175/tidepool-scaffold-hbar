/**
 * Swaps back and forth through the vault's pool so the position accrues real swap fees for the demo.
 * Each round: HBAR -> SAUCE (router wraps msg.value), then SAUCE -> WHBAR.
 * Run: npm run hardhat:simulate-traders   (ROUNDS=3 AMOUNT_HBAR=5 by default)
 */
import hre from "hardhat";

const TINYBAR_TO_WEIBAR = 10_000_000_000n;
const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)",
  "function refundETH() payable",
  "function multicall(bytes[]) payable returns (bytes[])",
];
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get("TidepoolVault")).address);
  const [token0, token1, fee, routerAddress] = await Promise.all([
    vault.token0(),
    vault.token1(),
    vault.fee(),
    vault.swapRouter(),
  ]);
  const router = new ethers.Contract(routerAddress, ROUTER_ABI, signer);
  const sauce = new ethers.Contract(token1, ERC20_ABI, signer);
  const rounds = Number(process.env.ROUNDS ?? "3");
  const amount = ethers.parseEther(process.env.AMOUNT_HBAR ?? "5");
  const deadline = () => Math.floor(Date.now() / 1000) + 300;

  for (let i = 0; i < rounds; i++) {
    const buy = router.interface.encodeFunctionData("exactInputSingle", [
      {
        tokenIn: token0,
        tokenOut: token1,
        fee,
        recipient: signer.address,
        deadline: deadline(),
        amountIn: amount / TINYBAR_TO_WEIBAR,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      },
    ]);
    await (
      await router.multicall([buy, router.interface.encodeFunctionData("refundETH")], {
        value: amount,
        gasLimit: 1_000_000,
      })
    ).wait();

    const sauceBalance: bigint = await sauce.balanceOf(signer.address);
    await (await sauce.approve(routerAddress, sauceBalance, { gasLimit: 1_000_000 })).wait();
    const sellTx = await router.exactInputSingle(
      {
        tokenIn: token1,
        tokenOut: token0,
        fee,
        recipient: signer.address,
        deadline: deadline(),
        amountIn: sauceBalance,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      },
      { gasLimit: 1_000_000 },
    );
    console.log(`round ${i + 1}: https://hashscan.io/testnet/transaction/${(await sellTx.wait())!.hash}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
