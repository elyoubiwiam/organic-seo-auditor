import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { generateAiAnalysis, type AiAnalysis } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

const DOT = { critical: "bg-critical", high: "bg-high", medium: "bg-medium", low: "bg-low" } as const;
const SOFT = { critical: "bg-critical-soft", high: "bg-high-soft", medium: "bg-medium-soft", low: "bg-low-soft" } as const;

export function AiAnalysisPanel({ auditId, initial }: { auditId: string; initial: AiAnalysis | null }) {
  const run = useServerFn(generateAiAnalysis);
  const [a, setA] = useState<AiAnalysis | null>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    setBusy(true); setErr(null);
    try { setA((await run({ data: { auditId } })).analysis); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <section id="ai" className="scroll-mt-20 rounded-2xl border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">AI analysis</h2>
        </div>
        <button onClick={go} disabled={busy} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {a ? "Regenerate" : "Generate AI analysis"}
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      {!a && !busy && <p className="mt-3 text-sm text-muted-foreground">Get a plain-language explanation of what's really going on and a step-by-step plan to grow your search traffic.</p>}
      {busy && !a && <p className="mt-3 text-sm text-muted-foreground">Analysing your data… this takes about 20 seconds.</p>}
      {a && (
        <div className="mt-5 space-y-7">
          <p className="text-base leading-relaxed">{a.summary}</p>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Key insights</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {a.insights.map((i, k) => (
                <div key={k} className={cn("rounded-xl p-4", SOFT[i.priority] ?? "bg-secondary")}>
                  <div className="flex items-center gap-2 font-medium"><span className={cn("h-2 w-2 rounded-full", DOT[i.priority])} />{i.title}</div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{i.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Why this is happening</h3>
              <ul className="list-disc space-y-1.5 pl-5 text-sm">{a.rootCauses.map((r, k) => <li key={k}>{r}</li>)}</ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick wins</h3>
              <ul className="space-y-2 text-sm">{a.quickWins.map((q, k) => <li key={k}><span className="font-medium">{q.title}.</span> <span className="text-muted-foreground">{q.how}</span></li>)}</ul>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">90-day plan</h3>
            <ol className="space-y-4 border-l pl-5">
              {a.plan.map((p, k) => (
                <li key={k} className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-primary" />
                  <div className="font-medium">{p.phase}</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{p.actions.map((x, j) => <li key={j}>{x}</li>)}</ul>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
