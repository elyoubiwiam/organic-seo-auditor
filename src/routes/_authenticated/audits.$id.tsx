import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Report } from "@/components/audit/Report";
import { AiAnalysisPanel } from "@/components/audit/AiAnalysisPanel";
import type { AiAnalysis } from "@/lib/ai.functions";
import type { IndustryKey, Row } from "@/lib/seo/types";

export const Route = createFileRoute("/_authenticated/audits/$id")({
  head: () => ({
    meta: [
      { title: "Audit report — Organic Auditor" },
      { name: "description", content: "Your private Search Console audit with AI analysis." },
      { property: "og:title", content: "Audit report — Organic Auditor" },
      { property: "og:description", content: "Private Search Console audit with AI analysis." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("audits").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <p className="p-10 text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="p-10 text-sm text-muted-foreground">Audit not found.</p>;
  return (
    <Report
      dataset={{ name: data.site, site: data.site, industry: data.industry as IndustryKey, rows: data.rows as unknown as Row[] }}
      onReset={() => navigate({ to: "/" })}
      top={<AiAnalysisPanel auditId={data.id} initial={data.ai_analysis as unknown as AiAnalysis | null} />}
    />
  );
}
