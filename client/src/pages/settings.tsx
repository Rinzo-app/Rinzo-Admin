import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { fetchSettings, updateSettings, type PlatformSettings } from "@/lib/backendApi";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Each field: how to read it from the row (→ editable string) and how to
// turn the edited string back into the stored integer.
type FieldKind = "rupees" | "percent" | "minutes";

interface FieldDef {
  key: keyof Omit<PlatformSettings, "id" | "updatedAt">;
  label: string;
  hint: string;
  kind: FieldKind;
}

const FIELDS: FieldDef[] = [
  { key: "deliveryRatePerKm", label: "Delivery rate (₹/km)", hint: "Customer fee = round-trip km × this", kind: "rupees" },
  { key: "minDeliveryFee", label: "Minimum delivery fee (₹)", hint: "Floor for distance-based fee", kind: "rupees" },
  { key: "fallbackDeliveryFee", label: "Fallback delivery fee (₹)", hint: "Charged when GPS is unavailable", kind: "rupees" },
  { key: "riderPayoutPerKm", label: "Rider payout (₹/km)", hint: "What the rider earns per km (per leg)", kind: "rupees" },
  { key: "platformFee", label: "Platform fee (₹)", hint: "Flat fee added to every order", kind: "rupees" },
  { key: "commissionBps", label: "Commission (%)", hint: "Platform's cut of the item total", kind: "percent" },
  { key: "placedTimeoutMin", label: "Accept timeout (min)", hint: "Auto-cancel if the shop never accepts", kind: "minutes" },
  { key: "noRiderTimeoutMin", label: "No-rider timeout (min)", hint: "Auto-cancel if no rider is found", kind: "minutes" },
];

function toInput(value: number, kind: FieldKind): string {
  if (kind === "rupees") return String(value / 100);
  if (kind === "percent") return String(value / 100); // bps → %
  return String(value);
}
function fromInput(text: string, kind: FieldKind): number {
  const n = parseFloat(text);
  if (Number.isNaN(n)) return 0;
  if (kind === "rupees") return Math.round(n * 100);
  if (kind === "percent") return Math.round(n * 100); // % → bps
  return Math.round(n);
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: fetchSettings });
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      const next: Record<string, string> = {};
      for (const f of FIELDS) next[f.key] = toInput(data[f.key] as number, f.kind);
      setForm(next);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const patch: Record<string, number> = {};
      for (const f of FIELDS) patch[f.key] = fromInput(form[f.key] ?? "0", f.kind);
      return updateSettings(patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: "Settings saved", description: "New pricing applies to orders immediately." });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Pricing & Settings"
        description="Set fares, fees, commission, and auto-cancel timeouts. Changes take effect right away."
      />

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type="number"
                  inputMode="decimal"
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  data-testid={`input-${f.key}`}
                />
                <p className="text-xs text-muted-foreground">{f.hint}</p>
              </div>
            ))}
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save-settings">
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}
