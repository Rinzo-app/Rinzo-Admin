import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  SUSPENDED: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  IN_REVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  CLOSED: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  PLACED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  PREPARING: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  DELIVERED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  SHOP_ACCEPTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  PICKUP_ASSIGNED: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  PICKED_UP_FROM_CUSTOMER: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  AT_SHOP: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  READY: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  REJECTED_BY_SHOP: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  COLLECTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CUSTOMER: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  SHOP: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  RIDER: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || "bg-muted text-muted-foreground";
  return (
    <Badge
      variant="outline"
      className={`${style} border-transparent no-default-hover-elevate no-default-active-elevate text-xs font-medium`}
      data-testid={`badge-status-${status.toLowerCase().replace(/_/g, "-")}`}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
