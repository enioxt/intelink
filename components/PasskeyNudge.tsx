'use client';

/**
 * AUTH-015b: Passkey nudge toast — shown once after login if passkey not configured.
 * Skippable. "Lembrar em 7 dias" snoozes via API. Dismissed via localStorage flag.
 */

import { useState, useEffect } from 'react';
import { Key, X } from 'lucide-react';
import Link from 'next/link';

const STORAGE_KEY = 'intelink_passkey_nudge_dismissed';
const SNOOZE_KEY  = 'intelink_passkey_nudge_snoozed_until';

export default function PasskeyNudge() {
    const [visible, setVisible] = useState(false);
    const [memberId, setMemberId] = useState<string | null>(null);

    useEffect(() => {
        const mid = localStorage.getItem('intelink_member_id');
        if (!mid) return;
        setMemberId(mid);

        // Check snooze
        const snoozed = localStorage.getItem(SNOOZE_KEY);
        if (snoozed && new Date(snoozed) > new Date()) return;

        // Check dismissed
        if (localStorage.getItem(STORAGE_KEY) === 'skipped') return;

        // Fetch preference from server
        fetch(`/api/members/${mid}?fields=passkey_preference,passkey_nudge_snoozed_until`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (!d) return;
                if (d.passkey_preference === 'enabled') return;
                if (d.passkey_preference === 'skipped') return;
                if (d.passkey_nudge_snoozed_until && new Date(d.passkey_nudge_snoozed_until) > new Date()) return;
                setVisible(true);
            })
            .catch(() => {});
    }, []);

    const dismiss = (action: 'snooze' | 'skip') => {
        setVisible(false);
        if (!memberId) return;
        if (action === 'snooze') {
            const until = new Date();
            until.setDate(until.getDate() + 7);
            localStorage.setItem(SNOOZE_KEY, until.toISOString());
            fetch('/api/members/passkey-pref', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_id: memberId, preference: 'deferred', snooze_days: 7 }),
            }).catch(() => {});
        } else {
            localStorage.setItem(STORAGE_KEY, 'skipped');
            fetch('/api/members/passkey-pref', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_id: memberId, preference: 'skipped' }),
            }).catch(() => {});
        }
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-cyan-500/10 rounded-xl flex items-center justify-center shrink-0 border border-cyan-500/20">
                    <Key className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">Ative a chave de acesso</p>
                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                        Faça login com biometria — sem senha.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <Link
                            href="/settings/security"
                            onClick={() => setVisible(false)}
                            className="flex-1 text-center bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
                        >
                            Configurar
                        </Link>
                        <button
                            onClick={() => dismiss('snooze')}
                            className="flex-1 text-slate-400 hover:text-slate-200 text-xs border border-slate-700 rounded-lg py-1.5 transition-colors"
                        >
                            Em 7 dias
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => dismiss('skip')}
                    className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
