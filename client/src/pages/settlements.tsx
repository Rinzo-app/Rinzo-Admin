import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { fetchSettlements, settleRiderCash, fetchShopPayouts, payShop, type RiderOutstanding, type ShopOutstanding } from "@/lib/backendApi";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Banknote } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const money = (paise: number) => "₹" + (paise / 100).toFixed(0);

export default function SettlementsPage() {
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<RiderOutstanding | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin-settlements"], queryFn: fetchSettlements });

  const settle = useMutation({
    mutationFn: (userId: string) => settleRiderCash(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
      toast({ title: "Settled", description: "Cash hand-over recorded; the rider's dues are cleared." });
      setConfirm(null);
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't settle", description: err.message, variant: "destructive" });
      setConfirm(null);
    },
  });

  const [shopConfirm, setShopConfirm] = useState<ShopOutstanding | null>(null);
  const shopQuery = useQuery({ queryKey: ["admin-shop-payouts"], queryFn: fetchShopPayouts });

  const pay = useMutation({
    mutationFn: (shopId: string) => payShop(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shop-payouts"] });
      toast({ title: "Paid out", description: "Shop payout recorded; their balance is cleared." });
      setShopConfirm(null);
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't pay out", description: err.message, variant: "destructive" });
      setShopConfirm(null);
    },
  });

  const outstanding = data?.outstanding ?? [];
  const recent = data?.recent ?? [];
  const shopOutstanding = shopQuery.data?.outstanding ?? [];
  const shopRecent = shopQuery.data?.recent ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Rider Settlements"
        description="Riders holding collected COD cash. Mark cash hand-overs as settled (or riders can pay their dues via UPI)."
      />

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-8">
          {/* Outstanding */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Outstanding ({outstanding.length})</h3>
            {outstanding.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rider is holding unsettled cash. 🎉</p>
            ) : (
              <div className="border rounded-lg divide-y">
                {outstanding.map((r) => (
                  <div key={r.riderId} className="flex items-center gap-4 p-4" data-testid={`row-outstanding-${r.riderId}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.phone || "—"} · {r.orderCount} order(s)</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Collected {money(r.cashInHand)} · kept {money(r.yourCut)}</p>
                      <p className="font-semibold">Owes {money(r.handOver)}</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={settle.isPending || !r.userId}
                      onClick={() => setConfirm(r)}
                      data-testid={`button-settle-${r.riderId}`}
                    >
                      <Banknote className="w-4 h-4 mr-1.5" /> Mark settled
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent settlements */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Recent settlements</h3>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No settlements yet.</p>
            ) : (
              <div className="border rounded-lg divide-y">
                {recent.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                    <span className="text-muted-foreground">
                      {format(new Date(s.createdAt), "MMM d, h:mma")} · {s.method} · {s.createdBy}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-medium">{money(s.amount)}</span>
                      <span className={s.status === "PAID" ? "text-emerald-600" : "text-amber-600"}>{s.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Shop payouts ── */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Shop payouts owed ({shopOutstanding.length})</h3>
            {shopOutstanding.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shop has a pending balance.</p>
            ) : (
              <div className="border rounded-lg divide-y">
                {shopOutstanding.map((s) => (
                  <div key={s.shopId} className="flex items-center gap-4 p-4" data-testid={`row-shop-payout-${s.shopId}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.payoutMethod === "UPI"
                          ? `UPI: ${s.upiId || "—"}`
                          : s.payoutMethod === "BANK"
                          ? `Bank: ${s.bankAccountNumber || "—"} (${s.bankIfsc || "—"})`
                          : "No payout details on file"}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">{money(s.balance)}</p>
                    <Button
                      size="sm"
                      disabled={pay.isPending || !s.payoutMethod}
                      onClick={() => setShopConfirm(s)}
                      title={s.payoutMethod ? "" : "Shop hasn't added payout details"}
                      data-testid={`button-pay-shop-${s.shopId}`}
                    >
                      <Banknote className="w-4 h-4 mr-1.5" /> Pay out
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent shop payouts */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Recent shop payouts</h3>
            {shopRecent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shop payouts yet.</p>
            ) : (
              <div className="border rounded-lg divide-y">
                {shopRecent.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                    <span className="text-muted-foreground">
                      {format(new Date(p.createdAt), "MMM d, h:mma")} · {p.method}{p.reference ? ` · ${p.reference}` : ""}
                    </span>
                    <span className="font-medium">{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!shopConfirm} onOpenChange={(o) => { if (!o && !pay.isPending) setShopConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pay {shopConfirm?.name} {shopConfirm ? money(shopConfirm.balance) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirms you've transferred this amount to the shop via{" "}
              {shopConfirm?.payoutMethod === "UPI" ? `UPI (${shopConfirm?.upiId})` : `bank (${shopConfirm?.bankAccountNumber})`}.
              It clears their balance. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pay.isPending}>Cancel</AlertDialogCancel>
            <Button disabled={pay.isPending} onClick={() => shopConfirm && pay.mutate(shopConfirm.shopId)}>
              {pay.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirm paid
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o && !settle.isPending) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Settle {confirm?.name}'s cash?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirms you've received {confirm ? money(confirm.handOver) : ""} in cash from this rider. It closes all
              {confirm ? ` ${confirm.orderCount}` : ""} collected order(s) as settled. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={settle.isPending}>Cancel</AlertDialogCancel>
            <Button disabled={settle.isPending || !confirm?.userId} onClick={() => confirm?.userId && settle.mutate(confirm.userId)}>
              {settle.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirm settled
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
