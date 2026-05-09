# Settlement bot — extending to V2

The pattern noun.wtf uses for the `nounirl.eth` auto-settler. Cleanest way to make one bot support both V1 and V2 auctions without rewriting the settlement loop.

## Architecture: env-toggled dual-watcher

Run **two separate processes / services**, both built from the same codebase. Each watches one DAO via an env var:

```
service A:  NOUNIRL_WATCH_DAO=v1   →   watches V1 auction house, settles V1
service B:  NOUNIRL_WATCH_DAO=v2   →   watches V2 auction house, settles V2
```

Settlement logic itself is DAO-agnostic — only the contract addresses differ.

## Implementation

In your bot's address-config module, parameterize over the env:

```ts
type WatchedDao = 'v1' | 'v2';

const WATCHED_DAO = (process.env.NOUNIRL_WATCH_DAO ?? 'v1') as WatchedDao;

const ADDRESSES = {
  v1: {
    auctionHouse: '0x830BD73E4184ceF73443C15111a1DF14e495C706', // V1 mainnet
    token:        '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
  },
  v2: {
    auctionHouse: '0x9a6ddb16e23967d5482e5bfd7444a04a5d5145fc', // V2 mainnet
    token:        '0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9',
  },
} as const;

export function selectAddresses(dao: WatchedDao = WATCHED_DAO) {
  return ADDRESSES[dao];
}
```

In your block watcher / settlement loop, replace hardcoded V1 addresses with the result of `selectAddresses()`:

```ts
const { auctionHouse: AUCTION_HOUSE_ADDRESS, token: TOKEN_ADDRESS } = selectAddresses();

// existing loop unchanged
async function onNewBlock(blockNumber: bigint) {
  const auction = await readAuction(AUCTION_HOUSE_ADDRESS);
  if (auction.endTime <= now() && !auction.settled) {
    await settleCurrentAndCreateNewAuction(AUCTION_HOUSE_ADDRESS);
  }
}
```

The V1 V2 AuctionHouse interfaces are 100% compatible for settlement (same `settleCurrentAndCreateNewAuction()`, `auction()`, `endTime`, `paused` members) — no ABI fork needed.

## Important gotchas

### 1. Separate signer wallets per DAO

If both watchers share `NOUNIRL_PRIVATE_KEY`, they race for the same nonce. If V1 and V2 auctions ever end within seconds of each other (unlikely but possible), one settlement tx will replace the other and only one DAO settles.

**Fix:** generate a separate wallet for V2, fund it with ~0.01 ETH, and put its key in service B's env. ENS-rename for clarity (e.g., `nounirl.eth` for V1, `nounirl-v2.eth` for V2).

### 2. State doesn't multi-DAO inside one process

Reservation stores, pre-signed-tx caches, nonce trackers — these live in module scope. You CAN'T just spawn two watchers in one process. Two processes / two services / two replicas is the correct pattern.

### 3. Crystal ball / predict endpoint

If your bot exposes a `/api/agent/predict` endpoint (the way noun.wtf uses for the orb preview), the V2 watcher serves V2-style predictions on the same endpoint with a `?dao=v2` query branch. Predictor logic must apply the slobber rule (see `WEBAPP_INTEGRATION.md`).

The V1 watcher serves the V1 predictor unchanged. The webapp routes V2 requests to the V2 service URL, V1 requests to the V1 service URL.

## Railway deploy recipe

If your bot lives on Railway like ours:

```bash
# 1. Link to project, create new service
railway link -p <your-project>
railway add -s nounirl-bot-v2 -v "NOUNIRL_WATCH_DAO=v2"

# 2. Bulk-copy non-Railway env vars from the V1 service to the V2 service
#    (use `railway variables --json --service <v1-service>` + a script to set
#     each on the V2 service; skip RAILWAY_* and FORCE_RESTART)

# 3. Override NOUNIRL_PRIVATE_KEY with the new V2 wallet's key
railway variables --service nounirl-bot-v2 --set "NOUNIRL_PRIVATE_KEY=0x<new-v2-key>"

# 4. Link this directory to the V2 service and deploy
railway link -s nounirl-bot-v2
railway up
```

## Files in this bundle

- `contracts/NounV2SlobberSeeder.sol` — the seeder source (slobber rule lives here, not in the bot)
- `ts/addresses.ts` — V2 mainnet addresses
