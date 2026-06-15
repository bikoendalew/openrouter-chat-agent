"use client";

import { MessageSquare, Plus, Trash2, Bot } from "lucide-react";
import type { Conversation } from "@/lib/types";
import { clsx } from "clsx";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="w-64 flex flex-col bg-surface-1 border-r border-zinc-800 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-zinc-800">
        <Bot className="text-accent" size={22} />
        <span className="font-semibold text-zinc-100 text-sm tracking-wide">BEagent</span>
      </div>

      {/* New chat button */}
      <div className="px-3 py-3">
        <button
          onClick={onNew}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-surface-2 hover:text-zinc-100 transition-colors"
        >
          <Plus size={16} />
          New conversation
        </button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-xs text-zinc-500 px-3 py-4 text-center">No conversations yet</p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={clsx(
              "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors",
              conv.id === activeId
                ? "bg-surface-3 text-zinc-100"
                : "text-zinc-400 hover:bg-surface-2 hover:text-zinc-100"
            )}
            onClick={() => onSelect(conv.id)}
          >
            <MessageSquare size={14} className="shrink-0" />
            <span className="flex-1 text-xs truncate">
              {conv.title ?? "Untitled"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}
