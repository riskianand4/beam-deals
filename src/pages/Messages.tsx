import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { getUploadUrl } from "@/lib/api";
import type { ChatGroupData, TeamGroup, TeamMessage } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  CheckCheck,
  Copy,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Paperclip,
  Pin,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import SuccessDialog from "@/components/SuccessDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { toast } from "sonner";

interface ChatThread {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  lastTime: string;
  unread: number;
  avatarInitials: string;
  participantIds?: string[];
  createdBy?: string;
  avatarUrl?: string;
}

const isImageFile = (url: string) => {
  if (!url) return false;
  const ext = url.split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
};

const getFileName = (url: string) => {
  if (!url) return "file";
  const parts = url.split("/");
  return parts[parts.length - 1] || "file";
};

const Messages = () => {
  const { user, users } = useAuth();

  const [allMessages, setAllMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamGroup[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroupData[]>([]);
  const [search, setSearch] = useState("");

  // Active chat
  const [activeChat, setActiveChat] = useState<ChatThread | null>(null);
  const [chatMessages, setChatMessages] = useState<TeamMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // New chat/group dialog
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatType, setNewChatType] = useState<"personal" | "team" | "group">(
    "personal",
  );
  const [newChatRecipient, setNewChatRecipient] = useState("");
  const [newChatTeamId, setNewChatTeamId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [memberSearchText, setMemberSearchText] = useState("");

  // Group setup step (step 2: name + avatar)
  const [groupSetupStep, setGroupSetupStep] = useState<1 | 2>(1);
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(
    null,
  );
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  const [successDialog, setSuccessDialog] = useState<
    { title: string; description?: string } | null
  >(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<
    string | null
  >(null);
  const [confirmLeaveGroupId, setConfirmLeaveGroupId] = useState<string | null>(
    null,
  );

  // Context menu for threads
  const [threadContextMenu, setThreadContextMenu] = useState<
    { x: number; y: number; threadId: string } | null
  >(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<
    { x: number; y: number; msgId: string } | null
  >(null);

  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const hideThread = async (threadId: string) => {
    if (!user) return;
    try {
      if (threadId.startsWith("personal-")) {
        const otherId = threadId.replace("personal-", "");
        await api.deleteThread(otherId);
        setAllMessages((prev) =>
          prev.filter((m) => {
            if (
              m.type === "group" || m.toUserId === "all" || m.groupId
            ) return true;
            return !((m.fromUserId === user.id && m.toUserId === otherId) ||
              (m.fromUserId === otherId && m.toUserId === user.id));
          })
        );
      }
      if (activeChat?.id === threadId) setActiveChat(null);
      toast.success("Chat berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus chat");
    }
  };

  const refreshMessages = useCallback(async () => {
    try {
      setLoading(true);
      const msgs = await api.getMessages();
      setAllMessages(msgs);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);
  useEffect(() => {
    api.getTeams().then(setTeams).catch(() => []);
    api.getChatGroups().then(setChatGroups).catch(() => []);
  }, []);

  // Close context menus on click anywhere
  useEffect(() => {
    const handler = () => {
      setContextMenu(null);
      setThreadContextMenu(null);
    };
    if (contextMenu || threadContextMenu) {
      window.addEventListener("click", handler);
    }
    return () => window.removeEventListener("click", handler);
  }, [contextMenu, threadContextMenu]);

  const getUserName = (id: string) =>
    users.find((u) => u.id === id)?.name ?? "Tidak dikenal";
  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  // Membantu membuat preview layaknya WA (mengambil prefix 📷 Gambar atau 📎 Dokumen)
  const getMessagePreview = (msg: TeamMessage) => {
    let text = msg.content || "";
    // Mengamankan string '📎 nama file' yg dibuat sistem jika cuma text yg ada di db
    if (msg.attachmentUrl) {
      if (isImageFile(msg.attachmentUrl)) {
        text = text ? `📷 ${text}` : "📷 Gambar";
      } else {
        text = text ? `📎 ${text}` : "📎 Dokumen";
      }
    }
    return text.substring(0, 50);
  };

  // Build chat threads from messages
  const chatThreads = useMemo<ChatThread[]>(() => {
    if (!user) return [];
    const threadMap = new Map<string, ChatThread>();

    chatGroups.forEach((group) => {
      // HANYA TAMPILKAN JIKA SAYA ADALAH MEMBER DARI GRUP INI
      if (group.memberIds && !group.memberIds.includes(user.id)) return;

      threadMap.set(`group-${group.id}`, {
        id: `group-${group.id}`,
        name: group.name,
        isGroup: true,
        lastMessage: "",
        lastTime: group.createdAt,
        unread: 0,
        avatarInitials: group.name.substring(0, 2).toUpperCase(),
        participantIds: group.memberIds,
        createdBy: group.createdBy,
        avatarUrl: group.avatarUrl,
      });
    });

    allMessages.forEach((msg) => {
      if (msg.type === "approval_request") return;

      const previewText = getMessagePreview(msg);

      if (msg.groupId) {
        const group = chatGroups.find((g) => g.id === msg.groupId);
        // HANYA PROSES JIKA SAYA ADALAH MEMBER (Keamanan Ekstra)
        if (group && group.memberIds && !group.memberIds.includes(user.id)) {
          return;
        }

        const key = `group-${msg.groupId}`;
        const existing = threadMap.get(key);
        const lastMsgFormatted = `${
          msg.fromUserId === user.id ? "Anda" : getUserName(msg.fromUserId)
        }: ${previewText}`;

        if (
          existing &&
          (!existing.lastMessage ||
            new Date(msg.createdAt) > new Date(existing.lastTime))
        ) {
          existing.lastMessage = lastMsgFormatted;
          existing.lastTime = msg.createdAt;
        }
        return;
      }

      if (msg.type === "group" || msg.toUserId === "all") {
        const key = "group-all";
        const existing = threadMap.get(key);
        const lastMsgFormatted = `${
          msg.fromUserId === user.id ? "Anda" : getUserName(msg.fromUserId)
        }: ${previewText}`;

        if (
          !existing || new Date(msg.createdAt) > new Date(existing.lastTime)
        ) {
          threadMap.set(key, {
            id: key,
            name: "Ruang Bersama",
            isGroup: true,
            lastMessage: lastMsgFormatted,
            lastTime: msg.createdAt,
            unread: 0,
            avatarInitials: "RB",
          });
        } else if (new Date(msg.createdAt) > new Date(existing.lastTime)) {
          existing.lastMessage = lastMsgFormatted;
          existing.lastTime = msg.createdAt;
        }
        return;
      }

      // PERSONAL CHAT - PRIVACY FIX: ABAIKAN JIKA SAYA TIDAK TERLIBAT
      if (msg.fromUserId !== user.id && msg.toUserId !== user.id) return;

      const otherId = msg.fromUserId === user.id
        ? msg.toUserId
        : msg.fromUserId;
      if (otherId === user.id) return; // Mencegah chat dengan diri sendiri secara tidak sengaja

      const key = `personal-${otherId}`;
      const existing = threadMap.get(key);
      const isUnread = !msg.isRead && msg.toUserId === user.id &&
        msg.fromUserId !== user.id;
      const lastMsgFormatted = msg.fromUserId === user.id
        ? `Anda: ${previewText}`
        : previewText;

      if (!existing || new Date(msg.createdAt) > new Date(existing.lastTime)) {
        const otherName = getUserName(otherId);
        threadMap.set(key, {
          id: key,
          name: otherName,
          isGroup: false,
          lastMessage: lastMsgFormatted,
          lastTime: msg.createdAt,
          unread: (existing?.unread || 0) + (isUnread ? 1 : 0),
          avatarInitials: getInitials(otherName),
          participantIds: [user.id, otherId],
        });
      } else if (isUnread) {
        existing.unread++;
      } else if (new Date(msg.createdAt) > new Date(existing.lastTime)) {
        existing.lastMessage = lastMsgFormatted;
        existing.lastTime = msg.createdAt;
      }
    });

    return Array.from(threadMap.values()).sort((a, b) =>
      new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
    );
  }, [allMessages, user, users, chatGroups]);

  const filteredThreads = chatThreads.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  // Load chat messages when active chat changes
  useEffect(() => {
    if (!activeChat || !user) {
      setChatMessages([]);
      return;
    }

    if (activeChat.id.startsWith("group-") && activeChat.id !== "group-all") {
      const groupId = activeChat.id.replace("group-", "");
      const msgs = allMessages.filter((m) => m.groupId === groupId)
        .sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      setChatMessages(msgs);
    } else if (activeChat.id === "group-all") {
      const msgs = allMessages.filter((m) =>
        m.type === "group" || m.toUserId === "all"
      )
        .sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      setChatMessages(msgs);
    } else if (activeChat.id.startsWith("personal-")) {
      const otherId = activeChat.id.replace("personal-", "");
      const msgs = allMessages.filter((m) =>
        m.type !== "group" && m.toUserId !== "all" &&
        m.type !== "approval_request" && !m.groupId &&
        ((m.fromUserId === user.id && m.toUserId === otherId) ||
          (m.fromUserId === otherId && m.toUserId === user.id))
      ).sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setChatMessages(msgs);

      msgs.filter((m) => !m.isRead && m.toUserId === user.id).forEach((m) => {
        api.markMessageRead(m.id).catch(() => {});
      });
    }
  }, [activeChat, allMessages, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const pinnedMessages = useMemo(() => chatMessages.filter((m) => m.pinned), [
    chatMessages,
  ]);

  const handleSend = async () => {
    if ((!messageText.trim() && !messageFile) || !user || !activeChat) return;
    try {
      const fd = new FormData();
      fd.append("fromUserId", user.id);
      fd.append("content", messageText.trim()); // jangan paksakan memasukkan nama file di text jika ada attachment
      fd.append("subject", "");
      if (messageFile) fd.append("attachment", messageFile);

      if (activeChat.id === "group-all") {
        fd.append("toUserId", "all");
        fd.append("type", "group");
      } else if (
        activeChat.id.startsWith("group-") && activeChat.id !== "group-all"
      ) {
        const groupId = activeChat.id.replace("group-", "");
        fd.append("toUserId", "group");
        fd.append("type", "group");
        fd.append("groupId", groupId);
      } else if (activeChat.id.startsWith("personal-")) {
        const otherId = activeChat.id.replace("personal-", "");
        fd.append("toUserId", otherId);
        fd.append("type", "message");
      }

      await api.sendMessage(fd);
      setMessageText("");
      setMessageFile(null);
      refreshMessages();
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGroupAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupAvatarFile(file);
      setGroupAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleNewChat = async () => {
    if (newChatType === "personal" && newChatRecipient) {
      const key = `personal-${newChatRecipient}`;
      const existing = chatThreads.find((t) => t.id === key);
      if (existing) {
        setActiveChat(existing);
      } else {
        const name = getUserName(newChatRecipient);
        setActiveChat({
          id: key,
          name,
          isGroup: false,
          lastMessage: "",
          lastTime: new Date().toISOString(),
          unread: 0,
          avatarInitials: getInitials(name),
          participantIds: [user!.id, newChatRecipient],
        });
      }
    } else if (newChatType === "team" && newChatTeamId) {
      // Step 2: group setup
      if (groupSetupStep === 1) {
        const team = teams.find((t) => t.id === newChatTeamId);
        if (team) setNewGroupName(team.name);
        setGroupSetupStep(2);
        return;
      }
      const team = teams.find((t) => t.id === newChatTeamId);
      if (team) {
        try {
          const group = await api.createChatGroup(
            newGroupName || team.name,
            team.memberIds,
          );
          if (groupAvatarFile) {
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const updated = await api.updateGroupAvatar(group.id, {
                  avatar: reader.result as string,
                });
                setChatGroups(
                  (prev) => [
                    { ...group, avatarUrl: updated.avatarUrl },
                    ...prev,
                  ]
                );
              } catch {
                setChatGroups((prev) => [group, ...prev]);
              }
            };
            reader.readAsDataURL(groupAvatarFile);
          } else {
            setChatGroups((prev) => [group, ...prev]);
          }
          setActiveChat({
            id: `group-${group.id}`,
            name: newGroupName || team.name,
            isGroup: true,
            lastMessage: "",
            lastTime: new Date().toISOString(),
            unread: 0,
            avatarInitials: (newGroupName || team.name).substring(0, 2)
              .toUpperCase(),
            participantIds: group.memberIds,
            createdBy: group.createdBy,
          });
        } catch {}
      }
    } else if (newChatType === "group" && newGroupMembers.length > 0) {
      // Step 2: group setup
      if (groupSetupStep === 1) {
        setGroupSetupStep(2);
        return;
      }
      try {
        const group = await api.createChatGroup(
          newGroupName || "Grup Chat",
          newGroupMembers,
        );
        if (groupAvatarFile) {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const updated = await api.updateGroupAvatar(group.id, {
                avatar: reader.result as string,
              });
              setChatGroups(
                (prev) => [{ ...group, avatarUrl: updated.avatarUrl }, ...prev]
              );
            } catch {
              setChatGroups((prev) => [group, ...prev]);
            }
          };
          reader.readAsDataURL(groupAvatarFile);
        } else {
          setChatGroups((prev) => [group, ...prev]);
        }
        setActiveChat({
          id: `group-${group.id}`,
          name: group.name,
          isGroup: true,
          lastMessage: "",
          lastTime: new Date().toISOString(),
          unread: 0,
          avatarInitials: group.name.substring(0, 2).toUpperCase(),
          participantIds: group.memberIds,
          createdBy: group.createdBy,
        });
      } catch {}
    }
    setNewChatOpen(false);
    setNewChatRecipient("");
    setNewChatTeamId("");
    setNewGroupName("");
    setNewGroupMembers([]);
    setNewChatType("personal");
    setGroupSetupStep(1);
    setGroupAvatarFile(null);
    setGroupAvatarPreview(null);
  };

  const handleDeleteMessage = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.deleteMessage(confirmDeleteId);
      setAllMessages((prev) => prev.filter((m) => m.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      toast.success("Pesan berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus pesan");
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirmDeleteGroupId) return;
    try {
      await api.deleteChatGroup(confirmDeleteGroupId);
      setChatGroups((prev) =>
        prev.filter((g) => g.id !== confirmDeleteGroupId)
      );
      setAllMessages((prev) =>
        prev.filter((m) => m.groupId !== confirmDeleteGroupId)
      );
      if (activeChat?.id === `group-${confirmDeleteGroupId}`) {
        setActiveChat(null);
      }
      setConfirmDeleteGroupId(null);
      toast.success("Grup berhasil dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus grup");
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirmLeaveGroupId) return;
    try {
      await api.leaveChatGroup(confirmLeaveGroupId);
      setChatGroups((prev) => prev.filter((g) => g.id !== confirmLeaveGroupId));
      if (activeChat?.id === `group-${confirmLeaveGroupId}`) {
        setActiveChat(null);
      }
      setConfirmLeaveGroupId(null);
      toast.success("Berhasil keluar dari grup");
    } catch {
      toast.error("Gagal keluar dari grup");
    }
  };

  const handlePinMessage = async (msgId: string) => {
    try {
      const updated = await api.pinMessage(msgId);
      setAllMessages((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, pinned: updated.pinned } : m)
      );
      toast.success(updated.pinned ? "Pesan disematkan" : "Sematan dihapus");
    } catch {
      toast.error("Gagal menyematkan pesan");
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Pesan disalin");
  };

  const handleContextMenu = (e: React.MouseEvent, msgId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msgId });
  };

  const otherUsers = users.filter((u) => u.id !== user?.id);
  const filteredMembers = otherUsers.filter((u) =>
    u.name.toLowerCase().includes(memberSearchText.toLowerCase())
  );

  const getUserAvatar = (userId: string) => {
    const u = users.find((u) => u.id === userId);
    return u?.avatar ? getUploadUrl(u.avatar) : null;
  };

  const renderAttachment = (url: string, isMine: boolean) => {
    const fullUrl = getUploadUrl(url);
    if (isImageFile(url)) {
      return (
        <div
          className="mt-1.5 cursor-pointer"
          onClick={() => setPreviewImage(fullUrl)}
        >
          <img
            src={fullUrl}
            alt="attachment"
            className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
          />
        </div>
      );
    }
    return (
      <div
        className={`mt-1.5 rounded-lg p-2 flex items-center justify-center gap-3 flex-col border border-primary-foreground/30  shadow-md `}
      >
        <FileText className="w-8 h-8 shrink-0 " />
        <div className="flex gap-1 shrink-0">
          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className={`p-1 rounded hover:bg-white/10 text-[10px] ${
              isMine ? "text-primary-foreground/80" : "text-primary-foreground/80"
            }`}
          >
            Lihat
          </a>
          <a
            href={fullUrl}
            download
            className={`p-1 rounded hover:bg-white/10 text-[10px] ${
              isMine ? "text-primary-foreground/80" : "text-primary-foreground/80"
            }`}
          >
            Unduh
          </a>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-8xl h-[calc(100vh-7rem)]"
    >
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <MessagesSquare className="w-4 h-4" /> Ruang
        </h1>
      </div>

      <div className="flex h-[calc(100%-2rem)] border border-border rounded-lg overflow-hidden bg-card">
        {/* Left sidebar - Chat list */}
        <div className="w-80 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari percakapan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-8 h-8 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1" align="end">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors"
                    onClick={() => {
                      setNewChatType("personal");
                      setNewChatOpen(true);
                    }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat Baru
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors"
                    onClick={() => {
                      setNewChatType("team");
                      setNewChatOpen(true);
                    }}
                  >
                    <UsersRound className="w-3.5 h-3.5" /> Group dari Team
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors"
                    onClick={() => {
                      setNewChatType("group");
                      setNewChatOpen(true);
                    }}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Pilih Beberapa Orang
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Chat list */}
          <ScrollArea className="flex-1">
            {loading
              ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Memuat...
                </div>
              )
              : filteredThreads.length === 0
              ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Belum ada percakapan
                  </p>
                </div>
              )
              : (
                <div>
                  {filteredThreads.map((thread) => {
                    const personalUserId = !thread.isGroup
                      ? thread.id.replace("personal-", "")
                      : null;
                    const personalAvatar = personalUserId
                      ? getUserAvatar(personalUserId)
                      : null;
                    return (
                      <div
                        key={thread.id}
                        className={`relative w-full flex items-center gap-3 px-3 py-3 border-b border-border hover:bg-muted/40 transition-colors text-left cursor-pointer group/thread ${
                          activeChat?.id === thread.id ? "bg-muted/60" : ""
                        }`}
                        onClick={() => setActiveChat(thread)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setThreadContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            threadId: thread.id,
                          });
                        }}
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          {thread.avatarUrl && (
                            <AvatarImage src={getUploadUrl(thread.avatarUrl)} />
                          )}
                          {!thread.avatarUrl && personalAvatar && (
                            <AvatarImage src={personalAvatar} />
                          )}
                          <AvatarFallback
                            className={`text-xs font-semibold ${
                              thread.isGroup
                                ? "bg-accent text-accent-foreground"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {thread.isGroup
                              ? <Users className="w-4 h-4" />
                              : thread.avatarInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground truncate">
                              {thread.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(thread.lastTime), {
                                addSuffix: false,
                                locale: localeID,
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-muted-foreground truncate">
                              {thread.lastMessage}
                            </p>
                            {thread.unread > 0 && (
                              <span className="w-4 h-4 bg-primary text-primary-foreground rounded-full text-[9px] font-bold flex items-center justify-center shrink-0">
                                {thread.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </ScrollArea>
        </div>

        {/* Right - Chat area */}
        <div className="flex-1 flex flex-col">
          {!activeChat
            ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <MessagesSquare className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Pilih percakapan atau mulai chat baru
                  </p>
                </div>
              </div>
            )
            : (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/80">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      {activeChat.avatarUrl && (
                        <AvatarImage src={getUploadUrl(activeChat.avatarUrl)} />
                      )}
                      {!activeChat.avatarUrl && !activeChat.isGroup && (() => {
                        const pId = activeChat.id.replace("personal-", "");
                        const av = getUserAvatar(pId);
                        return av ? <AvatarImage src={av} /> : null;
                      })()}
                      <AvatarFallback
                        className={`text-[10px] font-semibold ${
                          activeChat.isGroup
                            ? "bg-accent text-accent-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {activeChat.isGroup
                          ? <Users className="w-3.5 h-3.5" />
                          : activeChat.avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {activeChat.name}
                      </p>
                      {activeChat.isGroup && activeChat.participantIds && (
                        <p className="text-[10px] text-muted-foreground">
                          {activeChat.participantIds.length} anggota
                        </p>
                      )}
                    </div>
                  </div>
                  {activeChat.isGroup && activeChat.id !== "group-all" && (
                    <div className="flex gap-1">
                      {activeChat.createdBy === user?.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-destructive"
                          onClick={() =>
                            setConfirmDeleteGroupId(
                              activeChat.id.replace("group-", ""),
                            )}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {activeChat.createdBy !== user?.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-muted-foreground"
                          onClick={() =>
                            setConfirmLeaveGroupId(
                              activeChat.id.replace("group-", ""),
                            )}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pinned messages */}
                {pinnedMessages.length > 0 && (
                  <div className="px-4 py-2 bg-accent/30 border-b border-border">
                    <div className="flex items-center gap-1.5 text-[10px]  font-medium mb-1">
                      <Pin className="w-3 h-3" />{" "}
                      Pesan Disematkan ({pinnedMessages.length})
                    </div>
                    {pinnedMessages.slice(0, 2).map((pm) => (
                      <p
                        key={pm.id}
                        className="text-[11px] text-muted-foreground truncate"
                      >
                        {getUserName(pm.fromUserId)}:{" "}
                        {pm.content.substring(0, 80)}
                      </p>
                    ))}
                  </div>
                )}

                {/* Messages area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {chatMessages.length === 0
                      ? (
                        <div className="text-center py-12">
                          <p className="text-xs text-muted-foreground">
                            Belum ada pesan. Mulai percakapan!
                          </p>
                        </div>
                      )
                      : (
                        chatMessages.map((msg) => {
                          const isMine = msg.fromUserId === user?.id;
                          const senderAvatar = !isMine
                            ? getUserAvatar(msg.fromUserId)
                            : null;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${
                                isMine ? "justify-end" : "justify-start"
                              } group`}
                            >
                              {!isMine && (
                                <Avatar className="w-6 h-6 shrink-0 mt-1 mr-1.5">
                                  {senderAvatar && (
                                    <AvatarImage src={senderAvatar} />
                                  )}
                                  <AvatarFallback className="text-[8px] bg-muted font-medium">
                                    {getInitials(getUserName(msg.fromUserId))}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={`max-w-[70%] space-y-0.5`}>
                                {activeChat.isGroup && !isMine && (
                                  <p className="text-[10px]  font-medium ml-1">
                                    {getUserName(msg.fromUserId)}
                                  </p>
                                )}
                                <div
                                  className={`relative rounded-xl px-3 py-2 ${
                                    isMine
                                      ? "bg-primary text-primary-foreground rounded-br-sm"
                                      : "bg-primary text-primary-foreground  rounded-bl-sm"
                                  } ${
                                    msg.pinned ? "ring-1 ring-primary/50" : ""
                                  }`}
                                  onContextMenu={(e) =>
                                    handleContextMenu(e, msg.id)}
                                >
                                  {msg.pinned && (
                                    <Pin className="w-2.5 h-2.5 absolute -top-1 -right-1 " />
                                  )}
                                  {msg.content && (
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                      {msg.content}
                                    </p>
                                  )}
                                  {msg.attachmentUrl &&
                                    renderAttachment(msg.attachmentUrl, isMine)}
                                  <div
                                    className={`flex items-center gap-1 justify-end mt-0.5 ${
                                      isMine
                                        ? "text-primary-foreground/60"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    <span className="text-[9px]">
                                      {(() => {
                                        try {
                                          return format(
                                            new Date(msg.createdAt),
                                            "HH:mm",
                                          );
                                        } catch {
                                          return "";
                                        }
                                      })()}
                                    </span>
                                    {isMine && (
                                      msg.isRead
                                        ? <CheckCheck className="w-3 h-3" />
                                        : <Check className="w-3 h-3" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Input area */}
                <div className="px-4 py-3 border-t border-border bg-card/80">
                  {messageFile && (
                    <div className="flex items-center gap-2 mb-2">
                      {messageFile.type.startsWith("image/")
                        ? (
                          <div className="relative">
                            <img
                              src={URL.createObjectURL(messageFile)}
                              alt="preview"
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => setMessageFile(null)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )
                        : (
                          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted rounded-lg">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <button
                              onClick={() => setMessageFile(null)}
                              className="hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        setMessageFile(e.target.files?.[0] || null)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-9 h-9 shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ketik pesan..."
                      className="min-h-[40px] max-h-[120px] text-sm flex-1 resize-none"
                      rows={1}
                    />
                    <Button
                      size="icon"
                      className="w-9 h-9 shrink-0"
                      onClick={handleSend}
                      disabled={!messageText.trim() && !messageFile}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
        </div>
      </div>

      {/* Thread Context Menu */}
      {threadContextMenu && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{ left: threadContextMenu.x, top: threadContextMenu.y }}
          onClick={() => setThreadContextMenu(null)}
        >
          {(() => {
            const thread = chatThreads.find((t) =>
              t.id === threadContextMenu.threadId
            );
            if (!thread) return null;
            return (
              <>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-foreground"
                  onClick={() => hideThread(threadContextMenu.threadId)}
                >
                  <X className="w-3 h-3" /> Hapus dari daftar
                </button>
                {thread.isGroup && thread.id !== "group-all" &&
                  thread.createdBy === user?.id && (
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-destructive"
                    onClick={() =>
                      setConfirmDeleteGroupId(thread.id.replace("group-", ""))}
                  >
                    <Trash2 className="w-3 h-3" /> Hapus Grup
                  </button>
                )}
                {thread.isGroup && thread.id !== "group-all" &&
                  thread.createdBy !== user?.id && (
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-destructive"
                    onClick={() =>
                      setConfirmLeaveGroupId(thread.id.replace("group-", ""))}
                  >
                    <LogOut className="w-3 h-3" /> Keluar Grup
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Message Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu(null)}
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-foreground"
            onClick={() => handlePinMessage(contextMenu.msgId)}
          >
            <Pin className="w-3 h-3" />
            {chatMessages.find((m) => m.id === contextMenu.msgId)?.pinned
              ? "Hapus Sematan"
              : "Sematkan"}
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-foreground"
            onClick={() => {
              const msg = chatMessages.find((m) => m.id === contextMenu.msgId);
              if (msg) handleCopyMessage(msg.content);
            }}
          >
            <Copy className="w-3 h-3" /> Salin
          </button>
          {chatMessages.find((m) => m.id === contextMenu.msgId)?.fromUserId ===
              user?.id && (
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-destructive"
              onClick={() => setConfirmDeleteId(contextMenu.msgId)}
            >
              <Trash2 className="w-3 h-3" /> Hapus
            </button>
          )}
        </div>
      )}

      {/* Image Preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-2xl p-2">
          {previewImage && (
            <img
              src={previewImage}
              alt="preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* New Chat Dialog */}
      <Dialog
        open={newChatOpen}
        onOpenChange={(o) => {
          setNewChatOpen(o);
          if (!o) {
            setGroupSetupStep(1);
            setGroupAvatarFile(null);
            setGroupAvatarPreview(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {newChatType === "personal"
                ? <MessageCircle className="w-4 h-4 " />
                : newChatType === "team"
                ? <UsersRound className="w-4 h-4" />
                : <UserPlus className="w-4 h-4 " />}
              {newChatType === "personal"
                ? "Chat Baru"
                : newChatType === "team"
                ? "Group dari Team"
                : "Buat Grup"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {newChatType === "personal" && (
              <div className="space-y-1">
                <Label className="text-xs">Pilih Penerima</Label>
                <Select
                  value={newChatRecipient}
                  onValueChange={setNewChatRecipient}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih orang..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {otherUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.name} {u.position ? `— ${u.position}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newChatType === "team" && groupSetupStep === 1 && (
              <div className="space-y-1">
                <Label className="text-xs">Pilih Team</Label>
                <Select value={newChatTeamId} onValueChange={setNewChatTeamId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name} ({t.memberIds.length} anggota)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newChatType === "group" && groupSetupStep === 1 && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Pilih Anggota</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama..."
                      value={memberSearchText}
                      onChange={(e) => setMemberSearchText(e.target.value)}
                      className="text-xs pl-8 h-8"
                    />
                  </div>
                  {newGroupMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {newGroupMembers.map((id) => (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="text-[10px] gap-1 pr-1"
                        >
                          {getUserName(id)}
                          <button
                            onClick={() =>
                              setNewGroupMembers((prev) =>
                                prev.filter((x) => x !== id)
                              )}
                            className="hover:text-destructive"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <ScrollArea className="max-h-[150px]">
                    <div className="space-y-0.5">
                      {filteredMembers.map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={newGroupMembers.includes(u.id)}
                            onCheckedChange={() =>
                              setNewGroupMembers((prev) =>
                                prev.includes(u.id)
                                  ? prev.filter((x) => x !== u.id)
                                  : [...prev, u.id]
                              )}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-xs text-foreground">
                            {u.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}

            {/* Step 2: Group name + avatar setup */}
            {(newChatType === "team" || newChatType === "group") &&
              groupSetupStep === 2 && (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-3">
                  <input
                    ref={groupAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGroupAvatarSelect}
                  />
                  <div
                    className="w-20 h-20 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden border-2 border-dashed border-border"
                    onClick={() => groupAvatarInputRef.current?.click()}
                  >
                    {groupAvatarPreview
                      ? (
                        <img
                          src={groupAvatarPreview}
                          alt="group avatar"
                          className="w-full h-full object-cover"
                        />
                      )
                      : (
                        <div className="text-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto" />
                          <span className="text-[9px] text-muted-foreground">
                            Foto Grup
                          </span>
                        </div>
                      )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nama Grup</Label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Masukkan nama grup..."
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            <Button
              className="w-full text-xs gap-1.5"
              onClick={handleNewChat}
              disabled={(newChatType === "personal" && !newChatRecipient) ||
                (newChatType === "team" && groupSetupStep === 1 &&
                  !newChatTeamId) ||
                (newChatType === "team" && groupSetupStep === 2 &&
                  !newGroupName.trim()) ||
                (newChatType === "group" && groupSetupStep === 1 &&
                  newGroupMembers.length === 0) ||
                (newChatType === "group" && groupSetupStep === 2 &&
                  !newGroupName.trim())}
            >
              <Send className="w-3.5 h-3.5" />
              {(newChatType === "team" || newChatType === "group") &&
                  groupSetupStep === 1
                ? "Lanjut"
                : "Mulai Chat"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SuccessDialog
        open={!!successDialog}
        onOpenChange={() => setSuccessDialog(null)}
        title={successDialog?.title || ""}
        description={successDialog?.description}
      />
      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => {
          if (!o) setConfirmDeleteId(null);
        }}
        title="Hapus pesan ini?"
        description="Pesan akan dihapus permanen."
        variant="destructive"
        confirmText="Hapus"
        onConfirm={handleDeleteMessage}
      />
      <ConfirmDialog
        open={!!confirmDeleteGroupId}
        onOpenChange={(o) => {
          if (!o) setConfirmDeleteGroupId(null);
        }}
        title="Hapus grup ini?"
        description="Semua pesan di grup akan dihapus permanen."
        variant="destructive"
        confirmText="Hapus Grup"
        onConfirm={handleDeleteGroup}
      />
      <ConfirmDialog
        open={!!confirmLeaveGroupId}
        onOpenChange={(o) => {
          if (!o) setConfirmLeaveGroupId(null);
        }}
        title="Keluar dari grup?"
        description="Anda tidak akan bisa melihat pesan di grup ini lagi."
        variant="destructive"
        confirmText="Keluar"
        onConfirm={handleLeaveGroup}
      />
    </motion.div>
  );
};

export default Messages;
