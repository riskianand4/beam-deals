import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { PipelineSettings } from "@/components/settings/PipelineSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { EmailTemplateSettings } from "@/components/settings/EmailTemplateSettings";
import { ConnectorSettings } from "@/components/settings/ConnectorSettings";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and pipeline configuration.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileSettings /></TabsContent>
        <TabsContent value="pipeline"><PipelineSettings /></TabsContent>
        <TabsContent value="team"><TeamSettings /></TabsContent>
        <TabsContent value="notifications"><NotificationSettings /></TabsContent>
        <TabsContent value="templates"><EmailTemplateSettings /></TabsContent>
        <TabsContent value="connectors"><ConnectorSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
