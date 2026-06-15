import os
import json
import uuid
from datetime import datetime
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import joinedload

from database import SessionLocal, Conversation, Message
from schemas import ChatRequest, ConversationCreate, ConversationResponse, ConversationWithMessages, MessageResponse
from services.openrouter import OpenRouterClient
from services.file_agent import FileAgent, FILE_TOOLS

router = APIRouter()

AGENT_SYSTEM_PROMPT = (
    "You are a helpful file system agent. You can read, write, create, delete, and move files "
    "and directories. When the user asks you to perform file operations, use the provided tools. "
    "Always confirm what you did after completing tasks. Be careful with delete operations."
)


def get_client() -> OpenRouterClient:
    key = os.getenv("OPENROUTER_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not set")
    return OpenRouterClient(key)


# ── Conversations ──────────────────────────────────────────────────────────────

@router.post("/conversations", response_model=ConversationResponse)
def create_conversation(body: ConversationCreate):
    db = SessionLocal()
    try:
        conv = Conversation(
            id=str(uuid.uuid4()),
            model=body.model,
            title=body.title,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return ConversationResponse.model_validate(conv)
    finally:
        db.close()


@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations():
    db = SessionLocal()
    try:
        rows = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
        return [ConversationResponse.model_validate(c) for c in rows]
    finally:
        db.close()


@router.get("/conversations/{conv_id}", response_model=ConversationWithMessages)
def get_conversation(conv_id: str):
    db = SessionLocal()
    try:
        conv = (
            db.query(Conversation)
            .options(joinedload(Conversation.messages))
            .filter_by(id=conv_id)
            .first()
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        # Serialize while session is open
        result = ConversationWithMessages(
            id=conv.id,
            title=conv.title,
            model=conv.model,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            messages=[MessageResponse.model_validate(m) for m in conv.messages],
        )
        return result
    finally:
        db.close()


@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: str):
    db = SessionLocal()
    try:
        conv = db.query(Conversation).filter_by(id=conv_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        db.delete(conv)
        db.commit()
        return {"deleted": conv_id}
    finally:
        db.close()


# ── Streaming chat ─────────────────────────────────────────────────────────────

@router.post("/chat/stream")
async def stream_chat(request: ChatRequest):
    async def generate() -> AsyncGenerator[str, None]:
        db = SessionLocal()
        try:
            client = get_client()

            # Get or create conversation
            conv_id = request.conversation_id
            if not conv_id:
                conv = Conversation(
                    id=str(uuid.uuid4()),
                    model=request.model,
                    title=None,
                )
                db.add(conv)
                db.commit()
                db.refresh(conv)
                conv_id = conv.id
            else:
                conv = db.query(Conversation).filter_by(id=conv_id).first()
                if not conv:
                    yield f"data: {json.dumps({'type': 'error', 'error': 'Conversation not found'})}\n\n"
                    return

            # Build prior message history
            prior = db.query(Message).filter_by(conversation_id=conv_id).order_by(Message.created_at).all()
            messages: list[dict] = []

            if request.base_directory:
                messages.append({"role": "system", "content": AGENT_SYSTEM_PROMPT})

            for m in prior:
                messages.append({"role": m.role, "content": m.content})

            # Build user message content (text or audio)
            if request.audio_data:
                user_content: list | str = [
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": request.audio_data,
                            "format": request.audio_format or "webm",
                        },
                    }
                ]
                user_content_str = f"[Audio message]"
            else:
                user_content = request.message
                user_content_str = request.message

            messages.append({"role": "user", "content": user_content})

            # Save user message to DB
            user_msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conv_id,
                role="user",
                content=user_content_str,
                content_type="audio" if request.audio_data else "text",
                created_at=datetime.utcnow(),
            )
            db.add(user_msg)
            db.commit()

            # Emit conversation_id so frontend knows which conversation we're in
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conv_id})}\n\n"

            full_response = ""

            if request.base_directory:
                # ── Agent mode: tool-calling loop ──────────────────────────
                if not os.path.isdir(request.base_directory):
                    yield f"data: {json.dumps({'type': 'error', 'error': 'base_directory not found'})}\n\n"
                    return

                agent = FileAgent(request.base_directory)

                while True:
                    response = await client.chat(request.model, messages, tools=FILE_TOOLS)
                    choice = response["choices"][0]
                    msg = choice["message"]
                    finish = choice.get("finish_reason", "stop")

                    if finish == "tool_calls" or msg.get("tool_calls"):
                        messages.append(msg)
                        for tc in msg.get("tool_calls", []):
                            tool_name = tc["function"]["name"]
                            try:
                                args = json.loads(tc["function"]["arguments"])
                            except Exception:
                                args = {}

                            yield f"data: {json.dumps({'type': 'tool_call', 'tool': tool_name, 'args': args})}\n\n"

                            result_str = agent.execute_tool(tool_name, args)
                            result = json.loads(result_str)

                            yield f"data: {json.dumps({'type': 'tool_result', 'tool': tool_name, 'result': result})}\n\n"

                            messages.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "content": result_str,
                            })
                    else:
                        content = msg.get("content") or ""
                        full_response = content
                        # Stream the final answer token-by-token feel isn't possible here
                        # since we used non-streaming call; send whole chunk
                        yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"
                        break

            else:
                # ── Regular streaming chat ─────────────────────────────────
                async for chunk_raw in client.chat_stream(request.model, messages):
                    try:
                        chunk = json.loads(chunk_raw)
                        delta = chunk["choices"][0].get("delta", {})
                        token = delta.get("content") or ""
                        if token:
                            full_response += token
                            yield f"data: {json.dumps({'type': 'chunk', 'content': token})}\n\n"
                    except Exception:
                        pass

            # Save assistant reply
            if full_response:
                assistant_msg = Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conv_id,
                    role="assistant",
                    content=full_response,
                    content_type="text",
                    created_at=datetime.utcnow(),
                )
                db.add(assistant_msg)

                # Auto-title first message
                if not conv.title:
                    conv.title = request.message[:60] if request.message else "New chat"
                conv.updated_at = datetime.utcnow()
                db.commit()

            yield f"data: {json.dumps({'type': 'done', 'conversation_id': conv_id})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"
        finally:
            db.close()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
