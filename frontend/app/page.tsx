"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import type { Conversation, AIModel } from "@/lib/types";
import { fetchModels, fetchConversations, deleteConversation } from "@/lib/api";

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // chatKey drives ChatArea remounts — only changes on explicit user navigation,
  // NOT when a conversation is auto-created mid-stream.
  const [chatKey, setChatKey] = useState<string>("new");
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    fetchModels()
      .then((m) => {
        setModels(m);
        if (m.length > 0) setSelectedModel(m[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingModels(false));

    fetchConversations()
      .then(setConversations)
      .catch(console.error);
  }, []);

  const handleNewConversation = () => {
    setActiveId(null);
    setChatKey("new-" + Date.now()); // remount → fresh chat
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    setChatKey(id); // remount → load that conversation from DB
  };

  // Called by ChatArea when a new conversation is auto-created during streaming.
  // We update the sidebar but do NOT change chatKey so ChatArea stays mounted.
  const handleConversationCreated = (conv: Conversation) => {
    setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
    setActiveId(conv.id); // highlight in sidebar
  };

  const handleConversationUpdated = (conv: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, ...conv } : c))
    );
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setChatKey("new-" + Date.now());
    }
  };

  const activeModel = models.find((m) => m.id === selectedModel) ?? null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNewConversation}
        onDelete={handleDelete}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatArea
          key={chatKey}
          conversationId={activeId}
          model={selectedModel}
          models={models}
          loadingModels={loadingModels}
          activeModel={activeModel}
          onModelChange={setSelectedModel}
          onConversationCreated={handleConversationCreated}
          onConversationUpdated={handleConversationUpdated}
        />
      </main>
    </div>
  );
}
