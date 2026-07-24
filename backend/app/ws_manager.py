from collections import defaultdict
from typing import Optional

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.boards: dict[int, set[WebSocket]] = defaultdict(set)
        self.client_ids: dict[WebSocket, str] = {}

    async def connect(self, board_id: int, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.boards[board_id].add(websocket)
        self.client_ids[websocket] = client_id

    def disconnect(self, board_id: int, websocket: WebSocket):
        self.boards[board_id].discard(websocket)
        if not self.boards[board_id]:
            del self.boards[board_id]
        self.client_ids.pop(websocket, None)

    async def broadcast(self, board_id: int, message: dict, exclude_client_id: Optional[str] = None):
        dead = []
        for ws in self.boards.get(board_id, set()):
            if exclude_client_id is not None and self.client_ids.get(ws) == exclude_client_id:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(board_id, ws)


manager = ConnectionManager()
