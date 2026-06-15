"use client";

import { Bot, User, Wrench, CheckCircle } from "lucide-react";
import type { Message } from "@/lib/types";
import { clsx } from "clsx";

interface ToolEvent {
  type: "tool_call" | "tool_result";
  tool: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

interface Props {
  message?: Message;
  toolEvent?: ToolEvent;
  streaming?: boolean;
  streamContent?: string;
}

function CodeBlock({ content }: { content: string }) {
  return (
    <pre className="bg-zinc-900 rounded-lg p-3 text-xs overflow-x-auto border border-zinc-700 my-2">
      <code>{content}</code>
    </pre>
  );
}

function renderContent(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const code = part.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
      return <CodeBlock key={i} content={code} />;
    }
    return (
      <span
        key={i}
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: part.replace(/\n/g, "<br/>") }}
      />
    );
  });
}

export function ToolCallBubble({ event }: { event: ToolEvent }) {
  const isCall = event.type === "tool_call";
  return (
    <div className="flex items-start gap-2 py-1 px-4">
      <div className="mt-0.5 p-1 rounded bg-amber-500/10 text-amber-400 shrink-0">
        {isCall ? <Wrench size={12} /> : <CheckCircle size={12} />}
      </div>
      <div className="text-xs text-zinc-400 max-w-lg">
        <span className="font-medium text-amber-400">
          {isCall ? `Calling: ${event.tool}` : `Result: ${event.tool}`}
        </span>
        {event.args && (
          <pre className="mt-1 bg-zinc-900 rounded p-2 text-[10px] overflow-x-auto border border-zinc-800">
            {JSON.stringify(isCall ? event.args : event.result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function MessageBubble({ message, streaming, streamContent }: Props) {
  const isUser = message?.role === "user";
  const content = streaming ? (streamContent ?? "") : (message?.content ?? "");

  if (!message && !streaming) return null;

  return (
    <div className={clsx("flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={clsx(
          "shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5",
          isUser ? "bg-accent/20 text-accent" : "bg-zinc-700 text-zinc-300"
        )}
      >
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      {/* Bubble */}
      <div
        className={clsx(
          "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed message-content",
          isUser
            ? "bg-accent text-white rounded-tr-sm"
            : "bg-surface-2 text-zinc-200 rounded-tl-sm"
        )}
      >
        {message?.content_type === "audio" ? (
          <span className="italic text-zinc-400 text-xs">[Voice message]</span>
        ) : (
          renderContent(content)
        )}
        {streaming && (
          <span className="inline-block w-1.5 h-4 bg-zinc-400 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
