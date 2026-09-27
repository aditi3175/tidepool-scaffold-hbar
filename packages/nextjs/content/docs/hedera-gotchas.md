# Hedera gotchas

This page lists the things that work differently from Ethereum and cost time to discover, with how Tidepool handles each one.

## Tokens and association

- **HTS amounts are `int64`.** An 18-decimal share token would cap supply at about 9.2 tokens. Tidepool uses 8 decimals, and approvals never use `uint256` max: each standing allowance is the token's max supply (finite-supply tokens) or `type(int64).max`.
- **Contracts must associate before receiving tokens.** The vault associates itself with both pool tokens and the SaucerSwap LP NFT collection in `initialize()`. Users associate the share token from their wallet (HIP-719: call `associate()` on the token address). The dashboard shows the button.
- **Read `isAssociated()` with `account` set.** Through a multicall contract it would answer for the multicall contract, not for the user.
- **The LP position is an HTS NFT.** The manager mints the NFT to itself, then transfers it to the recipient; an unassociated recipient fails. The vault associates the NFT collection in `initialize()`.
- **HTS rejects an allowance above a finite token's max supply** (`AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY`). SAUCE has a finite supply, so a `type(int64).max` approval of it reverts. The vault reads each token's supply type and caps its allowances at `maxSupply`. Reproduce: `GET /api/v1/tokens/0.0.1183558` on the mirror node shows `supply_type` and `max_supply`.

## Gas and fees

- **Association and approval from a contract are expensive gas.** Roughly 650–780k gas each. `initialize()` (three associations, share-token creation, four standing approvals) used 5,236,012 gas on testnet; an early version with only the associations failed at a 2M limit with `HtsCallFailed(21)`.
- **HBAR has two unit systems.** JSON-RPC `value` is weibar (18 decimals); contracts see tinybar (8 decimals). Multiply tinybars by 1e10 in the frontend.
- **SaucerSwap charges a position fee in HBAR** on every `mint` and `increaseLiquidity`. It's quoted in tinycents; the vault converts it with the exchange-rate system contract (`0x168`) and forwards exactly `tinycentsToTinybars(fee) + 1`. Sending more lets the manager wrap the caller's HBAR instead of pulling the vault's WHBAR. Reproduce: `mintFee()` on the factory returns 500000000; `tinycentsToTinybars(500000000)` on `0x168` returns about 64,079,561 tinybars.
- **Hedera charges the gas used, not the limit.** Generous fixed limits cost nothing extra on success.

## Contracts and tooling

- **Use WhbarHelper, not the WHBAR contract.** SaucerSwap says not to call or approve the WHBAR contract directly. Approving the WHBAR *token* is fine.
- **Position mints can't be simulated.** `eth_call` and `eth_estimateGas` return `INVALID_NFT_ID` for SaucerSwap V2 mints that succeed on chain. The dashboard and scripts send `compound()` and `rebalance()` with `disableSimulate` and a fixed 8M gas limit after read-only precondition checks. Don't "fix" this by re-enabling simulation.
- **`quoteMintFee()` isn't `view`** because the exchange-rate interface is declared non-view. Call it with `eth_call` / `simulateContract`.
- **TWAP availability.** A pool with observation cardinality 1 makes `observe()` revert after any swap. Fix it permissionlessly with `increaseObservationCardinalityNext(n)` and wait for history to build.
- **Fresh scaffolds need two build fixes**, both included: a root `.npmrc` with `legacy-peer-deps=true` (Hardhat plugin peer mismatch) and a webpack alias that stubs the optional `@x402/*` peers pulled in by wagmi.
- **npm eats `--network`.** Use `npm run hardhat:deploy:testnet`, or pass it after `--`: `npm run hardhat:deploy -- --network hederaTestnet`.
- **Sourcify v1 routes return 404.** `hardhat verify` fails; `npm run hardhat:verify:sourcify` uses the v2 API instead.
- **Licences.** SaucerSwap V2 periphery is GPL-2.0 and core is BUSL-1.1, and Uniswap v3's maths libraries are GPL. Tidepool imports only MIT files from `@uniswap/v4-core`.
- **Testnet prices are not market prices.** Testnet pools are priced by testnet traders.

## Debugging a failed transaction

The EVM revert often hides the real cause of an HTS failure. Two mirror node endpoints show it:

```text
GET https://testnet.mirrornode.hedera.com/api/v1/contracts/results/{hash}/actions
GET https://testnet.mirrornode.hedera.com/api/v1/transactions/{transaction id}
```

The first shows each system-contract call and its output; the second lists the child records (such as `TOKENASSOCIATE` or `CRYPTOAPPROVEALLOWANCE`) with their real response codes.
