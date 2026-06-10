import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  fetchAdminUsers,
  approveUser,
  rejectUser,
  suspendUser,
  type BackendUser,
  ApiError,
} from "@/lib/backendApi";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { SuspendImpactNotice } from "@/components/suspend-impact";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Ban, RotateCcw, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

// ── Shared status transition mutation ────────────────────

type ConfirmAction = { type: "approve" | "reject" | "suspend" | "reenable"; user: BackendUser } | null;

function useUserAction(onDone: () => void) {
  const { toast } = useToast();

  const approve = useMutation({
    mutationFn: (id: string) => approveUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User approved" });
      onDone();
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      onDone();
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User rejected" });
      onDone();
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      onDone();
    },
  });

  const suspend = useMutation({
    mutationFn: (id: string) => suspendUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User suspended" });
      onDone();
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      onDone();
    },
  });

  const isPending =
    approve.isPending || reject.isPending || suspend.isPending;

  return { approve, reject, suspend, isPending };
}

// ── User table for a given role ──────────────────────────

function UserTable({ role }: { role: "SHOP_OWNER" | "RIDER" }) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [page, setPage] = useState(1);

  const { approve, reject, suspend, isPending } = useUserAction(() => setConfirmAction(null));

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ["admin-users", role, page],
    queryFn: () => fetchAdminUsers({ role, page }),
    staleTime: 30_000,
  });
  const users = usersResponse?.data ?? [];
  const usersPagination = usersResponse?.pagination;

  const filtered = users.filter((u) => {
    if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function handleConfirm() {
    if (!confirmAction) return;
    const id = confirmAction.user.id;
    if (confirmAction.type === "approve" || confirmAction.type === "reenable") {
      approve.mutate(id);
    } else if (confirmAction.type === "reject") {
      reject.mutate(id);
    } else if (confirmAction.type === "suspend") {
      suspend.mutate(id);
    }
  }

  const roleLabel = role === "SHOP_OWNER" ? "shop owner" : "rider";

  const confirmTitle = confirmAction
    ? confirmAction.type === "approve"
      ? `Approve ${confirmAction.user.name}?`
      : confirmAction.type === "reenable"
        ? `Re-enable ${confirmAction.user.name}?`
        : confirmAction.type === "reject"
          ? `Reject ${confirmAction.user.name}?`
          : `Suspend ${confirmAction.user.name}?`
    : "";

  const confirmDesc = confirmAction
    ? confirmAction.type === "approve" || confirmAction.type === "reenable"
      ? `This will grant ${roleLabel} access to the platform.`
      : confirmAction.type === "reject"
        ? "This user will be rejected and cannot access the platform."
        : "This user will be suspended and lose access immediately."
    : "";

  const confirmIsDestructive = confirmAction?.type === "reject" || confirmAction?.type === "suspend";

  const columns: Column<BackendUser>[] = [
    {
      header: "Name",
      accessor: (row) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      header: "Email",
      accessor: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.email || "—"}
        </span>
      ),
    },
    {
      header: "Phone",
      accessor: (row) => (
        <span className="text-sm">{row.phone || "—"}</span>
      ),
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Registered",
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
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmAction({ type: "approve", user: row });
                }}
                title="Approve"
                data-testid={`button-approve-${row.id}`}
              >
                <Check className="w-4 h-4 text-emerald-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmAction({ type: "reject", user: row });
                }}
                title="Reject"
                data-testid={`button-reject-${row.id}`}
              >
                <X className="w-4 h-4 text-red-600" />
              </Button>
            </>
          )}
          {row.status === "ACTIVE" && (
            <Button
              size="icon"
              variant="ghost"
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction({ type: "suspend", user: row });
              }}
              title="Suspend"
              data-testid={`button-suspend-${row.id}`}
            >
              <Ban className="w-4 h-4 text-slate-600" />
            </Button>
          )}
          {row.status === "SUSPENDED" && (
            <Button
              size="icon"
              variant="ghost"
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction({ type: "reenable", user: row });
              }}
              title="Re-enable"
              data-testid={`button-reenable-${row.id}`}
            >
              <RotateCcw className="w-4 h-4 text-blue-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid={`input-search-${role.toLowerCase()}`}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-[160px]"
            data-testid={`select-filter-${role.toLowerCase()}-status`}
          >
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
        emptyMessage={`No ${role === "SHOP_OWNER" ? "shop owner" : "rider"} registrations found`}
        testIdPrefix={`row-user-${role.toLowerCase()}`}
        pagination={usersPagination ? {
          page: usersPagination.page,
          totalPages: usersPagination.totalPages,
          onPageChange: setPage,
        } : undefined}
      />

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open && !isPending) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
            {confirmAction?.type === "suspend" && (
              <SuspendImpactNotice userId={confirmAction.user.id} />
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
    </div>
  );
}

// ── Page component ───────────────────────────────────────

export default function ApprovalsPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="User Approvals"
        description="Review and manage pending shop owner and rider registrations"
      />

      <Tabs defaultValue="shop_owner" className="mt-2">
        <TabsList data-testid="tabs-approval-role">
          <TabsTrigger value="shop_owner">Shop Owners</TabsTrigger>
          <TabsTrigger value="rider">Riders</TabsTrigger>
        </TabsList>
        <TabsContent value="shop_owner" className="mt-4">
          <UserTable role="SHOP_OWNER" />
        </TabsContent>
        <TabsContent value="rider" className="mt-4">
          <UserTable role="RIDER" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
