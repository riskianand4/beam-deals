import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeHref } from "@/lib/sanitize";

function parseMarkdown(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  // bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, (_, text, href) => `<a href="${sanitizeHref(href)}" class="text-primary underline" target="_blank" rel="noopener">${text}</a>`);
  // unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul class="list-disc pl-4 space-y-1">${m}</ul>`);
  // line breaks
  html = html.replace(/\n/g, "<br />");
  return html;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, rows = 3, placeholder }: RichTextEditorProps) {
  return (
    <Tabs defaultValue="write" className="w-full">
      <TabsList className="h-8">
        <TabsTrigger value="write" className="text-xs">Write</TabsTrigger>
        <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write" className="mt-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder || "Supports **bold**, *italic*, [links](url), and - lists"}
        />
      </TabsContent>
      <TabsContent value="preview" className="mt-2">
        <div
          className="min-h-[60px] rounded-md border bg-muted/30 p-3 text-sm prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: value ? parseMarkdown(value) : '<span class="text-muted-foreground">Nothing to preview</span>' }}
        />
      </TabsContent>
    </Tabs>
  );
}
