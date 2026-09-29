"use client";

// @refresh reset
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { RevealBurnerPKModal } from "./RevealBurnerPKModal";
import { SetBurnerPKModal } from "./SetBurnerPKModal";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Balance } from "@scaffold-hbar-ui/components";
import { Address } from "viem";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-hbar";

/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 */
export const RainbowKitCustomConnectButton = () => {
  const { targetNetwork } = useTargetNetwork();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        const blockExplorerAddressLink = account
          ? getBlockExplorerAddressLink(targetNetwork, account.address)
          : undefined;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button
                    className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-neon px-4 text-sm font-semibold text-ink shadow-[0_0_20px_-6px_rgba(46,230,200,0.6)] transition-[filter] duration-150 hover:brightness-110"
                    onClick={openConnectModal}
                    type="button"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported || chain.id !== targetNetwork.id) {
                return <WrongNetworkDropdown />;
              }

              return (
                <>
                  {/* The network is already shown in the header badge, so only the balance sits here. */}
                  <div className="mr-1 hidden items-center font-mono text-xs sm:flex">
                    <Balance
                      address={account.address as Address}
                      style={{
                        minHeight: "0",
                        height: "auto",
                        fontSize: "0.8em",
                      }}
                    />
                  </div>
                  <AddressInfoDropdown
                    address={account.address as Address}
                    displayName={account.displayName}
                    ensAvatar={account.ensAvatar}
                    blockExplorerAddressLink={blockExplorerAddressLink}
                  />
                  <RevealBurnerPKModal />
                  <SetBurnerPKModal />
                </>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
