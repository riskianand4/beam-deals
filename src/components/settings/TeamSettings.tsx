import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, X, AlertTriangle, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

interface PendingInvite {
  email: string;
  role: string;
  sentAt: Date;
}

export function TeamSettings() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("rep");
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getRoleForUser = (userId: string) => {
    const role = roles?.find((r) => r.user_id === userId);
    return role?.role || "rep";
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default";
      case "manager": return "secondary";
      default: return "outline";
    }
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setPendingInvites((prev) => [...prev, { email: inviteEmail, role: inviteRole, sentAt: new Date() }]);
    toast.success(`Invite sent to ${inviteEmail} (prototype — no email delivered)`);
    setInviteEmail("");
    setInviteRole("rep");
  };

  const removeInvite = (email: string) => {
    setPendingInvites((prev) => prev.filter((i) => i.email !== email));
    toast.info(`Invite for ${email} removed.`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Invite Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" /> Invite Team Member
          </CardTitle>
          <CardDescription>Send an invitation to join your team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <div className="w-full sm:w-36 space-y-1">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="rep">Rep</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleInvite} className="w-full sm:w-auto">
                <Mail className="h-4 w-4 mr-1" /> Send Invite
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Email delivery requires a transactional email connector. Go to the <strong>Connectors</strong> tab to set one up.</span>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" /> Pending Invites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.email} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">Invited as {invite.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-600 border-yellow-500/40">Pending</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeInvite(invite.email)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" /> Team Members
          </CardTitle>
          <CardDescription>Current members in your organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : !profiles?.length ? (
            <div className="flex flex-col items-center py-8">
              <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No team members yet.</p>
            </div>
          ) : (
            profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border p-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {(p.full_name || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.company || "No company"}</p>
                </div>
                <Badge variant={roleBadgeVariant(getRoleForUser(p.user_id)) as any} className="capitalize">
                  {getRoleForUser(p.user_id)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
