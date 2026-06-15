"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, AlertCircle } from "lucide-react";
import type { AIModel, Conversation, Message } from "@/lib/types";
import { fetchConversation, streamChat } from "@/lib/api";
import ModelSelector from "./ModelSelector";
import MessageBubble, { ToolCallBubble } from "./MessageBubble";
import AudioRecorder from "./AudioRecorder";
import FileAgentPanel from "./FileAgentPanel";
import { clsx } from "clsx";

interface Props {
  conversationId: string | null;
  model: string;
  models: AIModel[];
  loadingModels: boolean;
  activeModel: AIModel | null;
  onModelChange: (id: string) => void;
  onConversationCreated: (conv: Conversation) => void;
  onConversationUpdated: (conv: Conversation) => void;
}

interface ToolEvent {
  type: "tool_call" | "tool_result";
  tool: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

interface ChatItem {
  kind: "message" | "tool";
  message?: Message;
  toolEvent?: ToolEvent;
  id: string;
}

export default function ChatArea({
  conversationId,
  model,
  models,
  loadingModels,
  activeModel,
  onModelChange,
  onConversationCreated,
  onConversationUpdated,
}: Props) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = useState<{ base64: string; format: string } | null>(null);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [agentDir, setAgentDir] = useState("");
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Track conversation IDs created in this component session to avoid
  // double-fetching from DB when conversationId prop updates mid-stream.
  const localConvIds = useRef(new Set<string>());

  // Load existing conversation messages — only when explicitly navigated to,
  // not when auto-created during streaming (those are already in items).
  useEffect(() => {
    setActiveConvId(conversationId);
    if (!conversationId) {
      setItems([]);
      return;
    }
    if (localConvIds.current.has(conversationId)) return;
    fetchConversation(conversationId)
      .then((conv) => {
        const loaded: ChatItem[] = (conv.messages ?? []).map((m) => ({
          kind: "message",
          message: m,
          id: m.id,
        }));
        setItems(loaded);
      })
      .catch(console.error);
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items, streamContent]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [input]);

  const addItem = (item: ChatItem) =>
    setItems((prev) => [...prev, item]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text && !pendingAudio) return;
    if (streaming) return;

