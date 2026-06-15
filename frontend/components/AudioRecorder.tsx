"use client";

import { useState, useRef } from "react";
import { Mic, Square } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  onAudio: (base64: string, format: string) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onAudio, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const result = reader.result as string;
          // strip "data:audio/webm;base64," prefix
          const base64 = result.split(",")[1];
          onAudio(base64, "webm");
        };
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={recording ? stop : start}
      title={recording ? "Stop recording" : "Record audio"}
      className={clsx(
        "p-2 rounded-lg transition-colors",
        recording
          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-3",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {recording ? <Square size={16} /> : <Mic size={16} />}
    </button>
  );
}
