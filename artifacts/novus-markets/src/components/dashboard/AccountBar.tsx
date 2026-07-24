import React from 'react';
import { useDashboard } from './DashboardContext';
import { useGetAccountSummary } from '@workspace/api-client-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function AccountBar() {
  const { accountType, setAccountType, activeAccount } = useDashboard();
  
  const { data: summary } = useGetAccountSummary(
    { accountId: activeAccount?.id || 0 },
    { query: { enabled: !!activeAccount?.id, refetchInterval: 5000 } }
  );

  // Mock data fallback if API is not ready
  const data = summary || {
    balance: 10000.00,
    equity: 10150.50,
    margin: 500.00,
    freeMargin: 9650.50,
    marginLevel: 2030.1,
    openPnl: 150.50
  };

  const isDemo = accountType === 'demo';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: activeAccount?.currency || 'USD' }).format(val);

  return (
    <div className="w-full glass border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-6 overflow-x-auto pb-1 md:pb-0">
        <MetricItem label="Balance" value={formatCurrency(data.balance)} />
        <MetricItem label="Equity" value={formatCurrency(data.equity)} />
        <MetricItem label="Margin" value={formatCurrency(data.margin)} />
        <MetricItem label="Free Margin" value={formatCurrency(data.freeMargin)} />
        <MetricItem label="Margin Level" value={`${data.marginLevel.toFixed(2)}%`} />
        <MetricItem 
          label="Open P&L" 
          value={(data.openPnl > 0 ? '+' : '') + formatCurrency(data.openPnl)} 
          valueClass={data.openPnl >= 0 ? 'text-success' : 'text-destructive'} 
        />
      </div>
      
      <div className="flex items-center gap-3 border-l border-border pl-4">
        <Label htmlFor="account-mode" className={`text-xs font-semibold ${!isDemo ? 'text-primary' : 'text-muted-foreground'}`}>Real</Label>
        <Switch 
          id="account-mode" 
          checked={isDemo} 
          onCheckedChange={(c) => setAccountType(c ? 'demo' : 'real')} 
        />
        <Label htmlFor="account-mode" className={`text-xs font-semibold ${isDemo ? 'text-blue-500' : 'text-muted-foreground'}`}>Demo</Label>
      </div>
    </div>
  );
}

function MetricItem({ label, value, valueClass = 'text-foreground' }: { label: string, value: string, valueClass?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <span className={`font-mono font-medium text-sm ${valueClass}`}>{value}</span>
    </div>
  );
}
