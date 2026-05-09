// Mainnet addresses (chainId = 1) for the Nouns V2 fork and the Small Grants Treasury.
// Both systems are LIVE on Ethereum mainnet. V2 art ceremony executed 2026-05-09.
//
// • V2: standalone Nouns-style auction + token + governance. Reads art from
//   our own NounsDescriptorV2 (`art.descriptor` below), owned by NounV2Treasury.
//   Custom seeder applies the hidden "slobber" trait rule.
// • Grants: governance-on-NounsToken pot for small grants (V1 Nouns voting power).

export const NOUNS_V2 = {
  chainId: 1,
  token: '0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9',
  auctionHouse: '0x9a6ddb16e23967d5482e5bfd7444a04a5d5145fc',
  treasury: '0x2cdeb0d251674710840d9fa990d1de138dfe7c00',
  // V2-owned NounsDescriptorV2 (32 bodies / 144 accessories / 253 heads /
  // 23 glasses / 253 palette colors). DAO-owned post-2026-05-09 ceremony.
  descriptor: '0xAe0247Ca34B211a61b03A95F8008DCb8B3124B89',
  art: '0x3409A4A360A028b7Aa2eBF769d6306d96B976b3f',
  // Custom seeder with hidden slobber rule. Stateless.
  seeder: '0xd777E701506A86fE89f07f963aA6c08d6905cFF8',
  // Multisig vetoer (still Treasury admin; no longer Token owner since
  // 2026-05-09 transferOwnership(Treasury) Safe batch).
  safe: '0xADa31Add8450CA0422983B9a3103633b78938617',
  // Initial Safe batch tx that wired everything (setDescriptor + setSeeder
  // + transferOwnership): 0x973ddf9891a02679db25ffe6b4639283dd1e7b07e1bfb7c4474036df3a88ab88
  // Atomic deployer for the original V2 token (single-use, defunct after constructor)
  deployer: '0xda094c5b63261aef51c41a5d92660648cab90417',
  startBlock: 24951808n,
  deployTx: '0xb998296efd43c9f1f37d9e407566f17961d78369d9413a34b5dd56e0d12274d7',
} as const satisfies Record<string, unknown>;

// Slobber rule constants — match the on-chain NounV2SlobberSeeder.
// Use these in any prediction logic (crystal ball, marketplaces, etc).
export const SLOBBER_RULE = {
  GREASE_INDEX: 137,
  RETAINER_INDEX: 173,
  INDEX_CARD_INDEX: 237,
  SLOBBER_INDEX: 143,
  // Probability per V2 mint, with current trait counts:
  //   (1/143) × (2/253) × (1/2) ≈ 1/36,179
} as const satisfies Record<string, number>;

export const SMALL_GRANTS = {
  chainId: 1,
  treasury: '0xbac9233725440c595b19d975309cc98cb259253a',
  // Parent token: governance reads voting power from mainnet Nouns
  nounsToken: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
} as const satisfies Record<string, unknown>;

// Pre-ceremony historical addresses (V2 used to read from these). Kept here
// for reference; you don't need them for new integrations. NounV2Token now
// reads from `NOUNS_V2.descriptor` / `NOUNS_V2.seeder` above.
export const V2_ART_PRE_CEREMONY = {
  descriptor: '0x6229c811D04501523C6058bfAAc29c91bb586268', // older NounsDescriptorV2
  seeder: '0xCC8a0FB5ab3C7132c1b2A0109142Fb112c4Ce515',     // mainnet NounsSeeder
} as const satisfies Record<string, unknown>;

// V1's current descriptor on mainnet (`NounsToken.descriptor()`). Owned by
// the V1 Nouns DAO Executor; V2 has no write access. Reference only.
export const V1_DESCRIPTOR_CURRENT = '0x33A9c445fb4FB21f2c030A6b2d3e2F12D017BFAC' as const;
