import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { siteService } from "@/server/services/siteService";
import { alternativeLinks } from "@/db/schema";

interface SiteWithLinks {
  id: string;
  name: string;
  primaryUrl: string;
  createdAt: Date;
  linkCount: number;
  activeLinks: number;
  downLinks: number;
  blockedLinks: number;
}

async function getSites(): Promise<SiteWithLinks[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return [];

  const sites = await siteService.listByUser(session.user.id);

  // For now, return sites without link counts (Phase 2 adds this)
  return sites.map((s) => ({
    id: s.id,
    name: s.name,
    primaryUrl: s.primaryUrl,
    createdAt: s.createdAt,
    linkCount: 0,
    activeLinks: 0,
    downLinks: 0,
    blockedLinks: 0,
  }));
}

function StatusBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {count > 0 && <span>{count}</span>}
      {label}
    </span>
  );
}

export default async function DashboardPage() {
  const sites = await getSites();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sites</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {sites.length} site{sites.length !== 1 ? "s" : ""} monitored
          </p>
        </div>
        <Link
          href="/sites/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Add Site
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No sites added yet. Start monitoring your first website.
          </p>
          <Link
            href="/sites/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-block"
          >
            Add Your First Site
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Link
              key={site.id}
              href={`/sites/${site.id}`}
              className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {site.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-4">
                {site.primaryUrl}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge label="Active" count={site.activeLinks} color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
                <StatusBadge label="Down" count={site.downLinks} color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" />
                <StatusBadge label="Blocked" count={site.blockedLinks} color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
