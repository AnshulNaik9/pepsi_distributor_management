import { useTrucks } from "@/hooks/use-logistics";
import { Card } from "@/components/ui/card";
import { Truck, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function SelectTruckPage() {
  const { data: trucks = [], isLoading } = useTrucks();

  const [, setLocation] = useLocation();

  const handleSelect = (truckId: number) => {
    // Store selected truck in localStorage for simplicity in this demo
    localStorage.setItem('driver_truck_id', truckId.toString());
    setLocation("/driver/billing");
  };

  return (
    <div className="flex flex-col h-[80vh] items-center justify-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Truck className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-display font-bold mb-2 text-center">Select Your Vehicle</h1>
      <p className="text-muted-foreground text-center mb-8 max-w-xs">Which truck are you operating today?</p>

      <div className="w-full space-y-3 px-2">
        {isLoading ? (
          <p className="text-center text-muted-foreground">Loading vehicles...</p>
        ) : (
          trucks.map(truck => (
            <Card 
              key={truck.id} 
              onClick={() => handleSelect(truck.id)}
              className="p-5 flex items-center justify-between border border-border/50 hover:border-primary shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 active:scale-[0.98] rounded-2xl bg-white"
            >
              <div>
                <h3 className="font-bold text-xl">{truck.vehicleNumber}</h3>
                <p className="text-sm text-muted-foreground mt-1">{truck.driverName}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <ArrowRight className="w-5 h-5" />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
