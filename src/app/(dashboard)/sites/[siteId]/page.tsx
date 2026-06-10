import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { siteService } from "@/server/services/siteService";
import Link from "next/link";
import { AddLinkForm } from "./add-link-form";
import { LinkStatusPill } from "./link-status-pill";
import { KeywordsSection } from "./keywords-section";
import { RankChart } from "@/components/charts/rank-chart";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const { siteId } = await params;
  const site = await siteService.getById(siteId, session.user.id);
  if (!site) notFound();

  const links = await db
    .select()
    .from(schema.alternativeLinks)
    .where(eq(schema.alternativeLinks.websiteId, siteId))
    .orderBy(schema.alternativeLinks.createdAt);

  const keywords = await db
    .select()
    .from(schema.keywords)
    .where(and(eq(schema.keywords.websiteId, siteId), eq(schema.keywords.isActive, true)))
    .orderBy(schema.keywords.createdAt);

  // Fetch rank snapshots for chart (last 30 days, first keyword)
  let rankData: Array<{ date: string; mobile: number | null; desktop: number | null; aiOverviewPresent: boolean }> = [];
  if (keywords.length > 0) {
    const firstKeywordId = keywords[0].id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshots = await db
      .select()
      .from(schema.rankSnapshots)
      .where(
        and(
          eq(schema.rankSnapshots.keywordId, firstKeywordId),
          // capturedAt is a date column, filter via JS
        )
      )
      .orderBy(desc(schema.rankSnapshots.capturedAt))
      .limit(60);

    // Group by date
    const byDate = new Map<string, { mobile: number | null; desktop: number | null; aiOverview: boolean }>();
    for (const s of snapshots) {
      const dateStr = typeof s.capturedAt === "string" ? s.capturedAt : String(s.capturedAt).split("T")[0];
      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, { mobile: null, desktop: null, aiOverview: false });
      }
      const entry = byDate.get(dateStr)!;
      if (s.device === "mobile") entry.mobile = s.position;
      if (s.device === "desktop") entry.desktop = s.position;
      if (s.aiOverviewPresent) entry.aiOverview = true;
    }

    rankData = Array.from(byDate.entries())
      .map(([date, d]) => ({
        date,
        mobile: d.mobile,
        desktop: d.desktop,
        aiOverviewPresent: d.aiOverview,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/" className="hover:text-gray-900 dark:hover:text-white">
          Sites
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">{site.name}</span>
      </div>

      {/* Site Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {site.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {site.primaryUrl}
            </p>
            {site.gscPropertyUrl && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                GSC: {site.gscPropertyUrl}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              ID • {site.locale.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Alternative Links */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alternative Links
          </h2>
          <span className="text-sm text-gray-400">{links.length} link{links.length !== 1 ? 's' : ''}</span>
        </div>

        <AddLinkForm siteId={siteId} />

        {links.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No alternative links added yet. Add mirror domains or subdomains to monitor.
          </p>
        ) : (
          <div className="space-y-1 mt-4">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LinkStatusPill status={link.currentStatus} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {link.url}
                    </p>
                    {link.label && (
                      <p className="text-xs text-gray-400">{link.label}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {link.lastCheckedAt && (
                    <span className="text-xs text-gray-400">
                      Checked {new Date(link.lastCheckedAt).toLocaleString()}
                    </span>
                  )}
                  <DeleteLinkButton siteId={siteId} linkId={link.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keywords + Rank */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <KeywordsSection siteId={siteId} keywords={keywords.map(k => ({ id: k.id, phrase: k.phrase, source: k.source }))} />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          {rankData.length > 0 ? (
            <RankChart data={rankData} keyword={keywords[0]?.phrase ?? ""} />
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              No rank data yet. Add keywords and run rank checks to see charts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteLinkButton({ siteId, linkId }: { siteId: string; linkId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { headers } = await import("next/headers");
        const { auth } = await import("@/lib/auth");
        const session = await auth.api.getSession({
          headers: await headers(),
        });
        if (!session?.user) return;

        const { db, schema } = await import("@/db");
        const { eq, and } = await import("drizzle-orm");
        await db
          .delete(schema.alternativeLinks)
          .where(
            and(
              eq(schema.alternativeLinks.id, linkId),
              eq(schema.alternativeLinks.websiteId, siteId)
            )
          );
      }}
    >
      <button
        type="submit"
        className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove link"
      >
        ✕
      </button>
    </form>
  );
}
