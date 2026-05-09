# Deployed Addresses (Ethereum Mainnet, chainId = 1)

All addresses are checksummed and verified on Etherscan. Pasted as plain hex (lowercase) for easy diffing — viem accepts either case.

## Nouns V2

| Contract | Address | Etherscan |
| --- | --- | --- |
| `NounV2Token` | `0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9` | <https://etherscan.io/address/0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9> |
| `NounV2AuctionHouse` | `0x9a6ddb16e23967d5482e5bfd7444a04a5d5145fc` | <https://etherscan.io/address/0x9a6ddb16e23967d5482e5bfd7444a04a5d5145fc> |
| `NounV2Treasury` | `0x2cdeb0d251674710840d9fa990d1de138dfe7c00` | <https://etherscan.io/address/0x2cdeb0d251674710840d9fa990d1de138dfe7c00> |
| `NounV2Deployer` (defunct, single-use) | `0xda094c5b63261aef51c41a5d92660648cab90417` | <https://etherscan.io/address/0xda094c5b63261aef51c41a5d92660648cab90417> |
| **Safe** (Token owner, Treasury admin/vetoer) | `0xADa31Add8450CA0422983B9a3103633b78938617` | <https://etherscan.io/address/0xADa31Add8450CA0422983B9a3103633b78938617> |

- **Deploy tx**: [`0xb998296e...74d7`](https://etherscan.io/tx/0xb998296efd43c9f1f37d9e407566f17961d78369d9413a34b5dd56e0d12274d7)
- **Deploy block**: `24951808` (2026-04-24)

## Small Grants Treasury

| Contract | Address | Etherscan |
| --- | --- | --- |
| `SmallGrantsTreasury` | `0xbac9233725440c595b19d975309cc98cb259253a` | <https://etherscan.io/address/0xbac9233725440c595b19d975309cc98cb259253a> |
| Voting source: mainnet `NounsToken` | `0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03` | <https://etherscan.io/address/0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03> |

## V2 art pipeline (LIVE — DAO-owned, post-ceremony)

The art-handoff ceremony executed on 2026-05-09. V2 token now reads from a fresh `NounsDescriptorV2` deployed by us, owned by `NounV2Treasury`, with founder traits + 14 founder palette colors baked in. A custom seeder applies the hidden "slobber" rule.

| Contract | Address | Notes |
|---|---|---|
| **NounsDescriptorV2** (V2-owned) | [`0xAe0247Ca34B211a61b03A95F8008DCb8B3124B89`](https://etherscan.io/address/0xAe0247Ca34B211a61b03A95F8008DCb8B3124B89) | 32 bodies / 144 accessories / 253 heads / 23 glasses / 253 palette colors. Owner = NounV2Treasury (DAO). |
| **NounsArt** (paired) | [`0x3409A4A360A028b7Aa2eBF769d6306d96B976b3f`](https://etherscan.io/address/0x3409A4A360A028b7Aa2eBF769d6306d96B976b3f) | Holds the actual SSTORE2 trait + palette pointers. `onlyDescriptor` for writes. |
| **NounV2SlobberSeeder** | [`0xd777E701506A86fE89f07f963aA6c08d6905cFF8`](https://etherscan.io/address/0xd777E701506A86fE89f07f963aA6c08d6905cFF8) | Custom seeder. `SLOBBER_INDEX = 143`, `GREASE_INDEX = 137`, `RETAINER_INDEX = 173`, `INDEX_CARD_INDEX = 237`. Stateless. |
| **NounV2Token** owner | `NounV2Treasury` (`0x2cDeb0d2…`) | Transferred from Safe in same Safe batch. Token is now fully DAO-owned. |

Founder additions in the descriptor:
- Bodies: `body-white` @ 30 (palette slot 2), `body-black` @ 31 (palette slot 36)
- Accessories: `accessory-multicolor` @ 142 (from prop 966), `accessory-slobber` @ 143
- Heads: `head-missingnoun` @ 252
- 14 new palette colors at slots 239..252

### Historical context (pre-ceremony, for reference)

Pre-ceremony state — NounV2Token *used to* read art from V1's older `NounsDescriptorV2`. After 2026-05-09 it reads from the V2-owned descriptor above.

| Field | What V2 USED to read (pre-ceremony) | Address |
| --- | --- | --- |
| `descriptor` (old) | older `NounsDescriptorV2` (circa-2022) | `0x6229c811D04501523C6058bfAAc29c91bb586268` |
| `seeder` (old) | mainnet `NounsSeeder` | `0xCC8a0FB5ab3C7132c1b2A0109142Fb112c4Ce515` |

**Heads-up:** V1 mainnet has since migrated to a **newer** `NounsDescriptorV2` redeploy. V2 is *not* on the same one V1 uses today.

| Reference | Address | Notes |
| --- | --- | --- |
| V1's current descriptor (NounsDescriptorV2 redeploy) | `0x33A9c445fb4FB21f2c030A6b2d3e2F12D017BFAC` | What `NounsToken.descriptor()` returns today on mainnet. Owned by V1 Nouns DAO Executor — V2 governance has **no write access**. |
| Original older descriptor (V2 currently reads) | `0x6229c811D04501523C6058bfAAc29c91bb586268` | What V2 reads today. Owned by V1's old governance — V2 has **no write access** here either. |

**Roadmap (target end-state):** deploy a V2-owned `NounsDescriptorV2 + NounsArt` pair, transfer descriptor ownership to `NounV2Treasury` (`0x2cdeb0d2…`), then `Safe.setDescriptor(newDescriptor)` on the V2 token. After that, any V2 holder can `propose(...)` to add new traits via governance — see `README.md` "Roadmap" and `INTEGRATION.md` "Proposing a new trait." Never call `lockDescriptor` / `lockSeeder` / `lockParts`.

```solidity
// On NounV2Token (Safe-callable while not locked)
function setDescriptor(INounsDescriptorMinimal _descriptor) external onlyOwner whenDescriptorNotLocked;
function setSeeder(INounsSeeder _seeder) external onlyOwner whenSeederNotLocked;
function lockDescriptor() external onlyOwner whenDescriptorNotLocked; // permanent
function lockSeeder() external onlyOwner whenSeederNotLocked;         // permanent
```

## Ownership snapshot (current)

```
NounV2Token.owner()       == Safe       (0xADa31Add...)
NounV2AuctionHouse.owner()== NounV2Treasury (0x2cdeb0d2...)
NounV2Treasury.admin()    == Safe       (0xADa31Add...)  [veto only]
SmallGrantsTreasury.admin == deployer EOA (renounceable)
```

> The AH ownership was transferred from Safe → Treasury after launch. So changing
> auction params (reserve, duration, min-bid, time buffer, beneficiary) now
> requires a passing V2 governance proposal. The Safe can still pause via Treasury.
