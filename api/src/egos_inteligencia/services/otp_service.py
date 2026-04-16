"""OTP service for Intelink password reset.

Flow:
  1. POST /auth/forgot-password  {phone}
     → generates 6-digit OTP, stores in Redis with TTL=10min
     → sends OTP via WhatsApp (Evolution API) or Telegram
  2. POST /auth/reset-password   {phone, otp, new_password}
     → verifies OTP, sets new password, deletes OTP from Redis

OTP is keyed by `otp:{phone}` in Redis.
"""
from __future__ import annotations

import logging
import os
import random
import string

import httpx
import redis.asyncio as aioredis

from bracc.config import settings

logger = logging.getLogger(__name__)

_OTP_TTL_SECONDS = 600  # 10 minutes
_OTP_KEY_PREFIX = "otp:"


def _redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def issue_otp(phone: str) -> str:
    """Generate OTP, store in Redis, return code (for testing/logging only)."""
    otp = _generate_otp()
    key = f"{_OTP_KEY_PREFIX}{phone}"
    r = _redis()
    try:
        await r.set(key, otp, ex=_OTP_TTL_SECONDS)
    finally:
        await r.aclose()
    return otp


async def verify_otp(phone: str, otp: str) -> bool:
    """Check OTP. Deletes it on success (single-use)."""
    key = f"{_OTP_KEY_PREFIX}{phone}"
    r = _redis()
    try:
        stored = await r.get(key)
        if stored is None or stored != otp:
            return False
        await r.delete(key)
        return True
    finally:
        await r.aclose()


async def send_otp_whatsapp(phone: str, otp: str) -> bool:
    """Send OTP via WhatsApp Evolution API. Returns True if sent."""
    api_key = settings.evolution_api_key
    instance = settings.evolution_instance
    base_url = settings.evolution_api_url

    if not api_key or not instance:
        logger.warning("Evolution API not configured — OTP NOT sent to %s", phone)
        return False

    # Normalise phone to WhatsApp JID (55 + DDD + number, no formatting)
    digits = "".join(c for c in phone if c.isdigit())
    if not digits.startswith("55"):
        digits = "55" + digits
    jid = f"{digits}@s.whatsapp.net"

    payload = {
        "number": jid,
        "text": (
            f"🔐 *INTELINK* — Seu código de verificação:\n\n"
            f"*{otp}*\n\n"
            f"Válido por 10 minutos. Não compartilhe este código."
        ),
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(
                f"{base_url}/message/sendText/{instance}",
                json=payload,
                headers={"apikey": api_key},
            )
            resp.raise_for_status()
            logger.info("OTP sent via WhatsApp to %s", phone)
            return True
    except Exception as exc:
        logger.error("WhatsApp OTP send failed for %s: %s", phone, exc)
        return False


async def send_otp_telegram(chat_id: str, otp: str) -> bool:
    """Send OTP via Telegram Bot API. Returns True if sent."""
    token = settings.telegram_bot_token
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN not configured — OTP NOT sent")
        return False
    text = (
        f"🔐 *INTELINK* — Seu código de verificação:\n\n"
        f"`{otp}`\n\n"
        f"Válido por 10 minutos\\. Não compartilhe\\."
    )
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "MarkdownV2"},
            )
            resp.raise_for_status()
            logger.info("OTP sent via Telegram to %s", chat_id)
            return True
    except Exception as exc:
        logger.error("Telegram OTP send failed for chat_id %s: %s", chat_id, exc)
        return False
