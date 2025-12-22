import httpx
import logging

logger = logging.getLogger("liquidityvector.services")

class BaseService:
    """Base service with shared httpx client."""
    def __init__(self, client: httpx.AsyncClient = None):
        self._client = client or httpx.AsyncClient(timeout=10.0)
        self._external_client = not client

    async def close(self):
        if self._external_client:
            await self._client.aclose()
