# V2 Descriptor + Slobber Seeder — Deploy Walkthrough

This is the one-time ceremony to give NounV2 its own art pipeline (proposable forever) and seed it with the founder additions: a missingnoun head, two new accessories (prop-966 multicolor + slobber), two new bodies (white + black), 14 new palette colors, and the hidden slobber rule.

After this ceremony:
- NounV2 stops reading from V1's older descriptor (`0x6229c811…`).
- NounV2 reads from a freshly deployed `NounsDescriptorV2` whose owner is `NounV2Treasury` (`0x2cdeb0d2…`) — meaning **all future trait additions require a passing V2 governance proposal**.
- A custom `NounV2SlobberSeeder` is also wired in. It hides slobber from the random rotation; slobber only appears with a 50% chance when a noun rolls `head ∈ {retainer, index-card}` AND `accessory == grease`.

---

## 0. Prerequisites

- Foundry installed (`cast`, `forge`).
- Hugo's deployer EOA funded with ~0.1 ETH on mainnet (gas for the populate-everything tx + a couple smaller ones).
- Safe access to `NounV2Token` (`0xb1d6bdf9…`) for the two final wiring txs.
- An RPC URL.

```bash
export RPC_URL=https://...
export DEPLOYER_KEY=0x...        # Hugo's EOA private key
export DEPLOYER=$(cast wallet address $DEPLOYER_KEY)
```

---

## 1. Place the contracts in the monorepo

The deploy script and seeder need to compile against the existing `nouns-contracts` package. Copy them in:

```
packages/nouns-contracts/script/DeployAndSeedV2Descriptor.s.sol  ← from contracts/ here
packages/nouns-contracts/script/PrintTraitIndices.s.sol          ← from contracts/ here
packages/nouns-contracts/contracts/nounv2/NounV2SlobberSeeder.sol ← from contracts/ here
```

Then build to make sure everything resolves:

```bash
cd packages/nouns-contracts
forge build
```

---

## 2. Run the deploy script

```bash
DEPLOYER_KEY=$DEPLOYER_KEY forge script script/DeployAndSeedV2Descriptor.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --slow
```

The script reads `DEPLOYER_KEY` from env directly (via `vm.envUint`) and broadcasts as that account — **do not also pass `--private-key`**, that creates a `msg.sender` vs broadcaster mismatch that breaks the predicted `NounsArt` address and corrupts the descriptor's `art` pointer.

`--slow` waits between txs so each gets its own block — easier to debug if one reverts.

This will:
1. Deploy `NounsDescriptorV2` + `NounsArt`.
2. Set the new palette (existing 239 colors + 14 founder colors at slots 239–252).
3. Copy backgrounds + every body/accessory/head/glasses page from `0x6229c811…` (1:1, via SSTORE2 pointers — cheap).
4. Append founder traits in this exact order so the seeder's hardcoded indices are correct:
   - body 30 = white, body 31 = black
   - accessory 143 = prop-966 multicolor, accessory 144 = slobber  ← `SLOBBER_INDEX`
   - head 254 = missingnoun

At the end the script prints the new descriptor address. **Save it** as `$NEW_DESCRIPTOR`.

> The script `transferOwnership(NounV2Treasury)` as its final call — atomic with the seed/populate. After the broadcast returns, `$DEPLOYER` no longer owns the descriptor. Verification (step 3) is read-only; the seeder deploy (step 5) doesn't need ownership.

---

## 3. Verify trait counts

```bash
NEW_DESCRIPTOR=$NEW_DESCRIPTOR forge script script/PrintTraitIndices.s.sol --rpc-url $RPC_URL
```

Expected:
```
bodyCount:        32
accessoryCount:   145
headCount:        255
backgroundCount:  2
```

If anything is off, **stop** — the seeder's hardcoded indices won't be safe to deploy. Ping me.

You can also visually sanity-check via `cast`:

```bash
# Render slobber as a data URI (paste into a browser to view)
cast call $NEW_DESCRIPTOR "tokenURI(uint256,(uint48,uint48,uint48,uint48,uint48))(string)" \
    0 "(0,0,144,0,0)" --rpc-url $RPC_URL
```

(Background 0, body 0, accessory 144=slobber, head 0, glasses 0.)

---

## 4. Confirm ownership (already done atomically by step 2)

Just verify the deploy-script's final `transferOwnership` landed:

