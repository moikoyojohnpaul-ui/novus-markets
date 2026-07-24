import React, { useState } from 'react';
import { useDashboard } from './DashboardContext';
import { useExecuteTrade, TradeInputSide, TradeInputType } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function OrderPanel() {
  const { activeSymbol, activeAccount } = useDashboard();
  const { toast } = useToast();
  
  const [side, setSide] = useState<TradeInputSide>('buy');
  const [type, setType] = useState<TradeInputType>('market');
  const [lots, setLots] = useState(1.0);
  const [leverage, setLeverage] = useState(100);
  const [price, setPrice] = useState<string>('');
  const [sl, setSl] = useState<string>('');
  const [tp, setTp] = useState<string>('');
  
  const executeTrade = useExecuteTrade();

  const handleExecute = () => {
    if (!activeAccount) {
      toast({ title: "No active account", description: "Please select an account first", variant: "destructive" });
      return;
    }

    executeTrade.mutate({
      data: {
        accountId: activeAccount.id,
        symbol: activeSymbol,
        side,
        type,
        lotSize: lots,
        leverage,
        limitPrice: type !== 'market' ? Number(price) : undefined,
        stopLoss: sl ? Number(sl) : undefined,
        takeProfit: tp ? Number(tp) : undefined
      }
    }, {
      onSuccess: () => {
        toast({ 
          title: "Order Executed", 
          description: `Successfully placed ${side} order for ${lots} lots of ${activeSymbol}.` 
        });
        setSl(''); setTp(''); setPrice('');
      },
      onError: (err: any) => {
        toast({ title: "Order Failed", description: err.message || "Failed to execute trade", variant: "destructive" });
      }
    });
  };

  const requiredMargin = activeSymbol.includes('BTC') ? (64000 * lots) / leverage : (100000 * lots) / leverage;
  const estimatedFee = lots * 7.00; // Mock $7 per lot round turn

  return (
    <div className="w-full h-full glass border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border bg-background/50">
        <h3 className="font-display font-semibold">New Order</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="grid grid-cols-2 gap-2 bg-background/50 p-1 rounded-lg border border-border">
          <button
            onClick={() => setSide('buy')}
            className={`py-2 rounded-md font-semibold text-sm transition-all ${
              side === 'buy' ? 'bg-success text-success-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`py-2 rounded-md font-semibold text-sm transition-all ${
              side === 'sell' ? 'bg-destructive text-destructive-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sell
          </button>
        </div>

        <Tabs value={type} onValueChange={(v) => setType(v as TradeInputType)}>
          <TabsList className="grid grid-cols-3 w-full bg-background border border-border">
            <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
            <TabsTrigger value="limit" className="text-xs">Limit</TabsTrigger>
            <TabsTrigger value="stop" className="text-xs">Stop</TabsTrigger>
          </TabsList>
        </Tabs>

        {type !== 'market' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Price</Label>
            <Input 
              type="number" 
              value={price} 
              onChange={e => setPrice(e.target.value)} 
              placeholder="0.0000"
              className="font-mono h-10"
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground">Volume (Lots)</Label>
            <span className="font-mono text-sm">{lots.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setLots(Math.max(0.01, lots - 0.1))}>-</Button>
            <Input 
              type="number" 
              value={lots} 
              onChange={e => setLots(Number(e.target.value))} 
              className="font-mono text-center h-10"
              step="0.01"
              min="0.01"
            />
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setLots(lots + 0.1)}>+</Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground">Leverage</Label>
            <span className="font-mono text-sm font-semibold text-primary">1:{leverage}</span>
          </div>
          <Slider 
            value={[leverage]} 
            min={1} 
            max={500} 
            step={1}
            onValueChange={([v]) => setLeverage(v)} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Stop Loss</Label>
            <Input 
              type="number" 
              value={sl} 
              onChange={e => setSl(e.target.value)} 
              placeholder="0.0000"
              className="font-mono h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Take Profit</Label>
            <Input 
              type="number" 
              value={tp} 
              onChange={e => setTp(e.target.value)} 
              placeholder="0.0000"
              className="font-mono h-10"
            />
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-border/50">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Required Margin:</span>
            <span className="font-mono font-medium">${requiredMargin.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Est. Fee:</span>
            <span className="font-mono font-medium text-muted-foreground">${estimatedFee.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border bg-background/50 mt-auto">
        <Button 
          className={`w-full h-12 text-md font-bold flex items-center justify-center gap-2 ${
            side === 'buy' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
          }`}
          onClick={handleExecute}
          disabled={executeTrade.isPending || !activeAccount}
        >
          {executeTrade.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : side === 'buy' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          {side === 'buy' ? 'Buy / Long' : 'Sell / Short'}
        </Button>
      </div>
    </div>
  );
}
