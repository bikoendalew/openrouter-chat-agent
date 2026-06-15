import json
import httpx
from typing import AsyncGenerator, Optional

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Agent",
        }

    async def list_models(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{OPENROUTER_BASE_URL}/models", headers=self.headers)
            resp.raise_for_status()
            return resp.json().get("data", [])

    def parse_capabilities(self, model: dict) -> dict:
        architecture = model.get("architecture", {})
        modality: str = architecture.get("modality", "text->text")

        if "->" in modality:
            inp, out = modality.split("->", 1)
        else:
            inp, out = modality, "text"

        inputs = [m.strip() for m in inp.split("+")]
        outputs = [m.strip() for m in out.split("+")]

        return {
            "text_input": "text" in inputs,
            "image_input": "image" in inputs,
            "audio_input": "audio" in inputs,
            "text_output": "text" in outputs,
            "image_output": "image" in outputs,
            "audio_output": "audio" in outputs,
            "modality": modality,
        }

    def _build_content(self, text: str, audio_data: Optional[str] = None, audio_format: Optional[str] = None) -> list | str:
        if audio_data:
            return [
                {
                    "type": "input_audio",
                    "input_audio": {
                        "data": audio_data,
                        "format": audio_format or "webm",
                    },
                }
            ]
        return text

    async def chat_stream(
        self,
        model: str,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
    ) -> AsyncGenerator[str, None]:
        payload: dict = {"model": model, "messages": messages, "stream": True}
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=self.headers,
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        yield data

    async def chat(
        self,
        model: str,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
    ) -> dict:
        payload: dict = {"model": model, "messages": messages}
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()
