import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { beginSession } from "@/lib/session";
import type { UserPublic } from "@/lib/types";
import { AuthShell } from "./Login";

const BENEFITS = [
  "Hourly battery, P2P, DSM and grid dispatch decisions",
  "Outage survival estimates with load-shedding playbooks",
  "Panel cleaning and predictive maintenance alerts",
  "Three demonstration scenarios pre-loaded to explore",
];

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const m = useMutation({
    mutationFn: () => apiPost<UserPublic>("/auth/register", form),
    onSuccess: () => {
      beginSession();
      toast.success("Account created — demo scenarios loaded");
      nav("/");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return void toast.error("Password must be at least 8 characters");
    m.mutate();
  };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <AuthShell
      side={
        <div className="max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Model your community microgrid.</h2>
          <ul className="mt-6 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex gap-3 text-[#C9DDCD]">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#34D399]" /> {b}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <h1 className="text-2xl font-bold tracking-tight text-forest">Create account</h1>
      <p className="mt-1 text-sm text-muted-foreground">For engineers, students and community energy planners.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" data-testid="register-form">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" data-testid="register-name-input" required value={form.name} onChange={set("name")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="remail">Email</Label>
          <Input id="remail" data-testid="register-email-input" type="email" required value={form.email} onChange={set("email")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rpass">Password</Label>
          <Input id="rpass" data-testid="register-password-input" type="password" required value={form.password} onChange={set("password")} />
          <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
        </div>
        <Button data-testid="register-submit-button" type="submit" className="h-10 w-full" disabled={m.isPending}>
          {m.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" data-testid="go-login-link" className="font-semibold text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
