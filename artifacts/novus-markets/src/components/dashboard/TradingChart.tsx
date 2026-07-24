import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import { useDashboard } from './DashboardContext';
import { useGetCandles } from '@workspace/api-client-react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'];

export function TradingChart() {
  const { activeSymbol, activeTimeframe, setActiveTimeframe } = useDashboard();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [crosshairData, setCrosshairData] = useState<{ time: string; open: number; high: number; low: number; close: number } | null>(null);

  const { data: apiCandles, isLoading } = useGetCandles(
    { symbol: activeSymbol, timeframe: activeTimeframe, limit: 100 },
    { query: { enabled: !!activeSymbol, refetchInterval: 5000 } }
  );

  // Create chart once on mount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(210 40% 70%)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'hsl(222 47% 13%)' },
        horzLines: { color: 'hsl(222 47% 13%)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'hsl(217 91% 60% / 0.6)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'hsl(222 47% 11%)',
        },
        horzLine: {
          color: 'hsl(217 91% 60% / 0.6)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'hsl(222 47% 11%)',
        },
      },
      rightPriceScale: {
        borderColor: 'hsl(222 47% 15%)',
        textColor: 'hsl(210 40% 70%)',
      },
      timeScale: {
        borderColor: 'hsl(222 47% 15%)',
        textColor: 'hsl(210 40% 70%)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: 'hsl(160 84% 39%)',
      downColor: 'hsl(348 83% 60%)',
      borderUpColor: 'hsl(160 84% 39%)',
      borderDownColor: 'hsl(348 83% 60%)',
      wickUpColor: 'hsl(160 84% 39%)',
      wickDownColor: 'hsl(348 83% 60%)',
      priceFormat: {
        type: 'price',
        precision: activeSymbol.includes('BTC') || activeSymbol.includes('XAU') ? 2 : 5,
        minMove: activeSymbol.includes('BTC') || activeSymbol.includes('XAU') ? 0.01 : 0.00001,
      },
    });

    // Volume histogram series
    const volumeSeries = chart.addHistogramSeries({
      color: 'hsl(217 91% 60% / 0.3)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Crosshair move — update OHLC tooltip
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.size > 0) {
        const data = param.seriesData.get(candleSeries) as CandlestickData | undefined;
        if (data) {
          setCrosshairData({
            time: typeof param.time === 'number'
              ? format(new Date(param.time * 1000), 'MMM dd, HH:mm')
              : String(param.time),
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
          });
          return;
        }
      }
      setCrosshairData(null);
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
    // intentionally only runs once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feed candle data whenever API returns new data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    let candles: CandlestickData[];
    let volumes: HistogramData[];

    if (apiCandles && apiCandles.length > 0) {
      candles = apiCandles.map((c) => ({
        time: c.time as number,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      volumes = apiCandles.map((c) => ({
        time: c.time as number,
        value: c.volume ?? 0,
        color: c.close >= c.open ? 'hsl(160 84% 39% / 0.35)' : 'hsl(348 83% 60% / 0.35)',
      }));
    } else {
      // Synthetic fallback while API loads
      candles = generateSyntheticCandles(activeSymbol);
      volumes = candles.map((c) => ({
        time: c.time,
        value: Math.random() * 1_000_000 + 300_000,
        color: c.close >= c.open ? 'hsl(160 84% 39% / 0.35)' : 'hsl(348 83% 60% / 0.35)',
      }));
    }

    candleSeriesRef.current.setData(candles);
    volumeSeriesRef.current.setData(volumes);
    chartRef.current?.timeScale().fitContent();

    const last = candles[candles.length - 1];
    const first = candles[0];
    if (last && first) {
      setCurrentPrice(last.close);
      setPriceChange(((last.close - first.close) / first.close) * 100);
    }
  }, [apiCandles, activeSymbol]);

  // Simulate live tick updates every 2 s when on the synthetic feed
  useEffect(() => {
    if (apiCandles && apiCandles.length > 0) return; // real data handles its own refresh

    const interval = setInterval(() => {
      if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

      setCurrentPrice((prev) => {
        if (prev === null) return prev;
        const volatility = activeSymbol.includes('BTC') ? 50 : activeSymbol.includes('XAU') ? 1 : 0.0002;
        const tick = (Math.random() - 0.5) * volatility * 2;
        const next = prev + tick;

        const now = Math.floor(Date.now() / 1000);
        const roundedTime = Math.floor(now / 60) * 60;

        candleSeriesRef.current?.update({
          time: roundedTime as number,
          open: prev,
          high: Math.max(prev, next),
          low: Math.min(prev, next),
          close: next,
        });
        volumeSeriesRef.current?.update({
          time: roundedTime as number,
          value: Math.random() * 500_000 + 100_000,
          color: next >= prev ? 'hsl(160 84% 39% / 0.35)' : 'hsl(348 83% 60% / 0.35)',
        });

        setPriceChange((pct) => pct + (tick / prev) * 100);
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [apiCandles, activeSymbol]);

  const isPositive = priceChange >= 0;
  const precision = activeSymbol.includes('BTC') || activeSymbol.includes('XAU') ? 2 : 5;
  const ohlc = crosshairData;

  return (
    <div className="w-full h-full glass border border-border rounded-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/50 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-display font-bold text-base leading-none">{activeSymbol}</h3>
            {currentPrice !== null && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`font-mono text-sm font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {currentPrice.toFixed(precision)}
                </span>
                <span className={`text-xs font-mono ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {/* OHLC tooltip on crosshair hover */}
          {ohlc && (
            <div className="hidden md:flex items-center gap-3 text-xs font-mono text-muted-foreground">
              <span className="text-foreground/50">{ohlc.time}</span>
              <span>O <span className="text-foreground">{ohlc.open.toFixed(precision)}</span></span>
              <span>H <span className="text-success">{ohlc.high.toFixed(precision)}</span></span>
              <span>L <span className="text-destructive">{ohlc.low.toFixed(precision)}</span></span>
              <span>C <span className="text-foreground">{ohlc.close.toFixed(precision)}</span></span>
            </div>
          )}
        </div>

        {/* Timeframe selector */}
        <div className="flex bg-background/80 p-0.5 rounded border border-border">
          {TIMEFRAMES.map((tf) => (
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

      {/* Chart area */}
      <div className="flex-1 relative min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}

// ─── Synthetic candle generator for offline/demo fallback ───────────────────
function generateSyntheticCandles(symbol: string): CandlestickData[] {
  const basePrice = symbol.includes('BTC')
    ? 64120
    : symbol.includes('ETH')
    ? 3248
    : symbol.includes('XAU')
    ? 2342
    : symbol.includes('JPY')
    ? 154.32
    : symbol.includes('GBP')
    ? 1.2654
    : 1.0842;

  const volatility = symbol.includes('BTC') ? 200 : symbol.includes('XAU') ? 5 : 0.001;
  const now = Math.floor(Date.now() / 1000);
  const intervalSec = 3600;
  const candles: CandlestickData[] = [];
  let price = basePrice * 0.97;

  for (let i = 99; i >= 0; i--) {
    const time = (now - i * intervalSec) as unknown as CandlestickData['time'];
    const open = price;
    const change = (Math.random() - 0.48) * volatility;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.4;
    const low = Math.min(open, close) - Math.random() * volatility * 0.4;
    candles.push({ time, open, high, low, close });
    price = close;
  }

  return candles;
}
