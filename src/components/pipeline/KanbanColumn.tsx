import { useState } from "react";
import { Deal } from "@/hooks/useDeals";
import { PipelineStage } from "@/hooks/usePipelineStages";
import { DealCard } from "./DealCard";
import { formatCurrency } from "@/lib/formatters";
import { Kanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  onDrop: (dealId: string, stageId: string) => void;
  onDealClick: (deal: Deal) => void;
  onAddDeal: (stageId: string) => void;
}

export function KanbanColumn({ stage, deals, onDrop, onDealClick, onAddDeal }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const totalValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div className="min-w-[260px] flex-shrink-0">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
        <h3 className="text-sm font-semibold">{stage.name}</h3>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {deals.length}
        </span>
      </div>
      {totalValue > 0 && (
        <p className="mb-2 text-xs font-medium text-muted-foreground">{formatCurrency(totalValue)}</p>
      )}
      <div
        className={`space-y-2 rounded-xl p-3 min-h-[400px] transition-colors ${isDragOver ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted/50"}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const dealId = e.dataTransfer.getData("dealId");
          if (dealId) onDrop(dealId, stage.id);
        }}
      >
        {deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Kanban className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground/60">No deals yet</p>
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} stageColor={stage.color} onClick={() => onDealClick(deal)} />
          ))
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground hover:text-foreground"
          onClick={() => onAddDeal(stage.id)}
        >
          <Plus className="h-4 w-4 mr-1" /> Add deal
        </Button>
      </div>
    </div>
  );
}
