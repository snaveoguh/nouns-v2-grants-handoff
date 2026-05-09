// Read the current NounV2 auction. Run with:
//   pnpm tsx examples/read-current-auction.ts
//
// Requires: npm i viem

import { createPublicClient, http, formatEther } from 'viem';
import { mainnet } from 'viem/chains';

import { NOUNS_V2 } from '../ts/addresses';
import { nounV2AuctionHouseAbi } from '../ts/nounV2AuctionHouse';

const client = createPublicClient({ chain: mainnet, transport: http() });

const [nounId, amount, startTime, endTime, bidder, settled] =
  await client.readContract({
    address: NOUNS_V2.auctionHouse,
    abi: nounV2AuctionHouseAbi,
    functionName: 'auction',
  });

const ends = new Date(Number(endTime) * 1000);
const remaining = Number(endTime) - Math.floor(Date.now() / 1000);

console.log({
  nounId: nounId.toString(),
  topBid: `${formatEther(amount)} ETH`,
  topBidder: bidder,
  ends: ends.toISOString(),
  remainingSec: remaining > 0 ? remaining : 'ended',
  settled,
});
