import { useState } from "react";
import { useRoutes, useCreateRoute, useDeleteRoute, useCustomers } from "@/hooks/use-logistics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Map as MapIcon, Plus, ChevronRight, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function RoutesPage() {
  const [, setLocation] = useLocation();
  const { data: routes = [], isLoading } = useRoutes();
  const { data: allCustomers = [] } = useCustomers();
  const { mutate: createRoute, isPending } = useCreateRoute();
  const { mutate: deleteRoute, isPending: isDeleting } = useDeleteRoute();
  const [open, setOpen] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const { toast } = useToast();

  const getShopsForRoute = (routeId: number) => {
    return allCustomers.filter(c => c.routeId === routeId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRoute({ name: routeName }, {
      onSuccess: () => {
        toast({ title: "Route created successfully" });
        setOpen(false);
        setRouteName("");
      }
    });
  };

  const handleDelete = (id: number, name: string) => {
    deleteRoute(id, {
      onSuccess: () => {
        toast({ title: `Route "${name}" deleted successfully` });
      },
      onError: (err: any) => {
        toast({ 
          title: "Cannot delete route", 
          description: err?.message || "Failed to delete route",
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Routes</h1>
          <p className="text-muted-foreground mt-1 text-sm">Organize customers into distribution routes.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-display">New Route</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Route Name</label>
                <Input 
                  value={routeName}
                  onChange={e => setRouteName(e.target.value)}
                  required
                  placeholder="e.g. SADASHIVAGAD North"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full rounded-xl mt-2 h-12 text-base">
                {isPending ? "Creating..." : "Create Route"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i} className="h-32 animate-pulse bg-muted/50 rounded-2xl shadow-sm border-none" />)}
        </div>
      ) : routes.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map(route => {
              const routeShops = getShopsForRoute(route.id);
              const isActive = selectedRoute === route.id;
              
              return (
                <Card 
                  key={route.id} 
                  onClick={() => setSelectedRoute(isActive ? null : route.id)}
                  className={`group cursor-pointer overflow-hidden border transition-all duration-300 rounded-2xl shadow-sm hover:shadow-lg ${
                    isActive ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border/40 hover:border-primary/20"
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                          isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                        }`}>
                          <MapIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{route.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                              isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                            }`}>
                              {routeShops.length} {routeShops.length === 1 ? "SHOP" : "SHOPS"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                              onClick={(e) => e.stopPropagation()}
                              disabled={isDeleting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Route?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{route.name}</strong>? 
                                This will fail if the route has active customers assigned to it.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(route.id, route.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${
                          isActive ? "rotate-90 text-primary" : "text-muted-foreground group-hover:translate-x-1"
                        }`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedRoute && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <Card className="rounded-2xl border-border/50 shadow-xl shadow-primary/5 overflow-hidden">
                <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <MapIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {routes.find(r => r.id === selectedRoute)?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Members registered in this distribution path
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRoute(null)} className="rounded-xl">
                    Close Details
                  </Button>
                </div>
                <div className="p-0">
                  {getShopsForRoute(selectedRoute).length > 0 ? (
                    <div className="overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/30 border-b border-border/20">
                            <th className="text-left py-4 px-6 text-xs uppercase tracking-widest font-bold text-muted-foreground">Customer / Shop Name</th>
                            <th className="text-left py-4 px-6 text-xs uppercase tracking-widest font-bold text-muted-foreground">Contact</th>
                            <th className="text-left py-4 px-6 text-xs uppercase tracking-widest font-bold text-muted-foreground">Address</th>
                            <th className="text-right py-4 px-6 text-xs uppercase tracking-widest font-bold text-muted-foreground">Credit Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getShopsForRoute(selectedRoute).map((shop, idx) => (
                            <tr key={shop.id} className={`border-b border-border/10 hover:bg-primary/5 transition-colors ${idx % 2 ? 'bg-muted/5' : ''}`}>
                              <td className="py-4 px-6 font-bold text-foreground">{shop.name}</td>
                              <td className="py-4 px-6 text-muted-foreground text-sm">{shop.phone}</td>
                              <td className="py-4 px-6 text-muted-foreground text-sm truncate max-w-xs">{shop.address}</td>
                              <td className="py-4 px-6 text-right">
                                <span className={`font-mono font-bold ${shop.creditBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                  ₹{shop.creditBalance.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-20 text-center flex flex-col items-center justify-center bg-muted/5">
                      <p className="text-muted-foreground font-medium">No customers found in this route.</p>
                      <Button variant="ghost" className="mt-2 text-primary" onClick={() => setLocation("/admin/customers")}>
                        Go to Customers to add one
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-muted/20 border-2 border-dashed border-border/60 rounded-3xl">
          <MapIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-bold text-muted-foreground">No distribution routes yet</h3>
          <p className="text-muted-foreground px-4 text-center mt-1">Start by adding your first route to organize your customer network.</p>
        </div>
      )}
    </div>
  );
}
