import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  fetchAdminRiders,
  approveRider,
  rejectRider,
  suspendRider,
  rejectRiderDocuments,
  type BackendRider,
  type DocumentsStatus,
  ApiError,
} from "@/lib/backendApi";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { SuspendImpactNotice } from "@/components/suspend-impact";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Ban, RotateCcw, Search, Loader2, FileText } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const DOC_STATUS_META: Record<
  DocumentsStatus,
  { label: string; className: string }
> = {
  NOT_SUBMITTED: { label: "Not submitted", className: "bg-slate-100 text-slate-600" },
  SUBMITTED: { label: "Under review", className: "bg-amber-100 text-amber-700" },
  VERIFIED: { label: "Verified", className: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

type ConfirmAction = { type: "approve" | "reject" | "suspend" | "reenable"; rider: BackendRider } | null;

export default function RidersPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [docReview, setDocReview] = useState<BackendRider | null>(null);
  const [rejectReason, setRejectReason] = useState("");
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

  const approveDocs = useMutation({
    mutationFn: (id: string) => approveRider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      toast({ title: "Rider approved", description: "Documents verified and account activated." });
      setDocReview(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectDocs = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectRiderDocuments(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      toast({ title: "Documents returned", description: "The rider has been asked to re-upload." });
      setDocReview(null);
      setRejectReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isDocPending = approveDocs.isPending || rejectDocs.isPending;

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
      header: "Documents",
      accessor: (row) => {
        const ds = row.documentsStatus ?? "NOT_SUBMITTED";
        const meta = DOC_STATUS_META[ds];
        const hasAny = !!(row.dlImageUrl || row.rcImageUrl || row.selfieUrl);
        return (
          <button
            type="button"
            disabled={!hasAny}
            onClick={(e) => { e.stopPropagation(); setDocReview(row); setRejectReason(""); }}
            className="inline-flex items-center gap-1.5 disabled:cursor-default disabled:opacity-70"
            title={hasAny ? "Review documents" : "No documents submitted"}
            data-testid={`button-review-docs-${row.id}`}
          >
            <Badge className={meta.className}>{meta.label}</Badge>
            {hasAny && <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        );
      },
    },
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
            {confirmAction?.type === "suspend" && (
              <SuspendImpactNotice userId={confirmAction.rider.id} />
            )}
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

      <Dialog open={!!docReview} onOpenChange={(open) => { if (!open && !isDocPending) { setDocReview(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documents — {docReview?.name}</DialogTitle>
            <DialogDescription>
              Review the rider's KYC documents. Approving verifies the documents and activates the account.
            </DialogDescription>
          </DialogHeader>

          {docReview && (
            <div className="space-y-4">
              {docReview.documentsStatus === "REJECTED" && docReview.documentsRejectionReason && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <span className="font-medium">Previously returned: </span>
                  {docReview.documentsRejectionReason}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {([
                  ["Driving Licence", docReview.dlImageUrl],
                  ["Vehicle RC", docReview.rcImageUrl],
                  ["Selfie", docReview.selfieUrl],
                ] as const).map(([label, url]) => (
                  <div key={label} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={url}
                          alt={label}
                          className="aspect-square w-full rounded-md border object-cover hover:opacity-90"
                        />
                      </a>
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                        Not provided
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Reason (required to return documents)
                </p>
                <Textarea
                  placeholder="e.g. Licence photo is blurry — please re-upload a clearer image."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  data-testid="textarea-reject-reason"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="destructive"
              disabled={isDocPending || !rejectReason.trim() || !docReview}
              onClick={() => docReview && rejectDocs.mutate({ id: docReview.id, reason: rejectReason.trim() })}
              data-testid="button-confirm-reject-docs"
            >
              {rejectDocs.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Return for re-upload
            </Button>
            <Button
              disabled={isDocPending || !docReview}
              onClick={() => docReview && approveDocs.mutate(docReview.id)}
              data-testid="button-confirm-approve-docs"
            >
              {approveDocs.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Approve rider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
