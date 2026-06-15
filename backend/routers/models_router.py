import os
from fastapi import APIRouter, HTTPException
from services.openrouter import OpenRouterClient

router = APIRouter()


def get_client() -> OpenRouterClient:
    key = os.getenv("OPENROUTER_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not set")
    return OpenRouterClient(key)


def get_allowed_model_ids() -> list[str] | None:
    raw = os.getenv("MODELS", "").strip()
    if not raw:
        return None
    return [m.strip() for m in raw.split(",") if m.strip()]


@router.get("/models")
async def list_models():
    client = get_client()
    raw_models = await client.list_models()
    allowed = get_allowed_model_ids()

    models = []
    for m in raw_models:
        model_id = m.get("id")
        if allowed is not None and model_id not in allowed:
            continue
        capabilities = client.parse_capabilities(m)
        models.append(
            {
                "id": model_id,
                "name": m.get("name", model_id),
                "description": m.get("description", ""),
                "context_length": m.get("context_length", 0),
                "pricing": m.get("pricing", {}),
                "capabilities": capabilities,
            }
        )

    # Preserve the order from MODELS env var if set
    if allowed:
        order = {mid: i for i, mid in enumerate(allowed)}
        models.sort(key=lambda m: order.get(m["id"], 9999))

    return {"models": models}


@router.get("/models/{model_id:path}/capabilities")
async def model_capabilities(model_id: str):
    client = get_client()
    raw_models = await client.list_models()
    for m in raw_models:
        if m.get("id") == model_id:
            return client.parse_capabilities(m)
    raise HTTPException(status_code=404, detail="Model not found")
