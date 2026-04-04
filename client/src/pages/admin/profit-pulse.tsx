import { useState } from "react";
import { useProducts, useUpdateProduct, useGodownStock } from "@/hooks/use-inventory";
import { useOrders } from "@/hooks/use-sales";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  TrendingUp, TrendingDown, IndianRupee, Percent,
  Package, ArrowUpRight, ArrowDownRight, Edit, Check, X,
  BarChart3, PieChart, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product, Order } from "@shared/schema";

export default function ProfitPulsePage() {
  const { data: products = [] } = useProducts();
  const { data: orders = [] } = useOrders();
  const { data: stock = [] } = useGodownStock();
  const { mutate: updateProduct } = useUpdateProduct();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Compute per-product financials from orders
  const productFinancials = products.map(product => {
    let totalRevenue = 0;
    let totalCasesSold = 0;

    orders.forEach((order: Order) => {
      if (order.items) {
        order.items.forEach(item => {
          if (item.productId === product.id && !item.isFree) {
            totalCasesSold += item.quantity;
            totalRevenue += item.quantity * product.price;
          }
        });
      }
    });

    const totalCost = totalCasesSold * (product.purchasePrice || 0);
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const stockItem = stock.find(s => s.productId === product.id);
    const currentStock = stockItem?.casesAvailable || 0;
    const stockValue = currentStock * (product.purchasePrice || 0);

    return {
      product,
      totalRevenue,
      totalCost,
      profit,
      margin,
      totalCasesSold,
      currentStock,
      stockValue,
      hasPurchasePrice: (product.purchasePrice || 0) > 0,
    };
  });

  // Totals
  const overallRevenue = productFinancials.reduce((s, p) => s + p.totalRevenue, 0);
  const overallCost = productFinancials.reduce((s, p) => s + p.totalCost, 0);
  const overallProfit = overallRevenue - overallCost;
  const overallMargin = overallRevenue > 0 ? (overallProfit / overallRevenue) * 100 : 0;
  const totalStockValue = productFinancials.reduce((s, p) => s + p.stockValue, 0);
  const productsWithoutPurchasePrice = productFinancials.filter(p => !p.hasPurchasePrice).length;

  // Sort by profit (descending)
  const sortedFinancials = [...productFinancials].sort((a, b) => b.profit - a.profit);

  const handleSavePurchasePrice = (productId: number) => {
    const price = parseInt(editPrice, 10);
    if (isNaN(price) || price < 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    updateProduct(
      { id: productId, data: { purchasePrice: price } },
      {
        onSuccess: () => {
          toast({ title: "Purchase price updated" });
          setEditingId(null);
          setEditPrice("");
        },
      }
    );
  };

  // Get order details for a specific product
  const getProductOrders = (productId: number) => {
    const productOrders: { date: Date; customer: string; qty: number; revenue: number; cost: number }[] = [];
    orders.forEach((order: Order) => {
      if (order.items) {
        order.items.forEach(item => {
          if (item.productId === productId && !item.isFree) {
            const product = products.find(p => p.id === productId);
            productOrders.push({
              date: new Date(order.date as any),
              customer: order.customer?.name || "Unknown",
              qty: item.quantity,
              revenue: item.quantity * (product?.price || 0),
              cost: item.quantity * (product?.purchasePrice || 0),
            });
          }
        });
      }
    });
    return productOrders.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Profit Pulse</h1>
        <p className="text-muted-foreground mt-1">Complete financial performance overview with real-time profit tracking.</p>
      </div>

      {/* Alert if products missing purchase price */}
      {productsWithoutPurchasePrice > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50/50 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-amber-800">
              {productsWithoutPurchasePrice} product{productsWithoutPurchasePrice > 1 ? "s" : ""} missing purchase price
            </p>
            <p className="text-sm text-amber-600">Set purchase prices below to calculate accurate profits.</p>
          </div>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinancialCard
          title="Total Revenue"
          value={`₹${overallRevenue.toLocaleString()}`}
          icon={IndianRupee}
          color="text-emerald-500"
          bg="bg-emerald-100"
          subtitle="From all sales"
        />
        <FinancialCard
          title="Total Cost"
          value={`₹${overallCost.toLocaleString()}`}
          icon={BarChart3}
          color="text-blue-500"
          bg="bg-blue-100"
          subtitle="Cost of goods sold"
        />
        <FinancialCard
          title="Net Profit"
          value={`₹${overallProfit.toLocaleString()}`}
          icon={overallProfit >= 0 ? TrendingUp : TrendingDown}
          color={overallProfit >= 0 ? "text-emerald-500" : "text-red-500"}
          bg={overallProfit >= 0 ? "bg-emerald-100" : "bg-red-100"}
          subtitle={overallProfit >= 0 ? "You're profitable!" : "Loss detected"}
        />
        <FinancialCard
          title="Profit Margin"
          value={`${overallMargin.toFixed(1)}%`}
          icon={Percent}
          color={overallMargin >= 20 ? "text-emerald-500" : overallMargin >= 10 ? "text-amber-500" : "text-red-500"}
          bg={overallMargin >= 20 ? "bg-emerald-100" : overallMargin >= 10 ? "bg-amber-100" : "bg-red-100"}
          subtitle={`Stock value: ₹${totalStockValue.toLocaleString()}`}
        />
      </div>

      {/* Per-Product Table */}
      <Card className="border-border/50 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border/30">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Product-wise Financial Breakdown
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Click on a product row for detailed order history</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                <th className="text-left py-3.5 px-6 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Product</th>
                <th className="text-right py-3.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Sell Price</th>
                <th className="text-right py-3.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Purchase Price</th>
                <th className="text-right py-3.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Cases Sold</th>
                <th className="text-right py-3.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Revenue</th>
                <th className="text-right py-3.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Cost</th>
                <th className="text-right py-3.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Profit</th>
                <th className="text-right py-3.5 px-6 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Margin</th>
              </tr>
            </thead>
            <tbody>
              {sortedFinancials.map((item, idx) => (
                <tr
                  key={item.product.id}
                  className={`border-b border-border/20 hover:bg-muted/20 cursor-pointer transition-colors ${
                    idx % 2 === 0 ? "bg-background" : "bg-muted/5"
                  }`}
                  onClick={() => setDetailProduct(item.product)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{item.product.name}</p>
                        <p className="text-[11px] text-muted-foreground">{item.currentStock} cases in stock</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-sm">₹{item.product.price}</td>
                  <td className="py-4 px-4 text-right" onClick={e => e.stopPropagation()}>
                    {editingId === item.product.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          className="w-20 h-8 text-xs rounded-lg"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                          onClick={() => handleSavePurchasePrice(item.product.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground"
                          onClick={() => { setEditingId(null); setEditPrice(""); }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                          item.hasPurchasePrice
                            ? "text-foreground hover:text-primary"
                            : "text-amber-600 hover:text-amber-700"
                        }`}
                        onClick={() => {
                          setEditingId(item.product.id);
                          setEditPrice((item.product.purchasePrice || 0).toString());
                        }}
                      >
                        {item.hasPurchasePrice ? `₹${item.product.purchasePrice}` : "Set price"}
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-medium">{item.totalCasesSold}</td>
                  <td className="py-4 px-4 text-right text-sm font-semibold text-emerald-600">₹{item.totalRevenue.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right text-sm font-medium text-muted-foreground">₹{item.totalCost.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-bold ${
                      item.profit >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {item.profit >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      ₹{Math.abs(item.profit).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {item.hasPurchasePrice ? (
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.margin >= 20
                          ? "bg-emerald-100 text-emerald-700"
                          : item.margin >= 10
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {item.margin.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Product Detail Dialog */}
      <Dialog open={!!detailProduct} onOpenChange={o => !o && setDetailProduct(null)}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {detailProduct?.name} — Order History
            </DialogTitle>
          </DialogHeader>
          {detailProduct && (
            <div className="mt-4 space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600">Revenue</p>
                  <p className="text-lg font-bold text-emerald-700">
                    ₹{productFinancials.find(p => p.product.id === detailProduct.id)?.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600">COGS</p>
                  <p className="text-lg font-bold text-blue-700">
                    ₹{productFinancials.find(p => p.product.id === detailProduct.id)?.totalCost.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-purple-600">Profit</p>
                  <p className="text-lg font-bold text-purple-700">
                    ₹{productFinancials.find(p => p.product.id === detailProduct.id)?.profit.toLocaleString()}
                  </p>
                </div>
              </div>
              {/* Orders table for this product */}
              <div className="border border-border/30 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Date</th>
                      <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Customer</th>
                      <th className="text-right py-2.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Qty</th>
                      <th className="text-right py-2.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Revenue</th>
                      <th className="text-right py-2.5 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getProductOrders(detailProduct.id).length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No sales recorded yet</td></tr>
                    ) : (
                      getProductOrders(detailProduct.id).map((o, i) => (
                        <tr key={i} className="border-b border-border/10 hover:bg-muted/10">
                          <td className="py-2.5 px-4 text-muted-foreground">{o.date.toLocaleDateString()}</td>
                          <td className="py-2.5 px-4 font-medium">{o.customer}</td>
                          <td className="py-2.5 px-4 text-right">{o.qty}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-600 font-medium">₹{o.revenue.toLocaleString()}</td>
                          <td className={`py-2.5 px-4 text-right font-medium ${o.revenue - o.cost >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            ₹{(o.revenue - o.cost).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinancialCard({ title, value, icon: Icon, color, bg, subtitle }: any) {
  return (
    <Card className="p-6 border-border/50 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${bg} ${color} flex items-center justify-center`}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h4 className="text-2xl font-bold mt-0.5 text-foreground">{value}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
}
