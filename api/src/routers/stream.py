"""
Router de Tiempo Real mediante Server-Sent Events (SSE).
Mantiene conexión viva con reconexión automática y emisión de nuevos sismos.
Accesible para roles: viewer, admin (mediante Bearer token o query param ?token=...).
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import text

from src.auth.dependencies import get_current_user
from src.database import SessionLocal
from src.services.sse_manager import sse_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stream", tags=["Tiempo Real"])


async def event_generator(current_user: dict):
    """
    Generador asíncrono para Server-Sent Events:
    1. Envía mensaje de bienvenida/handshake inicial con hora actual y rol.
    2. Consulta periódicamente los sismos más recientes o retransmite eventos en vivo.
    3. Emite un ping cada 15 segundos para mantener activo el socket HTTP contra timeouts.
    """
    queue = await sse_manager.subscribe()
    try:
        # 1. Handshake inicial
        initial_msg = {
            "type": "CONNECTION_ESTABLISHED",
            "message": f"Conectado exitosamente a SismoWatch Live Stream ({current_user['role']})",
            "connected_at": datetime.now(timezone.utc).isoformat(),
        }
        yield f"event: connect\ndata: {json.dumps(initial_msg)}\n\n"

        last_checked_id = None

        while True:
            # Comprobar si hay mensajes en la cola del broadcast
            try:
                # Esperar hasta 5 segundos por mensajes en cola o emitir sismos recientes
                msg = await asyncio.wait_for(queue.get(), timeout=5.0)
                yield msg
            except asyncio.TimeoutError:
                pass

            # Polling liviano a nivel de backend sobre curated para capturar nuevos sismos
            # y emitirlos a través de SSE
            db = SessionLocal()
            try:
                sql = text("""
                    SELECT id, mag, place, time, longitude, latitude, depth_km, tsunami
                    FROM curated.earthquakes_curated
                    ORDER BY time DESC
                    LIMIT 1;
                """)
                latest = db.execute(sql).fetchone()
                if latest and latest[0] != last_checked_id:
                    if last_checked_id is not None:
                        # Nuevo evento detectado
                        event_payload = {
                            "type": "NEW_EARTHQUAKE",
                            "event": {
                                "id": latest[0],
                                "mag": float(latest[1]),
                                "place": latest[2],
                                "time": latest[3].isoformat(),
                                "longitude": float(latest[4]),
                                "latitude": float(latest[5]),
                                "depth_km": float(latest[6]),
                                "tsunami": int(latest[7] or 0),
                            },
                            "broadcast_at": datetime.now(timezone.utc).isoformat()
                        }
                        yield f"event: earthquake\ndata: {json.dumps(event_payload)}\n\n"
                    last_checked_id = latest[0]
            except Exception as e:
                logger.error("Error al consultar nuevos eventos para SSE: %s", str(e))
            finally:
                db.close()

            # Enviar ping de keep-alive
            ping_payload = {"timestamp": datetime.now(timezone.utc).isoformat()}
            yield f"event: ping\ndata: {json.dumps(ping_payload)}\n\n"

    except asyncio.CancelledError:
        logger.info("Cliente cerró conexión SSE")
    finally:
        await sse_manager.unsubscribe(queue)


@router.get("")
async def stream_events(current_user: dict = Depends(get_current_user)):
    """
    Endpoint SSE en /api/stream.
    Requiere autenticación. Soporta ?token=<jwt> para clientes como EventSource.
    """
    return StreamingResponse(
        event_generator(current_user),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Previene buffering en NGINX
        }
    )
