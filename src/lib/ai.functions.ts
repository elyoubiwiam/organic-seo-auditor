import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAudit } from "./seo/analyze";
import { INDUSTRIES } from "./seo/benchmarks";
import type { IndustryKey, Row } from "./seo/types";

export type AiAnalysis = {
  summary: string;
  insights: { title: string; detail: string; priority: "critical" | "high" | "medium" | "low" }[];
  rootCauses: string[];
  plan: { phase: string; actions: string[] }[];
  quickWins: { title: string; how: string }[];
};

const schema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "3-4 sentence plain-language executive summary of organic performance." },
    insights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string", description: "Why it matters in business terms, citing specific queries/pages and numbers." },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
        },
        required: ["title", "detail", "priority"],
      },
    },
    rootCauses: { type: "array", items: { type: "string" } },
    plan: {
      type: "array",
      items: { type: "object", properties: { phase: { type: "string" }, actions: { type: "array", items: { type: "string" } } }, required: ["phase", "actions"] },
    },
    quickWins: { type: "array", items: { type: "object", properties: { title: { type: "string" }, how: { type: "string" } }, required: ["title", "how"] } },
  },
  required: ["summary", "insights", "rootCauses", "plan", "quickWins"],
};

export const generateAiAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ auditId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS guarantees only the owner can read this audit.
    const { data: row, error } = await context.supabase.from("audits").select("id, site, industry, rows").eq("id", data.auditId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Audit not found");

    const industry = row.industry as IndustryKey;
    const a = runAudit({ name: row.site, site: row.site, industry, rows: row.rows as unknown as Row[] });
    const brief = (xs: { label: string; metric: string; opportunity: number }[]) => xs.slice(0, 10).map((f) => `- "${f.label}": ${f.metric} (≈${f.opportunity} extra clicks/mo)`).join("\n") || "- none";
    const prompt = `Site: ${row.site}
Industry: ${INDUSTRIES.find((i) => i.key === industry)?.label ?? industry}
Last 3 months: ${a.totals.clicks} clicks, ${a.totals.impressions} impressions, CTR ${(a.totals.ctr * 100).toFixed(2)}%, avg position ${a.totals.position.toFixed(1)}${a.totals.clicksDelta != null ? `, clicks vs previous period ${(a.totals.clicksDelta * 100).toFixed(0)}%` : ""}.
Health score: ${a.score}/100.

Low click rate vs benchmark (page one):
${brief(a.lowCtr)}

Losing traffic:
${brief(a.decaying)}

Almost page one (positions 11-20):
${brief(a.striking)}

Content gap signals:
${a.gaps.map((g) => `- ${g.theme}: ${g.evidence}`).join("\n")}`;

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a senior SEO strategist. Analyse Google Search Console findings and explain them to a non-technical business owner. Be specific (name queries/pages and numbers), insightful (look for patterns across findings, e.g. intent mismatch, cannibalisation, seasonality, SERP feature changes), honest about uncertainty, and practical. Give 4-6 insights, 3-5 root causes, 5 quick wins, and a 3-phase 90-day plan (Weeks 1-2, Weeks 3-6, Weeks 7-12).",
          },
          { role: "user", content: prompt },
        ],
        tools: [{ type: "function", function: { name: "report", description: "Return the analysis", parameters: schema } }],
        tool_choice: { type: "function", function: { name: "report" } },
      }),
    });
    if (res.status === 429) throw new Error("Too many AI requests right now. Please try again in a minute.");
    if (res.status === 402) throw new Error("AI credits have run out for this app.");
    if (!res.ok) {
      console.error(`AI request failed [${res.status}]: ${await res.text()}`);
      throw new Error("The AI analysis failed. Please try again.");
    }
    const json = (await res.json()) as { choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[] };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("The AI returned no analysis. Please try again.");
    const analysis = JSON.parse(args) as AiAnalysis;

    const { error: upErr } = await context.supabase.from("audits").update({ ai_analysis: analysis as never }).eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    return { analysis };
  });
