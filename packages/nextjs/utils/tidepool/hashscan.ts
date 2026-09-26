import { HASHSCAN_URL } from "~~/utils/tidepool/constants";
import { entityIdFromAddress } from "~~/utils/tidepool/math";

/** HashScan links (testnet). HashScan resolves EVM addresses for contracts and accounts. */
export const hashscan = {
  tx: (hash: string) => `${HASHSCAN_URL}/transaction/${hash}`,
  contract: (address: string) => `${HASHSCAN_URL}/contract/${address}`,
  account: (address: string) => `${HASHSCAN_URL}/account/${address}`,
  /** HTS tokens have long-zero addresses, so the token page is addressed by its 0.0.N ID. */
  token: (address: string) => `${HASHSCAN_URL}/token/${entityIdFromAddress(address) ?? address}`,
  /** One serial of an HTS NFT collection (the SaucerSwap LP position NFT). */
  nft: (collection: string, serial: bigint) =>
    `${HASHSCAN_URL}/token/${entityIdFromAddress(collection) ?? collection}/${serial.toString()}`,
};
