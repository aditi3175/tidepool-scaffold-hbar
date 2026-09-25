import { parseAbi } from "viem";

/** JSON-RPC values are weibar (18 decimals); contracts see tinybar (8 decimals). */
export const TINYBAR_TO_WEIBAR = 10_000_000_000n;

/** SaucerSwap WhbarHelper (testnet 0.0.5286055). Wrap/unwrap through it, never through the WHBAR contract. */
export const WHBAR_HELPER = "0x000000000000000000000000000000000050a8a7";

export const MIRROR_NODE_URL = process.env.NEXT_PUBLIC_MIRROR_NODE_URL ?? "https://testnet.mirrornode.hedera.com";
export const HASHSCAN_URL = "https://hashscan.io/testnet";

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
