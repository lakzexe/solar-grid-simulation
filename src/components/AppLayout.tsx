import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  Activity, BatteryWarning, CloudSun, Gauge, GitCompareArrows, LogOut, Menu, Settings, SlidersHorizontal, Sun, Wrench,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { ActiveRunContext, useMe, useRuns } from "@/lib/hooks";
import { endSession } from "@/lib/session";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/microgrid/common";

const NAV = [
  { to: "/", label: "Dashboard", icon: Gauge, id: "dashboard" },
  { to: "/simulation", label: "Simulation", icon: SlidersHorizontal, id: "simulation" },
  { to: "/energy-balance", label: "Energy balance", icon: Activity, id: "energy-balance" },
  { to: "/scenarios", label: "Scenario comparison", icon: GitCompareArrows, id: "scenarios" },
  { to: "/forecasts", label: "Forecasts", icon: CloudSun, id: "forecasts" },
  { to: "/maintenance", label: "Maintenance", icon: Wrench, id: "maintenance" },
  { to: "/outage", label: "Outage survival", icon: BatteryWarning, id: "outage" },
  { to: "/settings", label: "Settings", icon: Settings, id: "settings" },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2" data-testid="brand-link">
      <span className="flex size-9 items-center justify-center rounded-lg bg-[#34D399] text-forest">
        <Sun className="size-5" />
      </span>
      <span className="font-heading text-lg font-bold tracking-tight text-white">
        SolarGrid <span className="text-[#34D399]">AI</span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav role="navigation" aria-label="Main" className="mt-8 flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, id }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onNavigate}
          data-testid={`nav-${id}`}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
              isActive ? "bg-forest-3 text-[#34D399]" : "text-[#A3C4AC] hover:bg-white/5 hover:text-white",
            )
          }
        >
          <Icon className="size-4" aria-hidden /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto rounded-lg border border-[#1A4228] bg-[#0A2214] p-3 text-xs leading-relaxed text-[#A3C4AC]">
      <p className="font-semibold text-[#F4F9F4]">Simulation mode</p>
      Inverter, meter and weather feeds are not connected. All values come from the Python engine.
    </div>
  );
}

const RUN_KEY = "sg-active-run";

export default function AppLayout() {
  const me = useMe();
  const runs = useRuns();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [stored, setStored] = useState<string | null>(() => localStorage.getItem(RUN_KEY));

  const runId = useMemo(() => {
    const list = runs.data ?? [];
    if (stored && list.some((r) => r.id === stored)) return stored;
    return list[0]?.id ?? null;
  }, [runs.data, stored]);

  useEffect(() => setOpen(false), [loc.pathname]);

  const setRunId = (id: string) => {
    localStorage.setItem(RUN_KEY, id);
    setStored(id);
  };

  if (me.isError) {
    const unauth = me.error instanceof ApiError && me.error.status === 401;
    if (unauth || !me.data) return <Navigate to="/login" replace />;
  }

  const runLabel = (id: string) => runs.data?.find((r) => r.id === id)?.name ?? "Select run";

  return (
    <ActiveRunContext.Provider value={{ runId, setRunId }}>
      <div className="flex min-h-svh bg-warm">
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col bg-forest px-4 py-6 lg:flex" data-testid="sidebar">
          <Brand />
          <NavList />
          <SidebarFooter />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-[#F8FAF5]/85 px-4 backdrop-blur-md sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                data-testid="mobile-nav-button"
                className="rounded-md p-2 text-forest hover:bg-accent lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col border-0 bg-forest p-5">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Brand />
                <NavList onNavigate={() => setOpen(false)} />
                <SidebarFooter />
              </SheetContent>
            </Sheet>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground md:inline">Active run</span>
              {runs.data && runs.data.length > 0 ? (
                <Select value={runId ?? ""} onValueChange={(v: string) => setRunId(v)}>
                  <SelectTrigger data-testid="active-run-select" className="h-9 w-full max-w-[18rem] bg-white">
                    <SelectValue>{runLabel(runId ?? "")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {runs.data.map((r) => (
                      <SelectItem key={r.id} value={r.id} data-testid={`active-run-option-${r.id}`}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm text-muted-foreground" data-testid="active-run-none">
                  {runs.isLoading ? "Loading runs…" : "No runs yet"}
                </span>
              )}
            </div>
            <DemoBadge className="hidden sm:inline-flex" />
            <DropdownMenu>
              <DropdownMenuTrigger
                data-testid="user-menu-button"
                className="flex size-9 items-center justify-center rounded-full bg-forest text-sm font-semibold text-[#34D399]"
                aria-label="Account menu"
              >
                {(me.data?.name ?? "?").slice(0, 1).toUpperCase()}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold" data-testid="user-menu-name">{me.data?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{me.data?.email}</p>
                </div>
                <DropdownMenuItem data-testid="user-menu-settings" render={<Link to="/settings" />}>
                  <Settings className="size-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="user-menu-logout" onClick={() => void endSession()}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main role="main" className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster richColors />
    </ActiveRunContext.Provider>
  );
}
