export interface ModelCapabilities {
  text_input: boolean;
  image_input: boolean;
  audio_input: boolean;
  text_output: boolean;
  image_output: boolean;
  audio_output: boolean;
  modality: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
  capabilities: ModelCapabilities;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  content_type: "text" | "image" | "audio";
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  model: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export type StreamEventType =
  | "conversation_id"
  | "chunk"
  | "tool_call"
  | "tool_result"
  | "done"
  | "error";

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  conversation_id?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ChatRequest {
  conversation_id?: string;
  model: string;
  message: string;
  audio_data?: string;
  audio_format?: string;
  base_directory?: string;
}
