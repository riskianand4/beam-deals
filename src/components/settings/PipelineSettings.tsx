import { useState } from "react";
import { usePipelines, usePipelineStages, PipelineStage } from "@/hooks/usePipelineStages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical } from "lucide-react";

export function PipelineSettings() {
  const { user } = useAuth();
  const { data: pipelines } = usePipelines();
  const pipeline = pipelines?.[0];
  const { data: stages } = usePipelineStages(pipeline?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#3b82f6");

  const handleAddStage = async () => {
    if (!pipeline || !newStageName.trim()) return;
    const maxPos = stages?.reduce((max, s) => Math.max(max, s.position), -1) ?? -1;
    const { error } = await supabase.from("pipeline_stages").insert({
      pipeline_id: pipeline.id,
      name: newStageName.trim(),
      color: newStageColor,
      position: maxPos + 1,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Stage added" });
      setNewStageName("");
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
    }
  };

  const handleDeleteStage = async (id: string) => {
    const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Stage removed" });
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
    }
  };

  const handleCreatePipeline = async () => {
    if (!user) return;
    const { error } = await supabase.rpc("seed_default_pipeline", { p_user_id: user.id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Pipeline created" });
      queryClient.invalidateQueries({ queryKey: ["pipelines", "pipeline_stages"] });
    }
  };

  if (!pipeline) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No pipeline found. Create one to get started.</p>
        <Button onClick={handleCreatePipeline}>Create Default Pipeline</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="text-sm font-semibold mb-3">Pipeline Stages</h3>
        <div className="space-y-2">
          {stages?.map((stage) => (
            <div key={stage.id} className="flex items-center gap-3 rounded-lg border p-3">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="flex-1 text-sm font-medium">{stage.name}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteStage(stage.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="New stage name" className="flex-1" />
        <input type="color" value={newStageColor} onChange={(e) => setNewStageColor(e.target.value)} className="h-10 w-10 rounded cursor-pointer" />
        <Button onClick={handleAddStage} size="icon"><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
