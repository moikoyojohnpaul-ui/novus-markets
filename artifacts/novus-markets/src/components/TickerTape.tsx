import React from 'react';
import { useGetMarkets } from '@workspace/api-client-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function TickerTape() {
  const { data: markets = [], isLoading } = useGetMarkets({ query: { refetchInterval: 5000 } });

  if (isLoading) {
    return (
      <div className="w-full bg-card border-b border-border overflow-hidden h-10 flex items-center px-6">
        <div className="flex gap-12 w-full">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 w-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  const tickers = markets.map(m => {
    const change = parseFloat(m.change24h);
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    return {
      symbol: m.symbol,
      price: parseFloat(m.askPrice),
      change24h: change,
      direction
    };
  });

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
