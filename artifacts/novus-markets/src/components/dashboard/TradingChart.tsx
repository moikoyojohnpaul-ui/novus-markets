import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { useGetCandles, useGetTicker } from '@workspace/api-client-react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function TradingChart() {
  const { activeSymbol, activeTimeframe, setActiveTimeframe } = useDashboard();
  
  const { data: apiCandles, isLoading } = useGetCandles(
    { symbol: activeSymbol, timeframe: activeTimeframe, limit: 100 },
    { query: { enabled: !!activeSymbol } }
  );

  // Generate mock OHLCV if API fails or is loading
  const [mockCandles, setMockCandles] = useState<any[]>([]);
  
  useEffect(() => {
    // Generate base mock data
    let basePrice = activeSymbol.includes('BTC') ? 64000 : activeSymbol.includes('EUR') ? 1.09 : 150;
    const volatility = activeSymbol.includes('BTC') ? 100 : activeSymbol.includes('EUR') ? 0.001 : 0.1;
    
    const initial = Array.from({ length: 60 }).map((_, i) => {
      const open = basePrice;
      const change = (Math.random() - 0.5) * volatility;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * (volatility / 2);
      const low = Math.min(open, close) - Math.random() * (volatility / 2);
      basePrice = close;
      
      return {
        time: Date.now() - (60 - i) * 60000,
        open, high, low, close,
        isUp: close >= open,
        range: [Math.min(open, close), Math.max(open, close)]
      };
    });
    
    setMockCandles(initial);
    
    // Simulate live ticks
    const interval = setInterval(() => {
      setMockCandles(prev => {
        const last = { ...prev[prev.length - 1] };
        const tick = (Math.random() - 0.5) * (volatility / 5);
        last.close += tick;
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
        last.isUp = last.close >= last.open;
        last.range = [Math.min(last.open, last.close), Math.max(last.open, last.close)];
        
        return [...prev.slice(0, -1), last];
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [activeSymbol, activeTimeframe]);

  const displayData = apiCandles && apiCandles.length > 0 
    ? apiCandles.map(c => ({
        ...c,
        isUp: c.close >= c.open,
        range: [Math.min(c.open, c.close), Math.max(c.open, c.close)]
      }))
    : mockCandles;

  const currentPrice = displayData.length > 0 ? displayData[displayData.length - 1].close : 0;
  const isUp = displayData.length > 0 ? displayData[displayData.length - 1].isUp : true;

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];

  const CustomBar = (props: any) => {
    const { x, y, width, height, isUp } = props;
    const fill = isUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
    return <rect x={x} y={y} width={width} height={Math.max(height, 1)} fill={fill} rx={1} />;
  };

  return (
    <div className="w-full h-full glass border border-border rounded-lg flex flex-col overflow-hidden">
      {/* Chart Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-background/50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h3 className="font-display font-bold text-lg leading-none">{activeSymbol}</h3>
            <span className={`font-mono text-sm font-medium ${isUp ? 'text-success flash-up' : 'text-destructive flash-down'} transition-colors duration-200`}>
              {currentPrice.toFixed(activeSymbol.includes('BTC') ? 2 : 4)}
            </span>
          </div>
        </div>
        
        <div className="flex bg-background/80 p-0.5 rounded border border-border">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                activeTimeframe === tf 
                  ? 'bg-card text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart Area */}
      <div className="flex-1 min-h-0 w-full relative">
        {isLoading && !apiCandles && mockCandles.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={displayData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="time" 
                tickFormatter={(val) => format(new Date(val), 'HH:mm')}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => val.toFixed(activeSymbol.includes('BTC') ? 0 : 4)}
                width={60}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--foreground))' }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                labelFormatter={(val) => format(new Date(val), 'MMM dd, HH:mm:ss')}
                formatter={(value: any) => [
                  Array.isArray(value) ? `${value[0].toFixed(4)} - ${value[1].toFixed(4)}` : value,
                  'Price'
                ]}
              />
              <Bar 
                dataKey="range" 
                shape={<CustomBar />}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
