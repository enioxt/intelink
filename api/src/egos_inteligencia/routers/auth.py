from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from neo4j import AsyncSession
from neo4j.exceptions import ConstraintError
from starlette.requests import Request

from bracc.dependencies import CurrentUser, get_session
from bracc.middleware.rate_limit import limiter
from bracc.models.user import TokenResponse, UserCreate, UserResponse
from bracc.services import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("10/minute")
async def register(
    request: Request,
    body: UserCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    try:
        return await auth_service.register_user(
            session, body.email, body.password, body.invite_code
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid invite code"
        ) from exc
    except ConstraintError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        ) from exc


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    user = await auth_service.authenticate_user(session, form.username, form.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = auth_service.create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser) -> UserResponse:
    return user


# ── Password reset via OTP ────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel, Field as _Field

class ForgotPasswordRequest(_BaseModel):
    phone: str = _Field(description="Phone with country code, e.g. 5534999990000")

class ResetPasswordRequest(_BaseModel):
    phone: str
    otp: str = _Field(min_length=6, max_length=6)
    new_password: str = _Field(min_length=8, max_length=128)

class SetPhoneRequest(_BaseModel):
    phone: str


@router.post("/forgot-password", status_code=200)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    from bracc.services import otp_service

    # Always return 200 — don't reveal whether phone is registered (security)
    user = await auth_service.get_user_by_phone(session, body.phone)
    if user is None:
        return {"status": "sent"}

    otp = await otp_service.issue_otp(body.phone)

    from bracc.config import settings as _cfg
    sent = False
    if _cfg.evolution_api_key and _cfg.evolution_instance:
        sent = await otp_service.send_otp_whatsapp(body.phone, otp)
    if not sent and _cfg.telegram_bot_token:
        # Telegram needs chat_id — using phone as placeholder; set telegram_chat_id on user node
        sent = await otp_service.send_otp_telegram(body.phone, otp)

    if not sent and _cfg.app_env != "production":
        # Dev only: return OTP in response so we can test without a messenger
        return {"status": "sent", "_dev_otp": otp}

    return {"status": "sent"}


@router.post("/reset-password", status_code=200)
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    from bracc.services import otp_service

    valid = await otp_service.verify_otp(body.phone, body.otp)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    user = await auth_service.get_user_by_phone(session, body.phone)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await auth_service.set_password(session, user.email, body.new_password)
    return {"status": "ok", "message": "Password updated successfully"}


@router.post("/set-phone", status_code=200)
async def set_phone(
    request: Request,
    body: SetPhoneRequest,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    """Authenticated — let a logged-in user register their WhatsApp/Telegram phone."""
    ok = await auth_service.set_phone(session, user.email, body.phone)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"status": "ok", "phone": body.phone}
