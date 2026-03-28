import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useContacts } from "@/hooks/useContacts";
import { useDeals } from "@/hooks/useDeals";
import { usePipelines, usePipelineStages } from "@/hooks/usePipelineStages";
import { useCompanies } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { Upload, Download, FileSpreadsheet, Loader2, Check, AlertCircle } from "lucide-react";
import { PageBanner } from "@/components/PageBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";

const MAX_CSV_SIZE = 1 * 1024 * 1024; // 1 MB

const contactRowSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).nullable(),
  phone: z.string().max(30).nullable(),
  position: z.string().max(100).nullable(),
  tags: z.string().max(500).nullable(),
});

const dealRowSchema = z.object({
  title: z.string().trim().min(1).max(200),
  value: z.number().min(0).default(0),
  probability: z.number().int().min(0).max(100).default(50),
  close_date: z.string().max(20).nullable(),
  notes: z.string().max(2000).nullable(),
});

export default function DataImportExport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: contacts } = useContacts();
  const { data: pipelines } = usePipelines();
  const pipeline = pipelines?.[0];
  const { data: deals } = useDeals(pipeline?.id);
  const { data: stages } = usePipelineStages(pipeline?.id);
  const { data: companies } = useCompanies();

  // Import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<"contacts" | "deals">("contacts");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);

  const contactFields = ["first_name", "last_name", "email", "phone", "position", "company", "tags"];
  const dealFields = ["title", "company", "value", "probability", "close_date", "stage", "notes"];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_CSV_SIZE) {
      toast({ title: "File too large", description: "CSV file must be under 1 MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
      if (lines.length < 2) {
        toast({ title: "Invalid CSV", description: "File must have headers and at least one row.", variant: "destructive" });
        return;
      }
      setCsvHeaders(lines[0]);
      setCsvData(lines.slice(1).filter((row) => row.some((cell) => cell)));
      setColumnMapping({});
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user || !csvData.length) return;
    setImporting(true);
    let success = 0;
    let errors = 0;

    const getVal = (row: string[], field: string) => {
      const col = columnMapping[field];
      if (!col) return null;
      const idx = csvHeaders.indexOf(col);
      return idx >= 0 ? row[idx] || null : null;
    };

    try {
      if (importType === "contacts") {
        for (const row of csvData) {
          const firstName = getVal(row, "first_name");
          const lastName = getVal(row, "last_name");

          const parsed = contactRowSchema.safeParse({
            first_name: firstName,
            last_name: lastName,
            email: getVal(row, "email") || null,
            phone: getVal(row, "phone") || null,
            position: getVal(row, "position") || null,
            tags: getVal(row, "tags") || null,
          });
          if (!parsed.success) { errors++; continue; }

          const d = parsed.data;
          const tagsArr = d.tags ? d.tags.split(";").map((t: string) => t.trim()) : [];
          const { error } = await supabase.from("contacts").insert({
            first_name: d.first_name,
            last_name: d.last_name,
            email: d.email,
            phone: d.phone,
            position: d.position,
            tags: tagsArr,
            created_by: user.id,
          });
          if (error) errors++;
          else success++;
        }
      } else {
        if (!pipeline || !stages?.length) {
          toast({ title: "No pipeline", description: "Create a pipeline first.", variant: "destructive" });
          setImporting(false);
          return;
        }
        const defaultStage = stages[0];
        for (const row of csvData) {
          const title = getVal(row, "title");
          const rawValue = getVal(row, "value");
          const rawProb = getVal(row, "probability");

          const parsed = dealRowSchema.safeParse({
            title,
            value: parseFloat(rawValue || "0") || 0,
            probability: parseInt(rawProb || "50") || 50,
            close_date: getVal(row, "close_date") || null,
            notes: getVal(row, "notes") || null,
          });
          if (!parsed.success) { errors++; continue; }

          const d = parsed.data;
          const stageName = getVal(row, "stage");
          const matchedStage = stageName
            ? stages.find((s) => s.name.toLowerCase() === stageName.toLowerCase())
            : null;

          const { error } = await supabase.from("deals").insert({
            title: d.title,
            pipeline_id: pipeline.id,
            stage_id: matchedStage?.id || defaultStage.id,
            owner_id: user.id,
            created_by: user.id,
            value: d.value,
            probability: d.probability,
            close_date: d.close_date,
            notes: d.notes,
          });
          if (error) errors++;
          else success++;
        }
      }

      setImportResult({ success, errors });
      toast({ title: "Import complete", description: `${success} imported, ${errors} errors.` });
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleExportContacts = () => {
    if (!contacts?.length) { toast({ title: "No contacts to export" }); return; }
    const headers = ["First Name", "Last Name", "Email", "Phone", "Position", "Company", "Tags"];
    const rows = contacts.map((c) => [
      c.first_name, c.last_name, c.email || "", c.phone || "", c.position || "",
      c.companies?.name || "", (c.tags || []).join(";"),
    ]);
    downloadCSV(headers, rows, "contacts_export.csv");
  };

  const handleExportDeals = () => {
    if (!deals?.length) { toast({ title: "No deals to export" }); return; }
    const headers = ["Title", "Company", "Contact", "Value", "Probability", "Close Date", "Stage", "Notes"];
    const rows = deals.map((d) => {
      const stage = stages?.find((s) => s.id === d.stage_id);
      return [
        d.title, d.companies?.name || "", d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name}` : "",
        String(d.value || 0), String(d.probability || 0), d.close_date || "", stage?.name || "", d.notes || "",
      ];
    });
    downloadCSV(headers, rows, "deals_export.csv");
  };

  const downloadCSV = (headers: string[], rows: string[][], filename: string) => {
    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = (type: "contacts" | "deals") => {
    if (type === "contacts") {
      const headers = ["first_name", "last_name", "email", "phone", "position", "company", "tags"];
      const sampleRows = [
        ["Jane", "Smith", "jane.smith@example.com", "+1-555-0101", "VP Sales", "Acme Corp", "decision-maker;enterprise"],
        ["John", "Doe", "john.doe@example.com", "+1-555-0102", "CTO", "Globex Inc", "technical;champion"],
        ["Maria", "Garcia", "maria.g@example.com", "", "Account Manager", "Initech", ""],
      ];
      downloadCSV(headers, sampleRows, "contacts_template.csv");
    } else {
      const headers = ["title", "company", "value", "probability", "close_date", "stage", "notes"];
      const sampleRows = [
        ["Enterprise License Deal", "Acme Corp", "85000", "60", "2026-04-15", "Qualified", "Initial discussions went well"],
        ["SaaS Migration Project", "Globex Inc", "120000", "40", "2026-05-01", "Proposal", "Awaiting budget approval"],
        ["Training Package", "Initech", "25000", "80", "2026-03-20", "Negotiation", "Final terms being reviewed"],
      ];
      downloadCSV(headers, sampleRows, "deals_template.csv");
    }
    toast({ title: "Template downloaded", description: `Use this CSV as a starting point for your ${type} import.` });
  };

  const fields = importType === "contacts" ? contactFields : dealFields;
  const mappedCount = Object.values(columnMapping).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageBanner title="Import / Export" description="Bulk import contacts and deals from CSV, or export your data." />

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import"><Upload className="h-4 w-4 mr-1" /> Import</TabsTrigger>
          <TabsTrigger value="export"><Download className="h-4 w-4 mr-1" /> Export</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6 mt-6">
          <div className="flex gap-3 items-center flex-wrap">
            <Select value={importType} onValueChange={(v: any) => { setImportType(v); setCsvData([]); setCsvHeaders([]); setColumnMapping({}); setImportResult(null); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contacts">Contacts</SelectItem>
                <SelectItem value="deals">Deals</SelectItem>
              </SelectContent>
            </Select>

            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Choose CSV File
            </Button>

            <Button variant="ghost" size="sm" onClick={() => handleDownloadTemplate(importType)}>
              <Download className="h-4 w-4 mr-1" /> Download Template
            </Button>
          </div>

          {csvHeaders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Map Columns</CardTitle>
                <CardDescription>Match your CSV columns to {importType} fields. {csvData.length} rows detected.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div key={field} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-28 capitalize">{field.replace("_", " ")}</span>
                      <Select value={columnMapping[field] || ""} onValueChange={(v) => setColumnMapping({ ...columnMapping, [field]: v })}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Select column..." /></SelectTrigger>
                        <SelectContent>
                          {csvHeaders.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {/* Preview */}
                {csvData.length > 0 && (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {csvHeaders.map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.slice(0, 3).map((row, i) => (
                          <TableRow key={i}>
                            {row.map((cell, j) => <TableCell key={j} className="text-xs">{cell}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {importResult && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                    {importResult.errors === 0 ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span>{importResult.success} imported successfully{importResult.errors > 0 ? `, ${importResult.errors} errors` : ""}.</span>
                  </div>
                )}

                <Button onClick={handleImport} disabled={importing || mappedCount === 0}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Import {csvData.length} {importType}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="export" className="space-y-4 mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Contacts</CardTitle>
                <CardDescription>{contacts?.length || 0} contacts available</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportContacts} disabled={!contacts?.length}>
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Deals</CardTitle>
                <CardDescription>{deals?.length || 0} deals available</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportDeals} disabled={!deals?.length}>
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
