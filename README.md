# Nouns V2 + Small Grants — Handoff Bundle

Drop-in integration package for the **NounV2 DAO** and the **noun.wtf Small Grants Treasury**, both live on Ethereum mainnet.

This bundle is self-contained: Solidity sources, JSON ABIs, framework-neutral TypeScript ABIs, deployed addresses, and copy-paste integration recipes.

---

## TL;DR for the integrating agent

You are integrating two on-chain systems into the berryos.wtf codebase. Both share architecture (Nouns DAO fork, NounsToken-style voting). They are **independent deployments**.

| System | What it is | Token used for voting |
| --- | --- | --- |
| **Nouns V2** | Standalone Nouns-style auction/DAO running concurrently with mainnet Nouns. Has its own ERC-721, auction house, and treasury. | `NounV2Token` (`0xb1d6bdf9...`) |
| **Small Grants** | Lightweight governance pot for small grants from V1 Nouns holders. No quorum; 1 FOR vote passes if no AGAINST. | mainnet `NounsToken` (`0x9C8fF314...`) |

Both treasuries are forks of the same `SmallGrantsTreasury` contract — the only difference is `NounV2Treasury` adds `PROPOSAL_THRESHOLD = 1` (must hold ≥1 NounV2 to propose).

**Start here:** if you're using wagmi/viem, see `ts/` — drop `addresses.ts` and the four ABI files into your project and you're done. If you're using ethers/web3.js, use `abis/*.json` plus the addresses from `ADDRESSES.md`.

---

## Bundle layout

```
nouns-handoff/
├── README.md             ← you are here
├── ADDRESSES.md          ← single source of truth for deployed addresses
├── INTEGRATION.md        ← copy-paste recipes (read auction, vote on grant, etc.)
│
├── contracts/            ← Solidity source (verifies what's on Etherscan)
│   ├── NounV2Token.sol            (ERC-721 + checkpointable, no nounder reward)
│   ├── NounV2AuctionHouse.sol     (V1-style + beneficiary field)
│   ├── NounV2Treasury.sol         (governor + treasury, 1-noun threshold)
│   ├── NounV2Deployer.sol         (atomic deployer, single-use, defunct)
│   ├── DeployNounV2.s.sol         (forge script reference)
│   ├── NounV2.t.sol               (foundry tests — 3 audit blockers verified)
│   ├── SmallGrantsTreasury.sol    (governor + treasury for V1 holders)
│   └── DeploySmallGrants.s.sol    (forge script reference)
│
├── abis/                 ← framework-agnostic JSON ABIs
│   ├── NounV2Token.json           (synthesized — see note below)
│   ├── NounV2AuctionHouse.json
│   ├── NounV2Treasury.json
│   └── SmallGrantsTreasury.json
│
├── ts/                   ← drop-in `as const` TypeScript ABIs (wagmi/viem)
│   ├── addresses.ts
│   ├── nounV2Token.ts
│   ├── nounV2AuctionHouse.ts
│   ├── nounV2Treasury.ts
│   └── smallGrantsTreasury.ts
│
└── examples/             ← runnable viem examples
    ├── read-current-auction.ts
    ├── place-bid.ts
    └── grants-create-and-vote.ts
```

> `NounV2Token.json` covers the integration surface (ERC-721, voting power, delegation, basic admin reads). For the full ABI including admin writes (`mint`, `setMinter`, `lockMinter`, `setDescriptor`, etc.), pull from Etherscan: <https://etherscan.io/address/0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9#code>.

---

## Architecture summary

### NounV2 system

Three contracts, deployed atomically via a one-shot `NounV2Deployer` called from the Safe.

