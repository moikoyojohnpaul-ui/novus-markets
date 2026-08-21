import { EventEmitter } from "events";
import { db, marketsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const marketEvents = new EventEmitter();

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

// Simple random walk for prices
function generateNextPrice(currentPrice: number, volatility: number): number {
  const change = currentPrice * volatility * (Math.random() - 0.5);
  return Math.max(0.0001, currentPrice + change);
}

export async function startMarketSimulator() {
  if (isRunning) return;
  isRunning = true;
  
  // Every 2 seconds update markets
  intervalId = setInterval(async () => {
    try {
      const markets = await db.select().from(marketsTable);
      
      const updates = markets.map(m => {
        // Varying volatility by symbol type (e.g. crypto vs forex)
        const volatility = m.symbol.includes("BTC") || m.symbol.includes("ETH") ? 0.005 : 0.001;
        const currentBid = parseFloat(m.bidPrice);
        const nextBid = generateNextPrice(currentBid, volatility);
        
        // Keep a realistic spread (e.g. 0.05% spread)
        const spreadMultiplier = 1.0005;
        const nextAsk = nextBid * spreadMultiplier;
        
        return {
          id: m.id,
          symbol: m.symbol,
          bidPrice: nextBid.toFixed(8),
          askPrice: nextAsk.toFixed(8),
          lastUpdated: new Date()
        };
      });

      // Update db (we could batch this if there were many markets)
      for (const update of updates) {
        await db.update(marketsTable)
          .set({ bidPrice: update.bidPrice, askPrice: update.askPrice })
          .where(eq(marketsTable.id, update.id));
      }
      
      // Emit the update to connected sockets
      marketEvents.emit("price_update", updates);
      
    } catch (err) {
      console.error("Market simulator error:", err);
    }
  }, 2000);
}

export function stopMarketSimulator() {
  if (intervalId) clearInterval(intervalId);
  isRunning = false;
}
