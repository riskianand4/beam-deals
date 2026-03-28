import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePipelines, usePipelineStages } from "@/hooks/usePipelineStages";
import { useDeals, Deal } from "@/hooks/useDeals";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { CreateDealDialog } from "@/components/pipeline/CreateDealDialog";
import { DealDetailSheet } from "@/components/pipeline/DealDetailSheet";
import { PipelineFilters } from "@/components/pipeline/PipelineFilters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageBanner } from "@/components/PageBanner";
import { Plus, Kanban } from "lucide-react";

export default function Pipeline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines();
  const pipeline = pipelines?.[0];
  const { data: stages, isLoading: stagesLoading } = usePipelineStages(pipeline?.id);
  const { data: deals, isLoading: dealsLoading } = useDeals(pipeline?.id);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStageId, setCreateStageId] = useState<string | undefined>();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Open deal from search param
  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId && deals) {
      const found = deals.find((d) => d.id === openId);
      if (found) {
        setSelectedDeal(found);
        searchParams.delete("open");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, deals, setSearchParams]);

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    if (!search) return deals;
    const s = search.toLowerCase();
    return deals.filter(
      (d) =>
        d.title.toLowerCase().includes(s) ||
        d.companies?.name?.toLowerCase().includes(s) ||
        d.contacts?.first_name?.toLowerCase().includes(s) ||
        d.contacts?.last_name?.toLowerCase().includes(s)
    );
  }, [deals, search]);

  const handleCreatePipeline = async () => {
    if (!user) return;
    const { error } = await supabase.rpc("seed_default_pipeline", { p_user_id: user.id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Pipeline created!" });
      window.location.reload();
    }
  };

  const isLoading = pipelinesLoading || stagesLoading || dealsLoading;

  if (!pipelinesLoading && !pipeline) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Kanban className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Pipeline Yet</h2>
        <p className="text-muted-foreground mb-6">Create your first pipeline to start tracking deals.</p>
        <Button onClick={handleCreatePipeline} size="lg">
          <Plus className="h-5 w-5 mr-2" /> Create Pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBanner title="Pipeline" description="Drag deals across stages to update progress.">
        <Button className="w-full sm:w-auto" onClick={() => { setCreateStageId(stages?.[0]?.id); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Create Deal
        </Button>
      </PageBanner>

      <PipelineFilters search={search} onSearchChange={setSearch} />

      {isLoading ? (
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[500px] w-[280px] flex-shrink-0" />
          ))}
        </div>
      ) : stages && stages.length > 0 ? (
        <KanbanBoard
          stages={stages}
          deals={filteredDeals}
          onDealClick={setSelectedDeal}
          onAddDeal={(stageId) => { setCreateStageId(stageId); setCreateOpen(true); }}
        />
      ) : null}

      {pipeline && stages && (
        <CreateDealDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          pipelineId={pipeline.id}
          stages={stages}
          defaultStageId={createStageId}
        />
      )}

      <DealDetailSheet
        deal={selectedDeal}
        open={!!selectedDeal}
        onOpenChange={(o) => !o && setSelectedDeal(null)}
        stages={stages || []}
      />
    </div>
  );
}
