// Place a bid on the current NounV2 auction. Run with:
//   PRIVATE_KEY=0x... pnpm tsx examples/place-bid.ts
//
// Requires: npm i viem
//
// SAFETY: this sends a real transaction on mainnet. Read carefully.

import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

import { NOUNS_V2 } from '../ts/addresses';
import { nounV2AuctionHouseAbi } from '../ts/nounV2AuctionHouse';

const pk = process.env.PRIVATE_KEY;
if (!pk) throw new Error('Set PRIVATE_KEY (0x-prefixed)');

const account = privateKeyToAccount(pk as `0x${string}`);
const publicClient = createPublicClient({ chain: mainnet, transport: http() });
const wallet = createWalletClient({ account, chain: mainnet, transport: http() });

const [nounId, amount] = await publicClient.readContract({
  address: NOUNS_V2.auctionHouse,
  abi: nounV2AuctionHouseAbi,
  functionName: 'auction',
});

const reserve = await publicClient.readContract({
  address: NOUNS_V2.auctionHouse,
  abi: nounV2AuctionHouseAbi,
  functionName: 'reservePrice',
});

// 2% over current top bid, or reserve if no bids yet.
const bid = amount === 0n ? reserve : (amount * 102n) / 100n;
console.log(`Bidding ${formatEther(bid)} ETH on Noun #${nounId}…`);

const hash = await wallet.writeContract({
  address: NOUNS_V2.auctionHouse,
  abi: nounV2AuctionHouseAbi,
  functionName: 'createBid',
  args: [nounId],
  value: bid,
});

console.log(`tx: https://etherscan.io/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`mined in block ${receipt.blockNumber}, status: ${receipt.status}`);
