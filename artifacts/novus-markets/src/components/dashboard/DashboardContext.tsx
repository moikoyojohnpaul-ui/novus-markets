import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, useGetAccounts } from '@workspace/api-client-react';

interface DashboardState {
  activeSymbol: string;
  setActiveSymbol: (s: string) => void;
  activeTimeframe: string;
  setActiveTimeframe: (t: string) => void;
  accountType: 'real' | 'demo';
  setAccountType: (t: 'real' | 'demo') => void;
  activeAccount: Account | null;
}

const DashboardContext = createContext<DashboardState | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeSymbol, setActiveSymbol] = useState('EUR/USD');
  const [activeTimeframe, setActiveTimeframe] = useState('1m');
  const [accountType, setAccountType] = useState<'real' | 'demo'>('real');
  
  const { data: accounts } = useGetAccounts();
  const activeAccount = accounts?.find(a => a.type === accountType) || null;

  return (
    <DashboardContext.Provider value={{
      activeSymbol, setActiveSymbol,
      activeTimeframe, setActiveTimeframe,
      accountType, setAccountType,
      activeAccount
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be within DashboardProvider");
  return ctx;
}
