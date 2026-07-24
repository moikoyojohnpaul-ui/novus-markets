import React from 'react';
import { Link } from 'wouter';
import { Activity, LayoutDashboard, Settings, Wallet } from 'lucide-react';
import { useLocation } from 'wouter';

export function MobileDock() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { icon: Activity, label: 'Markets', href: '/markets' },
    { icon: LayoutDashboard, label: 'Trade', href: '/dashboard' },
    { icon: Wallet, label: 'Wallet', href: '/deposit' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => setLocation(item.href)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
