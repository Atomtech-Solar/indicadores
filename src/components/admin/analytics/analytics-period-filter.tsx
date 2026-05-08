import { Button } from "@/components/ui/button";
import { ANALYTICS_PERIODS, type AnalyticsPeriod } from "@/lib/admin-analytics";

type AnalyticsPeriodFilterProps = {
  value: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
  disabled?: boolean;
};

export function AnalyticsPeriodFilter({ value, onChange, disabled }: AnalyticsPeriodFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filtro de período">
      {ANALYTICS_PERIODS.map((period) => {
        const active = value === period.key;
        return (
          <Button
            key={period.key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            variant={active ? "default" : "outline"}
            className="h-8 px-3 text-xs"
            onClick={() => onChange(period.key)}
          >
            {period.label}
          </Button>
        );
      })}
    </div>
  );
}