```
                   ┌────────────────────────────────────┐
                   │  Safe (0xADa31Add...)              │
                   │  multisig — owns Token, Treasury   │
                   │  admin (vetoer)                    │
                   └────────────────┬───────────────────┘
                                    │ owns
                                    ▼
┌──────────────────┐  mints   ┌──────────────────┐  votes  ┌──────────────────┐
│ NounV2AuctionHouse│ ───────▶ │   NounV2Token    │ ──────▶ │  NounV2Treasury  │
│ (settle creates  │          │   (ERC-721)      │         │  (governor +     │
│  next noun, then │          │   getCurrent/    │         │   treasury, holds│
│  AH.beneficiary  │          │   PriorVotes     │         │   ETH; vetoer =  │
│  receives ETH)   │          │   delegates)     │         │   Safe)          │
└──────────────────┘          └──────────────────┘         └──────────────────┘
        ▲                              │                            
        │ owned by                     │ tokenURI / dataURI / seeder
        │                              ▼
   NounV2Treasury           Art pipeline (swappable by Safe):
   (after launch reshuffle)   currently mainnet NounsDescriptorV2 (0x6229c811...)
   — auction params now       and NounsSeeder (0xCC8a0FB5...)
     require a passing        — descriptor + seeder are NOT locked, so Safe
     V2 governance proposal     can swap to a V2-only descriptor at any time
```

Key facts:
- **Reserve price**: `50 wei` (the integer-math floor for the 2% min-bid increment). Effectively unreserved.
- **Auction duration**: 24h.
- **Min bid increment**: 2%.
- **Beneficiary**: where AH proceeds go on settlement. Currently the Treasury.
- **Auction house ownership**: `NounV2Treasury` (changing reserve/duration/min-bid now requires a passing V2 proposal).
- **Token ownership**: Safe.
- **Treasury admin**: Safe (veto only — proposals execute via the treasury itself).
- **Art**: read via `NounV2Token.tokenURI(id)`. **Descriptor + seeder are swappable** — `setDescriptor` and `setSeeder` are `onlyOwner` (Safe) and neither is locked.
  - **Design intent: V2 art is *forever* proposable.** Never call `lockDescriptor()`, `lockSeeder()`, or `lockParts()` on any descriptor V2 points at. All three are one-way switches and would permanently freeze the trait set. The whole point of V2 is that holders propose new heads / accessories / glasses / bodies / backgrounds via governance, in perpetuity.
  - **Current state:** V2 points at an **older** `NounsDescriptorV2` at `0x6229c811...` (the one V1 used circa 2022; V1 has since migrated to a newer redeploy at `0x33A9c445fb4FB21f2c030A6b2d3e2F12D017BFAC`). That older descriptor is **owned by the V1 Nouns DAO Treasury, not by V2** — so V2 holders can't propose new traits to it. **V2 needs its own descriptor for proposable art to work.** See the next section.
  - On any shared descriptor, V2 nouns are still visually distinct from V1 — the seeder's pseudo-RNG keys on `(nounId, blockhash)` and V2's mint-time blockhashes differ from V1's, so V2 #5 ≠ V1 #5 even when pulling from the same trait pool.

---

## Roadmap: enabling proposable traits

To make trait additions a V2 governance action, the V2 ecosystem needs a **descriptor it controls**. One-time setup:

```
1. Deploy a fresh NounsDescriptorV2 + NounsArt pair. Optionally seed with
   current V1 art using a variant of UpgradeDescriptorV2PopulateArtFromExisting
   (in packages/nouns-contracts/script/) pointed at 0x33A9c445… instead of
   0x6229c811….

2. Transfer descriptor ownership to NounV2Treasury (0x2cdeb0d2…).
   → descriptor.transferOwnership(0x2cdeb0d251674710840d9fa990d1de138dfe7c00)
   (NounsArt is owned-by-descriptor, so it follows automatically.)

3. Safe calls NounV2Token.setDescriptor(newDescriptorAddr).

4. NEVER call lockDescriptor / lockSeeder / lockParts. Anywhere. Ever.
```

Once that's in place, any V2 holder (≥1 NounV2) can submit a proposal whose execution path calls `descriptor.addHeads(...)` (or any other trait-add function), with the encoded image bytes. A 12h vote + 12h timelock later, anyone calls `execute(id)` and the trait is on-chain forever.