    setError(null);
    setInput("");
    setPendingAudio(null);

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: pendingAudio ? "[Voice message]" : text,
      content_type: pendingAudio ? "audio" : "text",
      created_at: new Date().toISOString(),
    };
    addItem({ kind: "message", message: userMsg, id: userMsg.id });

    setStreaming(true);
    setStreamContent("");

    // Plain mutable variable — avoids calling setItems inside a setState updater,
    // which React 18 Strict Mode would invoke twice and duplicate the message.
    let accumulated = "";

    try {
      let convId = activeConvId;

      for await (const event of streamChat({
        conversation_id: convId ?? undefined,
        model,
        message: text || " ",
        audio_data: pendingAudio?.base64,
        audio_format: pendingAudio?.format,
        base_directory: agentEnabled && agentDir ? agentDir : undefined,
      })) {
        if (event.type === "conversation_id") {
          convId = event.conversation_id ?? null;
          setActiveConvId(convId);
          if (convId) localConvIds.current.add(convId);
          if (convId && !activeConvId) {
            onConversationCreated({
              id: convId,
              title: text.slice(0, 60) || null,
              model,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        } else if (event.type === "chunk") {
          accumulated += event.content ?? "";
          setStreamContent(accumulated);
        } else if (event.type === "tool_call") {
          addItem({
            kind: "tool",
            toolEvent: { type: "tool_call", tool: event.tool!, args: event.args },
            id: `tc-${Date.now()}-${Math.random()}`,
          });
        } else if (event.type === "tool_result") {
          addItem({
            kind: "tool",
            toolEvent: { type: "tool_result", tool: event.tool!, result: event.result },
            id: `tr-${Date.now()}-${Math.random()}`,
          });
        } else if (event.type === "error") {
          setError(event.error ?? "Unknown error");
        } else if (event.type === "done") {
          if (convId) {
            onConversationUpdated({
              id: convId,
              title: text.slice(0, 60) || null,
              model,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Stream failed");
    } finally {
      setStreamContent("");
      setStreaming(false);
      if (accumulated) {
        addItem({
          kind: "message",
          message: {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: accumulated,
            content_type: "text",
            created_at: new Date().toISOString(),
          },
          id: `msg-${Date.now()}`,
        });
      }
    }
  }, [input, pendingAudio, streaming, activeConvId, model, agentEnabled, agentDir, onConversationCreated, onConversationUpdated]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const canSendAudio = activeModel?.capabilities.audio_input ?? false;

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-surface-1 shrink-0">
        <ModelSelector
          models={models}
          selected={model}
          loading={loadingModels}
          onChange={onModelChange}
        />
        {activeModel && (
          <div className="flex gap-1.5 text-[10px]">
            {activeModel.capabilities.audio_input && (
              <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Audio in</span>
            )}
            {activeModel.capabilities.audio_output && (
              <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Audio out</span>
            )}
            {activeModel.capabilities.image_input && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Vision</span>
            )}
            {activeModel.capabilities.image_output && (
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Images</span>
            )}
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {items.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full gap-5 select-none">
            {/* Big robot icon */}
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl bg-accent/15 flex items-center justify-center shadow-2xl shadow-accent/10 ring-1 ring-accent/20">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
                  {/* antenna */}
                  <rect x="30" y="4" width="4" height="9" rx="2" fill="#6366f1" opacity="0.8"/>
                  <circle cx="32" cy="3" r="3" fill="#6366f1"/>
                  {/* head */}
                  <rect x="12" y="13" width="40" height="30" rx="8" fill="#6366f1"/>
                  {/* eyes */}
                  <rect x="19" y="22" width="8" height="8" rx="4" fill="white"/>
                  <rect x="37" y="22" width="8" height="8" rx="4" fill="white"/>
                  <circle cx="23" cy="26" r="2.5" fill="#4338ca"/>
                  <circle cx="41" cy="26" r="2.5" fill="#4338ca"/>
                  {/* mouth */}
                  <rect x="22" y="34" width="20" height="4" rx="2" fill="white" opacity="0.7"/>
                  {/* ears */}
                  <rect x="6" y="22" width="6" height="12" rx="3" fill="#6366f1" opacity="0.6"/>
                  <rect x="52" y="22" width="6" height="12" rx="3" fill="#6366f1" opacity="0.6"/>
                  {/* body */}
                  <rect x="18" y="46" width="28" height="14" rx="6" fill="#6366f1" opacity="0.4"/>
                </svg>
              </div>
              {/* glow ring */}
              <div className="absolute inset-0 rounded-3xl bg-accent/5 blur-xl -z-10 scale-110" />
            </div>

            <div className="flex flex-col items-center gap-1">
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">BEagent</h2>
              <p className="text-sm text-zinc-500">Choose a model above and start chatting</p>
            </div>

            {agentEnabled && agentDir && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-xs text-accent">
                Agent mode active — <code>{agentDir}</code>
              </div>
            )}
          </div>
        )}

        {items.map((item) =>
          item.kind === "message" ? (
            <MessageBubble key={item.id} message={item.message} />
          ) : (
            <ToolCallBubble key={item.id} event={item.toolEvent!} />
          )
        )}

        {streaming && (
          <MessageBubble streaming streamContent={streamContent} />
        )}

        {error && (
          <div className="mx-4 my-2 flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <footer className="px-4 pb-4 pt-2 bg-surface shrink-0">
        {/* File agent panel */}
        <div className="mb-2">
          <FileAgentPanel
            enabled={agentEnabled}
            directory={agentDir}
            onToggle={() => setAgentEnabled((e) => !e)}
            onDirectoryChange={setAgentDir}
          />
        </div>

        {pendingAudio && (
          <div className="mb-2 flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5">
            <span>Voice message recorded — press Send to submit</span>
            <button onClick={() => setPendingAudio(null)} className="ml-auto text-zinc-400 hover:text-zinc-200">×</button>
          </div>
        )}

        <div className="flex items-end gap-2 bg-surface-2 border border-zinc-700 rounded-2xl px-3 py-2 focus-within:border-accent/50 transition-colors">
          {canSendAudio && (
            <AudioRecorder
              disabled={streaming}
              onAudio={(b64, fmt) => setPendingAudio({ base64: b64, format: fmt })}
            />
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={streaming}
            placeholder={
              agentEnabled
                ? "Tell the agent what to do with your files..."
                : "Message... (Shift+Enter for newline)"
            }
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm text-zinc-200 placeholder:text-zinc-500 max-h-44 py-1"
          />

          <button
            onClick={send}
            disabled={streaming || (!input.trim() && !pendingAudio)}
            className={clsx(
              "p-2 rounded-xl transition-colors shrink-0",
              streaming || (!input.trim() && !pendingAudio)
                ? "text-zinc-600 cursor-not-allowed"
                : "text-white bg-accent hover:bg-accent-hover"
            )}
          >
            <Send size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
