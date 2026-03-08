import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DriverLayout } from "@/components/layout/driver-layout";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminStock from "@/pages/admin/stock";
import AdminTrucks from "@/pages/admin/trucks";

import DriverSelect from "@/pages/driver/select-truck";
import DriverBilling from "@/pages/driver/billing";
import DriverInventory from "@/pages/driver/inventory";
import DriverExpenses from "@/pages/driver/expenses";

function AdminRouter() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/stock" component={AdminStock} />
        <Route path="/admin/trucks" component={AdminTrucks} />
        <Route path="/admin/*" component={() => <div className="p-8 text-center text-muted-foreground text-xl font-bold">Coming Soon (Customers, Offers, Orders)</div>} />
      </Switch>
    </AdminLayout>
  );
}

function DriverRouter() {
  return (
    <DriverLayout>
      <Switch>
        <Route path="/driver/billing" component={DriverBilling} />
        <Route path="/driver/stock" component={DriverInventory} />
        <Route path="/driver/expenses" component={DriverExpenses} />
        <Route path="/driver/*" component={DriverBilling} />
      </Switch>
    </DriverLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/driver/select" component={DriverSelect} />
      <Route path="/admin*" component={AdminRouter} />
      <Route path="/driver*" component={DriverRouter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
