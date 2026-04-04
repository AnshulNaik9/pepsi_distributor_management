import { useState } from "react";
import { useCustomers, useCreateCustomer, useRoutes } from "@/hooks/use-logistics";
import { usePayCredit, useUpdateCustomer } from "@/hooks/use-sales";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Phone, MapPin, Search, Filter, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function EditCustomerForm({ customer, routes, onSuccess }: any) {
  const { mutate: updateCustomer, isPending } = useUpdateCustomer();
  const [formData, setFormData] = useState({
    name: customer.name,
    phone: customer.phone === "0000000000" ? "" : customer.phone,
    address: customer.address.toLowerCase().includes("walk-in") ? "" : customer.address,
    routeId: customer.routeId.toString(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomer({ id: customer.id, data: { ...formData, routeId: parseInt(formData.routeId) } }, {
      onSuccess
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold">Store / Customer Name</label>
        <Input 
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          required
          placeholder="e.g. Sterling Resort"
          className="rounded-xl border-border/50 focus-visible:ring-primary/20"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">Phone Number</label>
        <Input 
          value={formData.phone}
          onChange={e => setFormData({...formData, phone: e.target.value})}
          required
          placeholder="e.g. 9900047443"
          className="rounded-xl border-border/50 focus-visible:ring-primary/20"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">Address</label>
        <Input 
          value={formData.address}
          onChange={e => setFormData({...formData, address: e.target.value})}
          required
          placeholder="e.g. NH 66 Sadashivgad"
          className="rounded-xl border-border/50 focus-visible:ring-primary/20"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">Assigned Route</label>
        <Select value={formData.routeId} onValueChange={v => setFormData({...formData, routeId: v})}>
          <SelectTrigger className="rounded-xl border-border/50 focus:ring-primary/20">
            <SelectValue placeholder="Select a route" />
          </SelectTrigger>
          <SelectContent className="rounded-xl overflow-hidden shadow-xl border-border/40">
            {routes.map((route: any) => (
              <SelectItem key={route.id} value={route.id.toString()}>
                {route.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending} className="w-full rounded-xl mt-2 h-12 text-base shadow-lg">
        {isPending ? "Saving..." : "Save Details"}
      </Button>
    </form>
  );
}

export default function CustomersPage() {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: routes = [], isLoading: routesLoading } = useRoutes();
  const { mutate: createCustomer, isPending } = useCreateCustomer();
  const { mutate: payCredit, isPending: isPaying } = usePayCredit();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [routeFilter, setRouteFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  const [formData, setFormData] = useState({ 
    name: "", 
    phone: "", 
    address: "", 
    routeId: "" 
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomer({ 
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      routeId: parseInt(formData.routeId),
      creditBalance: 0
    }, {
      onSuccess: () => {
        toast({ title: "Customer added successfully" });
        setOpen(false);
        setFormData({ name: "", phone: "", address: "", routeId: "" });
      }
    });
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                         c.address.toLowerCase().includes(search.toLowerCase());
    const matchesRoute = routeFilter === "all" || c.routeId === parseInt(routeFilter);
    return matchesSearch && matchesRoute;
  });

  const getRouteName = (routeId: number) => {
    return routes.find(r => r.id === routeId)?.name || "Unknown Route";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your distribution network and client details.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all">
              <Plus className="w-5 h-5 mr-2" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-display">Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Full Name / Outlet Name</label>
                <Input 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="e.g. Sterling Resort"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Phone Number</label>
                <Input 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="e.g. 9900047443"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Address</label>
                <Input 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  required
                  placeholder="e.g. NH 66 Sadashivgad"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Assigned Route</label>
                <Select value={formData.routeId} onValueChange={v => setFormData({...formData, routeId: v})}>
                  <SelectTrigger className="rounded-xl border-border/50 focus:ring-primary/20">
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl overflow-hidden shadow-xl border-border/40">
                    {routes.map(route => (
                      <SelectItem key={route.id} value={route.id.toString()}>
                        {route.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isPending} className="w-full rounded-xl mt-2 h-12 text-base">
                {isPending ? "Adding..." : "Add Customer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search by name or address..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-background border-border/40 shadow-sm focus-visible:ring-primary/20"
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger className="rounded-xl border-border/40 shadow-sm bg-background">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="All Routes" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl overflow-hidden shadow-xl border-border/20">
              <SelectItem value="all">All Routes</SelectItem>
              {routes.map(r => (
                <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {customersLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Card key={i} className="h-40 animate-pulse bg-muted/50 rounded-2xl border-none shadow-sm" />)}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-muted/50 w-full sm:w-auto p-1.5 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg px-6">All Customers</TabsTrigger>
            <TabsTrigger value="credit" className="rounded-lg px-4 sm:px-6 flex items-center gap-2">
              Credit Accounts 
              {filteredCustomers.filter(c => c.creditBalance && c.creditBalance > 0).length > 0 && (
                <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold leading-none">
                  {filteredCustomers.filter(c => c.creditBalance && c.creditBalance > 0).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="new" className="rounded-lg px-4 sm:px-6 flex items-center gap-2">
              New Customers
              {filteredCustomers.filter(c => c.phone === "0000000000" || c.address.toLowerCase().includes("walk-in")).length > 0 && (
                <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-xs font-bold leading-none animate-pulse">
                  {filteredCustomers.filter(c => c.phone === "0000000000" || c.address.toLowerCase().includes("walk-in")).length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => (
                  <Card key={customer.id} className="group overflow-hidden border border-border/40 shadow-sm hover:shadow-lg transition-all hover:border-primary/20 rounded-2xl flex flex-col">
                    <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="bg-secondary/50 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">
                      {getRouteName(customer.routeId)}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                      {customer.name}
                    </h3>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/20">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{customer.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{customer.address}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-muted/20 rounded-3xl border border-dashed border-border/60">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-display font-semibold text-muted-foreground">No customers found</h3>
              <p className="text-muted-foreground mt-1 max-w-xs mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          )}
            </div>
          </TabsContent>

          <TabsContent value="credit" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.filter(c => c.creditBalance && c.creditBalance > 0).length > 0 ? (
                filteredCustomers.filter(c => c.creditBalance && c.creditBalance > 0).map(customer => (
                  <Card key={customer.id} className="group overflow-hidden border border-red-200 shadow-sm hover:shadow-lg transition-all rounded-2xl flex flex-col bg-red-50/10">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 transition-all duration-300">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-red-800/60">Unpaid Balance</div>
                          <div className="text-xl font-black text-red-600">₹{customer.creditBalance}</div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-lg text-foreground truncate leading-tight">
                          {customer.name}
                        </h3>
                        <div className="bg-secondary/50 px-2 py-0.5 mt-1 inline-block rounded-md text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {getRouteName(customer.routeId)}
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-border/20">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{customer.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">{customer.address}</span>
                        </div>
                        <Button 
                          onClick={() => payCredit(customer.id)}
                          disabled={isPaying}
                          className="w-full mt-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-emerald-50/50 rounded-3xl border border-dashed border-emerald-200/50">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                  <h3 className="text-xl font-display font-bold text-emerald-800">All Settled!</h3>
                  <p className="text-emerald-600/80 mt-1 max-w-sm mx-auto">There are no customers with outstanding credit balances matching your filters.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="new" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.filter(c => c.phone === "0000000000" || c.address.toLowerCase().includes("walk-in")).length > 0 ? (
                filteredCustomers.filter(c => c.phone === "0000000000" || c.address.toLowerCase().includes("walk-in")).map(customer => (
                  <Card key={customer.id} className="group overflow-hidden border border-amber-200 shadow-sm hover:shadow-lg transition-all rounded-2xl flex flex-col bg-amber-50/20">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 transition-all duration-300">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="bg-amber-100 text-amber-800 px-2 py-1 flex items-center rounded-md text-[10px] font-bold uppercase tracking-wider">
                          Temporary Profile
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-lg text-foreground truncate leading-tight">
                          {customer.name}
                        </h3>
                        <div className="bg-secondary/50 px-2 py-0.5 mt-1 inline-block rounded-md text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {getRouteName(customer.routeId)}
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-border/20">
                        <div className="flex items-center gap-2 text-sm text-amber-600/70 italic">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Need real phone number</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-amber-600/70 italic">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">Need real address details</span>
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="w-full mt-2 h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all">
                              <Plus className="w-4 h-4 mr-2" /> Add Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md rounded-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-display">Finalize Shop Details</DialogTitle>
                            </DialogHeader>
                            <EditCustomerForm 
                              customer={customer} 
                              routes={routes} 
                              onSuccess={() => toast({ title: "Shop details successfully saved!" })} 
                            />
                          </DialogContent>
                        </Dialog>

                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-muted/20 rounded-3xl border border-dashed border-border/60">
                  <CheckCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-xl font-display font-semibold text-muted-foreground">Up to date</h3>
                  <p className="text-muted-foreground mt-1 max-w-sm mx-auto">There are no pending walk-in customers requiring permanent details.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
