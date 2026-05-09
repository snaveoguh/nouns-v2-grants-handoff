// Demo: create a Small Grants proposal sending 0.01 ETH to a recipient,
// then vote FOR. Same flow works for NounV2Treasury — swap the address/abi.
//
// Run with:
//   PRIVATE_KEY=0x... pnpm tsx examples/grants-create-and-vote.ts
//
// Requires: npm i viem

import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

import { SMALL_GRANTS } from '../ts/addresses';
import { smallGrantsTreasuryAbi } from '../ts/smallGrantsTreasury';

const pk = process.env.PRIVATE_KEY;
if (!pk) throw new Error('Set PRIVATE_KEY (must hold ≥1 V1 Noun, self-delegated)');

const account = privateKeyToAccount(pk as `0x${string}`);
const publicClient = createPublicClient({ chain: mainnet, transport: http() });
const wallet = createWalletClient({ account, chain: mainnet, transport: http() });

const RECIPIENT = '0x0000000000000000000000000000000000000000' as const; // change me

// 1. Create the proposal
const proposeHash = await wallet.writeContract({
  address: SMALL_GRANTS.treasury,
  abi: smallGrantsTreasuryAbi,
  functionName: 'propose',
  args: [
    [RECIPIENT],            // targets
    [parseEther('0.01')],   // values
    [''],                   // signatures (empty = plain ETH transfer)
    ['0x'],                 // calldatas
    'Send 0.01 ETH to fund X',
  ],
});
console.log(`propose tx: https://etherscan.io/tx/${proposeHash}`);
await publicClient.waitForTransactionReceipt({ hash: proposeHash });

// 2. Read proposalCount to get the new id
const proposalId = await publicClient.readContract({
  address: SMALL_GRANTS.treasury,
  abi: smallGrantsTreasuryAbi,
  functionName: 'proposalCount',
});
console.log(`proposal id: ${proposalId}`);

// 3. Vote FOR
const voteHash = await wallet.writeContract({
  address: SMALL_GRANTS.treasury,
  abi: smallGrantsTreasuryAbi,
  functionName: 'castVote',
  args: [proposalId, 1], // 1 = FOR
});
console.log(`vote tx: https://etherscan.io/tx/${voteHash}`);

// 4. After ~12h voting + ~12h timelock, anyone can call queue() then execute().
//    See INTEGRATION.md for full lifecycle.
