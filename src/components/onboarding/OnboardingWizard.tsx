import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, ArrowLeft, Building2, Users, Kanban, Check, Plus, X } from "lucide-react";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const defaultStages = [
  { name: "Prospect", color: "#3b82f6" },
  { name: "Qualified", color: "#8b5cf6" },
  { name: "Proposal", color: "#f97316" },
  { name: "Negotiation", color: "#eab308" },
  { name: "Won", color: "#22c55e" },
  { name: "Lost", color: "#ef4444" },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [stages, setStages] = useState(defaultStages);
  const [newStageName, setNewStageName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const teamSizes = ["Just me", "2-5", "6-15", "16-50", "50+"];

  const handleRemoveStage = (idx: number) => {
    if (stages.length <= 2) return;
    setStages(stages.filter((_, i) => i !== idx));
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    const colors = ["#06b6d4", "#ec4899", "#14b8a6", "#f59e0b", "#6366f1", "#84cc16"];
    setStages([...stages, { name: newStageName.trim(), color: colors[stages.length % colors.length] }]);
    setNewStageName("");
  };

  const handleFinish = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // Update profile with company
      if (companyName) {
        await supabase.from("profiles").update({ company: companyName }).eq("user_id", user.id);
      }

      // Create pipeline with custom stages
      const { data: pipeline, error: pipelineError } = await supabase
        .from("pipelines")
        .insert({ name: "Sales Pipeline", created_by: user.id })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      const stageInserts = stages.map((s, i) => ({
        pipeline_id: pipeline.id,
        name: s.name,
        color: s.color,
        position: i,
      }));

      const { error: stagesError } = await supabase.from("pipeline_stages").insert(stageInserts);
      if (stagesError) throw stagesError;

      toast({ title: "You're all set! 🎉", description: "Your pipeline is ready to go." });
      onComplete();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-0 shadow-2xl">
        <CardHeader className="text-center pb-2">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${s === step ? "w-8 bg-primary" : s < step ? "w-2 bg-primary" : "w-2 bg-muted"}`}
              />
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Tell us about your company</CardTitle>
              <CardDescription>We'll use this to personalize your experience.</CardDescription>
            </>
          )}
          {step === 2 && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">How big is your team?</CardTitle>
              <CardDescription>This helps us tailor the right features.</CardDescription>
            </>
          )}
          {step === 3 && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Kanban className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Customize your pipeline</CardTitle>
              <CardDescription>Set up your sales stages. You can always change these later.</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="pt-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Inc."
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {teamSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setTeamSize(size)}
                  className={`rounded-xl border-2 p-4 text-center text-sm font-medium transition-all ${
                    teamSize === size
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {size}
                  {teamSize === size && <Check className="mx-auto mt-2 h-4 w-4" />}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                {stages.map((stage, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                    <span className="flex-1 text-sm font-medium">{stage.name}</span>
                    <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                    <button onClick={() => handleRemoveStage(idx)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Add custom stage..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
                />
                <Button variant="outline" size="icon" onClick={handleAddStage}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Launch Pipeline <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
