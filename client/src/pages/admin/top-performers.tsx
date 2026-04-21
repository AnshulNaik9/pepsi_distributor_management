import { useState } from "react";
import { useCustomers } from "@/hooks/use-logistics";
import { useOrders } from "@/hooks/use-sales";
import { useRoutes } from "@/hooks/use-logistics";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatQuantity } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Trophy, Crown, Medal, Star, Search, ChevronRight,
  IndianRupee, ShoppingCart, Calendar, User, MapPin, Phone
} from "lucide-react";
import type { Customer, Order } from "@shared/schema";

interface CustomerStats {
  customer: Customer;
  totalPurchases: number;
  orderCount: number;
  avgOrderValue: number;
  lastOrderDate: Date | null;
  orders: {
    id: number;
    date: Date;
    totalAmount: number;
    paymentMode: string;
    items: { name: string; qty: number; isFree: boolean }[];
  }[];
}

export default function TopPerformersPage() {
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders();
  const { data: routes = [] } = useRoutes();
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStats | null>(null);

  const getRouteName = (routeId: number) =>
    routes.find(r => r.id === routeId)?.name || "Unknown";

  // Build customer stats
  const customerStats: CustomerStats[] = customers
    .filter(customer => !customer.isDeleted)
    .map(customer => {
      const customerOrders = orders.filter((o: Order) => o.customerId === customer.id && !o.isArchived);
    const totalPurchases = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = customerOrders.length;
    const avgOrderValue = orderCount > 0 ? totalPurchases / orderCount : 0;
    const lastOrderDate = customerOrders.length > 0
      ? new Date(Math.max(...customerOrders.map(o => new Date(o.date as any).getTime())))
      : null;

    const detailedOrders = customerOrders.map(o => ({
      id: o.id,
      date: new Date(o.date as any),
      totalAmount: o.totalAmount,
      paymentMode: o.paymentMode,
      items: (o.items || []).map(item => ({
        name: item.product?.name || `Product #${item.productId}`,
        qty: item.quantity,
        isFree: item.isFree || false,
      })),
    })).sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      customer,
      totalPurchases,
      orderCount,
      avgOrderValue,
      lastOrderDate,
      orders: detailedOrders,
    };
  });

  // Sort by total purchases (top performers first)
  const ranked = [...customerStats]
    .filter(cs => cs.totalPurchases > 0)
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .filter(cs => {
      if (!search) return true;
      return cs.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        cs.customer.address.toLowerCase().includes(search.toLowerCase());
    });

  const getRankBadge = (rank: number) => {
    if (rank === 0) return { icon: Crown, color: "text-amber-500", bg: "bg-gradient-to-br from-amber-100 to-yellow-100", border: "border-amber-200", label: "🥇 #1" };
    if (rank === 1) return { icon: Medal, color: "text-slate-400", bg: "bg-gradient-to-br from-slate-100 to-gray-100", border: "border-slate-200", label: "🥈 #2" };
    if (rank === 2) return { icon: Medal, color: "text-amber-700", bg: "bg-gradient-to-br from-orange-100 to-amber-100", border: "border-orange-200", label: "🥉 #3" };
    return { icon: Star, color: "text-primary", bg: "bg-primary/5", border: "border-border/40", label: `#${rank + 1}` };
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl font-display font-bold text-foreground">Top Performers</h1>
        </div>
        <p className="text-muted-foreground mt-1">Your highest-value customers driving business growth, ranked by total purchases.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-border/50 shadow-sm rounded-2xl bg-gradient-to-br from-amber-50/80 to-yellow-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/70">Top Customer</p>
              <p className="text-lg font-bold text-foreground truncate">
                {ranked.length > 0 && ranked[0].totalPurchases > 0 ? ranked[0].customer.name : "No data yet"}
              </p>
              {ranked.length > 0 && ranked[0].totalPurchases > 0 && (
                <p className="text-sm text-amber-600 font-semibold">₹{ranked[0].totalPurchases.toLocaleString()}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border/50 shadow-sm rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Customer Revenue</p>
              <p className="text-lg font-bold text-foreground">
                ₹{customerStats.reduce((s, c) => s + c.totalPurchases, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border/50 shadow-sm rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Customers</p>
              <p className="text-lg font-bold text-foreground">
                {customerStats.filter(c => c.orderCount > 0).length} / {customers.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search customers by name or address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 rounded-xl bg-background border-border/40 shadow-sm focus-visible:ring-primary/20"
        />
      </div>

      {/* Customer Ranking List */}
      <div className="space-y-3">
        {ranked.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed">
            <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">No customers found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search.</p>
          </Card>
        ) : (
          ranked.map((cs, idx) => {
            const rank = getRankBadge(idx);
            return (
              <Card
                key={cs.customer.id}
                className={`p-5 border ${rank.border} shadow-sm hover:shadow-lg transition-all rounded-2xl cursor-pointer group ${rank.bg}`}
                onClick={() => setSelectedCustomer(cs)}
              >
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                    idx < 3 ? `${rank.bg} ${rank.color}` : "bg-muted/50 text-muted-foreground"
                  }`}>
                    {idx < 3 ? <rank.icon className="w-6 h-6" /> : <span className="text-sm">{rank.label}</span>}
                  </div>

                  {/* Customer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                        {cs.customer.name}
                      </h3>
                      {idx < 3 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-sm">
                          {rank.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {getRouteName(cs.customer.routeId)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        {cs.orderCount} orders
                      </span>
                      {cs.lastOrderDate && (
                        <span className="flex items-center gap-1 hidden sm:flex">
                          <Calendar className="w-3 h-3" />
                          Last: {cs.lastOrderDate.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Purchase Total */}
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-foreground">₹{cs.totalPurchases.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg: ₹{cs.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Customer Detail Dialog with Purchase History */}
      <Dialog open={!!selectedCustomer} onOpenChange={o => !o && setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-display flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {selectedCustomer.customer.name}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-5">
                {/* Customer Info */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {selectedCustomer.customer.phone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedCustomer.customer.address}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {getRouteName(selectedCustomer.customer.routeId)}
                  </span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600">Total Spent</p>
                    <p className="text-lg font-bold text-emerald-700">₹{selectedCustomer.totalPurchases.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600">Orders</p>
                    <p className="text-lg font-bold text-blue-700">{selectedCustomer.orderCount}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-purple-600">Avg Order</p>
                    <p className="text-lg font-bold text-purple-700">
                      ₹{selectedCustomer.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* Order History */}
                <div>
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    Full Purchase History
                  </h4>
                  {selectedCustomer.orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl">
                      No orders placed yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedCustomer.orders.map(order => (
                        <Card key={order.id} className="p-4 border-border/30 rounded-xl hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-semibold text-foreground">
                                {order.date.toLocaleDateString("en-IN", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                order.paymentMode === "Credit"
                                  ? "bg-red-100 text-red-600"
                                  : order.paymentMode === "UPI"
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-emerald-100 text-emerald-600"
                              }`}>
                                {order.paymentMode}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-foreground">₹{order.totalAmount.toLocaleString()}</span>
                          </div>
                          <div className="space-y-1">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className={`${item.isFree ? "text-emerald-600 italic" : "text-muted-foreground"}`}>
                                  {item.isFree ? "🎁 " : ""}{item.name}
                                </span>
                                <span className="font-medium">
                                  {item.isFree 
                                    ? formatQuantity(item.qty, 12) // Default to 12 if unsure, but usually this is just a label
                                    : `${item.qty} cs`
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
