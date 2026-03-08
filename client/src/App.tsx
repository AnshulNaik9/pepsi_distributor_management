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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Admin Routes */}
      <Route path="/admin/products">
        {() => <AdminLayout><AdminProducts /></AdminLayout>}
      </Route>
      <Route path="/admin/stock">
        {() => <AdminLayout><AdminStock /></AdminLayout>}
      </Route>
      <Route path="/admin/trucks">
        {() => <AdminLayout><AdminTrucks /></AdminLayout>}
      </Route>
      <Route path="/admin">
        {() => <AdminLayout><AdminDashboard /></AdminLayout>}
      </Route>
      
      {/* Driver Routes */}
      <Route path="/driver/select" component={DriverSelect} />
      <Route path="/driver/billing">
        {() => <DriverLayout><DriverBilling /></DriverLayout>}
      </Route>
      <Route path="/driver/stock">
        {() => <DriverLayout><DriverInventory /></DriverLayout>}
      </Route>
      <Route path="/driver/expenses">
        {() => <DriverLayout><DriverExpenses /></DriverLayout>}
      </Route>
      <Route path="/driver">
        {() => <DriverLayout><DriverBilling /></DriverLayout>}
      </Route>
      
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
