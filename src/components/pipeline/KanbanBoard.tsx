import { Deal, useUpdateDeal } from "@/hooks/useDeals";
import { PipelineStage } from "@/hooks/usePipelineStages";
import { KanbanColumn } from "./KanbanColumn";
import { useToast } from "@/hooks/use-toast";

interface KanbanBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  onAddDeal: (stageId: string) => void;
}

export function KanbanBoard({ stages, deals, onDealClick, onAddDeal }: KanbanBoardProps) {
  const updateDeal = useUpdateDeal();
  const { toast } = useToast();

  const handleDrop = (dealId: string, stageId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === stageId) return;

    const targetStage = stages.find((s) => s.id === stageId);
    updateDeal.mutate(
      { id: dealId, stage_id: stageId },
      {
        onSuccess: () => {
          toast({ title: "Deal moved", description: `Moved to ${targetStage?.name || "new stage"}` });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to move deal", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          deals={deals.filter((d) => d.stage_id === stage.id)}
          onDrop={handleDrop}
          onDealClick={onDealClick}
          onAddDeal={onAddDeal}
        />
      ))}
    </div>
  );
}
