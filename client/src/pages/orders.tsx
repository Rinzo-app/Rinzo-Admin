import { useQuery, useMutation } from "@tanstack/react-query";

/** All backend amounts are integer paise. */
function formatMoney(paise: number): string {
  const rupees = (paise ?? 0) / 100;
  return `₹${Number.isInteger(rupees) ? rupees.toLocaleString() : rupees.toFixed(2)}`;
}
import { queryClient } from "@/lib/queryClient";
import {
  fetchAdminOrders,
  fetchOrderDetail,
  fetchOrderEvents,
  fetchAdminRiders,
  assignPickup,
  assignDelivery,
  markPaymentCollected,
  type AdminOrder,
  type BackendOrderWithItems,
  type OrderEvent,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Truck, Package, Loader2, Banknote, ChevronsUpDown, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ── All real backend order statuses ──────────────────────
const ORDER_STATUSES = [
  "PLACED",
  "SHOP_ACCEPTED",
  "PICKUP_ASSIGNED",
  "PICKED_UP_FROM_CUSTOMER",
  "AT_SHOP",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REJECTED_BY_SHOP",
] as const;

export default function OrdersPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [riderIdInput, setRiderIdInput] = useState("");
  const [riderPopoverOpen, setRiderPopoverOpen] = useState(false);
  const [page, setPage] = useState(1);

  // ── Orders list ────────────────────────────────────────
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["admin-orders", page],
    queryFn: () => fetchAdminOrders({ page }),
    staleTime: 30_000,
  });
  const orders = ordersResponse?.data ?? [];
  const ordersPagination = ordersResponse?.pagination;

  // ── Selected order detail ──────────────────────────────
  const { data: detail, isLoading: detailLoading } =
    useQuery<BackendOrderWithItems>({
      queryKey: ["order-detail", selectedId],
      queryFn: () => fetchOrderDetail(selectedId!),
      enabled: !!selectedId,
    });

  // ── Selected order events ──────────────────────────────
  const { data: events = [], isLoading: eventsLoading } = useQuery<
    OrderEvent[]
  >({
    queryKey: ["order-events", selectedId],
    queryFn: () => fetchOrderEvents(selectedId!),
    enabled: !!selectedId,
  });

  // ── Available riders for pickup assignment ─────────────
  const { data: ridersResponse } = useQuery({
    queryKey: ["admin-riders-all"],
    queryFn: () => fetchAdminRiders({ limit: 100 }),
    staleTime: 30_000,
    enabled: !!selectedId && detail?.status === "SHOP_ACCEPTED",
  });
  const allRiders = ridersResponse?.data ?? [];

  const activeRiders = useMemo(
    () => allRiders.filter((r) => r.status === "ACTIVE"),
    [allRiders],
  );

  const selectedRider = useMemo(
    () => activeRiders.find((r) => r.id === riderIdInput) ?? null,
    [activeRiders, riderIdInput],
  );

  // ── Assign pickup mutation ─────────────────────────────
  const pickupMutation = useMutation({
    mutationFn: ({ orderId, riderId }: { orderId: string; riderId: string }) =>
      assignPickup(orderId, riderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["order-events", selectedId] });
      toast({ title: "Pickup rider assigned" });
      setRiderIdInput("");
      setRiderPopoverOpen(false);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiError ? err.message : err.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  // ── Assign delivery mutation ───────────────────────────
  const deliveryMutation = useMutation({
    mutationFn: (orderId: string) => assignDelivery(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["order-events", selectedId] });
      toast({ title: "Delivery assigned" });
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiError ? err.message : err.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });
  // ── Mark payment collected mutation ─────────────────
  const collectMutation = useMutation({
    mutationFn: (paymentId: string) => markPaymentCollected(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", selectedId] });
      toast({ title: "Payment marked as collected" });
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiError ? err.message : err.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });
  // ── Filtering ──────────────────────────────────────────
  const filtered = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.customerName.toLowerCase().includes(q) ||
        o.shopName.toLowerCase().includes(q) ||
        (o.riderName && o.riderName.toLowerCase().includes(q)) ||
        o.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Table columns ──────────────────────────────────────
  const columns: Column<AdminOrder>[] = [
    {
      header: "Order ID",
      accessor: (row) => (
        <span
          className="font-mono text-xs"
          data-testid={`text-order-id-${row.id}`}
        >
          {row.id.substring(0, 8)}...
        </span>
      ),
    },
    {
      header: "Customer",
      accessor: (row) => (
        <span className="font-mono text-xs">{row.customerName}</span>
      ),
    },
    {
      header: "Shop",
      accessor: (row) => (
        <span className="font-mono text-xs">{row.shopName}</span>
      ),
    },
    {
      header: "Rider",
      accessor: (row) =>
        row.riderName ? (
          <span className="font-mono text-xs">{row.riderName}</span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    { header: "Items", accessor: "items" },
    {
      header: "Total",
      accessor: (row) => (
        <span className="font-medium">
          {formatMoney(row.totalAmount)}
        </span>
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
          onClick={(e) => {
            e.stopPropagation();
            setSelectedId(row.id);
          }}
          title="View Details"
          data-testid={`button-view-order-${row.id}`}
        >
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  // ── Helpers for detail dialog ──────────────────────────
  const canAssignPickup = detail?.status === "SHOP_ACCEPTED";
  const canAssignDelivery = detail?.status === "READY";
  const canMarkCollected =
    detail?.payment &&
    detail.payment.method === "COD" &&
    detail.payment.status === "PENDING" &&
    detail.status === "DELIVERED";

  return (
    <div className="p-6">
      <PageHeader
        title="Orders"
        description="View and manage all laundry orders across the platform"
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-orders"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-[220px]"
            data-testid="select-filter-order-status"
          >
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No orders found"
        onRowClick={(row) => setSelectedId(row.id)}
        testIdPrefix="row-order"
        pagination={ordersPagination ? {
          page: ordersPagination.page,
          totalPages: ordersPagination.totalPages,
          onPageChange: setPage,
        } : undefined}
      />

      {/* ── Order detail dialog ─────────────────────────── */}
      <Dialog
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-order-detail-title">
              Order Details
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <div className="space-y-5">
              {/* ── Summary grid ──────────────────────── */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Order ID</span>
                  <p className="mt-1 font-mono text-xs">{detail.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-1">
                    <StatusBadge status={detail.status} />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer ID</span>
                  <p className="mt-1 font-mono text-xs">{detail.customerId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Shop ID</span>
                  <p className="mt-1 font-mono text-xs">{detail.shopId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rider ID</span>
                  <p className="mt-1 font-mono text-xs">
                    {detail.riderId || "Unassigned"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total</span>
                  <p className="mt-1 font-medium">
                    {formatMoney(detail.totalAmount)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pickup Address</span>
                  <p className="mt-1 text-xs">{detail.pickupAddress}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Delivery Address
                  </span>
                  <p className="mt-1 text-xs">{detail.deliveryAddress}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="mt-1">
                    {format(
                      new Date(detail.createdAt),
                      "MMM d, yyyy h:mm a",
                    )}
                  </p>
                </div>
                {detail.rejectionReason && (
                  <div>
                    <span className="text-muted-foreground">
                      Rejection Reason
                    </span>
                    <p className="mt-1">
                      {detail.rejectionReason.replace(/_/g, " ")}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Items ─────────────────────────────── */}
              <div>
                <span className="text-sm font-medium">Items</span>
                <div className="mt-2 rounded-md border divide-y">
                  {Array.isArray(detail.items) &&
                    detail.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span>{item.serviceName}</span>
                        <span className="text-muted-foreground">
                          {item.quantity} × Rs. {item.price}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <Separator />

              {/* ── Payment info ──────────────────────── */}
              {detail.payment && (
                <div>
                  <span className="text-sm font-medium">Payment</span>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Method</span>
                      <p className="mt-1">{detail.payment.method}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status</span>
                      <div className="mt-1">
                        <StatusBadge status={detail.payment.status} />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount</span>
                      <p className="mt-1 font-medium">
                        {formatMoney(detail.payment.amount)}
                      </p>
                    </div>
                    {detail.payment.collectedAt && (
                      <div>
                        <span className="text-muted-foreground">Collected At</span>
                        <p className="mt-1 text-xs">
                          {format(new Date(detail.payment.collectedAt), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* ── Event timeline ────────────────────── */}
              <div>
                <span className="text-sm font-medium">Event Log</span>
                {eventsLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading
                    events…
                  </div>
                ) : events.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    No events recorded yet.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="text-muted-foreground text-xs min-w-[130px]">
                          {format(
                            new Date(ev.createdAt),
                            "MMM d, h:mm:ss a",
                          )}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {ev.fromStatus && (
                            <StatusBadge status={ev.fromStatus} />
                          )}
                          <span className="text-muted-foreground">→</span>
                          <StatusBadge status={ev.toStatus} />
                        </div>
                        <span className="text-muted-foreground text-xs">
                          by {ev.actor}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Admin actions ─────────────────────── */}
              {(canAssignPickup || canAssignDelivery || canMarkCollected) && (
                <div className="space-y-3">
                  <span className="text-sm font-medium">Admin Actions</span>

                  {canAssignPickup && (
                    <div className="space-y-2">
                      <Label className="text-xs">Assign Pickup Rider</Label>

                      <Popover open={riderPopoverOpen} onOpenChange={setRiderPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={riderPopoverOpen}
                            className="w-full justify-between font-normal"
                            data-testid="rider-picker-trigger"
                          >
                            {selectedRider
                              ? `${selectedRider.name}${selectedRider.vehicleType ? ` · ${selectedRider.vehicleType}` : ""}`
                              : "Select a rider…"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search riders…" />
                            <CommandList>
                              <CommandEmpty>No active riders found.</CommandEmpty>
                              <CommandGroup>
                                {activeRiders.map((rider) => (
                                  <CommandItem
                                    key={rider.id}
                                    value={`${rider.name} ${rider.vehicleType ?? ""}`}
                                    onSelect={() => {
                                      setRiderIdInput(rider.id);
                                      setRiderPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        riderIdInput === rider.id ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-sm">{rider.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {rider.vehicleType ?? "No vehicle"} · {rider.phone ?? "No phone"}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Fallback manual UUID input */}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Or enter rider UUID manually
                        </summary>
                        <Input
                          placeholder="Paste rider UUID…"
                          value={riderIdInput}
                          onChange={(e) => setRiderIdInput(e.target.value)}
                          data-testid="input-rider-id"
                          className="mt-1 font-mono text-xs"
                        />
                      </details>

                      <Button
                        onClick={() =>
                          pickupMutation.mutate({
                            orderId: detail.id,
                            riderId: riderIdInput.trim(),
                          })
                        }
                        disabled={
                          pickupMutation.isPending || !riderIdInput.trim()
                        }
                        className="w-full"
                        data-testid="button-assign-pickup"
                      >
                        {pickupMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Package className="w-4 h-4 mr-2" />
                        )}
                        Assign Pickup
                      </Button>
                    </div>
                  )}

                  {canAssignDelivery && (
                    <Button
                      onClick={() => deliveryMutation.mutate(detail.id)}
                      disabled={deliveryMutation.isPending}
                      data-testid="button-assign-delivery"
                    >
                      {deliveryMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Truck className="w-4 h-4 mr-2" />
                      )}
                      Assign Delivery
                    </Button>
                  )}

                  {canMarkCollected && (
                    <Button
                      onClick={() => collectMutation.mutate(detail.payment!.id)}
                      disabled={collectMutation.isPending}
                      data-testid="button-mark-collected"
                    >
                      {collectMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Banknote className="w-4 h-4 mr-2" />
                      )}
                      Mark Cash Collected
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Order not found.
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedId(null)}
              data-testid="button-close-order-detail"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
