import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Lock, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { useGetMarkets } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function Home() {
  const [category, setCategory] = useState<'forex' | 'crypto' | 'indices' | 'commodities'>('forex');

  const { data: markets = [] } = useGetMarkets(
    { category },
    { query: { refetchInterval: 5000 } }
  );

  const displayMarkets = Array.isArray(markets) && markets.length > 0 ? markets : mockMarkets[category];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1200px] pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5 px-3 py-1">
              Institutional Grade Execution
            </Badge>
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-8 max-w-4xl mx-auto leading-tight">
              Where Precision Meets{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
                Performance
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Trade Forex, Crypto, and Indices on a platform engineered for serious traders.
              Zero fluff, ultra-low latency, and tight spreads.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8" asChild>
                <Link href="/register">
                  Open Real Account <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 glass-hover" asChild>
                <Link href="/register?demo=true">Try Free Demo</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Markets Table Section */}
      <section className="py-24 bg-card/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">Live Markets</h2>
              <p className="text-muted-foreground">Real-time pricing from tier-1 liquidity providers.</p>
            </div>
            <div className="flex bg-background/50 p-1 rounded-lg border border-border backdrop-blur-md">
              {(['forex', 'crypto', 'indices', 'commodities'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    category === c
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-background/50 uppercase border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Instrument</th>
                    <th className="px-6 py-4 font-medium text-right">Bid</th>
                    <th className="px-6 py-4 font-medium text-right">Ask</th>
                    <th className="px-6 py-4 font-medium text-right">Spread</th>
                    <th className="px-6 py-4 font-medium text-right">24h Change</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayMarkets.map((market, i) => (
                    <motion.tr
                      key={market.symbol}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2">
                        {market.symbol}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                        {Number(market.bidPrice).toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                        {Number(market.askPrice).toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                        {Number(market.spread).toFixed(1)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-medium ${
                          Number(market.change24h) >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {Number(market.change24h) > 0 ? '+' : ''}
                        {Number(market.change24h).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 hover:bg-primary hover:text-primary-foreground"
                          asChild
                        >
                          <Link href={`/dashboard?symbol=${market.symbol}`}>Trade</Link>
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Engineered for the elite.</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We built the infrastructure so you can focus on the strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-2xl glass-hover">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Ultra-Low Latency</h3>
              <p className="text-muted-foreground leading-relaxed">
                Orders executed in under 12ms. Direct cross-connects to tier-1 liquidity pools ensure
                you get the price you see.
              </p>
            </div>

            <div className="glass p-8 rounded-2xl glass-hover relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full" />
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 text-blue-500">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Advanced Charting</h3>
              <p className="text-muted-foreground leading-relaxed">
                Institutional grade charting tools. 100+ indicators, custom timeframes, and seamless
                order placement from the chart.
              </p>
            </div>

            <div className="glass p-8 rounded-2xl glass-hover">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 text-emerald-500">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Bank-Grade Security</h3>
              <p className="text-muted-foreground leading-relaxed">
                Cold storage for crypto assets, segregated accounts for fiat, and strict regulatory
                compliance protect your capital.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden bg-card/50">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop')] opacity-5 mix-blend-overlay bg-cover bg-center" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-8">Ready to upgrade your edge?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of professional traders executing billions in volume every month.
          </p>
          <Button size="lg" className="h-16 px-10 text-lg rounded-full" asChild>
            <Link href="/register">Start Trading Now</Link>
          </Button>
        </div>
      </section>
    </MainLayout>
  );
}

const mockMarkets = {
  forex: [
    { symbol: 'EUR/USD', bidPrice: 1.09241, askPrice: 1.09243, spread: 0.2, change24h: 0.15 },
    { symbol: 'GBP/USD', bidPrice: 1.2645, askPrice: 1.26453, spread: 0.3, change24h: -0.21 },
    { symbol: 'USD/JPY', bidPrice: 150.12, askPrice: 150.124, spread: 0.4, change24h: 0.45 },
    { symbol: 'AUD/USD', bidPrice: 0.6521, askPrice: 0.65214, spread: 0.4, change24h: -0.1 },
  ],
  crypto: [
    { symbol: 'BTC/USD', bidPrice: 64230.5, askPrice: 64231.0, spread: 0.5, change24h: 2.4 },
    { symbol: 'ETH/USD', bidPrice: 3450.2, askPrice: 3450.4, spread: 0.2, change24h: 1.2 },
    { symbol: 'SOL/USD', bidPrice: 145.6, askPrice: 145.65, spread: 0.05, change24h: 5.4 },
  ],
  indices: [
    { symbol: 'US500', bidPrice: 5120.4, askPrice: 5120.8, spread: 0.4, change24h: 0.8 },
    { symbol: 'UT100', bidPrice: 18230.4, askPrice: 18231.2, spread: 0.8, change24h: 1.1 },
    { symbol: 'DE40', bidPrice: 17800.5, askPrice: 17801.5, spread: 1.0, change24h: -0.3 },
  ],
  commodities: [
    { symbol: 'XAU/USD', bidPrice: 2340.1, askPrice: 2340.4, spread: 0.3, change24h: -0.8 },
    { symbol: 'XAG/USD', bidPrice: 28.45, askPrice: 28.47, spread: 0.02, change24h: 0.5 },
    { symbol: 'WTI/USD', bidPrice: 82.4, askPrice: 82.43, spread: 0.03, change24h: 1.5 },
  ],
};