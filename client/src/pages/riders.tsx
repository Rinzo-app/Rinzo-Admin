import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Rider } from "@shared/schema";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Ban, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function RidersPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data: riders = [], isLoading } = useQuery<Rider[]>({
    queryKey: ["/api/riders"],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/riders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      toast({ title: "Rider status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = riders.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns: Column<Rider>[] = [
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
    { header: "Phone", accessor: "phone" },
    { header: "Vehicle", accessor: "vehicleType" },
    { header: "License", accessor: "licenseNumber" },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Submitted",
      accessor: (row) => (
        <span className="text-muted-foreground text-xs">
          {format(new Date(row.submittedAt), "MMM d, yyyy")}
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
                onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: row.id, status: "APPROVED" }); }}
                title="Approve"
                data-testid={`button-approve-rider-${row.id}`}
              >
                <Check className="w-4 h-4 text-emerald-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: row.id, status: "REJECTED" }); }}
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
              onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: row.id, status: "SUSPENDED" }); }}
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
              onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: row.id, status: "APPROVED" }); }}
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
            <SelectItem value="APPROVED">Approved</SelectItem>
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
      />
    </div>
  );
}
