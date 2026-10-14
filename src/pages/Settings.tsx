import { useState, useEffect, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Key, RefreshCcw, Save, ShieldCheck, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemoBadge, LoadingBlock, PageFade, PageHeader, Panel } from "@/components/microgrid/common";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { errorMessage, qk, useMe } from "@/lib/hooks";
import type { IntegrationStatus, MessageResponse, ProfileUpdate, UserPublic } from "@/lib/types";

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "JPY", "INR"];

const STATUS_PILL = {
  connected: "bg-[#EBF8F2] text-[#064E3B] border-[#A7F3D0]",
  demo: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]",
  not_connected: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]",
};

export default function Settings() {
  const qc = useQueryClient();
  const me = useMe();
  const integrations = useQuery({
    queryKey: qk.integrations,
    queryFn: () => apiGet<IntegrationStatus[]>("/integrations"),
  });

  const [profile, setProfile] = useState<ProfileUpdate>({
    name: "",
    organization: "",
    currency: "USD",
  });
  const [geminiKey, setGeminiKey] = useState("");

  useEffect(() => {
    if (me.data) {
      setProfile({
        name: me.data.name || "",
        organization: me.data.organization || "",
        currency: me.data.currency || "USD",
      });
    }
  }, [me.data]);

  const updateProfile = useMutation({
    mutationFn: () => apiPut<UserPublic>("/auth/me", profile),
    onSuccess: (updated) => {
      qc.setQueryData(qk.me, updated);
      toast.success("Profile settings updated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const updateKey = useMutation({
    mutationFn: () => apiPost<{ status: string; message: string }>("/api/settings/gemini-key", { api_key: geminiKey }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.integrations });
      toast.success(data.message);
      setGeminiKey("");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const resetDemo = useMutation({
    mutationFn: () => apiPost<MessageResponse>("/demo/reset"),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.runs });
      toast.success(data.message);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <PageFade>
      <PageHeader
        eyebrow="Configuration & management"
        title="Settings & integrations"
        description="Configure account preferences, Gemini AI model integration, and view telemetry interface readiness."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel
          className="lg:col-span-6"
          title="User profile & currency"
          subtitle="Customize display labels and currency notation"
          testId="settings-profile-panel"
        >
          {me.isLoading ? (
            <LoadingBlock label="Loading user profile…" />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfile.mutate();
              }}
              className="space-y-4"
              data-testid="settings-profile-form"
            >
              <div className="space-y-1.5">
                <Label htmlFor="set-name">Full name</Label>
                <Input
                  id="set-name"
                  data-testid="settings-name-input"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="set-org">Organization / Microgrid community</Label>
                <Input
                  id="set-org"
                  data-testid="settings-org-input"
                  value={profile.organization}
                  onChange={(e) => setProfile((p) => ({ ...p, organization: e.target.value }))}
                  placeholder="e.g. Oakridge Solar Cooperative"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Reporting currency</Label>
                <Select
                  value={profile.currency}
                  onValueChange={(v) => setProfile((p) => ({ ...p, currency: v }))}
                >
                  <SelectTrigger data-testid="settings-currency-select" className="w-full bg-white">
                    <SelectValue>{profile.currency}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={updateProfile.isPending}
                data-testid="settings-save-profile-button"
                className="mt-2"
              >
                <Save className="size-4" /> {updateProfile.isPending ? "Saving…" : "Save profile"}
              </Button>
            </form>
          )}
        </Panel>

        <Panel
          className="lg:col-span-6"
          title="Gemini AI configuration"
          subtitle="Narrative explanations of deterministic engine calculations"
          testId="settings-gemini-panel"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-4 text-[#064E3B]">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Sparkles className="size-4 text-[#059669]" /> Emergent Universal LLM / Gemini 3 Flash Support
              </div>
              <p className="mt-1 text-xs opacity-90 leading-relaxed">
                SolarGrid AI strictly calculates all kilowatt-hours and decisions via pure Python. When AI credentials
                are available, Gemini synthesizes the engine output into plain-language executive summaries.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateKey.mutate();
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="set-gemini-key">Custom Gemini API Key</Label>
                <Input
                  id="set-gemini-key"
                  data-testid="settings-gemini-key-input"
                  type="password"
                  placeholder="Paste AI Studio API key (AIzaSy...)"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank and submit to clear custom key and use environment / rule-based engine.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateKey.isPending}
                  data-testid="settings-save-key-button"
                >
                  <Key className="size-3.5" />
                  {updateKey.isPending ? "Updating…" : "Update Gemini Key"}
                </Button>
              </div>
            </form>

            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Demo scenarios</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Restore the default demonstration scenarios (sunny baseline, monsoon outage, expanded storage).
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={resetDemo.isPending}
                onClick={() => {
                  if (confirm("Reset demo scenarios? This will restore standard demonstration data.")) {
                    resetDemo.mutate();
                  }
                }}
                data-testid="settings-reset-demo-button"
              >
                <RefreshCcw className="size-3.5" />
                {resetDemo.isPending ? "Resetting…" : "Reset demonstration scenarios"}
              </Button>
            </div>
          </div>
        </Panel>

        <Panel
          className="lg:col-span-12"
          title="Hardware & telemetry integrations"
          subtitle="Pre-configured interfaces ready for future physical inverter, smart meter and weather telemetry"
          testId="settings-integrations-panel"
        >
          {integrations.isLoading ? (
            <LoadingBlock label="Checking integration endpoints…" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-56 text-xs">Interface</TableHead>
                    <TableHead className="w-36 text-xs">Status</TableHead>
                    <TableHead className="text-xs">Integration Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-sm">
                  {(integrations.data ?? []).map((it) => (
                    <TableRow key={it.key} data-testid={`integration-row-${it.key}`}>
                      <TableCell className="font-semibold text-forest">{it.label}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                            STATUS_PILL[it.status as keyof typeof STATUS_PILL] ?? STATUS_PILL.not_connected
                          }`}
                        >
                          {it.status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{it.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 rounded-lg bg-[#F8FAF5] p-3 text-xs text-muted-foreground">
            <strong>Architecture Note:</strong> Physical device adapters (Modbus SunSpec for inverters, DLMS/COSEM for
            smart meters) connect into the Python simulation backend via standard message queues without requiring UI
            changes.
          </div>
        </Panel>
      </div>
    </PageFade>
  );
}
