import { db, accountsTable, tradesTable, marketsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

export async function startLiquidationEngine() {
  if (isRunning) return;
  isRunning = true;
  
  // Run every 5 seconds
  intervalId = setInterval(async () => {
    try {
      // 1. Get all open trades and all markets
      const openTrades = await db.select().from(tradesTable).where(eq(tradesTable.status, "open"));
      if (openTrades.length === 0) return;
      
      const markets = await db.select().from(marketsTable);
      const marketMap = new Map(markets.map(m => [m.symbol, m]));
      
      // 2. Group trades by account
      const tradesByAccount = new Map<number, typeof openTrades>();
      for (const t of openTrades) {
        if (!tradesByAccount.has(t.accountId)) {
          tradesByAccount.set(t.accountId, []);
        }
        tradesByAccount.get(t.accountId)!.push(t);
      }
      
      // 3. Evaluate each account
      for (const [accountId, trades] of tradesByAccount.entries()) {
        const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId)).limit(1);
        if (!account) continue;
        
        let unrealizedPnl = 0;
        let totalMargin = 0;
        const closeData: { tradeId: number, closePrice: number, pnl: number }[] = [];
        
        for (const t of trades) {
          const m = marketMap.get(t.symbol);
          if (!m) continue;
          
          const closePrice = t.side === "buy" ? parseFloat(m.bidPrice) : parseFloat(m.askPrice);
          const priceDiff = t.side === "buy" 
            ? closePrice - parseFloat(t.openPrice) 
            : parseFloat(t.openPrice) - closePrice;
            
          const pnl = priceDiff * parseFloat(t.lotSize) * 100000;
          unrealizedPnl += pnl;
          totalMargin += parseFloat(t.margin);
          
          closeData.push({ tradeId: t.id, closePrice, pnl });
        }
        
        const balance = parseFloat(account.balance);
        const equity = balance + unrealizedPnl + totalMargin; // Note: margin was deducted from balance on open, so equity = (balance_without_margin) + margin + unrealizedPnl. Wait. When trade opens, balance -= margin. So equity = current_balance + margin + unrealized_pnl.
        
        // Liquidation condition: Equity falls below 20% of used margin
        if (equity < totalMargin * 0.20) {
          console.log(`[LIQUIDATION] Account ${accountId} liquidated. Equity: ${equity}, Margin: ${totalMargin}`);
          
          // Execute liquidation
          await db.transaction(async (tx) => {
            let totalRealized = 0;
            
            for (const c of closeData) {
              await tx.update(tradesTable)
                .set({ 
                  status: "closed", 
                  closePrice: c.closePrice.toString(), 
                  pnl: c.pnl.toString(), 
                  closedAt: new Date() 
                })
                .where(eq(tradesTable.id, c.tradeId));
                
              totalRealized += c.pnl;
            }
            
            const newBalance = balance + totalMargin + totalRealized;
            await tx.update(accountsTable)
              .set({ balance: Math.max(0, newBalance).toString() })
              .where(eq(accountsTable.id, accountId));
          });
        }
      }
      
    } catch (err) {
      console.error("Liquidation engine error:", err);
    }
  }, 5000);
}

export function stopLiquidationEngine() {
  if (intervalId) clearInterval(intervalId);
  isRunning = false;
}
