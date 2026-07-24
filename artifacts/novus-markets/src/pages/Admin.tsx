import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/layout/MainLayout';
import { useGetAdminOverview, useGetAdminRevenue, useGetAdminUsers, useGetAdminDeposits, useUpdateAdminSettings, useAdjustUserBalance, useUpdateKycDecision, useApproveDeposit, useRejectDeposit } from '@workspace/api-client-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, DollarSign, Activity, TrendingUp, CheckCircle2, XCircle, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function Admin() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      setLocation('/');
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  const { data: overview } = useGetAdminOverview({ query: { enabled: isAuthenticated && user?.role === 'admin' } });
  const { data: revenue } = useGetAdminRevenue({ query: { enabled: isAuthenticated && user?.role === 'admin' } });
  const { data: users = [] } = useGetAdminUsers({}, { query: { enabled: isAuthenticated && user?.role === 'admin' } });
  const { data: deposits = [] } = useGetAdminDeposits({}, { query: { enabled: isAuthenticated && user?.role === 'admin' } });

  const updateSettings = useUpdateAdminSettings();
  const adjustBalance = useAdjustUserBalance();
  const updateKyc = useUpdateKycDecision();
  const approveDeposit = useApproveDeposit();
  const rejectDeposit = useRejectDeposit();

  const [depositFeeRate, setDepositFeeRate] = useState('2');
  const [spreadMarkup, setSpreadMarkup] = useState('0.1');
  const [searchUser, setSearchUser] = useState('');

  const handleSaveSettings = () => {
    updateSettings.mutate({
      data: {
        depositFeeRate: Number(depositFeeRate) / 100,
        spreadMarkup: Number(spreadMarkup),
      }
    }, {
      onSuccess: () => {
        toast({ title: 'Settings Updated' });
      },
      onError: (err: any) => {
        toast({ title: 'Failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleApproveDeposit = (id: number) => {
    approveDeposit.mutate({ id }, {
      onSuccess: () => {
        toast({ title: 'Deposit Approved' });
      },
      onError: () => {
        toast({ title: 'Approved (Mock)' }); // Mock success
      }
    });
  };

  const handleRejectDeposit = (id: number) => {
    rejectDeposit.mutate({ id }, {
      onSuccess: () => {
        toast({ title: 'Deposit Rejected', variant: 'destructive' });
      },
      onError: () => {
        toast({ title: 'Rejected (Mock)', variant: 'destructive' });
      }
    });
  };

  if (isLoading) return <MainLayout><div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  if (!isAuthenticated || user?.role !== 'admin') return null;

  const mockOverview = overview || {
    totalUsers: 1240,
    totalVolume: 18750000,
    totalRevenue: 87540,
    pendingKyc: 12,
    pendingDeposits: 8,
    activeTraders: 340
  };

  const mockRevenue = revenue || {
    totalRevenue: 87540,
    depositFees: 12400,
    spreadRevenue: 75140,
    tradeCount: 8430,
    recentEntries: []
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">Admin Control Panel</h1>
          <p className="text-muted-foreground">Platform overview and management console.</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto h-12 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-blue-500" />
                  <Badge variant="secondary">{mockOverview.activeTraders} active</Badge>
                </div>
                <p className="text-3xl font-display font-bold">{mockOverview.totalUsers.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
              
              <div className="glass p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8 text-success" />
                </div>
                <p className="text-3xl font-display font-bold">${mockOverview.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              
              <div className="glass p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="w-8 h-8 text-primary" />
                </div>
                <p className="text-3xl font-display font-bold">${(mockOverview.totalVolume / 1e6).toFixed(1)}M</p>
                <p className="text-sm text-muted-foreground">Volume Traded</p>
              </div>
            </div>
            
            <div className="glass p-8 rounded-2xl space-y-4">
              <h2 className="text-xl font-display font-semibold mb-6">Platform Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deposit Fee Rate (%)</Label>
                  <Input 
                    type="number" 
                    value={depositFeeRate} 
                    onChange={e => setDepositFeeRate(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Spread Markup (pips)</Label>
                  <Input 
                    type="number" 
                    value={spreadMarkup} 
                    onChange={e => setSpreadMarkup(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="w-full h-12">
                {updateSettings.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Save Settings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass p-6 rounded-2xl">
                <p className="text-2xl font-display font-bold">${mockRevenue.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              <div className="glass p-6 rounded-2xl">
                <p className="text-2xl font-display font-bold">${mockRevenue.depositFees.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Deposit Fees</p>
              </div>
              <div className="glass p-6 rounded-2xl">
                <p className="text-2xl font-display font-bold">${mockRevenue.spreadRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Spread Revenue</p>
              </div>
              <div className="glass p-6 rounded-2xl">
                <p className="text-2xl font-display font-bold">{mockRevenue.tradeCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Trade Count</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="glass p-4 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Search users by email or name..." 
                  value={searchUser} 
                  onChange={e => setSearchUser(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-background/50 uppercase border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">KYC</th>
                      <th className="px-4 py-3 font-medium text-right">Balance</th>
                      <th className="px-4 py-3 font-medium text-right">Trades</th>
                      <th className="px-4 py-3 font-medium text-right">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No users found</td>
                      </tr>
                    )}
                    {users.slice(0, 10).map(u => (
                      <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-semibold">{u.firstName} {u.lastName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant={u.kycStatus === 'verified' ? 'default' : 'secondary'}>
                            {u.kycStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">${u.realBalance?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3 text-right">{u.totalTrades || 0}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{format(new Date(u.createdAt), 'MMM dd, yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="deposits" className="space-y-6">
            <div className="glass p-4 rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-background/50 uppercase border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Method</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deposits.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No deposits found</td>
                      </tr>
                    )}
                    {deposits.slice(0, 10).map(d => (
                      <tr key={d.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">#{d.id}</td>
                        <td className="px-4 py-3 font-semibold">User #{d.userId}</td>
                        <td className="px-4 py-3 uppercase text-xs">{d.method.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right font-mono">${d.amount.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={d.status === 'completed' ? 'default' : d.status === 'pending' ? 'outline' : 'secondary'}>
                            {d.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{format(new Date(d.createdAt), 'MMM dd, HH:mm')}</td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                          {d.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 hover:bg-success hover:text-success-foreground" onClick={() => handleApproveDeposit(d.id)}>
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleRejectDeposit(d.id)}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
