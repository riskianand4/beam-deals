import { Deal } from "@/hooks/useDeals";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Calendar, DollarSign, GripVertical } from "lucide-react";

interface DealCardProps {
  deal: Deal;
  stageColor: string;
  onClick: () => void;
}

export function DealCard({ deal, stageColor, onClick }: DealCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("dealId", deal.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className="group relative cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 min-h-[44px]"
    >
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg" style={{ backgroundColor: stageColor }} />
      <div className="ml-2 space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-semibold leading-tight">{deal.title}</h4>
          <GripVertical className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {deal.companies && (
          <p className="text-xs text-muted-foreground">{deal.companies.name}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {deal.value > 0 && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(deal.value)}
            </span>
          )}
          {deal.close_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(deal.close_date)}
            </span>
          )}
        </div>
        {deal.contacts && (
          <p className="text-xs text-muted-foreground">
            {deal.contacts.first_name} {deal.contacts.last_name}
          </p>
        )}
      </div>
    </div>
  );
}
