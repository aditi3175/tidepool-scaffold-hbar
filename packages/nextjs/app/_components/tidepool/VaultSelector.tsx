import { TIDEPOOL_VAULTS, type TidepoolVaultConfig, type TidepoolVaultId } from "~~/utils/tidepool/vaults";

/** Switches the whole dashboard between the configured vaults. The narrow vault is marked as a demo. */
export const VaultSelector = ({
  selected,
  onSelect,
}: {
  selected: TidepoolVaultConfig;
  onSelect: (id: TidepoolVaultId) => void;
}) => (
  <div className="flex flex-col gap-3">
    <div
      role="tablist"
      aria-label="Vault"
      className="tabs tabs-box tabs-sm w-fit max-w-full flex-nowrap overflow-x-auto"
    >
      {TIDEPOOL_VAULTS.map(vault => (
        <button
          key={vault.id}
          role="tab"
          type="button"
          aria-selected={vault.id === selected.id}
          className={`tab gap-2 whitespace-nowrap ${vault.id === selected.id ? "tab-active" : ""}`}
          onClick={() => onSelect(vault.id)}
        >
          {vault.label}
          {vault.demo && <span className="badge badge-warning badge-xs">Demo</span>}
        </button>
      ))}
    </div>
    {selected.demo && (
      <div role="note" className="rounded-box border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
        <span className="font-semibold">Demo / test vault.</span> {selected.description}
      </div>
    )}
  </div>
);
