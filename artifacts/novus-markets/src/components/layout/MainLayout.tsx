import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileDock } from './MobileDock';
import { TickerTape } from '../TickerTape';

export function MainLayout({ children, showTicker = true }: { children: React.ReactNode, showTicker?: boolean }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {showTicker && <TickerTape />}
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
      <MobileDock />
    </div>
  );
}
