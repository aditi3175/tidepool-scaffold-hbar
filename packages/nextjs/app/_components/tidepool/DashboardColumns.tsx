import { GetStarted } from "~~/app/_components/tidepool/GetStarted";
import {
  ConnectCard,
  PositionLoadingCard,
  VaultHoldingsCard,
  YourPositionCard,
} from "~~/app/_components/tidepool/HoldingsCard";
import { PositionCard } from "~~/app/_components/tidepool/PositionCard";
import { UserActions } from "~~/app/_components/tidepool/UserActions";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";

/**
 * The dashboard's two columns. They end on the same line: the grid row stretches both, and the last card in each
 * column grows (flex-1) to fill it, whichever column is taller. On one column (mobile) nothing stretches.
 * The left column's second card depends on the wallet: Connect, loading, Get started (no shares) or Your position.
 */
export const DashboardColumns = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const hasShares = (user.shares ?? 0n) > 0n;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6" data-column="left">
        <PositionCard vault={vault} />
        <div className="flex flex-1 flex-col">
          {!user.connected ? (
            <ConnectCard />
          ) : user.shares === undefined ? (
            <PositionLoadingCard />
          ) : hasShares ? (
            <YourPositionCard vault={vault} user={user} />
          ) : (
            <GetStarted vault={vault} user={user} />
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-6" data-column="right">
        <VaultHoldingsCard vault={vault} />
        <UserActions vault={vault} user={user} className="flex flex-1 flex-col" />
      </div>
    </div>
  );
};
