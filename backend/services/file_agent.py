import json
import shutil
from pathlib import Path


FILE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List files and directories at the given path",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path (empty string = base directory)"}
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the text contents of a file",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to file"}
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write or overwrite a file with the given content",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to file"},
                    "content": {"type": "string", "description": "Text content to write"},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_file",
            "description": "Permanently delete a file",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to file"}
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_directory",
            "description": "Permanently delete a directory and all its contents",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to directory"}
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_directory",
            "description": "Create a new directory (and parent directories as needed)",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path for new directory"}
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "move_item",
            "description": "Move or rename a file or directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "source": {"type": "string", "description": "Source relative path"},
                    "destination": {"type": "string", "description": "Destination relative path"},
                },
                "required": ["source", "destination"],
            },
        },
    },
]


class FileAgent:
    def __init__(self, base_directory: str):
        self.base_dir = Path(base_directory).resolve()

    def _safe_path(self, rel: str) -> Path:
        resolved = (self.base_dir / rel).resolve()
        if not str(resolved).startswith(str(self.base_dir)):
            raise ValueError(f"Path traversal blocked: {rel}")
        return resolved

    def list_directory(self, path: str = "") -> dict:
        try:
            target = self._safe_path(path)
            if not target.exists():
                return {"error": f"Path not found: {path or '.'}"}
            items = [
                {
                    "name": item.name,
                    "type": "directory" if item.is_dir() else "file",
                    "size": item.stat().st_size if item.is_file() else None,
                }
                for item in sorted(target.iterdir())
            ]
            return {"path": str(path or "."), "items": items}
        except Exception as e:
            return {"error": str(e)}

    def read_file(self, path: str) -> dict:
        try:
            target = self._safe_path(path)
            if not target.is_file():
                return {"error": f"Not a file: {path}"}
            content = target.read_text(encoding="utf-8", errors="replace")
            return {"path": path, "content": content}
        except Exception as e:
            return {"error": str(e)}

    def write_file(self, path: str, content: str) -> dict:
        try:
            target = self._safe_path(path)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
            return {"path": path, "success": True}
        except Exception as e:
            return {"error": str(e)}

    def delete_file(self, path: str) -> dict:
        try:
            target = self._safe_path(path)
            if not target.is_file():
                return {"error": f"Not a file: {path}"}
            target.unlink()
            return {"path": path, "success": True}
        except Exception as e:
            return {"error": str(e)}

    def delete_directory(self, path: str) -> dict:
        try:
            target = self._safe_path(path)
            if not target.is_dir():
                return {"error": f"Not a directory: {path}"}
            shutil.rmtree(target)
            return {"path": path, "success": True}
        except Exception as e:
            return {"error": str(e)}

    def create_directory(self, path: str) -> dict:
        try:
            target = self._safe_path(path)
            target.mkdir(parents=True, exist_ok=True)
            return {"path": path, "success": True}
        except Exception as e:
            return {"error": str(e)}

    def move_item(self, source: str, destination: str) -> dict:
        try:
            src = self._safe_path(source)
            dst = self._safe_path(destination)
            shutil.move(str(src), str(dst))
            return {"source": source, "destination": destination, "success": True}
        except Exception as e:
            return {"error": str(e)}

    def execute_tool(self, name: str, args: dict) -> str:
        dispatch = {
            "list_directory": lambda a: self.list_directory(a.get("path", "")),
            "read_file": lambda a: self.read_file(a["path"]),
            "write_file": lambda a: self.write_file(a["path"], a["content"]),
            "delete_file": lambda a: self.delete_file(a["path"]),
            "delete_directory": lambda a: self.delete_directory(a["path"]),
            "create_directory": lambda a: self.create_directory(a["path"]),
            "move_item": lambda a: self.move_item(a["source"], a["destination"]),
        }
        handler = dispatch.get(name)
        if not handler:
            return json.dumps({"error": f"Unknown tool: {name}"})
        return json.dumps(handler(args))
