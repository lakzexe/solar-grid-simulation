import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Sun, Zap } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { beginSession } from "@/lib/session";
import type { UserPublic } from "@/lib/types";

const HERO =
  "https://images.unsplash.com/photo-1761472823286-9f6093ed6663?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1400";

export function AuthShell({ children, side }: { children: ReactNode; side: ReactNode }) {
  return (
    <div className="grid min-h-svh bg-warm lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-forest lg:block">
        <img src={HERO} alt="Rooftop solar on a residential street" className="absolute inset-0 size-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/70 to-forest/20" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-[#34D399] text-forest"><Sun className="size-5" /></span>
            <span className="font-heading text-xl font-bold">SolarGrid <span className="text-[#34D399]">AI</span></span>
          </div>
          {side}
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

function SideCopy() {
  return (
    <div className="max-w-md">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#34D399]">Residential microgrid decision support</p>
      <h2 className="text-4xl font-bold leading-tight tracking-tight">Plan every kilowatt-hour before it flows.</h2>
      <p className="mt-4 leading-relaxed text-[#C9DDCD]">
        Simulate solar groups, batteries, peer-to-peer sharing and grid outages with a transparent engineering engine — then let AI explain the results.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-3 font-mono text-sm">
        {[["24 h", "dispatch"], ["48 h", "forecast"], ["3", "scenarios"]].map(([a, b]) => (
          <div key={b} className="rounded-lg border border-white/15 bg-white/5 p-3 backdrop-blur">
            <div className="text-lg font-semibold text-[#34D399]">{a}</div>
            <div className="text-xs text-[#C9DDCD]">{b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const m = useMutation({
    mutationFn: () => apiPost<UserPublic>("/auth/login", { email, password }),
    onSuccess: () => {
      beginSession();
      toast.success("Signed in");
      nav("/");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    m.mutate();
  };
  return (
    <AuthShell side={<SideCopy />}>
      <h1 className="text-2xl font-bold tracking-tight text-forest">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Access your microgrid simulations.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" data-testid="login-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" data-testid="login-password-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {m.isError && <p data-testid="login-error" className="text-sm text-destructive">{errorMessage(m.error)}</p>}
        <Button data-testid="login-submit-button" type="submit" className="h-10 w-full" disabled={m.isPending}>
          {m.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <button
        type="button"
        data-testid="login-use-demo-button"
        onClick={() => {
          setEmail("demo@solargrid.ai");
          setPassword("SolarDemo2026!");
        }}
        className="mt-4 flex w-full items-center gap-3 rounded-lg border border-dashed border-[#FCD34D] bg-[#FFFBEB] p-3 text-left text-sm transition-colors hover:bg-[#FEF3C7]"
      >
        <Zap className="size-4 text-[#B45309]" />
        <span>
          <span className="font-semibold text-[#92400E]">Use demo account</span>
          <span className="block text-xs text-[#B45309]">demo@solargrid.ai · demonstration data only</span>
        </span>
      </button>
      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/register" data-testid="go-register-link" className="font-semibold text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
