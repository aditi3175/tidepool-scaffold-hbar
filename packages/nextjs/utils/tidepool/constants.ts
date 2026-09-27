import { parseAbi } from "viem";

/** JSON-RPC values are weibar (18 decimals); contracts see tinybar (8 decimals). */
export const TINYBAR_TO_WEIBAR = 10_000_000_000n;

/** SaucerSwap WhbarHelper (testnet 0.0.5286055). Wrap/unwrap through it, never through the WHBAR contract. */
export const WHBAR_HELPER = "0x000000000000000000000000000000000050a8a7";

export const MIRROR_NODE_URL = process.env.NEXT_PUBLIC_MIRROR_NODE_URL ?? "https://testnet.mirrornode.hedera.com";
export const HASHSCAN_URL = "https://hashscan.io/testnet";
/** Where to get SAUCE on testnet. Tidepool does not swap for the user. */
export const SAUCERSWAP_TESTNET_URL = "https://testnet.saucerswap.finance";
/** The template's GitHub repository and the command that scaffolds a new project from it. */
export const GITHUB_URL = "https://github.com/aditi3175/tidepool-scaffold-hbar";
export const README_URL = `${GITHUB_URL}#readme`;
export const SCAFFOLD_COMMAND = "npm create scaffold-hbar@latest -- --template aditi3175/tidepool-scaffold-hbar";
/** Hedera portal faucet (testnet HBAR). */
export const FAUCET_URL = "https://portal.hedera.com/faucet";
("https://github.com/aditi3175/tidepool-scaffold-hbar/blob/main/docs/ARCHITECTURE.md");

/** Vault share token decimals (TidepoolVault.SHARE_DECIMALS). */
export const SHARE_DECIMALS = 8;
/** Slippage tolerance for deposit minShares and withdraw minimum amounts: accept up to 1% less than previewed. */
export const SLIPPAGE_BPS = 100n;
/** HBAR sent on top of the quoted position fee; the vault refunds whatever SaucerSwap does not take. */
export const KEEPER_FEE_HEADROOM_TINYBARS = 10_000_000n; // 0.1 HBAR

/** How often live vault state is re-read. React Query pauses interval refetches while the tab is hidden. */
export const POLL_INTERVAL_MS = 20_000;

/**
 * Fixed gas limits. Every HTS association or allowance change costs ~700-780k gas on Hedera.
 * compound() and rebalance() may mint a SaucerSwap position, which eth_call/eth_estimateGas cannot simulate
 * (INVALID_NFT_ID), so they are sent with a fixed limit after read-only precondition checks.
 * Observed on testnet: compound 4.8-5.13M, rebalance 5.26M, withdraw 0.36M, deposit 0.16-0.2M.
 */
export const GAS = {
  associate: 1_000_000n,
  approve: 1_000_000n,
  wrap: 1_000_000n, // ~78k once WHBAR is associated; ~839k if the wrap also auto-associates it
  deposit: 1_500_000n,
  withdraw: 2_000_000n,
  keeper: 8_000_000n,
} as const;

/** HTS tokens expose an ERC-20 facade plus the HIP-719 association functions. */
export const HTS_TOKEN_ABI = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function isAssociated() view returns (bool)",
  "function associate() returns (uint256)",
]);

export const WHBAR_HELPER_ABI = parseAbi(["function deposit() payable", "function unwrapWhbar(uint256)"]);

/** SaucerSwap V2 NonfungiblePositionManager.positions(): no nonce/operator fields, unlike Uniswap v3. */
export const POSITION_MANAGER_ABI = parseAbi([
  "function positions(uint256 tokenSN) view returns (address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
]);
