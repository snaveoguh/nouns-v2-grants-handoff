# Webapp integration — rendering V1 vs V2 nouns

Tested in production at noun.wtf. If you're building a frontend that renders both V1 mainnet Nouns and V2 nouns from the same UI, this is the cleanest pattern we found.

## The problem

`@noundry/nouns-assets` (npm) carries V1 chain's *current* trait set: 31 bodies / 144 accessories / 258 heads (as of mid-2026, drifts upward over time as V1 governance adds traits).

The V2-owned `NounsDescriptorV2` we deployed mirrors a different snapshot: 32 bodies (30 inherited + 2 founders) / 144 accessories (142 inherited + prop-966 multicolor + slobber) / 253 heads (252 inherited + missingnoun) / 23 glasses, plus 14 founder palette colors at slots 239..252.

These trait sets **partially overlap but diverge at higher indices**. A single `ImageData` blob can't decode both correctly — V2 founder traits (slobber etc.) live at indices that V1 chain has *different* traits at.

## The solution

Per-DAO `ImageData`. Two source-of-truth blobs:

| | Source | Use when |
|---|---|---|
| `ImageData` (V1) | npm `@noundry/nouns-assets@1.17.0` | rendering V1 nouns |
| `ImageDataV2` | This bundle's `ts/image-data-v2.json` (or workspace `@nouns/assets` if you fork the noun-wtf monorepo) | rendering V2 nouns |

`getNounDataV2(seed)` mirrors `getNounData(seed)` but pulls parts from the V2 blob.

### Drop-in helper

`ts/pickNounAssets.ts` is the helper noun.wtf uses. Drop it into your codebase:

```ts
import { ImageData as ImageDataV1, getNounData as getNounDataV1 } from '@noundry/nouns-assets';
import { ImageDataV2, getNounDataV2 } from '@nouns/assets';   // or import from this bundle

export function pickNounAssets(isV2 = false) {
  return isV2
    ? { ImageData: ImageDataV2, getNounData: getNounDataV2 }
    : { ImageData: ImageDataV1, getNounData: getNounDataV1 };
}
```

Then any render path that knows whether it's a V1 or V2 noun:

```tsx
function Noun({ seed, isV2 = false }) {
  const { ImageData, getNounData } = pickNounAssets(isV2);
  const { parts, background } = getNounData(seed);
  return <img src={`data:image/svg+xml;base64,${btoa(buildSVG(parts, ImageData.palette, background))}`} />;
}
```

## How to detect V1 vs V2

If you're already routing or DAO-aware:

- React Router / URL: anything under `/v2/...` is V2
- Detect by token contract address of the noun being rendered
- Pass `isV2` as a prop down through the tree from top-level page

In noun.wtf the `useActiveDao()` hook returns `'nouns' | 'nounv2'`; render contexts derive `isV2 = activeDao === 'nounv2'` and forward it.

## Generic shared components

For a `Noun.tsx` / `Trait.tsx` / `AsciiNoun` / `MorphingNounVoxels` that both V1 and V2 callers use, add an optional `isV2?: boolean` prop (default `false` so V1 callers don't break) and forward it into `pickNounAssets(isV2)` inside.

## Crystal ball / prediction backend

If your frontend has a "next mint" preview (the noun.wtf "crystal ball"), the prediction backend should also be V2-aware:

- The standard NounsSeeder picks each trait via `% count` from the live descriptor.
- The V2 `NounV2SlobberSeeder` deviates in two places:
  1. Excludes `SLOBBER_INDEX = 143` from random rotation via skip-mapping (`% (accessoryCount - 1)`, then `+= 1` if `>= SLOBBER_INDEX`).
  2. After picking, if `accessory == GREASE_INDEX (137)` AND `head ∈ {RETAINER (173), INDEX_CARD (237)}`, peek at bits 240..255 of the same `keccak256(blockhash, nounId)` — if bit 0 is set, swap accessory to `SLOBBER_INDEX (143)`.

Implement those two branches in your predictor when `dao === 'v2'`. Probability of slobber rolling: `(1/143) × (2/253) × (1/2) ≈ 1/36,000`. Worth foreshadowing in the UI.

## Files in this bundle

- `ts/image-data-v2.json` — drop-in V2 ImageData (32/144/253 traits + 253-color palette)
- `ts/pickNounAssets.ts` — the V1/V2 selector helper
- `ts/addresses.ts` — V2 descriptor + seeder addresses, etc.
