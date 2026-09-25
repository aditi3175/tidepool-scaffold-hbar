/**
 * End-to-end run against the live testnet vault. Produces the HashScan links used as bounty evidence.
 *   1. associate the deployer with WHBAR, SAUCE and the share token (HIP-719 facade)
 *   2. wrap HBAR through SaucerSwap's WhbarHelper (never the WHBAR contract directly)
 *   3. buy SAUCE through the SaucerSwap V2 router
 *   4. approve + deposit into the vault
 *   5. compound() - mints the first position, paying SaucerSwap's HBAR position fee (fixed 8M gas: a position
 *      mint cannot be simulated on Hedera, see tidepoolCompound.ts)
 *
 * Run: npm run hardhat:smoke   (wraps: ts-node scripts/runScriptWithPK.ts scripts/tidepoolSmoke.ts --network hederaTestnet)
 */
import hre from "hardhat";
import { TINYBAR_TO_WEIBAR, gasLimitFor, hashscan } from "./tidepoolScriptUtils";

const WHBAR_HELPER = "0x000000000000000000000000000000000050a8a7"; // testnet 0.0.5286055
const COMPOUND_GAS_LIMIT = 8_000_000n; // first compound on testnet used 5,128,563
const HTS_FACADE_ABI = [
  "function isAssociated() view returns (bool)",
  "function associate() returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)",
  "function refundETH() payable",
  "function multicall(bytes[]) payable returns (bytes[])",
];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get("TidepoolVault")).address, signer);

  const [token0, token1, shareToken, fee, router] = await Promise.all([
    vault.token0(),
    vault.token1(),
    vault.shareToken(),
    vault.fee(),
    vault.swapRouter(),
  ]);

  for (const token of [token0, token1, shareToken]) {
    const facade = new ethers.Contract(token, HTS_FACADE_ABI, signer);
    if (!(await facade.isAssociated())) {
      const gasLimit = await gasLimitFor(`associate ${token}`, facade.associate.estimateGas());
      const tx = await facade.associate({ gasLimit });
      console.log(`associate ${token}: ${hashscan((await tx.wait())!.hash)}`);
    }
  }

  const wrapHbar = ethers.parseEther(process.env.WRAP_HBAR ?? "20");
  const helper = new ethers.Contract(WHBAR_HELPER, ["function deposit() payable"], signer);
  const wrapGas = await gasLimitFor("wrap HBAR", helper.deposit.estimateGas({ value: wrapHbar }));
  const wrapTx = await helper.deposit({ value: wrapHbar, gasLimit: wrapGas });
  console.log(`wrap HBAR -> WHBAR: ${hashscan((await wrapTx.wait())!.hash)}`);

  // Buy SAUCE with HBAR: the router wraps msg.value itself when tokenIn is WHBAR; refundETH returns the rest.
  const buyHbar = ethers.parseEther(process.env.BUY_HBAR ?? "20");
  const r = new ethers.Contract(router, ROUTER_ABI, signer);
  const swapData = r.interface.encodeFunctionData("exactInputSingle", [
    {
      tokenIn: token0,
      tokenOut: token1,
      fee,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 300,
      amountIn: buyHbar / TINYBAR_TO_WEIBAR,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    },
  ]);
  const buyCalls = [swapData, r.interface.encodeFunctionData("refundETH")];
  const buyGas = await gasLimitFor("buy SAUCE", r.multicall.estimateGas(buyCalls, { value: buyHbar }));
  const buyTx = await r.multicall(buyCalls, { value: buyHbar, gasLimit: buyGas });
  console.log(`buy SAUCE: ${hashscan((await buyTx.wait())!.hash)}`);

  const t0 = new ethers.Contract(token0, HTS_FACADE_ABI, signer);
  const t1 = new ethers.Contract(token1, HTS_FACADE_ABI, signer);
  const [bal0, bal1] = await Promise.all([t0.balanceOf(signer.address), t1.balanceOf(signer.address)]);
  for (const [token, amount] of [
    [t0, bal0],
    [t1, bal1],
  ] as const) {
    const spender = await vault.getAddress();
    const gasLimit = await gasLimitFor(
      `approve ${await token.getAddress()}`,
      token.approve.estimateGas(spender, amount),
    );
    await (await token.approve(spender, amount, { gasLimit })).wait();
  }

  const depositGas = await gasLimitFor("deposit", vault.deposit.estimateGas(bal0, bal1, 0, signer.address));
  const depositTx = await vault.deposit(bal0, bal1, 0, signer.address, { gasLimit: depositGas });
  console.log(`deposit: ${hashscan((await depositTx.wait())!.hash)}`);

  const feeTinybars = await vault.quoteMintFee.staticCall();
  const compoundValue = (feeTinybars + 100_000_000n) * TINYBAR_TO_WEIBAR; // fee + 1 HBAR headroom, refunded
  const compoundTx = await vault.compound({ value: compoundValue, gasLimit: COMPOUND_GAS_LIMIT });
  console.log(`compound (first position): ${hashscan((await compoundTx.wait())!.hash)}`);
  console.log(
    `position serial: ${await vault.positionSerial()}, range [${await vault.tickLower()}, ${await vault.tickUpper()})`,
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
