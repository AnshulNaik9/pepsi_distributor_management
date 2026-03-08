import { useState } from "react";
import { useCreateExpense } from "@/hooks/use-sales";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Fuel, Utensils } from "lucide-react";

export default function ExpensesPage() {
  const truckId = parseInt(localStorage.getItem('driver_truck_id') || "0");
  const { mutate: logExpense, isPending } = useCreateExpense();
  const { toast } = useToast();
  
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  const presetDesc = (text: string) => setDesc(text);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!amount || !desc) return;
    
    logExpense({
      truckId,
      description: desc,
      amount: parseInt(amount)
    }, {
      onSuccess: () => {
        toast({ title: "Expense logged" });
        setDesc("");
        setAmount("");
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold">Daily Expenses</h2>
        <p className="text-muted-foreground mt-1">Log fuel, tolls, or food.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => presetDesc("Fuel")} className="p-4 bg-white border border-border/50 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors text-slate-700">
          <Fuel className="w-6 h-6 text-blue-500" />
          <span className="font-bold text-sm">Fuel</span>
        </button>
        <button type="button" onClick={() => presetDesc("Food")} className="p-4 bg-white border border-border/50 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors text-slate-700">
          <Utensils className="w-6 h-6 text-amber-500" />
          <span className="font-bold text-sm">Food</span>
        </button>
      </div>

      <Card className="p-5 rounded-3xl border-border/50 shadow-md bg-white">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <Input 
              value={desc} 
              onChange={e => setDesc(e.target.value)} 
              placeholder="e.g. Toll tax at Highway" 
              className="h-14 rounded-2xl bg-slate-50 border-transparent focus-visible:ring-primary/20 text-lg px-4"
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Amount (₹)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-slate-500 font-bold text-lg">₹</span>
              </div>
              <Input 
                type="number"
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                placeholder="500" 
                className="h-14 rounded-2xl bg-slate-50 border-transparent focus-visible:ring-primary/20 pl-9 text-xl font-bold"
                required 
              />
            </div>
          </div>
          <Button type="submit" disabled={isPending} className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/25 mt-2">
            {isPending ? "Saving..." : "Log Expense"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
