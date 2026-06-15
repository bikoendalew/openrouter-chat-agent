from fastapi import APIRouter, HTTPException
from schemas import FileOperationRequest
from services.file_agent import FileAgent
import os

router = APIRouter()


def _agent(base_dir: str) -> FileAgent:
    if not os.path.isdir(base_dir):
        raise HTTPException(status_code=400, detail=f"Directory not found: {base_dir}")
    return FileAgent(base_dir)


@router.post("/files/list")
def list_directory(req: FileOperationRequest):
    agent = _agent(req.base_directory)
    return agent.list_directory(req.path)


@router.post("/files/read")
def read_file(req: FileOperationRequest):
    agent = _agent(req.base_directory)
    return agent.read_file(req.path)


@router.post("/files/write")
def write_file(req: FileOperationRequest):
    if req.content is None:
        raise HTTPException(status_code=400, detail="content required")
    agent = _agent(req.base_directory)
    return agent.write_file(req.path, req.content)


@router.post("/files/delete")
def delete_item(req: FileOperationRequest):
    agent = _agent(req.base_directory)
    result = agent.delete_file(req.path)
    if "error" in result:
        result = agent.delete_directory(req.path)
    return result


@router.post("/files/move")
def move_item(req: FileOperationRequest):
    if not req.destination:
        raise HTTPException(status_code=400, detail="destination required")
    agent = _agent(req.base_directory)
    return agent.move_item(req.path, req.destination)


@router.post("/files/mkdir")
def create_directory(req: FileOperationRequest):
    agent = _agent(req.base_directory)
    return agent.create_directory(req.path)