See `INTEGRATION.md` → "Proposing a new trait" for the exact calldata pattern. Trait images need to be RLE-encoded — the `nouns-assets` package in the noun.wtf monorepo has the encoder scripts.

### Small Grants system

Single contract: combined governor + treasury that reads voting power from mainnet NounsToken.

```
   V1 Nouns holders ────vote/propose────▶  SmallGrantsTreasury
                                           ├─ 12h vote
                                           ├─ 12h timelock
                                           ├─ no quorum (1 FOR ⇒ pass if no AGAINST)
                                           ├─ MAX_OPERATIONS = 10 per proposal
                                           └─ holds ETH + ERC-20s (receives ETH)
                                              admin can cancel; admin can be renounced
```

Key facts:
- **Voting delay**: 0 blocks (vote starts at proposal creation).
- **Voting period**: 3600 blocks (~12h).
- **Timelock**: 43200 sec (12h).
- **Grace period**: 604800 sec (7d) before a queued proposal expires.
- **Threshold**: any voting power >= 1 can propose (no minimum at the proposal layer, but `getPriorVotes(proposer, snapshotBlock - 1) > 0` is enforced via `NoVotingPower` revert).
- **Reads**: `NounsToken.getPriorVotes(account, snapshotBlock)`.

---

## Quick start (wagmi / viem)

```ts
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

import { NOUNS_V2, SMALL_GRANTS } from './ts/addresses';
import { nounV2AuctionHouseAbi } from './ts/nounV2AuctionHouse';
import { smallGrantsTreasuryAbi } from './ts/smallGrantsTreasury';

const client = createPublicClient({ chain: mainnet, transport: http() });

// Read the current V2 auction
const auction = await client.readContract({
  address: NOUNS_V2.auctionHouse,
  abi: nounV2AuctionHouseAbi,
  functionName: 'auction',
});
// → [nounId, amount, startTime, endTime, bidder, settled]

// Read total Small Grants proposals
const count = await client.readContract({
  address: SMALL_GRANTS.treasury,
  abi: smallGrantsTreasuryAbi,
  functionName: 'proposalCount',
});
```

See `INTEGRATION.md` for full recipes (place a bid, create a proposal, vote, queue, execute) and `examples/` for runnable viem scripts.

---

## Verifying authenticity

- **NounV2 deployment tx**: `0xb998296efd43c9f1f37d9e407566f17961d78369d9413a34b5dd56e0d12274d7` (block 24951808, 2026-04-24)
- **Small Grants deployment**: see `contracts/DeploySmallGrants.s.sol` and the broadcast file in the noun.wtf monorepo.
- All contracts are **verified on Etherscan** at the addresses in `ADDRESSES.md`. Diff `contracts/*.sol` against the verified source if you want to confirm the bundle matches.

---

## Notes for integration

1. **No proxy contracts.** All four contracts are deployed directly (no upgrade path, no implementation/proxy split). Address ⇒ implementation, always.
2. **Art is swappable, not shared.** V2 currently *reads* from the mainnet Nouns descriptor + seeder, but they're owner-settable and unlocked. Deploying a V2-specific descriptor with its own traits and calling `Safe.setDescriptor(newAddr)` is a one-tx change — V1 is unaffected because it's a different contract. See the "Art pipeline" section above.
3. **No subgraph in this bundle.** The noun.wtf side runs a Ponder indexer — if berryos wants events, point your own indexer at the addresses with the start block in `addresses.ts` (`24951808n` for V2; for Small Grants, see Etherscan deploy block).
4. **Solidity versions:** V2 contracts use `^0.8.6` (matching mainnet Nouns). `SmallGrantsTreasury` uses `^0.8.19`. Both compile clean with the optimizer enabled (200 runs).
5. **License:** Solidity files retain their SPDX headers — `GPL-3.0` for V2 forks, `MIT` for `SmallGrantsTreasury`.
