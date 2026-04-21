import { useQuery } from "@tanstack/react-query";
import { useProducts } from "@/hooks/use-inventory";
import { api } from "@shared/routes";
import { Card } from "@/components/ui/card";
import { History, ChevronDown, ChevronUp, Printer, CreditCard, Wallet, Download, RefreshCw, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatQuantity } from "@/lib/utils";
import { useBluetoothPrinter } from "@/hooks/use-printer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BillItem = {
  productId: number;
  quantity: number;
  isFree?: boolean;
  customPrice?: number;
  product?: { name?: string; price?: number; itemsPerCase?: number };
};

type Bill = {
  id: number;
  orderId: number;
  orderDate: string | number | Date;
  customerName: string;
  customerPhone?: string;
  customerId?: number;
  paymentMode: string;
  totalAmount: number;
  items?: BillItem[];
  isDeleted?: boolean;
  deletedAt?: string | number | Date;
};

export default function OrdersPage() {
  const [expandedBillId, setExpandedBillId] = useState<number | null>(null);
  const [previewBill, setPreviewBill] = useState<Bill | null>(null);
  const { printReceipt, isConnecting: isPrinting } = useBluetoothPrinter();

  const [filterMode, setFilterMode] = useState<"all" | "today" | "yesterday" | "selectedDate" | "customDate">("today");
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: products = [] } = useProducts();

  const { data: bills = [], isLoading: isLoadingBills, isFetching: isFetchingBills, refetch: refetchBills } = useQuery<Bill[]>({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path);
      if (!res.ok) throw new Error("Failed to fetch bill history");
      const data = await res.json();
      return (data || []).map((o: any) => ({
        id: o.id,
        orderId: o.id,
        orderDate: o.date,
        customerId: o.customerId,
        customerName: (o.customer?.name || o.customerName || "").trim() || `Customer #${o.customerId}`,
        customerPhone: o.customer?.phone || "",
        paymentMode: o.paymentMode,
        totalAmount: o.totalAmount,
        items: o.items || [],
      }));
    },
  });

  const combinedBills = useMemo(() => {
    const byOrderId = new Map<number, Bill>();
    const prodMap = new Map((products || []).map((p: any) => [p.id, p]));

    for (const b of bills) {
      byOrderId.set(b.orderId, {
        ...b,
        totalAmount: Math.round(b.totalAmount),
        items: (b.items || []).map(item => ({
          ...item,
          product: item.product || prodMap.get(item.productId)
        }))
      });
    }
    return Array.from(byOrderId.values()).sort(
      (a, b) => new Date(b.orderDate as any).getTime() - new Date(a.orderDate as any).getTime(),
    );
  }, [bills, products]);

  const filteredBills = useMemo(() => {
    return combinedBills.filter((bill) => {
      const billDate = new Date(bill.orderDate as any);
      if (Number.isNaN(billDate.getTime())) return false;

      if (filterMode === "all") return true;

      if (filterMode === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return billDate >= start && billDate <= end;
      }

      if (filterMode === "yesterday") {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        return billDate >= start && billDate <= end;
      }

      if (filterMode === "selectedDate") {
        if (!selectedDate) return false;
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        return billDate >= start && billDate <= end;
      }

      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (billDate < start) return false;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (billDate > end) return false;
      }
      return true;
    });
  }, [combinedBills, filterMode, fromDate, selectedDate, toDate]);

  const handleBrowserPrint = (bill: Bill) => {
    const doc = window.open("", "_blank", "width=420,height=700");
    if (!doc) return;

    const itemRows = (bill.items || [])
      .map((item) => {
        const qty = item?.isFree
          ? formatQuantity(item.quantity, item?.product?.itemsPerCase || 1)
          : formatQuantity(
              item.quantity * (item?.product?.itemsPerCase || 1),
              item?.product?.itemsPerCase || 1,
            );
        const amount = item?.isFree
          ? "FREE"
          : `Rs ${Math.round((item?.customPrice || item?.product?.price || 0) * item.quantity)}`;
        return `<tr><td>${item?.product?.name || "Product"} x ${qty}</td><td style="text-align:right;white-space:nowrap;">${amount}</td></tr>`;
      })
      .join("");

    doc.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Invoice #${bill.orderId}</title>
          <style>
            @page { size: 58mm auto; margin: 3mm; }
            body { margin: 0; font-family: "Courier New", monospace; color: #000; }
            .receipt { width: 52mm; margin: 0 auto; font-size: 11px; line-height: 1.25; }
            .center { text-align: center; }
            .bold { font-weight: 700; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 1px 0; vertical-align: top; }
            .total { font-weight: 700; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center bold" style="font-size:14px;">CS MARKETING</div>
            <div class="line"></div>
            <div class="center bold">INVOICE</div>
            <div class="center">Order #${bill.orderId}</div>
            <div class="center">${new Date(bill.orderDate as any).toLocaleDateString()}</div>
            <div class="line"></div>
            <div>Shop Name - ${bill.customerName}</div>
            ${bill.customerPhone ? `<div>Phone - ${bill.customerPhone}</div>` : ""}
            <div class="line"></div>
            <div class="bold">Items</div>
            <table>${itemRows}</table>
            <div class="line"></div>
            <div class="total">Total (${bill.paymentMode}) - Rs ${bill.totalAmount}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    doc.document.close();
  };

  const { data: expenses = [], isFetching: isFetchingExpenses, refetch: refetchExpenses } = useQuery<any[]>({
    queryKey: [api.expenses.list.path],
    queryFn: async () => {
      const res = await fetch(api.expenses.list.path);
      if (!res.ok) return [];
      return await res.json();
    },
  });

  const handleRefresh = () => {
    refetchBills();
    refetchExpenses();
  };

  const isRefreshing = isFetchingBills || isFetchingExpenses;
  const isLoading = isLoadingBills;

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      if (Number.isNaN(expDate.getTime())) return false;

      if (filterMode === "all") return true;

      if (filterMode === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return expDate >= start && expDate <= end;
      }

      if (filterMode === "yesterday") {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        return expDate >= start && expDate <= end;
      }

      if (filterMode === "selectedDate") {
        if (!selectedDate) return false;
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        return expDate >= start && expDate <= end;
      }

      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (expDate < start) return false;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (expDate > end) return false;
      }
      return true;
    });
  }, [expenses, filterMode, fromDate, selectedDate, toDate]);

  const handleDownload = (format: 'csv' | 'word') => {
    if (filteredBills.length === 0 && filteredExpenses.length === 0) {
      alert("No data available to download.");
      return;
    }

    let fileContent = '';
    let mimeType = '';
    let extension = '';

    if (format === 'csv') {
      // --- CSV FORMAT ---
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';

      const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;

      let csv = '\uFEFF'; // UTF-8 BOM for Excel
      csv += 'SALES / INVOICES\n';
      csv += 'Bill #,Date,Customer Name,Payment Mode,Total Amount,Items Purchased\n';

      filteredBills.forEach(bill => {
        const itemsStr = (bill.items || []).map(item => {
          const name = item.product?.name || 'Product';
          const packing = item.product?.itemsPerCase || 1;
          const qty = item.isFree
            ? `${formatQuantity(item.quantity, packing)} (FREE)`
            : formatQuantity(item.quantity * packing, packing);
          return `${name} x ${qty}`;
        }).join(' | ');

        csv += [
          bill.orderId,
          esc(new Date(bill.orderDate as any).toLocaleString()),
          esc(bill.customerName),
          esc(bill.paymentMode),
          bill.totalAmount,
          esc(itemsStr)
        ].join(',') + '\n';
      });

      if (filteredExpenses.length > 0) {
        csv += '\n\nEXPENSES\nDate,Description,Amount\n';
        filteredExpenses.forEach(exp => {
          csv += [
            esc(new Date(exp.date).toLocaleString()),
            esc(exp.description),
            exp.amount
          ].join(',') + '\n';
        });

        const totalSales = filteredBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
        const totalExp = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
        csv += `\nSUMMARY\nTotal Sales,,${totalSales}\nTotal Expenses,,${totalExp}\nNet Profit,,${totalSales - totalExp}\n`;
      }

      fileContent = csv;

    } else {
      // --- WORD (HTML DOC) FORMAT ---
      mimeType = 'application/msword';
      extension = 'doc';

      const totalSales = filteredBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
      const totalExp = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

      fileContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  body { font-family: Calibri, sans-serif; padding: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { border: 1px solid #999; padding: 6px 10px; text-align: left; font-size: 11pt; }
  th { background-color: #e8e8e8; font-weight: bold; }
  h1 { text-align: center; color: #333; }
  h3 { color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
  .total-row { font-weight: bold; background-color: #f0f0f0; }
  .profit-row { font-weight: bold; background-color: #d4edda; }
</style></head>
<body>
  <h1>Delivery Report</h1>
  <p><b>Filter:</b> ${filterMode} | <b>Generated:</b> ${new Date().toLocaleString()}</p>

  <h3>SALES / INVOICES (${filteredBills.length} bills)</h3>
  <table>
    <tr><th>Bill #</th><th>Date</th><th>Customer Name</th><th>Payment</th><th>Amount</th><th>Items Purchased</th></tr>
    ${filteredBills.map(bill => {
      const itemsStr = (bill.items || []).map(item => {
        const name = item.product?.name || 'Product';
        const packing = item.product?.itemsPerCase || 1;
        const qty = item.isFree
          ? `${formatQuantity(item.quantity, packing)} (FREE)`
          : formatQuantity(item.quantity * packing, packing);
        return `${name} x ${qty}`;
      }).join(', ');
      return `<tr><td>${bill.orderId}</td><td>${new Date(bill.orderDate as any).toLocaleString()}</td><td>${bill.customerName}</td><td>${bill.paymentMode}</td><td>${bill.totalAmount}</td><td>${itemsStr}</td></tr>`;
    }).join('')}
    <tr class="total-row"><td colspan="4" style="text-align:right">Total Sales</td><td colspan="2">${totalSales}</td></tr>
  </table>

  ${filteredExpenses.length > 0 ? `
  <h3>EXPENSES (${filteredExpenses.length} entries)</h3>
  <table>
    <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
    ${filteredExpenses.map(e => `<tr><td>${new Date(e.date).toLocaleString()}</td><td>${e.description}</td><td>${e.amount}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="2" style="text-align:right">Total Expenses</td><td>${totalExp}</td></tr>
  </table>

  <h3>NET SUMMARY</h3>
  <table>
    <tr class="total-row"><td>Total Sales</td><td>${totalSales}</td></tr>
    <tr class="total-row"><td>Total Expenses</td><td>${totalExp}</td></tr>
    <tr class="profit-row"><td>Net Profit</td><td>${totalSales - totalExp}</td></tr>
  </table>` : ''}
</body></html>`;
    }

    // Create Blob and trigger download
    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery_report_${filterMode}.${extension}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Bill History</h1>
            <p className="text-muted-foreground mt-1">Complete billed details with print format preview.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-2xl h-11 w-11 shadow-sm"
            title="Refresh Bill History"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button 
            onClick={() => handleDownload('csv')} 
            disabled={filteredBills.length === 0 && filteredExpenses.length === 0}
            className="rounded-2xl h-11 px-4 font-bold shadow-sm flex items-center gap-2 border-primary/20 hover:bg-primary/5"
            variant="outline"
          >
            <Download className="w-4 h-4" /> CSV Report
          </Button>
          <Button 
            onClick={() => handleDownload('word')} 
            disabled={filteredBills.length === 0 && filteredExpenses.length === 0}
            className="rounded-2xl h-11 px-4 font-bold shadow-sm flex items-center gap-2 border-primary/20 hover:bg-primary/5"
            variant="outline"
          >
            <FileText className="w-4 h-4" /> Word Report
          </Button>
        </div>
      </div>

      <Card className="p-5 rounded-3xl border-border/50 bg-white shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
           <History className="w-16 h-16 text-primary" />
        </div>
        <div className="relative z-10">
          <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary rounded-full" />
            Selection Filters
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Time Range</label>
              <Select
                value={filterMode}
                onValueChange={(value: "all" | "today" | "yesterday" | "selectedDate" | "customDate") => setFilterMode(value)}
              >
                <SelectTrigger className="h-12 rounded-2xl w-full bg-slate-50 border-slate-100 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="selectedDate">Specific Date</SelectItem>
                  <SelectItem value="customDate">Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterMode === "selectedDate" && (
              <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pick Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-12 rounded-2xl w-full bg-slate-50 border-slate-100 font-bold"
                />
              </div>
            )}

            {filterMode === "customDate" && (
              <>
                <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-12 rounded-2xl w-full bg-slate-50 border-slate-100 font-bold"
                  />
                </div>
                <div className="space-y-2 animate-in slide-in-from-left-2 duration-400">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">End Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-12 rounded-2xl w-full bg-slate-50 border-slate-100 font-bold"
                  />
                </div>
              </>
            )}
            
            {filterMode !== "customDate" && filterMode !== "selectedDate" && (
              <div className="hidden lg:block"></div>
            )}
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-20 rounded-2xl animate-pulse bg-muted/40 border-border/40" />
          ))}
        </div>
      ) : filteredBills.length === 0 ? (
        <Card className="p-10 rounded-2xl border-border/50 text-center">
          <p className="font-semibold text-muted-foreground">No bills found for selected date filter.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBills.map((bill) => (
            <Card key={bill.id} className="p-4 rounded-2xl border-border/50">
              <div
                className="cursor-pointer"
                onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      Bill #{bill.orderId} - {bill.customerName}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bill Date: {new Date(bill.orderDate as any).toLocaleString()}
                    </p>
                    {bill.customerPhone ? (
                      <p className="text-xs text-muted-foreground">Phone: {bill.customerPhone}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">₹{bill.totalAmount?.toLocaleString?.() ?? bill.totalAmount}</div>
                    <div className="mt-1">
                      {(() => {
                        const mode = bill.paymentMode || "Unknown";
                        let color = "bg-slate-100 text-slate-600";
                        let Icon = Wallet;

                        if (mode.includes("Cash")) {
                          color = "bg-emerald-50 text-emerald-700 border-emerald-100";
                          Icon = Wallet;
                        } else if (mode.includes("UPI")) {
                          color = "bg-purple-50 text-purple-700 border-purple-100";
                          Icon = CreditCard;
                        } else if (mode.includes("Credit")) {
                          color = "bg-blue-50 text-blue-700 border-blue-100";
                          Icon = History;
                        } else if (mode.includes("Split")) {
                          color = "bg-orange-50 text-orange-700 border-orange-100";
                          Icon = CreditCard;
                        }

                        return (
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
                            <Icon className="w-3 h-3" />
                            <span className="uppercase tracking-tight">
                              {mode.includes("Split") ? "Split Pay" : mode}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    {bill.paymentMode.includes("Split") && (
                      <div className="mt-1 text-[9px] font-medium text-slate-400 max-w-[120px] leading-tight break-words">
                        {bill.paymentMode.replace("Split", "").replace(/[()]/g, "").trim()}
                      </div>
                    )}
                    <div className="mt-2 text-slate-400">
                      {expandedBillId === bill.id ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                    </div>
                  </div>
                </div>

                {expandedBillId === bill.id && (
                  <div className="mt-4 border-t border-border/50 pt-3 space-y-2">
                    <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">Billed Items</p>
                    {(bill.items || []).map((item, idx) => {
                      const qty = item.isFree
                        ? formatQuantity(item.quantity, item.product?.itemsPerCase || 1)
                        : formatQuantity(
                            item.quantity * (item.product?.itemsPerCase || 1),
                            item.product?.itemsPerCase || 1,
                          );
                      const amount = item.isFree
                        ? "FREE"
                        : `₹${Math.round((item.customPrice || item.product?.price || 0) * item.quantity)}`;
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-2 py-1.5">
                          <span className={`${item.isFree ? "text-blue-700 font-semibold" : "text-slate-700"} truncate pr-2`}>
                            {item.product?.name || "Product"} x {qty}
                          </span>
                          <span className="font-bold whitespace-nowrap">{amount}</span>
                        </div>
                      );
                    })}
                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewBill(bill);
                        }}
                      >
                        <Printer className="w-4 h-4 mr-2" /> Print Format
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!previewBill} onOpenChange={(open) => !open && setPreviewBill(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800">Invoice Print Preview</DialogTitle>
          </DialogHeader>

          {previewBill && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mx-auto w-[240px] bg-white border border-slate-200 rounded-md p-2 font-mono text-[11px] leading-tight text-black">
                <div className="text-center font-bold text-sm tracking-wide">CS MARKETING</div>
                <div className="mt-1 border-y border-dashed border-slate-300 py-1 text-center">
                  <div className="font-semibold">INVOICE</div>
                  <div>Order #{previewBill.orderId}</div>
                  <div>{new Date(previewBill.orderDate as any).toLocaleDateString()}</div>
                </div>
                <div className="mt-1">Shop Name - {previewBill.customerName}</div>
                {previewBill.customerPhone ? <div>Phone - {previewBill.customerPhone}</div> : null}
                <div className="mt-1 border-t border-dashed border-slate-300 pt-1">
                  <div className="mb-1 font-semibold">Items</div>
                  <div className="space-y-0.5 max-h-[30vh] overflow-y-auto pr-1">
                    {(previewBill.items || []).map((item, i) => {
                      const qty = item.isFree
                        ? formatQuantity(item.quantity, item.product?.itemsPerCase || 1)
                        : formatQuantity(
                            item.quantity * (item.product?.itemsPerCase || 1),
                            item.product?.itemsPerCase || 1,
                          );
                      const amount = item.isFree
                        ? "FREE"
                        : `₹${Math.round((item.customPrice || item.product?.price || 0) * item.quantity)}`;
                      return (
                        <div key={i} className="flex justify-between gap-2">
                          <span className="truncate">{item.product?.name || "Product"} x {qty}</span>
                          <span className="whitespace-nowrap">{amount}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-1 border-t border-dashed border-slate-300 pt-1 flex justify-between font-bold">
                  <span>Total ({previewBill.paymentMode})</span>
                  <span>₹{previewBill.totalAmount}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold" onClick={() => setPreviewBill(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl font-bold"
              disabled={isPrinting}
              onClick={async () => {
                if (!previewBill) return;
                const orderPayload: any = {
                  id: previewBill.orderId,
                  date: previewBill.orderDate,
                  paymentMode: previewBill.paymentMode,
                  totalAmount: previewBill.totalAmount,
                  customer: {
                    name: previewBill.customerName,
                    phone: previewBill.customerPhone,
                  },
                  items: previewBill.items || [],
                };
                if ((navigator as any).bluetooth) {
                  await printReceipt(orderPayload);
                } else {
                  handleBrowserPrint(previewBill);
                }
                setPreviewBill(null);
              }}
            >
              {isPrinting ? "Connecting..." : "Confirm Print"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
