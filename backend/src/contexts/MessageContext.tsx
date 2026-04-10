import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "@/lib/api";
import type { TeamMessage } from "@/types";

export type { TeamMessage };

interface MessageContextType {
  messages: TeamMessage[];
  sendMessage: (msg: Partial<TeamMessage>) => void;
  respondToRequest: (messageId: string, response: "accepted" | "rejected") => void;
  getUnreadCount: (userId: string) => number;
  getPendingRequestCount: (userId: string) => number;
  refreshMessages: () => Promise<void>;
}

const MessageContext = createContext<MessageContextType | null>(null);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);

  const refreshMessages = useCallback(async () => {
    try {
      const msgs = await api.getMessages();
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, []);

  useEffect(() => {
    if (api.getToken()) {
      refreshMessages();
    }
  }, [refreshMessages]);

  const sendMessage = useCallback(async (msg: Partial<TeamMessage>) => {
    try {
      const newMsg = await api.sendMessage(msg);
      setMessages((prev) => [newMsg, ...prev]);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }, []);

  const respondToRequest = useCallback(async (messageId: string, response: "accepted" | "rejected") => {
    try {
      await api.updateMessageStatus(messageId, response);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: response } : m)));
    } catch (err) {
      console.error("Failed to respond:", err);
    }
  }, []);

  const getUnreadCount = useCallback((userId: string) => {
    return messages.filter(
      (m) => m.toUserId === userId && !m.isRead && m.fromUserId !== userId
    ).length;
  }, [messages]);

  const getPendingRequestCount = useCallback((userId: string) => {
    return messages.filter(
      (m) => m.toUserId === userId && (m.type === "collaboration_request" || m.type === "approval_request") && m.status === "pending"
    ).length;
  }, [messages]);

  return (
    <MessageContext.Provider value={{ messages, sendMessage, respondToRequest, getUnreadCount, getPendingRequestCount, refreshMessages }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error("useMessages must be used within MessageProvider");
  return ctx;
};
