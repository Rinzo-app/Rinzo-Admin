import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { fetchSettlements, settleRiderCash, type RiderOutstanding } from "@/lib/backendApi";
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

  const outstanding = data?.outstanding ?? [];
  const recent = data?.recent ?? [];

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
        </div>
      )}

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
