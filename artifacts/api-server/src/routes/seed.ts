import { Router } from 'express';
import { db, marketsTable, platformSettingsTable } from '@workspace/db';

const router = Router();

router.get('/seed', async (_req, res): Promise<void> => {
  const existing = await db.select().from(marketsTable);
  if (existing.length > 0) {
    res.json({ message: `Already seeded with ${existing.length} markets.` });
    return;
  }

  await db.insert(marketsTable).values([
    { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'forex', bidPrice: '1.09241', askPrice: '1.09243', spread: '0.00002', change24h: '0.15', volume24h: '5800000000', high24h: '1.09480', low24h: '1.08950', pipSize: 5 },
    { symbol: 'GBPUSD', name: 'British Pound / US Dollar', category: 'forex', bidPrice: '1.26450', askPrice: '1.26453', spread: '0.00003', change24h: '-0.21', volume24h: '3200000000', high24h: '1.26780', low24h: '1.26120', pipSize: 5 },
    { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'forex', bidPrice: '150.120', askPrice: '150.124', spread: '0.00400', change24h: '0.45', volume24h: '4100000000', high24h: '150.780', low24h: '149.650', pipSize: 3 },
    { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', category: 'forex', bidPrice: '0.65210', askPrice: '0.65214', spread: '0.00004', change24h: '-0.10', volume24h: '1800000000', high24h: '0.65450', low24h: '0.64980', pipSize: 5 },
    { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'forex', bidPrice: '1.36450', askPrice: '1.36454', spread: '0.00004', change24h: '0.08', volume24h: '1500000000', high24h: '1.36780', low24h: '1.36120', pipSize: 5 },
    { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'forex', bidPrice: '0.89820', askPrice: '0.89824', spread: '0.00004', change24h: '-0.05', volume24h: '1200000000', high24h: '0.90050', low24h: '0.89580', pipSize: 5 },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', category: 'forex', bidPrice: '0.59780', askPrice: '0.59784', spread: '0.00004', change24h: '0.12', volume24h: '800000000', high24h: '0.60020', low24h: '0.59520', pipSize: 5 },
    { symbol: 'EURGBP', name: 'Euro / British Pound', category: 'forex', bidPrice: '0.86450', askPrice: '0.86453', spread: '0.00003', change24h: '0.06', volume24h: '1100000000', high24h: '0.86780', low24h: '0.86120', pipSize: 5 },
    { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', category: 'crypto', bidPrice: '64230.50', askPrice: '64231.00', spread: '0.50', change24h: '2.40', volume24h: '28000000000', high24h: '65800.00', low24h: '62100.00', pipSize: 2 },
    { symbol: 'ETHUSD', name: 'Ethereum / US Dollar', category: 'crypto', bidPrice: '3450.20', askPrice: '3450.40', spread: '0.20', change24h: '1.20', volume24h: '14000000000', high24h: '3520.00', low24h: '3380.00', pipSize: 2 },
    { symbol: 'SOLUSD', name: 'Solana / US Dollar', category: 'crypto', bidPrice: '145.60', askPrice: '145.65', spread: '0.05', change24h: '5.40', volume24h: '2800000000', high24h: '150.00', low24h: '136.00', pipSize: 3 },
    { symbol: 'XRPUSD', name: 'Ripple / US Dollar', category: 'crypto', bidPrice: '0.52140', askPrice: '0.52145', spread: '0.00005', change24h: '-1.20', volume24h: '1800000000', high24h: '0.53500', low24h: '0.51200', pipSize: 5 },
    { symbol: 'US500', name: 'S&P 500 Index', category: 'indices', bidPrice: '5120.40', askPrice: '5120.80', spread: '0.40', change24h: '0.80', volume24h: '85000000000', high24h: '5145.00', low24h: '5095.00', pipSize: 1 },
    { symbol: 'UT100', name: 'NASDAQ 100 Index', category: 'indices', bidPrice: '18230.40', askPrice: '18231.20', spread: '0.80', change24h: '1.10', volume24h: '65000000000', high24h: '18450.00', low24h: '17980.00', pipSize: 1 },
    { symbol: 'DE40', name: 'DAX 40 Index', category: 'indices', bidPrice: '17800.50', askPrice: '17801.50', spread: '1.00', change24h: '-0.30', volume24h: '12000000000', high24h: '17950.00', low24h: '17680.00', pipSize: 1 },
    { symbol: 'UK100', name: 'FTSE 100 Index', category: 'indices', bidPrice: '7850.40', askPrice: '7851.20', spread: '0.80', change24h: '0.25', volume24h: '9500000000', high24h: '7890.00', low24h: '7820.00', pipSize: 1 },
    { symbol: 'XAUUSD', name: 'Gold / US Dollar', category: 'commodities', bidPrice: '2320.00', askPrice: '2320.50', spread: '0.50', change24h: '8.50', volume24h: '95000000000', high24h: '2335.00', low24h: '2308.00', pipSize: 1 },
    { symbol: 'XAGUSD', name: 'Silver / US Dollar', category: 'commodities', bidPrice: '27.450', askPrice: '27.460', spread: '0.01', change24h: '0.35', volume24h: '12000000000', high24h: '27.800', low24h: '27.100', pipSize: 3 },
  ] as any[]);

  const settingsExist = await db.select().from(platformSettingsTable);
  if (settingsExist.length === 0) {
    await db.insert(platformSettingsTable).values({});
  }

  res.json({ message: 'Seeded 18 markets successfully.' });
});

export default router;