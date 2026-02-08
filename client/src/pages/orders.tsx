import { useQuery } from "@tanstack/react-query";
import type { Order } from "@shared/schema";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

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

  const columns: Column<Order>[] = [
    {
      header: "Order ID",
      accessor: (row) => (
        <span className="font-mono text-xs" data-testid={`text-order-id-${row.id}`}>
          {row.id.substring(0, 8)}...
        </span>
      ),
    },
    { header: "Customer", accessor: "customerName" },
    { header: "Shop", accessor: "shopName" },
    {
      header: "Rider",
      accessor: (row) => row.riderName || <span className="text-muted-foreground">Unassigned</span>,
    },
    { header: "Items", accessor: "items" },
    {
      header: "Total",
      accessor: (row) => (
        <span className="font-medium">Rs. {row.totalAmount.toLocaleString()}</span>
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
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Orders"
        description="View laundry orders for debugging purposes (read-only)"
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
          <SelectTrigger className="w-[180px]" data-testid="select-filter-order-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PLACED">Placed</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="PREPARING">Preparing</SelectItem>
            <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No orders found"
        testIdPrefix="row-order"
      />
    </div>
  );
}
