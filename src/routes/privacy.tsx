import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — Organic Auditor" },
      { name: "description", content: "How Organic Auditor handles your Google Search Console data." },
      { property: "og:title", content: "Privacy policy — Organic Auditor" },
      { property: "og:description", content: "Your Search Console data is private to your account." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-4 px-6 py-10 text-sm leading-relaxed">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
        <p>Organic Auditor reads your Google Search Console performance data (read-only) only when you connect it and run an audit.</p>
        <h2 className="pt-2 text-lg font-semibold">What we access</h2>
        <p>Search queries, pages, clicks, impressions, click rate and average position for the sites you choose, plus your Google email to show which account is linked.</p>
        <h2 className="pt-2 text-lg font-semibold">Who can see it</h2>
        <p>Only you. Audits are stored in your account and locked so that no other user — including the app owner — can view them through the app. Your Google access key is stored encrypted and used only to fetch your data when you ask.</p>
        <h2 className="pt-2 text-lg font-semibold">AI analysis</h2>
        <p>When you request an AI analysis, a summary of your audit findings is sent to an AI model to write the explanation. It is not used to train models.</p>
        <h2 className="pt-2 text-lg font-semibold">Deleting your data</h2>
        <p>Disconnect Search Console at any time to revoke and delete the access key. Delete any saved audit from "My audits".</p>
        <p>Google API data use complies with the Google API Services User Data Policy, including the Limited Use requirements.</p>
      </main>
    </div>
  ),
});
