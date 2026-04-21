import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { IndianRupee, Package, Banknote, LogOut, Navigation, ChevronLeft, History } from "lucide-react";
import { logout } from "@/lib/auth";

export function DriverLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();

  const navItems = [
    { label: "Billing", url: "/driver/billing", icon: IndianRupee },
    { label: "Inventory", url: "/driver/stock", icon: Package },
    { label: "Expenses", url: "/driver/expenses", icon: Banknote },
    { label: "History", url: "/driver/history", icon: History },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col mx-auto max-w-md shadow-2xl relative">
      {/* Driver Header */}
      <header className="bg-primary px-4 py-3 rounded-b-2xl shadow-lg shadow-primary/20 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-foreground">
            <Navigation className="w-5 h-5" />
            <h1 className="font-display font-bold text-base">Delivery Mode</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Change Vehicle Button */}
            <Link href="/driver/select">
              <button className="flex items-center gap-1 text-xs font-bold text-white/80 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
                Change Vehicle
              </button>
            </Link>
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-24 px-4 pt-4 mobile-safe-bottom">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md bg-background border-t border-border/50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-20 pb-safe">
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const isActive = location === item.url;
            return (
              <Link key={item.url} href={item.url} className="flex-1 flex flex-col items-center gap-1 group">
                <div className={`
                  p-2.5 rounded-xl transition-all duration-300
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 translate-y-[-4px]' 
                    : 'text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                  }
                `}>
                  <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
