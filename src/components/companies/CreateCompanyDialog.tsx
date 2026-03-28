import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateCompany } from "@/hooks/useCompanies";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export function CreateCompanyDialog() {
  const { user } = useAuth();
  const createCompany = useCreateCompany();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    createCompany.mutate(
      { name: name.trim(), industry: industry || null, website: website || null, created_by: user.id },
      {
        onSuccess: () => {
          toast({ title: "Company created" });
          setOpen(false);
          setName("");
          setIndustry("");
          setWebsite("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Add Company</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." maxLength={500} />
          </div>
          <Button type="submit" disabled={createCompany.isPending} className="w-full">
            Create Company
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
