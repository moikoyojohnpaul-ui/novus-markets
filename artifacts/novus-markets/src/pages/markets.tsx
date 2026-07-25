import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGetMarkets } from '@workspace/api-client-react';
import { Search, TrendingUp } from 'lucide-react';
import type { GetMarketsCategory } from '@workspace/api-client-react';

export default function MarketsPage() {
  const [category, setCategory] = useState<GetMarketsCategory>('forex');
  const [search, setSearch] = useState('');

  const { data: markets, isLoading, isError } = useGetMarkets(
    { category },
    { query: { refetchInterval: 5000, retry: false } }
  );

  const prevPricesRef = useRef<Record<number, { bid: number; ask: number }>>({});
  const [priceFlash, setPriceFlash] = useState<Record<number, 'up' | 'down' | null>>({});

  const marketsList = Array.isArray(markets) ? markets : [];

  useEffect(() => {
    if (!marketsList.length) return;

    const newFlash: Record<number, 'up' | 'down' | null> = {};

    marketsList.forEach((market) => {
      const prev = prevPricesRef.current[market.id];
      if (prev) {
        if (market.bidPrice > prev.bid || market.askPrice > prev.ask) {
          newFlash[market.id] = 'up';
        } else if (market.bidPrice < prev.bid || market.askPrice < prev.ask) {
          newFlash[market.id] = 'down';
        }
      }
      prevPricesRef.current[market.id] = { bid: market.bidPrice, ask: market.askPrice };
    });

    setPriceFlash(newFlash);

    const timeout = setTimeout(() => setPriceFlash({}), 600);
    return () => clearTimeout(timeout);
  }, [markets]);

  const filteredMarkets = marketsList.filter(
    (m) =>
      m.symbol.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[100dvh] w-full bg-background pb-20 md:pb-4">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Markets
          </h1>
          <p className="text-muted-foreground mt-1">Live prices across all instruments</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search markets by symbol or name..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Tabs value={category} onValueChange={(v) => setCategory(v as GetMarketsCategory)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="forex">Forex</TabsTrigger>
                <TabsTrigger value="crypto">Crypto</TabsTrigger>
                <TabsTrigger value="indices">Indices</TabsTrigger>
                <TabsTrigger value="commodities">Commodities</TabsTrigger>
              </TabsList>

              <TabsContent value={category} className="mt-6">
                {isError && (
                  <p className="text-center text-red-500 py-8">
                    Unable to load market data. Please check your connection.
                  </p>
                )}

                {!isError && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border">
                        <tr className="text-left">
                          <th className="p-3 text-sm font-semibold">Symbol</th>
                          <th className="p-3 text-sm font-semibold">Name</th>
                          <th className="p-3 text-sm font-semibold text-right">Bid</th>
                          <th className="p-3 text-sm font-semibold text-right">Ask</th>
                          <th className="p-3 text-sm font-semibold text-right">Spread</th>
                          <th className="p-3 text-sm font-semibold text-right">24h Change</th>
                          <th className="p-3 text-sm font-semibold text-right">Volume</th>
                          <th className="p-3 text-sm font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <tr>
                            <td colSpan={8} className="p-12 text-center text-muted-foreground">
                              Loading markets...
                            </td>
                          </tr>
                        ) : filteredMarkets.length > 0 ? (
                          filteredMarkets.map((market) => (
                            <tr
                              key={market.id}
                              className={`border-b border-border hover:bg-accent/50 transition-colors ${
                                priceFlash[market.id] === 'up'
                                  ? 'flash-up'
                                  : priceFlash[market.id] === 'down'
                                  ? 'flash-down'
                                  : ''
                              }`}
                            >
                              <td className="p-3 font-mono font-bold">{market.symbol}</td>
                              <td className="p-3 text-sm text-muted-foreground">{market.name}</td>
                              <td className="p-3 text-right font-mono text-sm">
                                {market.bidPrice.toFixed(market.pipSize)}
                              </td>
                              <td className="p-3 text-right font-mono text-sm">
                                {market.askPrice.toFixed(market.pipSize)}
                              </td>
                              <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                                {market.spread.toFixed(market.pipSize)}
                              </td>
                              <td
                                className={`p-3 text-right font-mono font-semibold ${
                                  market.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}
                              >
                                {market.change24h >= 0 ? '+' : ''}
                                {market.change24h.toFixed(2)}%
                              </td>
                              <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                                ${(market.volume24h / 1000000).toFixed(2)}M
                              </td>
                              <td className="p-3 text-right">
                                <Link href={`/dashboard?symbol=${market.symbol}`}>
                                  <Button size="sm">Trade</Button>
                                </Link>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-12 text-center text-muted-foreground">
                              {search ? 'No markets found matching your search' : 'No markets available'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}