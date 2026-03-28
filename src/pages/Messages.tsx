import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import type { TeamMessage } from "@/types";
import { motion } from "framer-motion";
import {
  Mail, Send, Inbox, PenSquare,
  ChevronLeft, Search, Trash2,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import SuccessDialog from "@/components/SuccessDialog";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";

type Section = "inbox" | "sent" | "compose";

const Messages = () => {
  const { user, users } = useAuth();

  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [section, setSection] = useState<Section>("inbox");
  const [selectedThread, setSelectedThread] = useState<TeamMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<TeamMessage[]>([]);
  const [replyContent, setReplyContent] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Compose
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeContent, setComposeContent] = useState("");

  // Success
  const [successDialog, setSuccessDialog] = useState<{ title: string; description?: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refreshMessages = useCallback(async () => {
    try {
      setLoading(true);
      const msgs = await api.getMessages();
      setMessages(msgs);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshMessages(); }, [refreshMessages]);

  const getUserName = (id: string) => users.find(u => u.id === id)?.name ?? "Tidak dikenal";
  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").substring(0, 2);

  const openThread = async (msg: TeamMessage) => {
    setSelectedThread(msg);
    if (msg.threadId) {
      try {
        const thread = await api.getThread(msg.threadId);
        setThreadMessages(thread);
      } catch { setThreadMessages([msg]); }
    } else {
      setThreadMessages([msg]);
    }
    if (!msg.isRead && msg.toUserId === user?.id) {
      try { await api.markMessageRead(msg.id); } catch { }
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedThread || !user) return;
    try {
      const reply = await api.sendMessage({
        fromUserId: user.id,
        toUserId: selectedThread.fromUserId === user.id ? selectedThread.toUserId : selectedThread.fromUserId,
        type: "message",
        subject: `Re: ${selectedThread.subject}`,
        content: replyContent.trim(),
        threadId: selectedThread.threadId,
        parentMessageId: selectedThread.id,
      });
      setThreadMessages(prev => [...prev, reply]);
      setReplyContent("");
      refreshMessages();
    } catch { }
  };

  const handleCompose = async () => {
    if (!composeContent.trim() || !composeRecipient || !user) return;
    try {
      await api.sendMessage({
        fromUserId: user.id,
        toUserId: composeRecipient,
        type: "message",
        subject: composeSubject.trim() || "(Tanpa subjek)",
        content: composeContent.trim(),
      });
      setComposeOpen(false);
      setComposeSubject("");
      setComposeContent("");
      setComposeRecipient("");
      refreshMessages();
      setSuccessDialog({ title: "Pesan berhasil dikirim!" });
    } catch { }
  };

  const handleDeleteMessage = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.deleteMessage(confirmDeleteId);
      setMessages(prev => prev.filter(m => m.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      setSuccessDialog({ title: "Pesan berhasil dihapus" });
    } catch { }
  };

  const inboxMessages = messages.filter(m =>
    m.toUserId === user?.id && m.fromUserId !== user?.id && m.type !== "approval_request"
  );
  const sentMessages = messages.filter(m => m.fromUserId === user?.id && m.type !== "approval_request");

  const filteredInbox = inboxMessages.filter(m =>
    !search || m.subject?.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase())
  );

  const groupByThread = (msgs: TeamMessage[]) => {
    const map = new Map<string, TeamMessage>();
    msgs.forEach(m => {
      const key = m.threadId || m.id;
      const existing = map.get(key);
      if (!existing || new Date(m.createdAt) > new Date(existing.createdAt)) {
        map.set(key, m);
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const otherUsers = users.filter(u => u.id !== user?.id);

  const sidebarItems: { key: Section; label: string; icon: typeof Inbox; count?: number }[] = [
    { key: "inbox", label: "Kotak Masuk", icon: Inbox, count: inboxMessages.filter(m => !m.isRead).length },
    { key: "sent", label: "Terkirim", icon: Send },
  ];

  const renderMessageRow = (msg: TeamMessage) => {
    const fromName = getUserName(msg.fromUserId);
    const isUnread = !msg.isRead && msg.toUserId === user?.id;
    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => openThread(msg)}
        className={`group flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border hover:bg-muted/40 transition-colors ${isUnread ? "bg-primary/5" : ""}`}
      >
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="bg-primary text-[10px] font-semibold">{getInitials(fromName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs truncate ${isUnread ? "font-bold text-foreground" : "font-medium text-foreground"}`}>{fromName}</span>
          </div>
          <p className={`text-xs truncate ${isUnread ? "font-semibold text-foreground" : "text-foreground"}`}>{msg.subject || "(Tanpa subjek)"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{msg.content.substring(0, 80)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: localeID })}
          </span>
          <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); setConfirmDeleteId(msg.id); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </motion.div>
    );
  };

  // Thread view
  if (selectedThread) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 max-w-8xl">
        <button onClick={() => { setSelectedThread(null); setThreadMessages([]); }} className="text-xs hover:underline flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Kembali
        </button>
        <div className="ms-card">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">{selectedThread.subject || "(Tanpa subjek)"}</h2>
            <p className="text-[10px] text-muted-foreground">
              {getUserName(selectedThread.fromUserId)} → {getUserName(selectedThread.toUserId)}
            </p>
          </div>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-0">
              {threadMessages.map(msg => {
                const isMine = msg.fromUserId === user?.id;
                return (
                  <div key={msg.id} className={`px-4 py-3 border-b border-border ${isMine ? "bg-primary/5" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-[8px] bg-primary font-semibold">{getInitials(getUserName(msg.fromUserId))}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground">{getUserName(msg.fromUserId)}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: localeID })}</span>
                    </div>
                    <p className="text-sm text-foreground ml-8">{msg.content}</p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Reply box */}
          <div className="px-4 py-3 border-t border-border space-y-2">
            <Textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="Balas pesan..." className="min-h-[60px] text-xs" />
            <Button size="sm" className="gap-1 text-xs" onClick={handleReply} disabled={!replyContent.trim()}>
              <Send className="w-3 h-3" /> Balas
            </Button>
          </div>
        </div>

        <SuccessDialog open={!!successDialog} onOpenChange={() => setSuccessDialog(null)} title={successDialog?.title || ""} description={successDialog?.description} />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-8xl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Mail className="w-4 h-4" /> Pesan
        </h1>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setComposeOpen(true)}>
          <PenSquare className="w-3.5 h-3.5" /> Tulis Pesan
        </Button>
      </div>

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-40 shrink-0 space-y-0.5">
          {sidebarItems.map(item => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${section === item.key ? "bg-primary font-medium" : "hover:bg-muted text-foreground"}`}
            >
              <item.icon className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">{item.label}</span>
              {(item.count ?? 0) > 0 && (
                <span className="w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center">{item.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 ms-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Cari pesan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Memuat...</div>
          ) : (
            <>
              {section === "inbox" && (
                groupByThread(filteredInbox).length === 0 ? (
                  <div className="p-8"><EmptyState icon={Inbox} title="Kotak masuk kosong" description="Belum ada pesan masuk." compact /></div>
                ) : groupByThread(filteredInbox).map(renderMessageRow)
              )}
              {section === "sent" && (
                groupByThread(sentMessages).length === 0 ? (
                  <div className="p-8"><EmptyState icon={Send} title="Belum ada pesan terkirim" description="" compact /></div>
                ) : groupByThread(sentMessages).map(renderMessageRow)
              )}
            </>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><PenSquare className="w-4 h-4 text-primary" /> Tulis Pesan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Kepada</Label>
              <Select value={composeRecipient} onValueChange={setComposeRecipient}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Pilih penerima..." /></SelectTrigger>
                <SelectContent className="h-64">
                  {otherUsers.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">{u.name} {u.position ? `— ${u.position}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subjek</Label>
              <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Subjek pesan..." className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Isi Pesan</Label>
              <Textarea value={composeContent} onChange={e => setComposeContent(e.target.value)} placeholder="Tulis pesan..." className="min-h-[120px] text-xs" />
            </div>
            <Button className="w-full text-xs gap-1.5" onClick={handleCompose} disabled={!composeRecipient || !composeContent.trim()}>
              <Send className="w-3.5 h-3.5" /> Kirim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SuccessDialog open={!!successDialog} onOpenChange={() => setSuccessDialog(null)} title={successDialog?.title || ""} description={successDialog?.description} />
      <ConfirmDialog open={!!confirmDeleteId} onOpenChange={o => { if (!o) setConfirmDeleteId(null); }} title="Hapus pesan ini?" description="Pesan akan dihapus permanen." variant="destructive" confirmText="Hapus" onConfirm={handleDeleteMessage} />
    </motion.div>
  );
};

export default Messages;
