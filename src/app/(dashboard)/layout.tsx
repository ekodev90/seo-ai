import { auth } from "@/lib/auth";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        const { auth } = await import("@/lib/auth");
        await auth.api.signOut({
          headers: await headers(),
        });
      }}
    >
      <button
        type="submit"
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        Sign Out
      </button>
    </form>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                SEO-AI
              </Link>
              <div className="hidden sm:flex items-center gap-4">
                <Link
                  href="/"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  Sites
                </Link>
                <Link
                  href="/settings"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {session.user.name}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
