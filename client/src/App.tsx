import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { getRole } from "@/lib/auth";

import Home from "@/pages/home";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DriverLayout } from "@/components/layout/driver-layout";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminStock from "@/pages/admin/stock";
import AdminTrucks from "@/pages/admin/trucks";
import AdminCustomers from "@/pages/admin/customers";
import AdminRoutes from "@/pages/admin/routes";
import AdminOffers from "@/pages/admin/offers";
import AdminOrders from "@/pages/admin/orders";
import AdminProfitPulse from "@/pages/admin/profit-pulse";
import AdminTopPerformers from "@/pages/admin/top-performers";

import DriverSelect from "@/pages/driver/select-truck";
import DriverSelectRoute from "@/pages/driver/select-route";
import DriverBilling from "@/pages/driver/billing";
import DriverInventory from "@/pages/driver/inventory";
import DriverExpenses from "@/pages/driver/expenses";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const role = getRole();
  useEffect(() => {
    if (role !== "admin") setLocation("/");
  }, [role]);
  if (role !== "admin") return null;
  return <>{children}</>;
}

function DriverGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const role = getRole();
  useEffect(() => {
    if (!role) setLocation("/");
  }, [role]);
  if (!role) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Admin Routes */}
      <Route path="/admin/profit-pulse">
        {() => <AdminGuard><AdminLayout><AdminProfitPulse /></AdminLayout></AdminGuard>}
      </Route>
      <Route path="/admin/top-performers">
        {() => <AdminGuard><AdminLayout><AdminTopPerformers /></AdminLayout></AdminGuard>}
      </Route>
      <Route path="/admin/products">
        {() => <AdminGuard><AdminLayout><AdminProducts /></AdminLayout></AdminGuard>}
      </Route>
      <Route path="/admin/stock">
        {() => <AdminGuard><AdminLayout><AdminStock /></AdminLayout></AdminGuard>}
      </Route>
      <Route path="/admin/trucks">
        {() => <AdminGuard><AdminLayout><AdminTrucks /></AdminLayout></AdminGuard>}
      </Route>
      <Route path="/admin/customers">
        {() => <AdminGuard><AdminLayout><AdminCustomers /></AdminLayout></AdminGuard>}
      </Route>
      <Route path="/admin/routes">
        {() => <AdminGuard><AdminLayout><AdminRoutes /></AdminLayout></AdminGuard>}
      </Route>
      <Route path="/admin/offers">
        {() => <AdminGuard><AdminLayout><AdminOffers /></AdminLayout></AdminGuard>}
      </Route>
      <Route path="/admin/orders">
        {() => <AdminGuard><AdminLayout><AdminOrders /></AdminLayout></AdminGuard>}
      </Route>
      <Route path="/admin">
        {() => <AdminGuard><AdminLayout><AdminDashboard /></AdminLayout></AdminGuard>}
      </Route>
      
      {/* Driver Routes */}
      <Route path="/driver/select">
        {() => <DriverGuard><DriverSelect /></DriverGuard>}
      </Route>
      <Route path="/driver/select-route">
        {() => <DriverGuard><DriverSelectRoute /></DriverGuard>}
      </Route>
      <Route path="/driver/billing">
        {() => <DriverGuard><DriverLayout><DriverBilling /></DriverLayout></DriverGuard>}
      </Route>
      <Route path="/driver/stock">
        {() => <DriverGuard><DriverLayout><DriverInventory /></DriverLayout></DriverGuard>}
      </Route>
      <Route path="/driver/expenses">
        {() => <DriverGuard><DriverLayout><DriverExpenses /></DriverLayout></DriverGuard>}
      </Route>
      <Route path="/driver">
        {() => <DriverGuard><DriverLayout><DriverBilling /></DriverLayout></DriverGuard>}
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
