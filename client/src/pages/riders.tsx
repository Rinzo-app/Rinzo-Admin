import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  fetchAdminRiders,
  approveRider,
  rejectRider,
  suspendRider,
  type BackendRider,
  ApiError,
} from "@/lib/backendApi";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Ban, RotateCcw, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

type ConfirmAction = { type: "approve" | "reject" | "suspend" | "reenable"; rider: BackendRider } | null;

export default function RidersPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [page, setPage] = useState(1);

  const { data: ridersResponse, isLoading } = useQuery({
    queryKey: ["admin-riders", page],
    queryFn: () => fetchAdminRiders({ page }),
    staleTime: 30_000,
  });
  const riders = ridersResponse?.data ?? [];
  const ridersPagination = ridersResponse?.pagination;

  const approve = useMutation({
    mutationFn: (id: string) => approveRider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      toast({ title: "Rider approved" });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConfirmAction(null);
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectRider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      toast({ title: "Rider rejected" });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConfirmAction(null);
    },
  });

  const suspend = useMutation({
    mutationFn: (id: string) => suspendRider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      toast({ title: "Rider suspended" });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConfirmAction(null);
    },
  });

  const isPending = approve.isPending || reject.isPending || suspend.isPending;

  const filtered = riders.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.phone && r.phone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  function handleConfirm() {
    if (!confirmAction) return;
    const id = confirmAction.rider.id;
    if (confirmAction.type === "approve" || confirmAction.type === "reenable") {
      approve.mutate(id);
    } else if (confirmAction.type === "reject") {
      reject.mutate(id);
    } else if (confirmAction.type === "suspend") {
      suspend.mutate(id);
    }
  }

  const confirmTitle = confirmAction
    ? confirmAction.type === "approve"
      ? `Approve ${confirmAction.rider.name}?`
      : confirmAction.type === "reenable"
        ? `Re-enable ${confirmAction.rider.name}?`
        : confirmAction.type === "reject"
          ? `Reject ${confirmAction.rider.name}?`
          : `Suspend ${confirmAction.rider.name}?`
    : "";

  const confirmDesc = confirmAction
    ? confirmAction.type === "approve" || confirmAction.type === "reenable"
      ? "This will grant rider access to the platform."
      : confirmAction.type === "reject"
        ? "This user will be rejected and cannot access the platform."
        : "This user will be suspended and lose access immediately."
    : "";

  const confirmIsDestructive = confirmAction?.type === "reject" || confirmAction?.type === "suspend";

  const columns: Column<BackendRider>[] = [
    { header: "Name", accessor: (row) => <span className="font-medium">{row.name}</span> },
    { header: "Email", accessor: (row) => <span className="text-sm text-muted-foreground">{row.email || "—"}</span> },
    { header: "Phone", accessor: (row) => <span className="text-sm">{row.phone || "—"}</span> },
    { header: "Vehicle", accessor: (row) => <span className="text-sm text-muted-foreground">{row.vehicleType || "—"}</span> },
    { header: "License", accessor: (row) => <span className="text-sm text-muted-foreground">{row.licenseNumber || "—"}</span> },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Submitted",
      accessor: (row) => (
        <span className="text-muted-foreground text-xs">
          {format(new Date(row.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          {row.status === "PENDING" && (
            <>
              <Button
                size="icon"
                variant="ghost"
                disabled={isPending}
                onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "approve", rider: row }); }}
                title="Approve"
                data-testid={`button-approve-rider-${row.id}`}
              >
                <Check className="w-4 h-4 text-emerald-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={isPending}
                onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "reject", rider: row }); }}
                title="Reject"
                data-testid={`button-reject-rider-${row.id}`}
              >
                <X className="w-4 h-4 text-red-600" />
              </Button>
            </>
          )}
          {(row.status === "APPROVED" || row.status === "ACTIVE") && (
            <Button
              size="icon"
              variant="ghost"
              disabled={isPending}
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "suspend", rider: row }); }}
              title="Suspend"
              data-testid={`button-suspend-rider-${row.id}`}
            >
              <Ban className="w-4 h-4 text-slate-600" />
            </Button>
          )}
          {row.status === "SUSPENDED" && (
            <Button
              size="icon"
              variant="ghost"
              disabled={isPending}
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "reenable", rider: row }); }}
              title="Re-enable"
              data-testid={`button-reenable-rider-${row.id}`}
            >
              <RotateCcw className="w-4 h-4 text-blue-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Rider Management"
        description="Review, approve, and manage pickup & delivery rider registrations"
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search riders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-riders"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-rider-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No riders found"
        testIdPrefix="row-rider"
        pagination={ridersPagination ? {
          page: ridersPagination.page,
          totalPages: ridersPagination.totalPages,
          onPageChange: setPage,
        } : undefined}
      />

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open && !isPending) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button
              variant={confirmIsDestructive ? "destructive" : "default"}
              disabled={isPending}
              onClick={handleConfirm}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {confirmAction?.type === "approve"
                ? "Approve"
                : confirmAction?.type === "reenable"
                  ? "Re-enable"
                  : confirmAction?.type === "reject"
                    ? "Reject"
                    : "Suspend"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
