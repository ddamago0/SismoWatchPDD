"""
Gestor de Tiempo Real basado en Server-Sent Events (SSE).
Mantiene conexiones activas con el frontend y retransmite eventos sísmicos en vivo.
"""

import asyncio
import json
import logging
from typing import AsyncGenerator, Set

logger = logging.getLogger(__name__)


class SSEManager:
    def __init__(self):
        self.subscribers: Set[asyncio.Queue] = set()

    async def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self.subscribers.add(queue)
        logger.info("Nuevo cliente conectado a SSE. Conexiones activas: %d", len(self.subscribers))
        return queue

    async def unsubscribe(self, queue: asyncio.Queue):
        if queue in self.subscribers:
            self.subscribers.remove(queue)
            logger.info("Cliente desconectado de SSE. Conexiones activas: %d", len(self.subscribers))

    async def broadcast(self, event_type: str, data: dict):
        """Envía un mensaje formateado SSE a todos los clientes conectados."""
        if not self.subscribers:
            return
        message = f"event: {event_type}\ndata: {json.dumps(data, default=str)}\n\n"
        for queue in list(self.subscribers):
            try:
                await queue.put(message)
            except Exception:
                pass


sse_manager = SSEManager()
