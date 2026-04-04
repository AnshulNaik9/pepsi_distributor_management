import { useRoutes } from "@/hooks/use-logistics";
import { Card } from "@/components/ui/card";
import { MapPin, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function SelectRoutePage() {
  const { data: routes = [], isLoading } = useRoutes();
  const [, setLocation] = useLocation();

  const truckId = localStorage.getItem('driver_truck_id');

  useEffect(() => {
    if (!truckId) setLocation("/driver/select");
  }, [truckId]);

  const handleSelect = (routeId: number) => {
    localStorage.setItem('driver_route_id', routeId.toString());
    setLocation("/driver/billing");
  };

  return (
    <div className="flex flex-col h-[80vh] items-center justify-center animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto px-4">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <MapPin className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-display font-bold mb-2 text-center">Select Route</h1>
      <p className="text-muted-foreground text-center mb-8">Which route are you heading towards today?</p>

      <div className="w-full space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Card key={i} className="h-20 animate-pulse bg-muted/50 rounded-2xl border-none" />)}
          </div>
        ) : (
          routes.map(route => (
            <Card 
              key={route.id} 
              onClick={() => handleSelect(route.id)}
              className="p-5 flex items-center justify-between border border-border/50 hover:border-primary shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 active:scale-[0.98] rounded-2xl bg-white group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{route.name}</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Distribution Route</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
