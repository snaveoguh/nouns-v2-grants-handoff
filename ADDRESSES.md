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

## V2 art pipeline (swappable by Safe)

NounV2Token's descriptor and seeder were set at deploy-time, but **neither is locked**. The Safe (Token owner) can `setDescriptor(addr)` / `setSeeder(addr)` at any time without touching V1.

| Field | V2 currently reads | Address |
| --- | --- | --- |
| `descriptor` | older `NounsDescriptorV2` (circa-2022 trait set) | `0x6229c811D04501523C6058bfAAc29c91bb586268` |
| `seeder` | mainnet `NounsSeeder` | `0xCC8a0FB5ab3C7132c1b2A0109142Fb112c4Ce515` |

**Heads-up:** V1 mainnet has since migrated to a **newer** `NounsDescriptorV2` redeploy (with refreshed/expanded art). V2 is *not* on the same one V1 is on today.

| Reference | Address | Notes |
| --- | --- | --- |
| V1's current descriptor (NounsDescriptorV2 redeploy) | `0x33A9c445fb4FB21f2c030A6b2d3e2F12D017BFAC` | What `NounsToken.descriptor()` returns today on mainnet. Berryos can `setDescriptor` V2 to this for visual parity with V1. |
| Original older descriptor (V2 still uses) | `0x6229c811D04501523C6058bfAAc29c91bb586268` | The one the V2 deploy script picked. Frozen 2022-era trait set. |

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
