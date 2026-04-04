import { useState } from "react";
import { useRoutes, useCreateRoute } from "@/hooks/use-logistics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Map as MapIcon, Plus, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RoutesPage() {
  const { data: routes = [], isLoading } = useRoutes();
  const { mutate: createRoute, isPending } = useCreateRoute();
  const [open, setOpen] = useState(false);
  const [routeName, setRouteName] = useState("");
  const { toast } = useToast();

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map(route => (
            <Card key={route.id} className="group overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all hover:border-primary/20 rounded-2xl">
              <CardContent className="p-0">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      <MapIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{route.name}</h3>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Distribution Route</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
