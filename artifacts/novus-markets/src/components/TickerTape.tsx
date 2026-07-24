import React, { useEffect, useState } from 'react';
import { useGetTicker } from '@workspace/api-client-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const mockTickers = [
  { symbol: 'EUR/USD', price: 1.0924, change24h: 0.15, direction: 'up' },
  { symbol: 'BTC/USD', price: 64230.50, change24h: 2.4, direction: 'up' },
  { symbol: 'XAU/USD', price: 2340.10, change24h: -0.8, direction: 'down' },
  { symbol: 'ETH/USD', price: 3450.20, change24h: 1.2, direction: 'up' },
  { symbol: 'GBP/JPY', price: 191.45, change24h: -0.3, direction: 'down' },
  { symbol: 'NDX500', price: 18230.40, change24h: 0.0, direction: 'flat' },
];

export function TickerTape() {
  const [tickers, setTickers] = useState(mockTickers);

  // Simulate live fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers(prev => prev.map(t => {
        const volatility = t.symbol.includes('BTC') || t.symbol.includes('ETH') ? 0.001 : 0.0001;
        const change = 1 + (Math.random() * volatility * 2 - volatility);
        const newPrice = t.price * change;
        const direction = newPrice > t.price ? 'up' : newPrice < t.price ? 'down' : 'flat';
        return { ...t, price: newPrice, direction };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-card border-b border-border overflow-hidden h-10 flex items-center">
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Double array to make marquee seamless */}
        {[...tickers, ...tickers].map((ticker, i) => (
          <div key={i} className="flex items-center gap-3 px-6 border-r border-border/50 text-sm font-mono">
            <span className="text-muted-foreground font-semibold">{ticker.symbol}</span>
            <span className="text-foreground">
              {ticker.price.toLocaleString(undefined, { 
                minimumFractionDigits: ticker.price > 1000 ? 2 : 4,
                maximumFractionDigits: ticker.price > 1000 ? 2 : 4
              })}
            </span>
            <span className={`flex items-center text-xs ${
              ticker.direction === 'up' ? 'text-success' : 
              ticker.direction === 'down' ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {ticker.direction === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
              {ticker.direction === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
              {ticker.direction === 'flat' && <Minus className="w-3 h-3 mr-1" />}
              {ticker.change24h > 0 ? '+' : ''}{ticker.change24h}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
