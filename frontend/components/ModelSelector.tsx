"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Cpu, Mic, Image, Volume2 } from "lucide-react";
import type { AIModel } from "@/lib/types";
import { clsx } from "clsx";

interface Props {
  models: AIModel[];
  selected: string;
  loading: boolean;
  onChange: (id: string) => void;
}

function CapabilityBadges({ caps }: { caps: AIModel["capabilities"] }) {
  return (
    <span className="flex gap-1">
      {caps.audio_input && <span title="Audio input"><Mic size={10} className="text-green-400" /></span>}
      {caps.audio_output && <span title="Audio output"><Volume2 size={10} className="text-green-400" /></span>}
      {caps.image_input && <span title="Image input"><Image size={10} className="text-blue-400" /></span>}
      {caps.image_output && <span title="Image output"><Image size={10} className="text-purple-400" /></span>}
    </span>
  );
}

export default function ModelSelector({ models, selected, loading, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.id === selected);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = models.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-zinc-700 text-sm text-zinc-200 hover:border-zinc-500 transition-colors min-w-[200px] max-w-xs"
      >
        <Cpu size={14} className="text-accent shrink-0" />
        <span className="flex-1 truncate text-left text-xs">
          {loading ? "Loading models..." : (selectedModel?.name ?? "Select model")}
        </span>
        {selectedModel && <CapabilityBadges caps={selectedModel.capabilities} />}
        <ChevronDown size={14} className={clsx("shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-80 bg-surface-2 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-zinc-700">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full bg-surface-3 text-sm text-zinc-200 px-3 py-1.5 rounded-lg outline-none placeholder:text-zinc-500"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="text-xs text-zinc-500 px-3 py-2">No models found</li>
            )}
            {filtered.map((m) => (
              <li
                key={m.id}
                onClick={() => { onChange(m.id); setOpen(false); setSearch(""); }}
                className={clsx(
                  "flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                  m.id === selected ? "bg-accent/20 text-accent" : "hover:bg-surface-3 text-zinc-300"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{m.name}</span>
                    <CapabilityBadges caps={m.capabilities} />
                  </div>
                  <span className="text-[10px] text-zinc-500 truncate block">{m.id}</span>
                </div>
                {m.pricing?.prompt && (
                  <span className="text-[10px] text-zinc-500 shrink-0 mt-0.5">
                    ${parseFloat(m.pricing.prompt) * 1_000_000}/M
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
