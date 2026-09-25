/**
 * Per-network SaucerSwap V2 addresses and vault parameters.
 * Contract and token IDs: https://docs.saucerswap.finance/developers/contracts
 * EVM address = 0x + the entity number (the last part of 0.0.N) as 40 hex digits.
 */
export type VaultParams = {
  pool: string;
  positionManager: string;
  swapRouter: string;
  halfWidth: number;
  twapWindow: number;
  maxTwapDeviation: number;
  rebalanceCooldown: number;
  swapSlippageBps: number;
  shareName: string;
  shareSymbol: string;
  /** HBAR sent to initialize() for the HTS token-creation fee (unused HBAR is refunded). */
  initializeHbar: string;
};

export const TIDEPOOL: Record<string, VaultParams> = {
  hederaTestnet: {
    pool: "0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7", // WHBAR/SAUCE 0.30%, 1000 observation slots
    positionManager: "0x000000000000000000000000000000000013f618", // 0.0.1308184
    swapRouter: "0x0000000000000000000000000000000000159398", // 0.0.1414040
    halfWidth: 600, // +/- 600 ticks, about +/- 6.2% in price
    twapWindow: 600,
    maxTwapDeviation: 50, // about 0.5%
    rebalanceCooldown: 3600,
    swapSlippageBps: 100,
    shareName: "Tidepool WHBAR-SAUCE",
    shareSymbol: "tpWHBAR-SAUCE",
    initializeHbar: "30",
  },
};

/**
 * Separate, narrow-range vault used only to exercise rebalance() on testnet. Same pool, manager and router
 * as the main vault; +/- 60 ticks and a 10-minute cooldown so a small, temporary price move takes it out of
 * range. Deployed under the name "TidepoolVaultNarrow" by deploy/01_deploy_tidepool_vault_narrow.ts, which is
 * skipped unless TIDEPOOL_DEPLOY_NARROW=true. The main TIDEPOOL entry above is unaffected.
 */
export const TIDEPOOL_NARROW: Record<string, VaultParams> = {
  hederaTestnet: {
    pool: "0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7", // same WHBAR/SAUCE 0.30% pool as the main vault
    positionManager: "0x000000000000000000000000000000000013f618", // 0.0.1308184
    swapRouter: "0x0000000000000000000000000000000000159398", // 0.0.1414040
    halfWidth: 60, // +/- 60 ticks (one tick spacing), about +/- 0.6% in price
    twapWindow: 600,
    maxTwapDeviation: 50,
    rebalanceCooldown: 600,
    swapSlippageBps: 100,
    shareName: "Tidepool Narrow Test",
    shareSymbol: "tpNARROW",
    initializeHbar: "30",
  },
};
