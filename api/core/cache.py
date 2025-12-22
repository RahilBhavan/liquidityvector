import logging
from typing import Optional, Any
import json
import redis.asyncio as redis
from redis.commands.json.path import Path
import orjson

from .config import settings

logger = logging.getLogger("liquidityvector.cache")

class RedisCache:
    """
    Async Redis client wrapper with optimization focused features:
    - Distributed Locking (SET NX EX) for thundering herd protection
    - Efficient JSON serialization via orjson
    - Connection pooling (handled by redis-py automatically via ConnectionPool)
    """
    _instance = None

    def __init__(self):
        self.redis = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            # Connection Pool Best Practices
            max_connections=50, # Scaled for typical concurrency
            socket_timeout=5.0,
            socket_connect_timeout=2.0
        )
        logger.info(f"Initialized Redis connection to {settings.REDIS_URL}")

    @classmethod
    def get_instance(cls):
        if not cls._instance:
            cls._instance = cls()
        return cls._instance

    async def get_json(self, key: str) -> Optional[Any]:
        """Retrieve and deserialize JSON data."""
        try:
            data = await self.redis.get(key)
            if data:
                return orjson.loads(data)
            return None
        except Exception as e:
            logger.warning(f"Cache GET failed for {key}: {e}")
            return None

    async def set_json(self, key: str, value: Any, ttl: int = 60) -> bool:
        """Serialize and store JSON data with TTL."""
        try:
            # key, value, ex=ttl
            data = orjson.dumps(value).decode('utf-8')
            await self.redis.set(key, data, ex=ttl)
            return True
        except Exception as e:
            logger.error(f"Cache SET failed for {key}: {e}")
            return False

    async def lock(self, key: str, ttl: int = 5) -> bool:
        """
        Acquire a distributed lock (SET NX EX).
        Returns True if lock acquired (you are the leader), False otherwise.
        """
        try:
            # Set Key only if Not eXists (nx=True) with Expiration (ex=ttl)
            return bool(await self.redis.set(key, "locked", nx=True, ex=ttl))
        except Exception as e:
            logger.error(f"Lock acquisition failed for {key}: {e}")
            return False

    async def close(self):
        """Close connection pool."""
        await self.redis.close()

# Dependency for dependency injection or direct usage
async def get_cache():
    return RedisCache.get_instance()
