import { useQuery } from "@tanstack/react-query";
import { fetchUserImpact } from "@/lib/backendApi";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Shown inside the "Suspend user?" confirmation dialog.
 * Warns the admin about the user's active orders:
 * - PLACED orders are auto-cancelled by the backend on suspension
 * - in-progress orders need manual resolution (cancel / reassign)
 */
export function SuspendImpactNotice({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["user-impact", userId],
    queryFn: () => fetchUserImpact(userId),
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking active orders…
      </div>
    );
  }

  if (!data || data.totalActiveOrders === 0) {
    return (
      <p className="text-sm text-muted-foreground mt-2">
        No active orders are affected.
      </p>
    );
  }

  const inProgress = data.totalActiveOrders - (data.byStatus["PLACED"] ?? 0);

  return (
    <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm space-y-1">
      <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4" />
        {data.totalActiveOrders} active order{data.totalActiveOrders !== 1 ? "s" : ""} affected
      </div>
      {data.placedWillBeCancelled > 0 && (
        <p className="text-amber-700 dark:text-amber-400">
          {data.placedWillBeCancelled} not-yet-accepted (PLACED) order
          {data.placedWillBeCancelled !== 1 ? "s" : ""} will be{" "}
          <strong>cancelled automatically</strong>.
        </p>
      )}
      {inProgress > 0 && (
        <p className="text-amber-700 dark:text-amber-400">
          {inProgress} order{inProgress !== 1 ? "s" : ""} already in progress (
          {Object.entries(data.byStatus)
            .filter(([s]) => s !== "PLACED")
            .map(([s, n]) => `${n} ${s.replaceAll("_", " ").toLowerCase()}`)
            .join(", ")}
          ) will need <strong>manual resolution</strong> from the Orders page —
          cancel, refund, or reassign as appropriate.
        </p>
      )}
    </div>
  );
}
