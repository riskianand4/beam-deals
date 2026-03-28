import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCompanies, Company, useDeleteCompany } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";
import { CompanyDetailSheet } from "@/components/companies/CompanyDetailSheet";
import { BulkActionBar } from "@/components/BulkActionBar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PageBanner } from "@/components/PageBanner";
import { Search } from "lucide-react";

export default function Companies() {
  const { data: companies, isLoading } = useCompanies();
  const { data: contacts } = useContacts();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const deleteCompany = useDeleteCompany();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId && companies) {
      const found = companies.find((c) => c.id === openId);
      if (found) {
        setSelectedCompany(found);
        searchParams.delete("open");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, companies, setSearchParams]);

  const filtered = companies?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const contactCount = (companyId: string) =>
    contacts?.filter((c) => c.company_id === companyId).length || 0;

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    await Promise.all(Array.from(selected).map((id) => deleteCompany.mutateAsync(id)));
    setSelected(new Set());
    setDeleting(false);
    toast({ title: `${selected.size} companies deleted` });
  };

  return (
    <div className="space-y-6">
      <PageBanner title="Companies" description="Manage your company accounts.">
        <CreateCompanyDialog />
      </PageBanner>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead className="hidden sm:table-cell">Website</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No companies found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((company) => (
                  <TableRow key={company.id} className="cursor-pointer">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(company.id)} onCheckedChange={() => toggleSelect(company.id)} />
                    </TableCell>
                    <TableCell className="font-medium" onClick={() => setSelectedCompany(company)}>{company.name}</TableCell>
                    <TableCell onClick={() => setSelectedCompany(company)}>{company.industry || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {company.website ? (
                        <a href={company.website} target="_blank" rel="noopener" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                          {company.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={() => setSelectedCompany(company)}>{contactCount(company.id)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <BulkActionBar count={selected.size} onDelete={handleBulkDelete} onClear={() => setSelected(new Set())} deleting={deleting} />
      <CompanyDetailSheet company={selectedCompany} open={!!selectedCompany} onOpenChange={(o) => { if (!o) setSelectedCompany(null); }} />
    </div>
  );
}
