import { useState } from "react";
import { useOrders } from "@/hooks/use-sales";
import { useProducts, useGodownStock } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Package, IndianRupee, Truck, ArrowRight, TrendingUp, Trophy, History, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: stock = [] } = useGodownStock();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [dateFilter] = useState<{
    type: 'all' | 'month' | 'custom',
    month?: string,
    start?: string,
    end?: string
  }>({ type: 'month', month: currentMonthStr });

  const filteredOrders = orders.filter(order => {
    if (order.isArchived) return false;
    const orderDate = new Date(order.date as any);
    if (dateFilter.type === 'all') return true;
    if (dateFilter.type === 'month') {
      const m = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      return m === dateFilter.month;
    }
    if (dateFilter.type === 'custom' && dateFilter.start && dateFilter.end) {
      const start = new Date(dateFilter.start);
      start.setHours(0,0,0,0);
      const end = new Date(dateFilter.end);
      end.setHours(23,59,59,999);
      return orderDate >= start && orderDate <= end;
    }
    return true;
  });

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const stockTotals = products.reduce(
    (acc, product) => {
      const s = stock.find(item => item.productId === product.id);
      const casesAvailable = s?.casesAvailable || 0;
      const itemsPerCase = product.itemsPerCase || 1;
      const totalProductBottles = Math.round(casesAvailable * itemsPerCase);
      const fullCases = Math.floor(totalProductBottles / itemsPerCase);
      const looseBottles = totalProductBottles % itemsPerCase;
      return {
        totalCases: acc.totalCases + fullCases,
        totalBottles: acc.totalBottles + looseBottles,
      };
    },
    { totalCases: 0, totalBottles: 0 },
  );
  
  const totalStockCases = stockTotals.totalCases;
  const totalStockLeftoverBottles = stockTotals.totalBottles;
  const totalStockDisplay =
    totalStockLeftoverBottles === 0
      ? `${totalStockCases}cs`
      : `${totalStockCases}cs ${totalStockLeftoverBottles}btls`;

  // Chart data based on filtered orders
  const chartData = filteredOrders.length > 0 
    ? filteredOrders.sort((a,b) => new Date(a.date as any).getTime() - new Date(b.date as any).getTime())
        .reduce((acc: any[], order) => {
          const d = new Date(order.date as any).toLocaleDateString([], { month: 'short', day: 'numeric' });
          const existing = acc.find(item => item.name === d);
          if (existing) existing.total += order.totalAmount;
          else acc.push({ name: d, total: order.totalAmount });
          return acc;
        }, []).slice(-10)
    : [
        { name: 'No Data', total: 0 }
      ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground font-medium mt-1">Real-time overview of your distribution network</p>
        </div>
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border/50 shadow-sm w-fit">
          <div className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm">
            {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Total Revenue" 
          value={`₹${totalRevenue.toLocaleString()}`} 
          icon={IndianRupee} 
          variant="emerald"
          trend="+12.5% vs last month"
        />
        <MetricCard 
          title="Products Active" 
          value={products.length.toString()} 
          icon={Package} 
          variant="blue"
          trend="All systems nominal"
        />
        <MetricCard 
          title="Godown Stock" 
          value={totalStockDisplay} 
          icon={Truck} 
          variant="amber"
          trend="Stock update required"
        />
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard 
          title="Profit Pulse"
          description="Full financial performance overview with profit tracking"
          icon={TrendingUp}
          color="emerald"
          onClick={() => setLocation("/admin/profit-pulse")}
        />
        <QuickActionCard 
          title="Bill History"
          description="View and manage all generated invoices"
          icon={History}
          color="blue"
          onClick={() => setLocation("/admin/orders")}
        />
        <QuickActionCard 
          title="Top Performers"
          description="Customer rankings and purchase history insights"
          icon={Trophy}
          color="amber"
          onClick={() => setLocation("/admin/top-performers")}
        />
      </div>

      <Card className="p-8 border-border/50 shadow-xl shadow-black/5 rounded-[2.5rem] bg-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Zap className="w-32 h-32 text-primary" />
        </div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-foreground">Revenue Trend</h3>
            <p className="text-sm text-muted-foreground font-medium mt-1">Daily sales performance for the last 10 records</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <button className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white shadow-sm border border-slate-200">Sales</button>
            <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-slate-100 transition-colors">Volume</button>
          </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                fontFamily="inherit"
                fontWeight="500"
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `₹${value}`} 
                fontFamily="inherit"
                fontWeight="500"
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '24px', 
                  border: '1px solid #f1f5f9', 
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  padding: '16px'
                }}
                itemStyle={{ fontWeight: '800', fontSize: '14px', color: 'hsl(var(--primary))' }}
                labelStyle={{ fontWeight: '700', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}
                formatter={(value: number) => [`₹${value}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--primary))" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorTotal)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, variant, trend }: any) {
  const variants: any = {
    emerald: "from-emerald-50 to-teal-50 text-emerald-600 border-emerald-100 icon-bg-emerald-500",
    blue: "from-blue-50 to-indigo-50 text-blue-600 border-blue-100 icon-bg-blue-500",
    amber: "from-amber-50 to-orange-50 text-amber-600 border-amber-100 icon-bg-amber-500",
  };

  const currentVariant = variants[variant] || variants.blue;

  return (
    <Card className={`p-8 border border-transparent bg-gradient-to-br ${currentVariant} shadow-xl shadow-black/5 rounded-[2.5rem] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-black/5`}>
            <Icon className="w-8 h-8" />
          </div>
          <div className="text-[11px] font-black uppercase tracking-widest opacity-70 bg-white/40 px-3 py-1 rounded-full border border-white/50">
            {title === "Total Revenue" ? "Live" : "Active"}
          </div>
        </div>
        <div>
          <h4 className="text-3xl font-black tracking-tight text-slate-800">{value}</h4>
          <p className="text-xs font-bold mt-1.5 uppercase tracking-tighter opacity-60 flex items-center gap-1.5">
             <Zap className="w-3 h-3 fill-current" /> {title}
          </p>
        </div>
        {trend && (
          <div className="mt-2 pt-4 border-t border-black/5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-tighter opacity-50">{trend}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function QuickActionCard({ title, description, icon: Icon, color, onClick }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-200",
    blue: "bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-200",
    amber: "bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-200",
  };

  return (
    <Card 
      onClick={onClick} 
      className={`p-8 border-2 transition-all duration-300 cursor-pointer group rounded-[2.5rem] bg-white flex flex-col justify-between h-full hover:shadow-2xl hover:shadow-black/10 active:scale-[0.98] ${colors[color]}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-black/5 bg-white`}>
          <Icon className="w-8 h-8" />
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center -rotate-45 group-hover:rotate-0 transition-transform">
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
        </div>
      </div>
      <div className="mt-8">
        <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{title}</h4>
        <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">{description}</p>
      </div>
    </Card>
  );
}

