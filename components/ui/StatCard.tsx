import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string;
  hero?: boolean;
  ayerPct?: number | null;
  semanaPct?: number | null;
};

function PctRow({ pct, label }: { pct: number | null | undefined; label: string }) {
  if (pct === undefined) return null;
  if (pct === null) return <span className="text-xs text-muted">{label}: —</span>;

  const up = pct > 0;
  const zero = pct === 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs",
      zero ? "text-muted" : up ? "text-success" : "text-error"
    )}>
      {zero
        ? <Minus size={12} />
        : up
        ? <ArrowUpRight size={12} />
        : <ArrowDownRight size={12} />
      }
      {label}: {up ? "+" : ""}{pct}%
    </span>
  );
}

export default function StatCard({ label, value, hero, ayerPct, semanaPct }: Props) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-2">
      <p className="text-sm text-muted uppercase tracking-wider">{label}</p>
      <p className={cn(
        "font-semibold text-text-strong leading-none",
        hero ? "text-6xl text-accent" : "text-5xl"
      )}>
        {value}
      </p>
      {(ayerPct !== undefined || semanaPct !== undefined) && (
        <div className="flex flex-col gap-0.5 mt-1">
          <PctRow pct={ayerPct} label="vs ayer" />
          <PctRow pct={semanaPct} label="vs sem. ant." />
        </div>
      )}
    </div>
  );
}
