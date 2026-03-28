import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plug, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const connectors = [
  { id: "hubspot", name: "HubSpot", description: "CRM platform for sales, marketing, and customer service." },
  { id: "slack", name: "Slack", description: "Send messages and interact with Slack workspaces." },
  { id: "google_calendar", name: "Google Calendar", description: "Create and manage Google Calendar events." },
  { id: "telegram", name: "Telegram", description: "Messaging platform with Bot API for automated interactions." },
  { id: "elevenlabs", name: "ElevenLabs", description: "AI voice generation, text-to-speech, and speech-to-text." },
  { id: "firecrawl", name: "Firecrawl", description: "AI-powered scraper, search, and retrieval tool." },
  { id: "perplexity", name: "Perplexity", description: "AI-powered search and answer engine." },
  { id: "bigquery", name: "BigQuery", description: "Query and analyze data in BigQuery." },
];

export function ConnectorSettings() {
  const handleConnect = (name: string) => {
    toast.info(`To connect ${name}, go to Project Settings → Connectors in Lovable.`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-sm text-muted-foreground">
          Extend your CRM with external integrations. Connect third-party services to automate workflows and sync data.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {connectors.map((c) => (
          <Card key={c.id} className="flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{c.name}</CardTitle>
                <Badge variant="outline" className="text-xs">Available</Badge>
              </div>
              <CardDescription className="text-xs">{c.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" size="sm" className="w-full" onClick={() => handleConnect(c.name)}>
                <Plug className="h-3.5 w-3.5 mr-1" /> Connect
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-muted p-3 text-sm text-muted-foreground">
        <ExternalLink className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Connectors are managed through Lovable's integration platform. Click "Connect" on any service to get started.</span>
      </div>
    </div>
  );
}
