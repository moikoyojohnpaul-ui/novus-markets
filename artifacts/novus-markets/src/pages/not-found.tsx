import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background text-foreground relative overflow-hidden">
      <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-destructive/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="text-center glass p-12 rounded-3xl border-white/5 relative z-10">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
        <h1 className="text-4xl font-display font-bold tracking-tight mb-2">404</h1>
        <p className="text-xl text-muted-foreground mb-8">Page Not Found</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8">
          The market data you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Button asChild size="lg">
          <Link href="/">Return to Terminal</Link>
        </Button>
      </div>
    </div>
  );
}
