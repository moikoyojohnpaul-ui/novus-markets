import { Router } from "express";
import { db, marketsTable } from "@workspace/db";

const markets = [
  // Forex
  { symbol: "EURUSD", name: "Euro / US Dollar", category: "forex", bidPrice: "1.08450", askPrice: "1.08460", spread: "0.00010", change24h: "0.0023", volume24h: "1250000", high24h: "1.08900", low24h: "1.08100", pipSize: "0.00010" },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", category: "forex", bidPrice: "1.27200", askPrice: "1.27215", spread: "0.00015", change24h: "-0.0015", volume24h: "980000", high24h: "1.27800", low24h: "1.26900", pipSize: "0.00010" },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", category: "forex", bidPrice: "149.850", askPrice: "149.860", spread: "0.01000", change24h: "0.1500", volume24h: "1100000", high24h: "150.200", low24h: "149.400", pipSize: "0.01000" },
  { symbol: "USDCHF", name: "US Dollar / Swiss Franc", category: "forex", bidPrice: "0.89500", askPrice: "0.89512", spread: "0.00012", change24h: "-0.0008", volume24h: "620000", high24h: "0.89900", low24h: "0.89200", pipSize: "0.00010" },
  { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", category: "forex", bidPrice: "0.64800", askPrice: "0.64812", spread: "0.00012", change24h: "0.0011", volume24h: "540000", high24h: "0.65100", low24h: "0.64500", pipSize: "0.00010" },
  // Crypto
  { symbol: "BTCUSD", name: "Bitcoin / US Dollar", category: "crypto", bidPrice: "67450.00", askPrice: "67460.00", spread: "10.00000", change24h: "1250.00", volume24h: "28000000000", high24h: "68200.00", low24h: "66100.00", pipSize: "1.00000" },
  { symbol: "ETHUSD", name: "Ethereum / US Dollar", category: "crypto", bidPrice: "3520.00", askPrice: "3521.50", spread: "1.50000", change24h: "45.00", volume24h: "12000000000", high24h: "3580.00", low24h: "3460.00", pipSize: "0.10000" },
  { symbol: "XRPUSD", name: "Ripple / US Dollar", category: "crypto", bidPrice: "0.52400", askPrice: "0.52450", spread: "0.00050", change24h: "0.01200", volume24h: "1800000000", high24h: "0.53500", low24h: "0.51000", pipSize: "0.00010" },
  // Indices
  { symbol: "US30", name: "Dow Jones Industrial", category: "indices", bidPrice: "38500.00", askPrice: "38505.00", spread: "5.00000", change24h: "125.00", volume24h: "450000000", high24h: "38700.00", low24h: "38300.00", pipSize: "1.00000" },
  { symbol: "SPX500", name: "S&P 500", category: "indices", bidPrice: "5100.00", askPrice: "5100.50", spread: "0.50000", change24h: "18.00", volume24h: "320000000", high24h: "5125.00", low24h: "5080.00", pipSize: "0.10000" },
  // Commodities
  { symbol: "XAUUSD", name: "Gold / US Dollar", category: "commodities", bidPrice: "2320.00", askPrice: "2320.50", spread: "0.50000", change24h: "8.50", volume24h: "95000000", high24h: "2335.00", low24h: "2308.00", pipSize: "0.10000" },
  { symbol: "XAGUSD", name: "Silver / US Dollar", category: "commodities", bidPrice: "27.450", askPrice: "27.460", spread: "0.01000", change24h: "0.35000", volume24h: "12000000", high24h: "27.800", low24h: "27.100", pipSize: "0.00100" },
];

const seedRouter = Router();

seedRouter.get("/seed", async (req, res) => {
  try {
    const existing = await db.select().from(marketsTable);
    if (existing.length > 0) {
      res.json({ message: "Markets already seeded, skipping.", count: existing.length });
      return;
    }
    await db.insert(marketsTable).values(markets as any);
    res.json({ message: `Seeded ${markets.length} markets successfully.`, count: markets.length });
  } catch (err) {
    res.status(500).json({ error: "Seed failed", details: String(err) });
  }
});

export default seedRouter;