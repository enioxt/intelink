'use client';

/**
 * UI-POLISH-005 — Public landing page for unauthenticated visitors.
 *
 * Shown when isAuthenticated=false in app/page.tsx.
 * CTAs: /signup (primary), /login (secondary).
 */

import Link from 'next/link';
import { Shield, Network, FileSearch, Users, Lock, Scale, ArrowRight, Check } from 'lucide-react';

export function PublicLanding() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* Top nav */}
            <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20">
                        <Shield className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="font-bold text-lg">Intelink</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="px-4 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
                    >
                        Entrar
                    </Link>
                    <Link
                        href="/signup"
                        className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Criar conta
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="w-full px-6 py-16 md:py-24">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-300 mb-6">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                        Em uso em delegacia piloto DHPP
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
                        Inteligência policial<br />
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            numa plataforma só.
                        </span>
                    </h1>
                    <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
                        Busca REDS, grafo de 83.7M nós, ingestão de documentos com IA,
                        sistema de sugestões com quórum e agente conversacional —
                        com audit trail tamper-evident e compliance LGPD.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/signup"
                            className="w-full sm:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                        >
                            Criar conta
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/login"
                            className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg transition-colors"
                        >
                            Já tenho conta
                        </Link>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">
                        Verificação obrigatória por email ou Telegram antes de acessar.
                    </p>
                </div>
            </section>

            {/* Features grid */}
            <section className="w-full px-6 py-12 border-t border-slate-800/50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-10">O que está pronto hoje</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Feature
                            icon={<FileSearch className="w-5 h-5 text-cyan-400" />}
                            title="Busca REDS + grafo"
                            desc="CPF/nome → ocorrências, co-envolvidos, fotos. Grafo 2D/3D com drill-down 3 graus."
                        />
                        <Feature
                            icon={<Network className="w-5 h-5 text-cyan-400" />}
                            title="Ingestão com IA"
                            desc="PDF/DOC/OCR/áudio → entidades extraídas → cross-ref com Neo4j → diff review."
                        />
                        <Feature
                            icon={<Users className="w-5 h-5 text-cyan-400" />}
                            title="Sugestões com quórum"
                            desc="Operadores propõem edições; 3 aprovações → oficial. Audit hash-chained."
                        />
                        <Feature
                            icon={<Shield className="w-5 h-5 text-cyan-400" />}
                            title="Agente conversacional"
                            desc="Chat web + /agente no Telegram. Tool-calling, RAG, trajectory exposta."
                        />
                        <Feature
                            icon={<Lock className="w-5 h-5 text-cyan-400" />}
                            title="Auth tri-canal"
                            desc="Signup com verificação por email ou Telegram. MFA TOTP + PIN opcionais."
                        />
                        <Feature
                            icon={<Scale className="w-5 h-5 text-cyan-400" />}
                            title="LGPD compliant"
                            desc="PII masking, ATRiAN anti-alucinação, audit tamper-evident, RBAC por delegacia."
                        />
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="w-full px-6 py-12 border-t border-slate-800/50">
                <div className="max-w-4xl mx-auto grid md:grid-cols-4 gap-6 text-center">
                    <Stat value="83.7M" label="Nós no grafo público" />
                    <Stat value="48/50" label="Pass rate eval" />
                    <Stat value="100%" label="Block-severity pass" />
                    <Stat value="0" label="Incidentes LGPD" />
                </div>
            </section>

            {/* For who */}
            <section className="w-full px-6 py-12 border-t border-slate-800/50">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-8">Para quem</h2>
                    <div className="space-y-3">
                        <Item text="Delegacias civis que querem sair de Excel + PDFs dispersos" />
                        <Item text="Divisões de homicídio que precisam cruzar casos automaticamente" />
                        <Item text="Unidades de inteligência (DIE/AINI) centralizando dados" />
                        <Item text="Municípios pequenos sem time de análise dedicada" />
                    </div>
                    <p className="text-center text-slate-500 text-sm mt-8">
                        <strong className="text-slate-400">Não é para:</strong> uso fora do exercício policial autorizado,
                        substituir o REDS oficial, ou público leigo.
                    </p>
                </div>
            </section>

            {/* Secondary CTA */}
            <section className="w-full px-6 py-16 border-t border-slate-800/50">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-3">Pronto para começar?</h2>
                    <p className="text-slate-400 mb-6">
                        Criar conta leva 2 minutos. Verificação por email ou Telegram é obrigatória.
                    </p>
                    <Link
                        href="/signup"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
                    >
                        Criar conta
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="w-full px-6 py-8 border-t border-slate-800/50 text-center text-xs text-slate-500 space-y-2">
                <p>Intelink · Plataforma de Inteligência Policial · ecossistema EGOS</p>
                <div className="flex items-center justify-center gap-4">
                    <Link href="/login" className="hover:text-slate-300 transition-colors">Entrar</Link>
                    <span>·</span>
                    <Link href="/signup" className="hover:text-slate-300 transition-colors">Criar conta</Link>
                    <span>·</span>
                    <Link href="/recover" className="hover:text-slate-300 transition-colors">Recuperar senha</Link>
                </div>
                <p className="pt-2">Autoria: Enio Rocha · Patos de Minas, MG</p>
            </footer>
        </div>
    );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20 mb-3">
                {icon}
            </div>
            <h3 className="font-semibold mb-1.5">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
        </div>
    );
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <div>
            <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {value}
            </div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
        </div>
    );
}

function Item({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-3">
            <Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <span className="text-slate-300 text-sm">{text}</span>
        </div>
    );
}
