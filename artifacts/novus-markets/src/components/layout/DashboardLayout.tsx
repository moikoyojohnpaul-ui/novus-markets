import React from 'react';
import { Navbar } from './Navbar';
import { MobileDock } from './MobileDock';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      <Navbar />
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
      <MobileDock />
    </div>
  );
}
