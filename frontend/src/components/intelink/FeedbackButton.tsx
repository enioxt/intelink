'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, CheckCircle } from 'lucide-react';

// Telegram Bot configuration from environment
const ADMIN_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_ADMIN_CHAT_ID ?
    parseInt(process.env.NEXT_PUBLIC_TELEGRAM_ADMIN_CHAT_ID) :
    171767219;
const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';

interface FeedbackButtonProps {
    userName?: string;
    userRole?: string;
}

export default function FeedbackButton({ userName, userRole }: FeedbackButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'other'>('suggestion');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSend = async () => {
        if (!message.trim()) return;

        setSending(true);
        try {
            const typeLabels = {
                bug: '🐛 BUG REPORT',
                suggestion: '💡 SUGESTÃO',
                other: '📝 FEEDBACK'
            };

            const telegramMessage = `${typeLabels[feedbackType]}
━━━━━━━━━━━━━━━━━━━

👤 **De:** ${userName || 'Usuário anônimo'}
📋 **Cargo:** ${userRole || 'Não identificado'}
📍 **Página:** ${typeof window !== 'undefined' ? window.location.pathname : 'N/A'}

${feedbackType === 'bug' ? '🔴' : feedbackType === 'suggestion' ? '🟡' : '🔵'} **Mensagem:**
${message}

───────────
📅 ${new Date().toLocaleString('pt-BR')}`;

            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_CHAT_ID,
                    text: telegramMessage,
                    parse_mode: 'Markdown'
                })
            });

            if (response.ok) {
                setSent(true);
                setMessage('');
                setTimeout(() => {
                    setIsOpen(false);
                    setSent(false);
                }, 2000);
            }
        } catch (e) {
            console.error('Feedback error:', e);
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            {/* Floating Button - 30% smaller */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-5 right-5 z-40 p-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-full shadow-xl shadow-blue-500/20 transition-all hover:scale-110"
                title="Enviar Feedback"
            >
                <MessageCircle className="w-4 h-4" />
            </button>

            {/* Modal - ESC e clique fora para fechar */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                    onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
                >
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <MessageCircle className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Enviar Feedback</h2>
                                    <p className="text-slate-400 text-sm">Sua opinião é importante!</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {sent ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                                    </div>
                                    <p className="text-emerald-300 font-medium">Feedback enviado!</p>
                                    <p className="text-slate-400 text-sm mt-2">Obrigado pela sua contribuição.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Tipo */}
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">Tipo de Feedback</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'bug', label: '🐛 Bug', color: 'red' },
                                                { id: 'suggestion', label: '💡 Sugestão', color: 'amber' },
                                                { id: 'other', label: '📝 Outro', color: 'blue' }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setFeedbackType(type.id as any)}
                                                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${feedbackType === type.id
                                                            ? `bg-${type.color}-500/20 text-${type.color}-400 border-2 border-${type.color}-500/50`
                                                            : 'bg-slate-700 text-slate-300 border-2 border-transparent hover:bg-slate-600'
                                                        }`}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Mensagem */}
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">Sua Mensagem</label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder={
                                                feedbackType === 'bug'
                                                    ? 'Descreva o problema que encontrou...'
                                                    : feedbackType === 'suggestion'
                                                        ? 'Sua sugestão de melhoria...'
                                                        : 'Escreva sua mensagem...'
                                            }
                                            rows={4}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                                        />
                                    </div>

                                    {/* Send Button */}
                                    <button
                                        onClick={handleSend}
                                        disabled={!message.trim() || sending}
                                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        {sending ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Enviar Feedback
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-4">
                            <p className="text-slate-500 text-xs text-center">
                                O feedback será enviado diretamente ao administrador via Telegram.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
