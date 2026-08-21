import { useState, useEffect } from "react";
import { socket } from "../lib/socket";

export type MarketData = {
  id: number;
  symbol: string;
  bidPrice: string;
  askPrice: string;
  lastUpdated: string;
};

export function useMarketData(initialMarkets: MarketData[] = []) {
  const [markets, setMarkets] = useState<MarketData[]>(initialMarkets);
  const [marketMap, setMarketMap] = useState<Record<string, MarketData>>({});

  useEffect(() => {
    socket.connect();
    
    socket.on("price_update", (updates: MarketData[]) => {
      setMarkets(prev => {
        const next = [...prev];
        const updateMap = new Map(updates.map(u => [u.symbol, u]));
        
        for (let i = 0; i < next.length; i++) {
          if (updateMap.has(next[i].symbol)) {
            next[i] = updateMap.get(next[i].symbol)!;
            updateMap.delete(next[i].symbol);
          }
        }
        
        // Add any new markets that weren't in initial
        for (const [_, u] of updateMap) {
          next.push(u);
        }
        
        return next;
      });
    });

    return () => {
      socket.off("price_update");
    };
  }, []);

  useEffect(() => {
    const map: Record<string, MarketData> = {};
    for (const m of markets) {
      map[m.symbol] = m;
    }
    setMarketMap(map);
  }, [markets]);

  return { markets, marketMap };
}
