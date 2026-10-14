import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";
import { errorMessage, qk } from "@/lib/hooks";
import type { ExplainTopic, Explanation, SimRun } from "@/lib/types";
import { MiniMarkdown, Panel } from "./common";

export function AiExplainPanel({ run, topic, title = "AI explanation" }: { run: SimRun; topic: ExplainTopic; title?: string }) {
  const qc = useQueryClient();
  const existing = run.explanations?.[topic];
  const m = useMutation({
    mutationFn: () => apiPost<Explanation>(`/simulations/${run.id}/explain`, { topic }),
    onSuccess: (exp) => {
      qc.invalidateQueries({ queryKey: qk.run(run.id) });
      toast.success(exp.source === "gemini" ? "Gemini explanation ready" : "Rule-based explanation generated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const exp = m.data ?? existing;
  return (
    <Panel
      testId={`ai-explain-panel-${topic}`}
      title={title}
      subtitle="Narrates engine results only — calculations stay in the simulation engine."
      action={
        <Button
          data-testid={`ai-explain-button-${topic}`}
          size="sm"
          onClick={() => m.mutate()}
          disabled={m.isPending}
          className="bg-forest text-white hover:bg-forest-2"
        >
          <Sparkles className="size-3.5" /> {m.isPending ? "Explaining…" : exp ? "Regenerate" : "Explain results"}
        </Button>
      }
      className="bg-gradient-to-br from-white to-[#F2F7F2]"
    >
      {m.isPending && (
        <div data-testid="ai-explain-loading" className="space-y-2">
          {[90, 75, 82, 60].map((w) => (
            <div key={w} className="h-3 animate-pulse rounded bg-[#DDE8DA]" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
      {!m.isPending && exp && (
        <div data-testid={`ai-explain-text-${topic}`}>
          <span
            data-testid="ai-explain-source"
            className={
              exp.source === "gemini"
                ? "mb-3 inline-block rounded-full bg-[#EBF5ED] px-2 py-0.5 text-[11px] font-semibold text-[#0F5132]"
                : "mb-3 inline-block rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]"
            }
          >
            {exp.source === "gemini" ? "Gemini AI" : "Rule-based fallback (AI unavailable)"}
          </span>
          <MiniMarkdown text={exp.text} />
        </div>
      )}
      {!m.isPending && !exp && (
        <p data-testid="ai-explain-empty" className="text-sm text-muted-foreground">
          No explanation yet. Generate one to get a plain-language summary of what the engine decided and why.
        </p>
      )}
    </Panel>
  );
}
