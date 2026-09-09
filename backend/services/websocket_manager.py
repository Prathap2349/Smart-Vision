import json
import asyncio
from typing import List, Dict, Any
from fastapi import WebSocket

class WebSocketConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, camera_id: str, websocket: WebSocket):
        await websocket.accept()
        if camera_id not in self.active_connections:
            self.active_connections[camera_id] = []
        self.active_connections[camera_id].append(websocket)

    def disconnect(self, camera_id: str, websocket: WebSocket):
        if camera_id in self.active_connections:
            if websocket in self.active_connections[camera_id]:
                self.active_connections[camera_id].remove(websocket)

    async def broadcast_telemetry(self, camera_id: str, payload: Dict[str, Any]):
        if camera_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[camera_id]:
                try:
                    await connection.send_json(payload)
                except Exception:
                    disconnected.append(connection)
            for conn in disconnected:
                self.disconnect(camera_id, conn)

ws_manager = WebSocketConnectionManager()
