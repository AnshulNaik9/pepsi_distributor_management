import { useState } from "react";
import { login } from "@/lib/auth";
import { useLocation } from "wouter";
import { Truck, Lock, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      const user = login(username, password);
      if (!user) {
        setError("Invalid username or password. Please try again.");
        setIsLoading(false);
        return;
      }
      if (user.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/driver/select");
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-[5%] right-[5%] w-[45%] h-[45%] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-sm z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl shadow-blue-900/60 mb-5 text-white">
            <Truck className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Distri<span className="text-blue-400">Sys</span>
          </h1>
          <p className="text-blue-200/70 mt-2 text-sm font-medium">Distribution & Billing Platform</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-1">Sign In</h2>
          <p className="text-white/50 text-sm mb-7">Enter your credentials to continue</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="username"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(""); }}
                  placeholder="Enter username"
                  className="h-12 pl-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter password"
                  className="h-12 pl-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-base shadow-lg shadow-blue-900/40 transition-all mt-2"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Hint */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-3 text-center text-xs text-white/40">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="font-bold text-white/60 mb-1">Admin</div>
              <div>admin / admin123</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="font-bold text-white/60 mb-1">Driver</div>
              <div>driver / driver123</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
