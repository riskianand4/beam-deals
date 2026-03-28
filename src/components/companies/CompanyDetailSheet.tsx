import { useState, useEffect } from "react";
import { Company, useUpdateCompany, useDeleteCompany } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, X, Save, Trash2, Globe, Factory, Users } from "lucide-react";

interface CompanyDetailSheetProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyDetailSheet({ company, open, onOpenChange }: CompanyDetailSheetProps) {
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const { data: contacts } = useContacts();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editWebsite, setEditWebsite] = useState("");

  useEffect(() => {
    if (company && editing) {
      setEditName(company.name);
      setEditIndustry(company.industry || "");
      setEditWebsite(company.website || "");
    }
  }, [company, editing]);

  if (!company) return null;

  const linkedContacts = contacts?.filter((c) => c.company_id === company.id) || [];

  const handleSave = () => {
    updateCompany.mutate(
      { id: company.id, name: editName, industry: editIndustry || null, website: editWebsite || null },
      { onSuccess: () => { toast({ title: "Company updated" }); setEditing(false); } }
    );
  };

  const handleDelete = () => {
    deleteCompany.mutate(company.id, {
      onSuccess: () => { toast({ title: "Company deleted" }); onOpenChange(false); },
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setEditing(false); onOpenChange(o); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{company.name}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => setEditing(!editing)}>
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </div>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateCompany.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              {company.industry && (
                <div className="flex items-center gap-2 text-sm">
                  <Factory className="h-4 w-4 text-muted-foreground" />
                  <span>{company.industry}</span>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={company.website} target="_blank" rel="noopener" className="text-primary hover:underline">{company.website}</a>
                </div>
              )}
            </>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" /> Contacts ({linkedContacts.length})
            </h4>
            {linkedContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts linked to this company.</p>
            ) : (
              <div className="space-y-2">
                {linkedContacts.map((c) => (
                  <div key={c.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{c.first_name} {c.last_name}</p>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" /> Delete Company
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete company?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{company.name}" and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
