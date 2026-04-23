/**
 * AUTH-PUB-005/006/007 — Verification orchestrator (tri-channel)
 *
 * Generates 6-digit OTP, bcrypts and stores in intelink_unit_members,
 * dispatches via selected channel (email/telegram/whatsapp-deferred),
 * validates on confirm with expiry + attempt limits.
 *
 * INC-008 safety: bcrypt-hashed only. Plain OTP never persisted.
 * Rate-limit enforced at route level (AUTH-PUB-015).
 */

import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../api-utils';
import { sendCodeEmail } from '../email';
import { sendMessage } from '../intelink/telegram-utils';

export type VerificationChannel = 'email' | 'telegram' | 'whatsapp';

export type VerificationPurpose = 'signup' | 'recovery';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

function generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
}

interface MemberForVerify {
    id: string;
    name: string;
    email: string | null;
    telegram_chat_id: number | null;
    whatsapp: string | null;
    phone: string | null;
    verified_at: string | null;
}

async function loadMember(email: string): Promise<MemberForVerify | null> {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('intelink_unit_members')
        .select('id, name, email, telegram_chat_id, whatsapp, phone, verified_at')
        .eq('email', email.toLowerCase())
        .maybeSingle();
    return (data as MemberForVerify | null) ?? null;
}

export interface RequestResult {
    ok: boolean;
    error?: string;
    channelUsed?: VerificationChannel;
    expiresAt?: string;
}

/**
 * AUTH-PUB-005 core: generate OTP, hash, store, dispatch.
 * Idempotent in the sense that a new request overwrites previous token.
 */
export async function requestVerification(
    email: string,
    channel: VerificationChannel,
    purpose: VerificationPurpose,
): Promise<RequestResult> {
    if (channel === 'whatsapp') {
        return { ok: false, error: 'WhatsApp ainda não disponível. Use email ou Telegram.' };
    }

    const member = await loadMember(email);
    if (!member) {
        // Don't leak existence — caller maps to generic error.
        return { ok: false, error: 'Conta não encontrada' };
    }

    if (purpose === 'signup' && member.verified_at) {
        return { ok: false, error: 'Conta já verificada. Faça login.' };
    }

    if (channel === 'telegram' && !member.telegram_chat_id) {
        return {
            ok: false,
            error: 'Telegram não vinculado a esta conta. Escolha email ou vincule via /start verify-<token>.',
        };
    }

    if (channel === 'email' && !member.email) {
        return { ok: false, error: 'Email não cadastrado nesta conta.' };
    }

    const otp = generateOtp();
    const hash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const supabase = getSupabaseAdmin();
    const { error: updateErr } = await supabase
        .from('intelink_unit_members')
        .update({
            verification_token_hash: hash,
            verification_token_expires_at: expiresAt.toISOString(),
            verification_channel: channel,
            verification_attempts: 0,
        })
        .eq('id', member.id);

    if (updateErr) {
        return { ok: false, error: 'Falha ao preparar verificação' };
    }

    let sent = false;
    if (channel === 'email') {
        sent = await sendCodeEmail({
            to: member.email!,
            memberName: member.name,
            code: otp,
            type: purpose === 'recovery' ? 'recovery' : 'access',
        });
    } else if (channel === 'telegram') {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            return { ok: false, error: 'Telegram não configurado no servidor' };
        }
        const purposeLabel = purpose === 'recovery' ? 'recuperação de senha' : 'verificação de conta';
        const text =
            `🔐 *INTELINK — ${purposeLabel}*\n\n` +
            `Seu código: *${otp}*\n\n` +
            `Válido por 10 minutos.\n` +
            `Se você não solicitou este código, ignore esta mensagem.`;
        await sendMessage(botToken, member.telegram_chat_id!, text);
        sent = true;
    }

    if (!sent) {
        return { ok: false, error: 'Falha ao enviar código. Tente outro canal.' };
    }

    await audit(member.id, member.name, `auth.verify_request.${purpose}`, {
        channel,
        expires_at: expiresAt.toISOString(),
    });

    return {
        ok: true,
        channelUsed: channel,
        expiresAt: expiresAt.toISOString(),
    };
}

export interface ConfirmResult {
    ok: boolean;
    error?: string;
    memberId?: string;
    channel?: VerificationChannel;
}

/**
 * AUTH-PUB-010 core: validate OTP + mark verified.
 * For 'signup' purpose, sets verified_at.
 * For 'recovery' purpose, only validates — caller sets new password separately.
 */
export async function confirmVerification(
    email: string,
    code: string,
    purpose: VerificationPurpose,
): Promise<ConfirmResult> {
    if (!/^\d{6}$/.test(code)) {
        return { ok: false, error: 'Código inválido' };
    }

    const supabase = getSupabaseAdmin();
    const { data: member } = await supabase
        .from('intelink_unit_members')
        .select(
            'id, name, verified_at, verification_token_hash, verification_token_expires_at, verification_attempts, verification_channel',
        )
        .eq('email', email.toLowerCase())
        .maybeSingle();

    if (!member) {
        return { ok: false, error: 'Conta não encontrada' };
    }

    if (purpose === 'signup' && member.verified_at) {
        return { ok: false, error: 'Conta já verificada' };
    }

    if (!member.verification_token_hash || !member.verification_token_expires_at) {
        return { ok: false, error: 'Nenhum código pendente. Solicite um novo.' };
    }

    if (member.verification_attempts >= MAX_ATTEMPTS) {
        return { ok: false, error: 'Muitas tentativas. Solicite um novo código.' };
    }

    if (new Date(member.verification_token_expires_at).getTime() < Date.now()) {
        return { ok: false, error: 'Código expirado. Solicite um novo.' };
    }

    const match = await bcrypt.compare(code, member.verification_token_hash);
    if (!match) {
        await supabase
            .from('intelink_unit_members')
            .update({ verification_attempts: member.verification_attempts + 1 })
            .eq('id', member.id);
        await audit(member.id, member.name, `auth.verify_confirm.${purpose}.fail`, {
            attempts: member.verification_attempts + 1,
        });
        return { ok: false, error: 'Código incorreto' };
    }

    // Success: clear token; for signup also set verified_at.
    const patch: Record<string, unknown> = {
        verification_token_hash: null,
        verification_token_expires_at: null,
        verification_attempts: 0,
    };
    if (purpose === 'signup') {
        patch.verified_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
        .from('intelink_unit_members')
        .update(patch)
        .eq('id', member.id);

    if (updateErr) {
        return { ok: false, error: 'Falha ao confirmar verificação' };
    }

    await audit(member.id, member.name, `auth.verify_confirm.${purpose}.success`, {
        channel: member.verification_channel,
    });

    return {
        ok: true,
        memberId: member.id,
        channel: member.verification_channel as VerificationChannel,
    };
}

async function audit(
    memberId: string,
    memberName: string,
    action: string,
    details: Record<string, unknown>,
): Promise<void> {
    const supabase = getSupabaseAdmin();
    try {
        await supabase.from('intelink_audit_logs').insert({
            action,
            actor_id: String(memberId),
            actor_name: memberName,
            target_type: 'member',
            target_id: String(memberId),
            details,
        });
    } catch {
        // audit is best-effort; never block auth flow
    }
}
