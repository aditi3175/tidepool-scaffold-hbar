import { wagmiConnectors } from "./wagmiConnectors";
import { type Transport, createClient, fallback, http } from "viem";
import { createConfig } from "wagmi";
import scaffoldConfig, { ScaffoldConfig } from "~~/scaffold.config";

const { targetNetworks } = scaffoldConfig;

export const enabledChains = targetNetworks;

/**
 * Reads that go out together (a page's eth_calls, the block, code checks) share one JSON-RPC batch request: one HTTP
 * round trip and one CORS preflight instead of one each. The Hedera relay (Hashio) accepts batches; it rejects very
 * large ones, so they are capped at 20. Everything else, transactions included, is sent on its own as before.
 */
const BATCHED_READS = new Set(["eth_call", "eth_getCode", "eth_getBlockByNumber", "eth_blockNumber", "eth_getBalance"]);

const rpc = (url?: string): Transport => {
  const batched = http(url, { batch: { batchSize: 20, wait: 16 } });
  const single = http(url);
  return params => {
    const b = batched(params);
    const s = single(params);
    return {
      ...s,
      request: (args => (BATCHED_READS.has(args.method) ? b.request(args) : s.request(args))) as typeof s.request,
    };
  };
};

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors(),
  ssr: true,
  client({ chain }) {
    const rpcFallbacks = [];

    const rpcOverrideUrl = (scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"])?.[chain.id];
    if (rpcOverrideUrl) {
      rpcFallbacks.push(rpc(rpcOverrideUrl));
    }

    // Default public RPC for the chain (e.g. Hedera testnet hashio)
    rpcFallbacks.push(rpc());

    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      pollingInterval: scaffoldConfig.pollingInterval,
    });
  },
});
