// Mainnet addresses (chainId = 1) for the Nouns V2 fork and the Small Grants Treasury.
// Both systems are live on Ethereum mainnet.
//
// • V2: standalone Nouns-style auction + token + governance, sharing
//   mainnet Nouns' on-chain art (descriptor + seeder).
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

// Shared art source — the V2 token uses these mainnet Nouns contracts.
export const SHARED_ART = {
  descriptor: '0x6229c811D04501523C6058bfAAc29c91bb586268', // NounsDescriptorV2
  seeder: '0xCC8a0FB5ab3C7132c1b2A0109142Fb112c4Ce515',
} as const satisfies Record<string, unknown>;
