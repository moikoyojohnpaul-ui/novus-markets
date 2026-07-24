import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/layout/MainLayout';
import { useGetAccounts, useCreateDeposit, useCreateWithdrawal, useGetDepositFeePreview, DepositInputMethod, WithdrawalInputMethod } from '@workspace/api-client-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, QrCode, CreditCard, Smartphone, Building2, Bitcoin, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Deposit() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const { data: accounts } = useGetAccounts({ query: { enabled: isAuthenticated } });
  const realAccount = accounts?.find(a => a.type === 'real');

  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [method, setMethod] = useState<DepositInputMethod | WithdrawalInputMethod>('mpesa');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [walletAddr, setWalletAddr] = useState('');

  const { data: feePreview } = useGetDepositFeePreview(
    { amount: Number(amount) || 0 },
    { query: { enabled: !!amount && Number(amount) > 0 } }
  );

  const createDeposit = useCreateDeposit();
  const createWithdrawal = useCreateWithdrawal();

  const handleSubmit = () => {
    if (!realAccount) {
      toast({ title: 'No account', description: 'No real account found', variant: 'destructive' });
      return;
    }
    
    const data = {
      accountId: realAccount.id,
      amount: Number(amount),
      method,
      phoneNumber: method === 'mpesa' ? phone : undefined,
      walletAddress: (method === 'crypto_usdt' || method === 'crypto_btc') ? walletAddr : undefined
    };

    if (txType === 'deposit') {
      createDeposit.mutate({ data }, {
        onSuccess: () => {
          toast({ title: 'Deposit Initiated', description: 'Your deposit has been submitted for processing.' });
          setAmount(''); setPhone(''); setWalletAddr('');
        },
        onError: (err: any) => {
          toast({ title: 'Failed', description: err.message, variant: 'destructive' });
        }
      });
    } else {
      createWithdrawal.mutate({ data }, {
        onSuccess: () => {
          toast({ title: 'Withdrawal Requested', description: 'Your withdrawal will be processed soon.' });
          setAmount(''); setPhone(''); setWalletAddr('');
        },
        onError: (err: any) => {
          toast({ title: 'Failed', description: err.message, variant: 'destructive' });
        }
      });
    }
  };

  const isPending = createDeposit.isPending || createWithdrawal.isPending;

  if (isLoading) return <MainLayout><div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  if (!isAuthenticated) return null;

  const depositMethods = [
    { value: 'mpesa', label: 'M-Pesa', icon: <Smartphone className="w-5 h-5" /> },
    { value: 'crypto_usdt', label: 'USDT TRC20', icon: <Bitcoin className="w-5 h-5" /> },
    { value: 'crypto_btc', label: 'Bitcoin', icon: <Bitcoin className="w-5 h-5" /> },
    { value: 'card', label: 'Card', icon: <CreditCard className="w-5 h-5" /> },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: <Building2 className="w-5 h-5" /> },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">Wallet & Transfers</h1>
          <p className="text-muted-foreground">Fund your account or withdraw profits.</p>
        </div>

        <Tabs value={txType} onValueChange={(v) => setTxType(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto h-12 mb-8">
            <TabsTrigger value="deposit" className="text-md">Deposit</TabsTrigger>
            <TabsTrigger value="withdrawal" className="text-md">Withdraw</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-6">
            <div className="glass p-8 rounded-2xl">
              <Label className="text-sm font-semibold mb-4 block">Choose Payment Method</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {depositMethods.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value as DepositInputMethod)}
                    className={`p-4 rounded-lg border transition-all flex flex-col items-center justify-center gap-2 ${
                      method === m.value 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {m.icon}
                    <span className="text-xs font-medium">{m.label}</span>
                  </button>
                ))}
              </div>

              {method === 'mpesa' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input 
                      placeholder="254712345678" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)}
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">Enter your M-Pesa number for STK push.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (KES)</Label>
                    <Input 
                      type="number" 
                      placeholder="1000" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              )}

              {(method === 'crypto_usdt' || method === 'crypto_btc') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platform Wallet Address</Label>
                    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border font-mono text-sm">
                      <span className="flex-1 truncate">
                        {method === 'crypto_usdt' ? 'TXyz123...abcDEF' : '1A1zP1eP...3v3sL2z'}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="shrink-0 h-8 w-8"
                        onClick={() => {
                          navigator.clipboard.writeText(method === 'crypto_usdt' ? 'TXyz123abcDEF' : '1A1zP1eP3v3sL2z');
                          toast({ title: 'Copied to clipboard' });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Send {method === 'crypto_usdt' ? 'USDT (TRC20 Network Only)' : 'Bitcoin'} to this address. Once confirmed, funds will credit your account.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (USD)</Label>
                    <Input 
                      type="number" 
                      placeholder="100" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              )}

              {(method === 'card' || method === 'bank_transfer') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Amount (USD)</Label>
                    <Input 
                      type="number" 
                      placeholder="100" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {method === 'card' ? 'You will be redirected to a secure payment processor.' : 'Bank transfer details will be provided upon submission.'}
                  </p>
                </div>
              )}

              {feePreview && (
                <div className="mt-6 p-4 bg-background/50 border border-border rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit Amount:</span>
                    <span className="font-mono">${feePreview.depositAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Processing Fee ({(feePreview.feeRate * 100).toFixed(1)}%):</span>
                    <span className="font-mono">-${feePreview.feeAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold">
                    <span>Net Credited:</span>
                    <span className="font-mono text-success">${feePreview.netAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <Button 
                className="w-full h-12 mt-6 text-md" 
                onClick={handleSubmit}
                disabled={!amount || isPending}
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Submit Deposit
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="withdrawal" className="space-y-6">
            <div className="glass p-8 rounded-2xl">
              <Label className="text-sm font-semibold mb-4 block">Withdrawal Method</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {depositMethods.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value as WithdrawalInputMethod)}
                    className={`p-4 rounded-lg border transition-all flex flex-col items-center justify-center gap-2 ${
                      method === m.value 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {m.icon}
                    <span className="text-xs font-medium">{m.label}</span>
                  </button>
                ))}
              </div>

              {method === 'mpesa' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input 
                      placeholder="254712345678" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (KES)</Label>
                    <Input 
                      type="number" 
                      placeholder="1000" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              )}

              {(method === 'crypto_usdt' || method === 'crypto_btc') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Your Wallet Address</Label>
                    <Input 
                      placeholder={method === 'crypto_usdt' ? 'TXyz...' : '1A1zP...'} 
                      value={walletAddr} 
                      onChange={e => setWalletAddr(e.target.value)}
                      className="h-12 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (USD)</Label>
                    <Input 
                      type="number" 
                      placeholder="100" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              )}

              <Button 
                className="w-full h-12 mt-6 text-md" 
                onClick={handleSubmit}
                disabled={!amount || isPending}
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Request Withdrawal
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