```bash
cast call $NEW_DESCRIPTOR "owner()(address)" --rpc-url $RPC_URL
# → 0x2cdeb0d251674710840d9fa990d1de138dfe7c00
```

If for any reason it isn't the Treasury, **do not proceed** — investigate. (This shouldn't happen; it's the last tx of the same broadcast.)

From this point on, `addBodies` / `addAccessories` / `addHeads` / `setPalette` on the descriptor can only be called by a passing V2 governance proposal.

---

## 5. Deploy the slobber seeder

```bash
forge create contracts/nounv2/NounV2SlobberSeeder.sol:NounV2SlobberSeeder \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_KEY
```

Save the deployed address as `$NEW_SEEDER`.

The seeder is stateless — it doesn't need an owner, it doesn't need to be initialized. Its hardcoded indices match what the deploy script just produced.

---

## 6. Two Safe transactions: setDescriptor + setSeeder

`NounV2Token` (`0xb1d6bdf9…`) is owned by the Safe (`0xADa31Add…`). Two txs to wire the new descriptor + seeder in. Use Safe Transaction Builder.

**Tx 1 — point V2 token at the new descriptor:**
- to: `0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9`
- function: `setDescriptor(address)`
- arg: `$NEW_DESCRIPTOR`

**Tx 2 — point V2 token at the new seeder:**
- to: `0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9`
- function: `setSeeder(address)`
- arg: `$NEW_SEEDER`

Bundle both into a single Safe tx if you want them atomic. Once executed, the next minted noun (next auction settle) will roll its seed using the slobber rule and render via the new V2-owned descriptor.

---

## 7. Confirm end state

```bash
TOKEN=0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9
cast call $TOKEN "descriptor()(address)" --rpc-url $RPC_URL  # → $NEW_DESCRIPTOR
cast call $TOKEN "seeder()(address)" --rpc-url $RPC_URL      # → $NEW_SEEDER
cast call $NEW_DESCRIPTOR "owner()(address)" --rpc-url $RPC_URL  # → V2 Treasury
```

That's it. V2 art is now permanently proposable, slobber is loaded as a hidden rare, and the next mint will run through the new pipeline.

---

## ⚠️ Things to never do (or treat as critical-veto candidates)

- **Never call `lockDescriptor()`** on `NounV2Token`. One-way; permanently freezes the descriptor pointer.
- **Never call `lockSeeder()`** on `NounV2Token`. Same — would freeze the slobber rule forever.
- **Never propose a tx that calls `lockParts()`** on the descriptor. One-way; permanently freezes art additions.
- The Safe is the vetoer on the V2 Treasury — if a proposal targeting any of those three functions ever gets votes, **veto it**.

### Broader admin surface to scrutinize at the same level

These are also `onlyOwner` on the descriptor (= V2 Treasury post-handoff), so
they're proposable by V2 holders. Each one is a system-wide behaviour change,
not just a trait addition — treat them as the same severity as `setDescriptor`
or `setSeeder`. Don't auto-veto, but don't auto-pass either: the proposer
needs to justify the swap.

- **`descriptor.setArt(newArt)`** — swaps the entire `NounsArt` contract the
  descriptor reads from. If `newArt` isn't pre-populated with the existing
  trait set + palette, every previously-minted noun would render as missing
  art. Only ever appropriate alongside a fresh art deployment that mirrors
  current state.
- **`descriptor.setArtDescriptor(addr)`** — tells `NounsArt` to accept writes
  from a different descriptor. Could be used to migrate art governance to a
  new descriptor; could also be used to hand write-access to an attacker.
- **`descriptor.setArtInflator(addr)`** — swaps the deflate decompressor. A
  buggy or malicious inflator could mis-render every trait or revert all
  reads.
- **`descriptor.setRenderer(addr)`** — swaps the SVG renderer. Same risk class
  as the inflator.

For all of these, the safe pattern is: propose, vote slowly, and if anything
seems off, the Safe vetoes via `NounV2Treasury.cancel(id)`.

---

## What if I want to add another rare-trait rule later?

Same pattern as slobber:
1. Propose `descriptor.addX(...)` to add the trait via governance. Note the new index.
2. Deploy a new seeder (clone of `NounV2SlobberSeeder`, with the new rule + hardcoded indices added).
3. Safe → `NounV2Token.setSeeder(newSeeder)`.

The `setSeeder` call is the only Safe action needed; the seeder is hot-swappable as long as it's never been locked.
