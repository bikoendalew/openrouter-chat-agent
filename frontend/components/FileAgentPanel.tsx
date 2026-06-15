"use client";

import { useState } from "react";
import { FolderOpen, X, ChevronDown, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  enabled: boolean;
  directory: string;
  onToggle: () => void;
  onDirectoryChange: (dir: string) => void;
}

export default function FileAgentPanel({ enabled, directory, onToggle, onDirectoryChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={clsx(
      "border rounded-xl transition-colors",
      enabled ? "border-accent/50 bg-accent/5" : "border-zinc-700 bg-surface-1"
    )}>
      {/* Toggle row */}
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          onClick={onToggle}
          className={clsx(
            "relative w-9 h-5 rounded-full transition-colors shrink-0",
            enabled ? "bg-accent" : "bg-zinc-600"
          )}
        >
          <span
            className={clsx(
              "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
              enabled && "translate-x-4"
            )}
          />
        </button>
        <FolderOpen size={14} className={clsx(enabled ? "text-accent" : "text-zinc-500")} />
        <span className={clsx("text-xs font-medium", enabled ? "text-zinc-200" : "text-zinc-400")}>
          File Agent Mode
        </span>
        {enabled && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="ml-auto text-zinc-400 hover:text-zinc-200"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      {/* Directory picker */}
      {enabled && (
        <div className={clsx("overflow-hidden transition-all", expanded ? "max-h-24" : "max-h-0 invisible")}>
          <div className="px-3 pb-3">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
              Base directory
            </label>
            <input
              value={directory}
              onChange={(e) => onDirectoryChange(e.target.value)}
              placeholder="C:\Users\you\projects\my-app"
              className="w-full bg-surface-2 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-accent/50 transition-colors"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              The AI can read, write, and delete files inside this directory.
            </p>
          </div>
        </div>
      )}

      {/* Quick show directory when not expanded */}
      {enabled && !expanded && directory && (
        <div className="px-3 pb-2">
          <span className="text-[10px] text-zinc-500 truncate block">{directory}</span>
        </div>
      )}
    </div>
  );
}
