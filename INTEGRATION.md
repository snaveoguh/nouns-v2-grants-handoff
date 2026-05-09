# Integration recipes

Drop-in code snippets for the most common operations. All examples use **viem**; if you're on ethers/web3.js, the same call shapes apply — just swap the client.

Assumes you've copied `ts/` into your project and have an RPC URL.

```ts
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

import { NOUNS_V2, SMALL_GRANTS } from './ts/addresses';
import { nounV2TokenAbi } from './ts/nounV2Token';
import { nounV2AuctionHouseAbi } from './ts/nounV2AuctionHouse';
import { nounV2TreasuryAbi } from './ts/nounV2Treasury';
import { smallGrantsTreasuryAbi } from './ts/smallGrantsTreasury';

const publicClient = createPublicClient({ chain: mainnet, transport: http() });
```

---

## NounV2 auction

### Read the current auction

```ts
const [nounId, amount, startTime, endTime, bidder, settled] =
  await publicClient.readContract({
    address: NOUNS_V2.auctionHouse,
    abi: nounV2AuctionHouseAbi,
    functionName: 'auction',
  });
```

Returns a tuple, not an object — index it positionally.

### Place a bid

The min increment is 2% over the current `amount` (or `>= reservePrice` if `amount == 0`). Send the bid as `value`.

```ts
const bid = (amount * 102n) / 100n; // 2% over current
if (bid === 0n) {
  // first bid → must clear reservePrice (currently 50 wei)
}

const wallet = createWalletClient({
  account: privateKeyToAccount('0x...'),
  chain: mainnet,
  transport: http(),
});

const hash = await wallet.writeContract({
  address: NOUNS_V2.auctionHouse,
  abi: nounV2AuctionHouseAbi,
  functionName: 'createBid',
  args: [nounId],
  value: bid,
});
```

### Settle and start the next auction

After `endTime`, anyone can call this. It mints the next noun, transfers winning ETH to `beneficiary`, and starts a fresh 24h auction.

```ts
await wallet.writeContract({
  address: NOUNS_V2.auctionHouse,
  abi: nounV2AuctionHouseAbi,
  functionName: 'settleCurrentAndCreateNewAuction',
});
```

### Listen for bids

```ts
publicClient.watchContractEvent({
  address: NOUNS_V2.auctionHouse,
  abi: nounV2AuctionHouseAbi,
  eventName: 'AuctionBid',
  onLogs: logs => console.log(logs),
});
```

Events: `AuctionBid`, `AuctionCreated`, `AuctionExtended`, `AuctionSettled`, `BeneficiaryUpdated`, plus the usual reserve/min-bid updates.

---

## NounV2 token (voting power, delegation, art)

### Voting power for a proposal

V2 governance reads voting power at `proposal.snapshotBlock`. Use `getPriorVotes`:

```ts
const power = await publicClient.readContract({
  address: NOUNS_V2.token,
  abi: nounV2TokenAbi,
  functionName: 'getPriorVotes',
  args: [voter, snapshotBlock],
});
```

### Self-delegate (required to vote your own balance)

```ts
await wallet.writeContract({
  address: NOUNS_V2.token,
  abi: nounV2TokenAbi,
  functionName: 'delegate',
  args: [wallet.account.address],
});
```

Until you self-delegate, your voting power is 0 even if you hold tokens. Same as mainnet Nouns.

### Render a noun's art

```ts
// On-chain SVG (data URI). Decode and display.
const dataUri = await publicClient.readContract({
  address: NOUNS_V2.token,
  abi: nounV2TokenAbi,
  functionName: 'dataURI',
  args: [nounId],
});

// Or get the JSON metadata URI (also a data URI):
const tokenUri = await publicClient.readContract({
  address: NOUNS_V2.token,
  abi: nounV2TokenAbi,
  functionName: 'tokenURI',
  args: [nounId],
});
```

---

## NounV2 governance (Treasury proposals)

The treasury is a combined governor + execution layer. Lifecycle:

1. `propose(...)` → state = `Active` (vote starts immediately)
2. After `VOTING_PERIOD`: `Succeeded` if `forVotes > againstVotes`, else `Defeated`
3. Anyone calls `queue(id)` → state = `Queued`, `eta = block.timestamp + TIMELOCK_DELAY`
4. After `eta` (within `GRACE_PERIOD`): anyone calls `execute(id)` → `Executed`
5. Admin (Safe) can `cancel(id)` at any time before execution (veto)

