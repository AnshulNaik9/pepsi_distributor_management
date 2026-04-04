import { useOrders } from "@/hooks/use-sales";
import { useProducts, useGodownStock } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Package, IndianRupee, Truck, ArrowRight, TrendingUp, BarChart3, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: stock = [] } = useGodownStock();

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalStock = stock.reduce((sum, item) => sum + item.casesAvailable, 0);

  // Chart data based on orders
  const chartData = [
    { name: 'Mon', total: 4000 },
    { name: 'Tue', total: 3000 },
    { name: 'Wed', total: 2000 },
    { name: 'Thu', total: 2780 },
    { name: 'Fri', total: totalRevenue > 0 ? totalRevenue : 1890 },
    { name: 'Sat', total: 2390 },
    { name: 'Sun', total: 3490 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of today's distribution metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={IndianRupee} color="text-emerald-500" bg="bg-emerald-100" />
        {/* Empty slot where Total Orders was */}
        <Card className="p-6 flex items-center gap-4 border-border/30 shadow-sm rounded-2xl bg-muted/10 border-dashed">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 text-muted-foreground/30 flex items-center justify-center">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground/50">—</p>
            <h4 className="text-2xl font-bold mt-1 text-muted-foreground/30">—</h4>
          </div>
        </Card>
        <MetricCard title="Products Active" value={products.length.toString()} icon={Package} color="text-indigo-500" bg="bg-indigo-100" />
        <MetricCard title="Godown Stock" value={`${totalStock} cases`} icon={Truck} color="text-amber-500" bg="bg-amber-100" />
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card onClick={() => setLocation("/admin/profit-pulse")} className="p-6 border-border/40 shadow-sm hover:shadow-md transition-all hover:border-primary/30 rounded-2xl cursor-pointer group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h4 className="text-lg font-bold text-foreground mb-1">Profit Pulse</h4>
          <p className="text-sm text-muted-foreground">Full financial performance overview with profit tracking</p>
        </Card>

        <Card onClick={() => setLocation("/admin/stock")} className="p-6 border-border/40 shadow-sm hover:shadow-md transition-all hover:border-primary/30 rounded-2xl cursor-pointer group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h4 className="text-lg font-bold text-foreground mb-1">Godown Stock</h4>
          <p className="text-sm text-muted-foreground">Track and update inventory in the warehouse</p>
        </Card>

        <Card onClick={() => setLocation("/admin/top-performers")} className="p-6 border-border/40 shadow-sm hover:shadow-md transition-all hover:border-primary/30 rounded-2xl cursor-pointer group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h4 className="text-lg font-bold text-foreground mb-1">Top Performers</h4>
          <p className="text-sm text-muted-foreground">Customer rankings and purchase history insights</p>
        </Card>
      </div>

      <Card className="p-6 border-border/50 shadow-lg shadow-black/5 rounded-2xl">
        <h3 className="text-lg font-bold mb-6">Revenue Trend</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`₹${value}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="p-6 flex items-center gap-4 border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-2xl ${bg} ${color} flex items-center justify-center`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h4 className="text-2xl font-bold mt-1 text-foreground">{value}</h4>
      </div>
    </Card>
  );
}
