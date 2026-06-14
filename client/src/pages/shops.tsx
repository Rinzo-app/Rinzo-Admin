import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  fetchAdminShops,
  approveShop,
  rejectShop,
  suspendShop,
  rejectShopDocuments,
  type BackendShop,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Check, X, Ban, RotateCcw, Search, Loader2, FileText } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

type ConfirmAction = { type: "approve" | "reject" | "suspend" | "reenable"; shop: BackendShop } | null;

const DOC_META: Record<DocumentsStatus, { label: string; className: string }> = {
  NOT_SUBMITTED: { label: "Not submitted", className: "bg-slate-100 text-slate-600" },
  SUBMITTED: { label: "Under review", className: "bg-amber-100 text-amber-700" },
  VERIFIED: { label: "Verified", className: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

export default function ShopsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [docReview, setDocReview] = useState<BackendShop | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [page, setPage] = useState(1);

  const { data: shopsResponse, isLoading } = useQuery({
    queryKey: ["admin-shops", page],
    queryFn: () => fetchAdminShops({ page }),
    staleTime: 30_000,
  });
  const shops = shopsResponse?.data ?? [];
  const shopsPagination = shopsResponse?.pagination;

  const approve = useMutation({
    mutationFn: (id: string) => approveShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      toast({ title: "Shop approved" });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConfirmAction(null);
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      toast({ title: "Shop rejected" });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConfirmAction(null);
    },
  });

  const suspend = useMutation({
    mutationFn: (id: string) => suspendShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      toast({ title: "Shop suspended" });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConfirmAction(null);
    },
  });

  const approveDocs = useMutation({
    mutationFn: (id: string) => approveShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      toast({ title: "Shop approved", description: "Documents verified and shop activated." });
      setDocReview(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const rejectDocs = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectShopDocuments(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      toast({ title: "Documents returned", description: "The shop has been asked to re-upload." });
      setDocReview(null);
      setRejectReason("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isDocPending = approveDocs.isPending || rejectDocs.isPending;

  const isPending = approve.isPending || reject.isPending || suspend.isPending;

  const filtered = shops.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  function handleConfirm() {
    if (!confirmAction) return;
    const id = confirmAction.shop.id;
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
      ? `Approve ${confirmAction.shop.name}?`
      : confirmAction.type === "reenable"
        ? `Re-enable ${confirmAction.shop.name}?`
        : confirmAction.type === "reject"
          ? `Reject ${confirmAction.shop.name}?`
          : `Suspend ${confirmAction.shop.name}?`
    : "";

  const confirmDesc = confirmAction
    ? confirmAction.type === "approve" || confirmAction.type === "reenable"
      ? "This will grant shop owner access to the platform."
      : confirmAction.type === "reject"
        ? "This user will be rejected and cannot access the platform."
        : "This user will be suspended and lose access immediately."
    : "";

  const confirmIsDestructive = confirmAction?.type === "reject" || confirmAction?.type === "suspend";

  const columns: Column<BackendShop>[] = [
    { header: "Shop Name", accessor: (row) => <span className="font-medium">{row.name}</span> },
    { header: "Owner", accessor: (row) => row.ownerName },
    { header: "Category", accessor: (row) => <span className="text-sm text-muted-foreground">{row.category || "—"}</span> },
    { header: "Email", accessor: (row) => <span className="text-sm text-muted-foreground">{row.email || "—"}</span> },
    { header: "Phone", accessor: (row) => <span className="text-sm">{row.phone || "—"}</span> },
    {
      header: "Documents",
      accessor: (row) => {
        const ds = row.documentsStatus ?? "NOT_SUBMITTED";
        const meta = DOC_META[ds];
        const hasAny = !!(row.panImageUrl || row.licenseImageUrl || row.panNumber || row.gstNumber);
        return (
          <button
            type="button"
            disabled={!hasAny}
            onClick={(e) => { e.stopPropagation(); setDocReview(row); setRejectReason(""); }}
            className="inline-flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-default"
            title={hasAny ? "Review documents" : "No documents submitted"}
            data-testid={`button-review-shop-docs-${row.id}`}
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
                onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "approve", shop: row }); }}
                title="Approve"
                data-testid={`button-approve-shop-${row.id}`}
              >
                <Check className="w-4 h-4 text-emerald-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={isPending}
                onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "reject", shop: row }); }}
                title="Reject"
                data-testid={`button-reject-shop-${row.id}`}
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
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "suspend", shop: row }); }}
              title="Suspend"
              data-testid={`button-suspend-shop-${row.id}`}
            >
              <Ban className="w-4 h-4 text-slate-600" />
            </Button>
          )}
          {row.status === "SUSPENDED" && (
            <Button
              size="icon"
              variant="ghost"
              disabled={isPending}
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "reenable", shop: row }); }}
              title="Re-enable"
              data-testid={`button-reenable-shop-${row.id}`}
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
        title="Laundry Shop Management"
        description="Review, approve, and manage laundry shop registrations"
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search shops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-shops"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-shop-status">
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
        emptyMessage="No shops found"
        testIdPrefix="row-shop"
        pagination={shopsPagination ? {
          page: shopsPagination.page,
          totalPages: shopsPagination.totalPages,
          onPageChange: setPage,
        } : undefined}
      />

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open && !isPending) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
            {confirmAction?.type === "suspend" && (
              <SuspendImpactNotice userId={confirmAction.shop.id} />
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

      <Dialog open={!!docReview} onOpenChange={(o) => { if (!o && !isDocPending) { setDocReview(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documents — {docReview?.name}</DialogTitle>
            <DialogDescription>
              Review the shop's business documents. Approving verifies them and activates the shop.
            </DialogDescription>
          </DialogHeader>

          {docReview && (
            <div className="space-y-4">
              {docReview.documentsStatus === "REJECTED" && docReview.documentsRejectionReason && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <span className="font-medium">Previously returned: </span>{docReview.documentsRejectionReason}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">PAN: </span>{docReview.panNumber || "—"}</div>
                <div><span className="text-muted-foreground">GST: </span>{docReview.gstNumber || "—"}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([["PAN card", docReview.panImageUrl], ["Shop licence", docReview.licenseImageUrl]] as const).map(([label, url]) => (
                  <div key={label} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={label} className="aspect-video w-full rounded-md border object-cover hover:opacity-90" />
                      </a>
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">Not provided</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Reason (required to return documents)</p>
                <Textarea
                  placeholder="e.g. PAN photo is blurry — please re-upload."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  data-testid="textarea-shop-reject-reason"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="destructive"
              disabled={isDocPending || !rejectReason.trim() || !docReview}
              onClick={() => docReview?.shopId && rejectDocs.mutate({ id: docReview.id, reason: rejectReason.trim() })}
              data-testid="button-confirm-reject-shop-docs"
            >
              {rejectDocs.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Return for re-upload
            </Button>
            <Button
              disabled={isDocPending || !docReview}
              onClick={() => docReview && approveDocs.mutate(docReview.id)}
              data-testid="button-confirm-approve-shop-docs"
            >
              {approveDocs.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Approve shop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