**Constants:**
- `VOTING_DELAY`     = 0 blocks
- `VOTING_PERIOD`    = 3600 blocks (~12h)
- `TIMELOCK_DELAY`   = 43200 sec (12h)
- `GRACE_PERIOD`     = 604800 sec (7d)
- `MAX_OPERATIONS`   = 10 per proposal
- `PROPOSAL_THRESHOLD` = 1 (must hold ≥1 NounV2)

### Create a proposal

```ts
// Send 1 ETH from the treasury to a recipient
await wallet.writeContract({
  address: NOUNS_V2.treasury,
  abi: nounV2TreasuryAbi,
  functionName: 'propose',
  args: [
    [recipient],          // targets
    [parseEther('1')],    // values (ETH)
    [''],                 // signatures (empty for plain transfer)
    ['0x'],               // calldatas
    'Send 1 ETH to recipient for X',
  ],
});
```

### Vote

```ts
await wallet.writeContract({
  address: NOUNS_V2.treasury,
  abi: nounV2TreasuryAbi,
  functionName: 'castVote',
  args: [proposalId, 1], // 0=against, 1=for, 2=abstain
});

// Or with a reason:
await wallet.writeContract({
  address: NOUNS_V2.treasury,
  abi: nounV2TreasuryAbi,
  functionName: 'castVoteWithReason',
  args: [proposalId, 1, 'because reasons'],
});
```

### Queue and execute

```ts
await wallet.writeContract({
  address: NOUNS_V2.treasury,
  abi: nounV2TreasuryAbi,
  functionName: 'queue',
  args: [proposalId],
});

// after eta
await wallet.writeContract({
  address: NOUNS_V2.treasury,
  abi: nounV2TreasuryAbi,
  functionName: 'execute',
  args: [proposalId],
});
```

### Inspect state

```ts
const state = await publicClient.readContract({
  address: NOUNS_V2.treasury,
  abi: nounV2TreasuryAbi,
  functionName: 'state',
  args: [proposalId],
});
// 0 Active, 1 Canceled, 2 Defeated, 3 Succeeded,
// 4 Queued,  5 Expired,  6 Executed
```

---

## Small Grants (V1 Nouns voting)

`SmallGrantsTreasury` has the **same ABI** as `NounV2Treasury` minus the `PROPOSAL_THRESHOLD` constant and the `BelowProposalThreshold` error. Voting power is read from the **mainnet NounsToken** (V1).

```ts
// Same propose/castVote/queue/execute flow as above, just point at SMALL_GRANTS.treasury:
await wallet.writeContract({
  address: SMALL_GRANTS.treasury,
  abi: smallGrantsTreasuryAbi,
  functionName: 'propose',
  args: [targets, values, signatures, calldatas, description],
});
```

**Key behavioral differences** vs full Nouns DAO governance:
- No quorum: a single FOR vote is enough if no AGAINST is cast.
- No proposal threshold check at `propose()` — but `getPriorVotes(proposer, snapshotBlock - 1) > 0` is required (revert: `NoVotingPower`).
- 12h vote / 12h timelock — much faster than Nouns DAO mainline.
- Single contract — no separate timelock executor.

---

## Funding the treasuries

Both treasuries have a `receive()` payable fallback — send ETH directly:

```ts
await wallet.sendTransaction({
  to: NOUNS_V2.treasury, // or SMALL_GRANTS.treasury
  value: parseEther('1'),
});
```

For ERC-20: standard `transfer(treasury, amount)` from the token contract. Then propose a `transfer(...)` calldata to spend it.

---

## Proposal hash convention (for off-chain indexing)

The treasury emits `ProposalCreated(uint256 id, address proposer, ...)`. `proposalCount` is monotonic. Receipts are stored at `proposals(id)` and per-voter at `getReceipt(id, voter)`.

To enumerate, iterate `1..proposalCount` and call `proposals(i)` + `state(i)`.

---

## Gotchas

1. **Self-delegate to vote.** A wallet that holds tokens but hasn't called `delegate()` has 0 voting power. (Standard Nouns / Compound checkpoint pattern.)
2. **`auction()` returns a tuple.** Not a struct in the ABI sense — index positionally `[nounId, amount, startTime, endTime, bidder, settled]`.
3. **`settleAuction` vs `settleCurrentAndCreateNewAuction`.** The former just settles (paused mode). The latter is the normal continuous-auction path.
4. **NounV2 art is mainnet Nouns art.** `tokenURI`/`dataURI` resolve via `NounsDescriptorV2` + `NounsSeeder` (the V1 contracts). No separate V2 image data.
5. **Proposal voting power is at `snapshotBlock - 1`.** That's `block.number - 1` at proposal creation. Delegations and transfers in the proposal-creation block do not count.
6. **MAX_OPERATIONS = 10.** Bundling more than 10 calls in one proposal reverts.
