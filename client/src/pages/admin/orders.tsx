import { IndianRupee } from "lucide-react";

export default function OrdersPage() {
  return (
    <div className="space-y-6 text-center py-20">
      <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
        <IndianRupee className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-display font-bold">Order History</h1>
      <p className="text-muted-foreground max-w-sm mx-auto">This page is coming soon. You'll be able to view and export all transaction receipts here.</p>
    </div>
  );
}
