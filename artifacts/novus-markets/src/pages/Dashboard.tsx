import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardProvider } from '@/components/dashboard/DashboardContext';
import { AccountBar } from '@/components/dashboard/AccountBar';
import { TradingChart } from '@/components/dashboard/TradingChart';
import { OrderPanel } from '@/components/dashboard/OrderPanel';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <DashboardProvider>
        <div className="flex-1 p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto lg:overflow-hidden h-full">
          
          {/* Top Bar */}
          <div className="col-span-1 lg:col-span-12 shrink-0">
            <AccountBar />
          </div>
          
          {/* Main Chart Area */}
          <div className="col-span-1 lg:col-span-9 flex flex-col min-h-[400px] lg:min-h-0">
            <TradingChart />
          </div>
          
          {/* Right Order Panel */}
          <div className="col-span-1 lg:col-span-3 flex flex-col min-h-[500px] lg:min-h-0">
            <OrderPanel />
          </div>
          
          {/* Bottom Positions Table */}
          <div className="col-span-1 lg:col-span-12 flex flex-col min-h-[300px] lg:h-[30vh]">
            <PositionsTable />
          </div>

        </div>
      </DashboardProvider>
    </DashboardLayout>
  );
}
