<div align="center">

# 🤖 BEagent

**A multi-modal AI agent powered by OpenRouter — chat, voice, image, and file system control, all in one place.**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-AI-6366f1?style=for-the-badge)](https://openrouter.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 **300+ AI Models** | Access every model on OpenRouter — GPT-4o, Claude, Gemini, Llama, and more |
| 🎯 **Curated Model List** | Pin your favourite models in `.env` — only those appear in the selector |
| 💬 **Real-time Streaming** | Responses stream token-by-token via Server-Sent Events |
| 🗂️ **Persistent History** | Every conversation and message saved in SQLite |
| 🗑️ **Delete History** | Remove individual conversations from the sidebar |
| 🎙️ **Voice Input** | Record audio in-browser and send it to audio-capable models |
| 🖼️ **Image & Vision** | Detects model capabilities (vision input / image output) and shows badges |
| 🤖 **File Agent Mode** | Give the AI access to a directory — it can list, read, write, move, and delete files using function-calling |
| 🔒 **Path Safety** | File agent is sandboxed to the base directory — no path traversal |
| ⚡ **Single Server** | `python start.py` builds the frontend and serves everything on port 8000 |

---

## 📸 Preview

```
┌─────────────────────────────────────────────────────────────┐
│  BEagent                                                     │
├──────────────┬──────────────────────────────────────────────┤
│              │  [Model: GPT-4o ▾]  [Audio in] [Vision]     │
│  + New chat  │                                              │
│              │          🤖 BEagent                          │
│  ▸ My first  │    Choose a model above and start chatting   │
│    chat      │                                              │
│  ▸ File ops  │                                              │
│              │  ┌─────────────────────────────────────────┐ │
│              │  │ [ File Agent ●  C:\projects\myapp     ] │ │
│              │  │ 🎙  Message...                   [Send] │ │
│              │  └─────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`
- An **OpenRouter API key** → [openrouter.ai/keys](https://openrouter.ai/keys)

### 1. Clone & enter the project

```bash
git clone https://github.com/YOUR_USERNAME/BEagent.git
cd BEagent
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-...your-key-here...

# Comma-separated model IDs to show in the UI (first = default).
# Leave empty to show ALL ~300 OpenRouter models.
MODELS=openai/gpt-4o,anthropic/claude-sonnet-4-5,google/gemini-flash-1.5,meta-llama/llama-3.1-8b-instruct:free
```

### 4. Run

```bash
# From the backend/ directory (venv active)
python start.py
```

This will:
1. Install frontend `node_modules` if missing
2. Build the Next.js frontend into `frontend/out/`
3. Start FastAPI on **http://localhost:8000**

Open your browser at **http://localhost:8000** — done!

---

## ⚡ Dev Mode (faster restarts)

```bash
# Skip frontend rebuild (backend changes only)
python start.py --no-build

# Or use uvicorn directly with hot reload
uvicorn main:app --reload

# Frontend dev server (separate terminal, from frontend/)
npm run dev   # → http://localhost:3000
```

---

## 🗂️ Project Structure

```
BEagent/
├── backend/
│   ├── main.py               # FastAPI app + static file serving
│   ├── database.py           # SQLAlchemy models (Conversation, Message)
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── start.py              # One-command build + run script
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── chat.py           # Conversations CRUD + SSE streaming
│   │   ├── models_router.py  # OpenRouter model listing
│   │   └── files.py          # File operation endpoints
│   └── services/
│       ├── openrouter.py     # OpenRouter API client (stream + non-stream)
│       └── file_agent.py     # File tools + sandboxed FileAgent class
│
└── frontend/
    ├── app/
    │   ├── layout.tsx        # Root layout, favicon, title
    │   ├── page.tsx          # Main page — wires sidebar + chat together
    │   └── globals.css
    ├── components/
    │   ├── Sidebar.tsx       # Conversation list + delete
    │   ├── ChatArea.tsx      # Streaming chat, agent mode, audio input
    │   ├── MessageBubble.tsx # Text / audio / image message renderer
    │   ├── ModelSelector.tsx # Searchable model dropdown with badges
    │   ├── FileAgentPanel.tsx# Toggle + directory picker for file agent
    │   └── AudioRecorder.tsx # Browser MediaRecorder → base64
    └── lib/
        ├── types.ts          # Shared TypeScript interfaces
        └── api.ts            # Fetch helpers + SSE async generator
```

---

## 🤖 File Agent

Enable **File Agent Mode** in the chat footer, enter an absolute directory path, then just talk to it:

```
You:  List all Python files in this project
Bot:  [calls list_directory] [calls list_directory on src/]
      Here are your Python files:
      • main.py — FastAPI entry point
      • database.py — SQLAlchemy models
      ...

You:  Create a file called notes.txt with my shopping list
Bot:  [calls write_file("notes.txt", "...")]
      Done! notes.txt has been created.
```

**Available tools the AI can call:**

| Tool | What it does |
|---|---|
| `list_directory` | List files and folders at a path |
| `read_file` | Read a file's contents |
| `write_file` | Create or overwrite a file |
| `delete_file` | Delete a file |
| `delete_directory` | Delete a folder and all contents |
| `create_directory` | Make a new folder |
| `move_item` | Move or rename a file/folder |

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/models` | List configured models with capabilities |
| `GET` | `/api/conversations` | List all conversations |
| `POST` | `/api/conversations` | Create a new conversation |
| `GET` | `/api/conversations/{id}` | Get conversation with messages |
| `DELETE` | `/api/conversations/{id}` | Delete conversation + messages |
| `POST` | `/api/chat/stream` | Stream chat response (SSE) |
| `POST` | `/api/files/list` | List directory contents |
| `POST` | `/api/files/read` | Read a file |
| `POST` | `/api/files/write` | Write a file |
| `POST` | `/api/files/delete` | Delete a file or directory |
| `POST` | `/api/files/move` | Move or rename |
| `POST` | `/api/files/mkdir` | Create a directory |

Interactive docs available at **http://localhost:8000/docs**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python, FastAPI, SQLAlchemy, SQLite, httpx |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **AI** | OpenRouter API (supports 300+ models) |
| **Streaming** | Server-Sent Events (SSE) |
| **Audio** | Browser MediaRecorder API |

---

## 📄 License

MIT © 2025 — feel free to fork, extend, and build on top of BEagent.

---


