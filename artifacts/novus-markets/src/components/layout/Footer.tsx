import React from 'react';
import { Link } from 'wouter';

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer mb-4 inline-flex">
              <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-lg">
                N
              </div>
              <span className="font-display font-bold text-xl tracking-tight">Novus Markets</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm">
              Institutional-grade trading platform engineered for speed, reliability, and precision. Trade Forex, Crypto, Indices, and Commodities with tight spreads.
            </p>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Web Terminal</Link></li>
              <li><Link href="/markets" className="hover:text-primary transition-colors">Live Markets</Link></li>
              <li><Link href="/fees" className="hover:text-primary transition-colors">Spreads & Fees</Link></li>
              <li><Link href="/api-docs" className="hover:text-primary transition-colors">API Documentation</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
              <li><Link href="/legal" className="hover:text-primary transition-colors">Legal & Privacy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 text-xs text-muted-foreground space-y-4">
          <p>
            <strong>Risk Warning:</strong> Trading foreign exchange on margin carries a high level of risk, and may not be suitable for all investors. Past performance is not indicative of future results. The high degree of leverage can work against you as well as for you. Before deciding to invest in foreign exchange you should carefully consider your investment objectives, level of experience, and risk appetite.
          </p>
          <p>
            Novus Markets is a technology provider and does not offer financial advice. All trading involves risk. Only risk capital you are prepared to lose.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-between pt-4">
            <p>&copy; {new Date().getFullYear()} Novus Markets LLC. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/aml" className="hover:text-foreground transition-colors">AML Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
