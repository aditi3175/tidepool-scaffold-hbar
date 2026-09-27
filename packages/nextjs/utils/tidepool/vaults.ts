import deployedContracts from "~~/contracts/deployedContracts";

/**
 * The TidepoolVault ABI, from the generated main deployment. The narrow demo vault is the same contract
 * (deployed from the same artifact with different parameters), so both vaults share it.
 */
export const VAULT_ABI = deployedContracts[296].TidepoolVault.abi;

export type TidepoolVaultId = "main" | "narrow";

export type TidepoolVaultConfig = {
  id: TidepoolVaultId;
  /** Deployment name in the generated deployedContracts.ts. */
  contractName: "TidepoolVault" | "TidepoolVaultNarrow";
  label: string;
  description: string;
  demo: boolean;
};

/**
 * Vaults the dashboard can show. Both addresses come from the generated contracts/deployedContracts.ts
 * (`hardhat:deploy:testnet` writes the main vault, `hardhat:deploy:narrow` the narrow demo vault).
 * Range width, TWAP window, deviation limit and cooldown are read from each vault, not written here.
 */
export const TIDEPOOL_VAULTS: readonly TidepoolVaultConfig[] = [
  {
    id: "main",
    contractName: "TidepoolVault",
    label: "Main Vault",
    description: "The template's vault on the WHBAR/SAUCE pool.",
    demo: false,
  },
  {
    id: "narrow",
    contractName: "TidepoolVaultNarrow",
    label: "Narrow Demo Vault",
    description:
      "A test vault with a deliberately narrow range and a short cooldown, deployed to demonstrate rebalance on testnet. " +
      "It goes out of range often. Use the Main Vault for anything else.",
    demo: true,
  },
];
