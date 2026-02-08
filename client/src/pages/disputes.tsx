import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Dispute } from "@shared/schema";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function DisputesPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const { data: disputes = [], isLoading } = useQuery<Dispute[]>({
    queryKey: ["/api/disputes"],
  });

  const updateDispute = useMutation({
    mutationFn: async ({ id, status, internalNotes }: { id: string; status: string; internalNotes: string }) => {
      await apiRequest("PATCH", `/api/disputes/${id}`, { status, internalNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
      toast({ title: "Dispute updated" });
      setSelected(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = disputes.filter((d) => {
    if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && d.raisedByType !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.raisedByName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        (d.orderId && d.orderId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const openDetail = (dispute: Dispute) => {
    setSelected(dispute);
    setNotes(dispute.internalNotes || "");
    setNewStatus(dispute.status);
  };

  const statusFlow = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"];

  const columns: Column<Dispute>[] = [
    {
      header: "Raised By",
      accessor: (row) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm">{row.raisedByName}</span>
          <StatusBadge status={row.raisedByType} />
        </div>
      ),
    },
    {
      header: "Order ID",
      accessor: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.orderId ? row.orderId.substring(0, 8) + "..." : "-"}
        </span>
      ),
    },
    { header: "Category", accessor: "category" },
    {
      header: "Description",
      accessor: (row) => (
        <span className="text-sm line-clamp-2 max-w-[200px]">{row.description}</span>
      ),
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Created",
      accessor: (row) => (
        <span className="text-muted-foreground text-xs">
          {format(new Date(row.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: (row) => (
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); openDetail(row); }}
          title="View Details"
          data-testid={`button-view-dispute-${row.id}`}
        >
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Support & Disputes"
        description="Manage disputes raised by customers, shops, and riders"
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search disputes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-disputes"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-dispute-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-dispute-type">
            <SelectValue placeholder="Raised by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="CUSTOMER">Customer</SelectItem>
            <SelectItem value="SHOP">Shop</SelectItem>
            <SelectItem value="RIDER">Rider</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No disputes found"
        testIdPrefix="row-dispute"
      />

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-dispute-detail-title">Dispute Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Raised By</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span>{selected.raisedByName}</span>
                    <StatusBadge status={selected.raisedByType} />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Order ID</span>
                  <p className="mt-1 font-mono text-xs">{selected.orderId || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category</span>
                  <p className="mt-1">{selected.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="mt-1">{format(new Date(selected.createdAt), "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Description</span>
                <p className="mt-1 text-sm bg-muted/50 rounded-md p-3" data-testid="text-dispute-description">
                  {selected.description}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger data-testid="select-dispute-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFlow.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  rows={3}
                  data-testid="textarea-dispute-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} data-testid="button-cancel-dispute">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selected) {
                  updateDispute.mutate({ id: selected.id, status: newStatus, internalNotes: notes });
                }
              }}
              disabled={updateDispute.isPending}
              data-testid="button-save-dispute"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
