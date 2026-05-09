// Mainnet addresses (chainId = 1) for the Nouns V2 fork and the Small Grants Treasury.
// Both systems are live on Ethereum mainnet.
//
// • V2: standalone Nouns-style auction + token + governance. Currently
//   reads art from mainnet Nouns' descriptor + seeder, but the V2 token's
//   `setDescriptor` / `setSeeder` are owner-callable and unlocked — Safe
//   can swap to a V2-only descriptor at any time. See README.md.
// • Grants: governance-on-NounsToken pot for small grants (V1 Nouns voting power).

export const NOUNS_V2 = {
  chainId: 1,
  token: '0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9',
  auctionHouse: '0x9a6ddb16e23967d5482e5bfd7444a04a5d5145fc',
  treasury: '0x2cdeb0d251674710840d9fa990d1de138dfe7c00',
  // Atomic deployer (single-use, defunct after constructor)
  deployer: '0xda094c5b63261aef51c41a5d92660648cab90417',
  // Multisig that owns Token and is Treasury admin (vetoer)
  safe: '0xADa31Add8450CA0422983B9a3103633b78938617',
  startBlock: 24951808n,
  deployTx: '0xb998296efd43c9f1f37d9e407566f17961d78369d9413a34b5dd56e0d12274d7',
} as const satisfies Record<string, unknown>;

export const SMALL_GRANTS = {
  chainId: 1,
  treasury: '0xbac9233725440c595b19d975309cc98cb259253a',
  // Parent token: governance reads voting power from mainnet Nouns
  nounsToken: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
} as const satisfies Record<string, unknown>;

// V2 art pipeline as set at deploy-time. Swappable by Safe via
// `NounV2Token.setDescriptor` / `setSeeder` (neither is locked).
//
// IMPORTANT: V2 is on an OLDER NounsDescriptorV2 than V1 mainnet uses today.
// V1 migrated to a redeployed NounsDescriptorV2 with refreshed art (see
// V1_DESCRIPTOR_CURRENT below). V2 stayed on the original, so V2 renders
// a frozen 2022-era trait set. Swap if visual parity with V1 is wanted.
export const V2_ART_CURRENT = {
  descriptor: '0x6229c811D04501523C6058bfAAc29c91bb586268', // older NounsDescriptorV2
  seeder: '0xCC8a0FB5ab3C7132c1b2A0109142Fb112c4Ce515',     // mainnet NounsSeeder
} as const satisfies Record<string, unknown>;

// What V1 NounsToken.descriptor() returns on mainnet today. Pass this to
// `NounV2Token.setDescriptor(...)` to give V2 visual parity with V1.
export const V1_DESCRIPTOR_CURRENT = '0x33A9c445fb4FB21f2c030A6b2d3e2F12D017BFAC' as const;
