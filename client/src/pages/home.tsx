import { Truck, ShieldCheck, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="max-w-4xl w-full z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-blue-700 shadow-xl shadow-primary/30 mb-6 text-white">
            <Truck className="w-10 h-10" />
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-extrabold text-foreground tracking-tight mb-4">
            Distri<span className="text-primary">Sys</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The complete offline-first distribution & billing platform. Choose your role to continue.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <a href="/admin" className="block group">
            <Card className="p-8 border-2 border-transparent hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10 cursor-pointer transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur">
              <div className="w-16 h-16 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Admin Portal</h2>
              <p className="text-muted-foreground mb-6">Manage inventory, load trucks, set offers, and view dashboard analytics.</p>
              <div className="flex items-center text-blue-600 font-semibold group-hover:gap-2 transition-all">
                Enter Office <ArrowRight className="w-5 h-5 ml-1" />
              </div>
            </Card>
          </a>

          <a href="/driver/select" className="block group">
            <Card className="p-8 border-2 border-transparent hover:border-accent/20 hover:shadow-xl hover:shadow-accent/10 cursor-pointer transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur">
              <div className="w-16 h-16 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Truck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Driver App</h2>
              <p className="text-muted-foreground mb-6">Spot billing, check truck inventory, process returns and log daily expenses.</p>
              <div className="flex items-center text-emerald-600 font-semibold group-hover:gap-2 transition-all">
                Start Route <ArrowRight className="w-5 h-5 ml-1" />
              </div>
            </Card>
          </a>
        </div>
      </div>
    </div>
  );
}
