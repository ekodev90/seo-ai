import type { linkStatusEnum } from "@/db/schema";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  down: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  suspended: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  parked: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  unknown: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

export function LinkStatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          status === "active"
            ? "bg-green-500"
            : status === "down" || status === "blocked"
              ? "bg-red-500"
              : status === "suspended"
                ? "bg-orange-500"
                : "bg-gray-400"
        }`}
      />
      {status}
    </span>
  );
}
