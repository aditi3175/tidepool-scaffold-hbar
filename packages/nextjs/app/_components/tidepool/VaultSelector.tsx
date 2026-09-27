import { TIDEPOOL_VAULTS, type TidepoolVaultConfig, type TidepoolVaultId } from "~~/utils/tidepool/vaults";

/** Switches the whole dashboard between the configured vaults. The narrow vault is labelled as a demo. */
export const VaultSelector = ({
  selected,
  onSelect,
}: {
  selected: TidepoolVaultConfig;
  onSelect: (id: TidepoolVaultId) => void;
}) => (
  <div
    role="tablist"
    aria-label="Vault"
    className="inline-flex gap-1 rounded-lg border border-base-300 bg-base-100 p-1"
  >
    {TIDEPOOL_VAULTS.map(vault => {
      const active = vault.id === selected.id;
      return (
        <button
          key={vault.id}
          role="tab"
          type="button"
          aria-selected={active}
          className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
            active ? "bg-base-300 font-medium text-base-content" : "text-base-content/60 hover:text-base-content"
          }`}
          onClick={() => onSelect(vault.id)}
        >
          {vault.label.replace(/ (Demo )?Vault$/, "")}
          {vault.demo && <span className="text-xs text-warning">Demo</span>}
        </button>
      );
    })}
  </div>
);
