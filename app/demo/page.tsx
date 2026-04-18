'use client';

import React, { useState, useMemo } from 'react';
import {
    syntheticEntities,
    syntheticRelationships,
    syntheticAnomalies,
    syntheticTimeline,
} from '../../lib/demo-data';

// ─── Types ─────────────────────────────────────────────────────
type TabId = 'overview' | 'graph' | 'anomalies' | 'timeline' | 'evidence';

// ─── Utility ───────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const riskColor = (score: number) =>
    score >= 90 ? '#ef4444' : score >= 70 ? '#f59e0b' : score >= 50 ? '#3b82f6' : '#22c55e';

const typeIcon: Record<string, string> = {
    person: '👤',
    company: '🏢',
    government: '🏛️',
};

const typeLabel: Record<string, string> = {
    person: 'Pessoa',
    company: 'Empresa',
    government: 'Governo',
};

// ─── Main Page ─────────────────────────────────────────────────
export default function IntelinkDemoPage() {
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

    const entities = Object.values(syntheticEntities);
    const totalExposure = syntheticAnomalies.reduce((a, b) => a + b.value, 0);

    const tabs: { id: TabId; label: string; icon: string }[] = [
        { id: 'overview', label: 'Visão Geral', icon: '📊' },
        { id: 'graph', label: 'Grafo de Vínculos', icon: '🕸️' },
        { id: 'anomalies', label: 'Anomalias', icon: '🚨' },
        { id: 'timeline', label: 'Linha do Tempo', icon: '📅' },
        { id: 'evidence', label: 'Evidências', icon: '📎' },
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
            color: '#e2e8f0',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* ═══ Demo Banner ═══ */}
            <div style={{
                background: 'linear-gradient(90deg, #f59e0b22, #ef444422, #f59e0b22)',
                borderBottom: '1px solid #f59e0b44',
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 600,
            }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <span style={{ color: '#fbbf24' }}>MODO DEMONSTRAÇÃO</span>
                <span style={{ color: '#94a3b8' }}>— Todos os dados exibidos são sintéticos e fictícios.</span>
            </div>

            {/* ═══ Header ═══ */}
            <header style={{
                padding: '32px 24px 16px',
                maxWidth: 1400,
                margin: '0 auto',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                    <div style={{
                        width: 48, height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24,
                    }}>🔍</div>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                            Intelink <span style={{ color: '#a855f7' }}>Cortex</span>
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                            Plataforma Open-Source de Inteligência em Dados Públicos
                        </p>
                    </div>
                </div>

                {/* ═══ Macro Stats ═══ */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                    marginTop: 24,
                }}>
                    {[
                        { label: 'Entidades', value: entities.length, icon: '🎯', color: '#3b82f6' },
                        { label: 'Vínculos', value: syntheticRelationships.length, icon: '🔗', color: '#8b5cf6' },
                        { label: 'Anomalias', value: syntheticAnomalies.length, icon: '🚨', color: '#ef4444' },
                        { label: 'Exposição Total', value: fmt(totalExposure), icon: '💰', color: '#f59e0b' },
                        { label: 'Bases Públicas', value: '79', icon: '🗄️', color: '#22c55e' },
                        { label: 'Score Máx. Risco', value: '97', icon: '⚡', color: '#ef4444' },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: `1px solid ${s.color}33`,
                            borderRadius: 12,
                            padding: '16px 20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span>{s.icon}</span>
                                <span style={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>
            </header>

            {/* ═══ Tab Bar ═══ */}
            <nav style={{
                maxWidth: 1400,
                margin: '0 auto',
                padding: '0 24px',
                display: 'flex',
                gap: 4,
                borderBottom: '1px solid #1e293b',
            }}>
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                            padding: '12px 20px',
                            background: activeTab === t.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === t.id ? '2px solid #a855f7' : '2px solid transparent',
                            color: activeTab === t.id ? '#e2e8f0' : '#64748b',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: activeTab === t.id ? 600 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s',
                        }}
                    >
                        <span>{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </nav>

            {/* ═══ Content ═══ */}
            <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'graph' && <GraphTab selectedEntity={selectedEntity} setSelectedEntity={setSelectedEntity} />}
                {activeTab === 'anomalies' && <AnomaliesTab selectedAnomaly={selectedAnomaly} setSelectedAnomaly={setSelectedAnomaly} />}
                {activeTab === 'timeline' && <TimelineTab />}
                {activeTab === 'evidence' && <EvidenceTab />}
            </main>

            {/* ═══ Footer ═══ */}
            <footer style={{
                maxWidth: 1400,
                margin: '0 auto',
                padding: '40px 24px',
                borderTop: '1px solid #1e293b',
                textAlign: 'center',
            }}>
                <div style={{
                    background: 'rgba(168, 85, 247, 0.08)',
                    borderRadius: 16,
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    padding: '32px 24px',
                }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                        🌐 Contribua com o Intelink
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16, maxWidth: 600, margin: '0 auto 16px' }}>
                        Intelink é 100% open-source. Ajude a construir a maior plataforma de inteligência em dados públicos do Brasil.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="https://github.com/enioxt/egos-lab" target="_blank" rel="noreferrer"
                            style={{ padding: '10px 24px', background: '#a855f7', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                            ⭐ Star no GitHub
                        </a>
                        <a href="https://github.com/enioxt/egos-lab/issues" target="_blank" rel="noreferrer"
                            style={{ padding: '10px 24px', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            📋 Abrir Issue
                        </a>
                    </div>
                </div>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 16 }}>
                    Intelink Cortex — EGOS Lab © 2026 | Dados sintéticos para demonstração
                </p>
            </footer>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Tab: Overview
// ═══════════════════════════════════════════════════════════════
function OverviewTab() {
    const entities = Object.values(syntheticEntities);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Case Summary */}
            <div style={{
                gridColumn: '1 / -1',
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 16,
                padding: 24,
                border: '1px solid #1e293b',
            }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    📋 Resumo do Caso Demonstrativo
                </h2>
                <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: 14 }}>
                    Este caso demonstrativo simula uma investigação de <strong style={{ color: '#ef4444' }}>auto-direcionamento de emendas parlamentares</strong>.
                    Um deputado federal destinou R$ 47 milhões em emendas para um município politicamente aliado. Desse valor,
                    67% foi adjudicado em contratos para uma empresa de propriedade do <strong style={{ color: '#f59e0b' }}>irmão do deputado</strong>.
                    Paralelamente, uma empresa de saúde que <strong style={{ color: '#8b5cf6' }}>doou R$ 150 mil para a campanha</strong> do deputado
                    começou a receber repasses milionários do SUS via o mesmo município. Além disso, foram detectados
                    <strong style={{ color: '#ef4444' }}> 34 funcionários fantasma</strong> com duplo vínculo entre a empresa familiar e o serviço público municipal.
                </p>
            </div>

            {/* Entity Cards */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 16,
                padding: 24,
                border: '1px solid #1e293b',
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🎯 Entidades Monitoradas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {entities.map(e => (
                        <div key={e.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'rgba(30, 41, 59, 0.5)',
                            borderRadius: 10,
                            border: `1px solid ${riskColor(e.riskScore)}22`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 20 }}>{typeIcon[e.type]}</span>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.label}</div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>{typeLabel[e.type]}</div>
                                </div>
                            </div>
                            <div style={{
                                padding: '4px 10px',
                                borderRadius: 20,
                                background: `${riskColor(e.riskScore)}22`,
                                color: riskColor(e.riskScore),
                                fontSize: 12,
                                fontWeight: 700,
                            }}>
                                Risk: {e.riskScore}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Anomalies Summary */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 16,
                padding: 24,
                border: '1px solid #1e293b',
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🚨 Anomalias Críticas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {syntheticAnomalies.map(a => (
                        <div key={a.id} style={{
                            padding: '12px 16px',
                            background: a.type === 'critical' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                            borderRadius: 10,
                            borderLeft: `3px solid ${a.type === 'critical' ? '#ef4444' : '#f59e0b'}`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</span>
                                <span style={{
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 10,
                                    background: a.type === 'critical' ? '#ef444422' : '#f59e0b22',
                                    color: a.type === 'critical' ? '#ef4444' : '#f59e0b',
                                    fontWeight: 700,
                                }}>
                                    {a.score}
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{a.description.slice(0, 100)}...</div>
                            <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginTop: 6 }}>
                                Exposição: {fmt(a.value)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Data Sources */}
            <div style={{
                gridColumn: '1 / -1',
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 16,
                padding: 24,
                border: '1px solid #1e293b',
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🗄️ Fontes Públicas Utilizadas (Demonstração)</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                        'Receita Federal (CNPJ/QSA)', 'TSE Doações', 'TSE Candidaturas', 'Portal da Transparência',
                        'RAIS', 'DATASUS/SIH', 'ComprasNet/PNCP', 'SIAFI', 'DOU', 'CEIS/CGU',
                        'INPE/DETER', 'DataJud/CNJ', 'CVM Aberta', 'BCB Câmbio',
                    ].map((source, i) => (
                        <span key={i} style={{
                            padding: '6px 14px',
                            borderRadius: 20,
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            color: '#22c55e',
                            fontSize: 12,
                            fontWeight: 500,
                        }}>
                            {source}
                        </span>
                    ))}
                    <span style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        background: 'rgba(100, 116, 139, 0.1)',
                        border: '1px solid rgba(100, 116, 139, 0.2)',
                        color: '#64748b',
                        fontSize: 12,
                    }}>
                        + 65 outras bases
                    </span>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Tab: Graph (SVG Force-directed simulation)
// ═══════════════════════════════════════════════════════════════
function GraphTab({
    selectedEntity,
    setSelectedEntity,
}: {
    selectedEntity: string | null;
    setSelectedEntity: (id: string | null) => void;
}) {
    const entities = Object.values(syntheticEntities);

    // Static positions for the demo (radial layout)
    const positions: Record<string, { x: number; y: number }> = {
        dep_federal_1: { x: 400, y: 200 },
        pref_santo_andre: { x: 250, y: 380 },
        abc_construcoes: { x: 550, y: 380 },
        jsj_comunicacao: { x: 600, y: 180 },
        ms_saude: { x: 180, y: 150 },
    };

    const edgeColors: Record<string, string> = {
        assigned_emenda: '#f59e0b',
        contracted: '#3b82f6',
        family_tie: '#ef4444',
        donated: '#a855f7',
    };

    const selectedData = selectedEntity ? syntheticEntities[selectedEntity] : null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
            <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 16,
                border: '1px solid #1e293b',
                overflow: 'hidden',
                position: 'relative',
            }}>
                <div style={{
                    position: 'absolute', top: 16, left: 16,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 12,
                    color: '#94a3b8',
                    zIndex: 10,
                }}>
                    Clique em um nó para inspecionar
                </div>

                {/* SVG Graph */}
                <svg width="100%" viewBox="0 0 800 500" style={{ display: 'block' }}>
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Edges */}
                    {syntheticRelationships.map(r => {
                        const from = positions[r.source];
                        const to = positions[r.target];
                        if (!from || !to) return null;
                        const color = edgeColors[r.type] || '#475569';
                        return (
                            <g key={r.id}>
                                <line
                                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                    stroke={color}
                                    strokeWidth={r.type === 'family_tie' ? 3 : 2}
                                    strokeDasharray={r.type === 'family_tie' ? '8,4' : undefined}
                                    opacity={0.6}
                                />
                                <text
                                    x={(from.x + to.x) / 2}
                                    y={(from.y + to.y) / 2 - 8}
                                    fill={color}
                                    fontSize={10}
                                    textAnchor="middle"
                                    fontWeight={500}
                                >
                                    {r.label}
                                </text>
                                {r.properties.amount && (
                                    <text
                                        x={(from.x + to.x) / 2}
                                        y={(from.y + to.y) / 2 + 6}
                                        fill="#64748b"
                                        fontSize={9}
                                        textAnchor="middle"
                                    >
                                        {fmt(Number(r.properties.amount))}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Nodes */}
                    {entities.map(e => {
                        const pos = positions[e.id];
                        if (!pos) return null;
                        const isSelected = selectedEntity === e.id;
                        const nodeRadius = e.type === 'person' ? 32 : 28;
                        return (
                            <g
                                key={e.id}
                                onClick={() => setSelectedEntity(isSelected ? null : e.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <circle
                                    cx={pos.x} cy={pos.y}
                                    r={nodeRadius + 4}
                                    fill="none"
                                    stroke={riskColor(e.riskScore)}
                                    strokeWidth={isSelected ? 3 : 1}
                                    opacity={isSelected ? 0.8 : 0.3}
                                    filter={isSelected ? 'url(#glow)' : undefined}
                                />
                                <circle
                                    cx={pos.x} cy={pos.y}
                                    r={nodeRadius}
                                    fill={`${riskColor(e.riskScore)}22`}
                                    stroke={riskColor(e.riskScore)}
                                    strokeWidth={2}
                                />
                                <text
                                    x={pos.x} y={pos.y + 4}
                                    textAnchor="middle"
                                    fontSize={22}
                                >
                                    {typeIcon[e.type]}
                                </text>
                                <text
                                    x={pos.x} y={pos.y + nodeRadius + 16}
                                    textAnchor="middle"
                                    fill="#e2e8f0"
                                    fontSize={11}
                                    fontWeight={600}
                                >
                                    {e.label.length > 25 ? e.label.slice(0, 22) + '...' : e.label}
                                </text>
                            </g>
                        );
                    })}

                    {/* Legend */}
                    {[
                        { label: 'Emenda', color: '#f59e0b', y: 440 },
                        { label: 'Contrato', color: '#3b82f6', y: 455 },
                        { label: 'Vínculo Familiar', color: '#ef4444', y: 470, dashed: true },
                        { label: 'Doação', color: '#a855f7', y: 485 },
                    ].map((l, i) => (
                        <g key={i}>
                            <line x1={20} y1={l.y} x2={50} y2={l.y} stroke={l.color} strokeWidth={2}
                                strokeDasharray={l.dashed ? '6,3' : undefined} />
                            <text x={56} y={l.y + 4} fill="#94a3b8" fontSize={10}>{l.label}</text>
                        </g>
                    ))}
                </svg>
            </div>

            {/* Entity Detail Panel */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 16,
                border: '1px solid #1e293b',
                padding: 24,
            }}>
                {selectedData ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <span style={{ fontSize: 32 }}>{typeIcon[selectedData.type]}</span>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{selectedData.label}</h3>
                                <span style={{ fontSize: 12, color: '#64748b' }}>{typeLabel[selectedData.type]}</span>
                            </div>
                        </div>

                        <div style={{
                            padding: 16, borderRadius: 10,
                            background: `${riskColor(selectedData.riskScore)}11`,
                            border: `1px solid ${riskColor(selectedData.riskScore)}33`,
                            marginBottom: 20,
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>SCORE DE RISCO</div>
                            <div style={{ fontSize: 36, fontWeight: 800, color: riskColor(selectedData.riskScore) }}>
                                {selectedData.riskScore}
                            </div>
                        </div>

                        <h4 style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
                            Propriedades
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {Object.entries(selectedData.properties).map(([k, v]) => (
                                <div key={k} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    background: 'rgba(30, 41, 59, 0.5)',
                                    borderRadius: 6,
                                    fontSize: 12,
                                }}>
                                    <span style={{ color: '#94a3b8' }}>{k}</span>
                                    <span style={{ fontWeight: 600 }}>
                                        {typeof v === 'number' && v > 1000 ? fmt(v) : String(v)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <h4 style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', marginTop: 20, marginBottom: 10 }}>
                            Conexões
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {syntheticRelationships
                                .filter(r => r.source === selectedData.id || r.target === selectedData.id)
                                .map(r => {
                                    const otherId = r.source === selectedData.id ? r.target : r.source;
                                    const other = syntheticEntities[otherId];
                                    return (
                                        <div key={r.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 12px',
                                            background: 'rgba(30, 41, 59, 0.5)',
                                            borderRadius: 6,
                                            fontSize: 12,
                                        }}>
                                            <span>{typeIcon[other?.type || 'person']}</span>
                                            <span style={{ flex: 1 }}>{other?.label}</span>
                                            <span style={{ color: edgeColors[r.type] || '#64748b', fontWeight: 600 }}>
                                                {r.label}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
                        <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🕸️</span>
                        <p>Clique em uma entidade no grafo para ver seus detalhes e conexões.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Tab: Anomalies
// ═══════════════════════════════════════════════════════════════
function AnomaliesTab({
    selectedAnomaly,
    setSelectedAnomaly,
}: {
    selectedAnomaly: string | null;
    setSelectedAnomaly: (id: string | null) => void;
}) {
    const selected = syntheticAnomalies.find(a => a.id === selectedAnomaly);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {syntheticAnomalies.map(a => {
                const isSelected = selectedAnomaly === a.id;
                return (
                    <div
                        key={a.id}
                        onClick={() => setSelectedAnomaly(isSelected ? null : a.id)}
                        style={{
                            background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'rgba(15, 23, 42, 0.8)',
                            borderRadius: 16,
                            padding: 24,
                            border: `1px solid ${isSelected ? '#ef444455' : '#1e293b'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: 20,
                                background: a.type === 'critical' ? '#ef444422' : '#f59e0b22',
                                color: a.type === 'critical' ? '#ef4444' : '#f59e0b',
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                            }}>
                                {a.type}
                            </span>
                            <div style={{
                                width: 48, height: 48,
                                borderRadius: '50%',
                                background: `${riskColor(a.score)}22`,
                                border: `2px solid ${riskColor(a.score)}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, fontWeight: 800, color: riskColor(a.score),
                            }}>
                                {a.score}
                            </div>
                        </div>

                        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{a.title}</h3>
                        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>{a.description}</p>

                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(245, 158, 11, 0.08)',
                            borderRadius: 10,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Exposição Financeira</span>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{fmt(a.value)}</span>
                        </div>

                        {isSelected && (
                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
                                <h4 style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Entidades Envolvidas:</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {a.entities.map(eId => {
                                        const e = syntheticEntities[eId];
                                        return (
                                            <span key={eId} style={{
                                                padding: '4px 12px',
                                                borderRadius: 20,
                                                background: 'rgba(30, 41, 59, 0.8)',
                                                border: `1px solid ${riskColor(e?.riskScore || 50)}33`,
                                                fontSize: 12,
                                            }}>
                                                {typeIcon[e?.type || 'person']} {e?.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Tab: Timeline
// ═══════════════════════════════════════════════════════════════
function TimelineTab() {
    const typeColors: Record<string, string> = {
        registration: '#3b82f6',
        election: '#8b5cf6',
        financial: '#f59e0b',
        transaction: '#ef4444',
        legal: '#22c55e',
    };

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: 16,
            padding: '32px 24px',
            border: '1px solid #1e293b',
            position: 'relative',
        }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>📅 Cronologia dos Eventos</h3>

            <div style={{ position: 'relative', paddingLeft: 40 }}>
                {/* Vertical line */}
                <div style={{
                    position: 'absolute',
                    left: 15,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: 'linear-gradient(to bottom, #a855f7, #3b82f6, #22c55e, #ef4444)',
                    opacity: 0.4,
                }} />

                {syntheticTimeline.map((event, i) => {
                    const color = typeColors[event.type] || '#64748b';
                    return (
                        <div key={event.id} style={{
                            position: 'relative',
                            marginBottom: '1.5rem',
                        }}>
                            {/* Dot */}
                            <div style={{
                                position: 'absolute',
                                left: -33,
                                top: 16,
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: color,
                                border: `2px solid ${color}`,
                                boxShadow: `0 0 12px ${color}44`,
                                zIndex: 1,
                            }} />

                            {/* Card */}
                            <div style={{
                                background: 'rgba(30, 41, 59, 0.5)',
                                border: '1px solid rgba(51, 65, 85, 0.5)',
                                borderRadius: 12,
                                padding: '16px 20px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                    <span style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{event.date}</span>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 10,
                                        background: `${color}22`,
                                        color,
                                        fontSize: 10,
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                    }}>
                                        {event.type}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#475569' }}>Fonte: {event.source}</span>
                                </div>
                                <h4 style={{ fontSize: 15, fontWeight: 700, margin: '4px 0' }}>{event.title}</h4>
                                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{event.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Tab: Evidence
// ═══════════════════════════════════════════════════════════════
function EvidenceTab() {
    const evidenceItems = [
        {
            id: 'ev1',
            type: 'document',
            title: 'Emenda Parlamentar — Portal da Transparência',
            source: 'transparencia.gov.br',
            date: '2023-03-10',
            snippet: 'Transferência Especial nº 900XXX/2023 — Valor: R$ 47.000.000,00 — Destinação: Prefeitura de Santo André/SP — Autor: Dep. [Oculto]',
            confidence: 98,
        },
        {
            id: 'ev2',
            type: 'contract',
            title: 'Contrato Administrativo nº 042/2023',
            source: 'ComprasNet/PNCP',
            date: '2023-06-25',
            snippet: 'Objeto: Obras de infraestrutura urbana — Contratada: ABC Construções Ltda (CNPJ: 11.222.333/0001-44) — Valor: R$ 32.000.000,00 — Modalidade: Concorrência Pública',
            confidence: 96,
        },
        {
            id: 'ev3',
            type: 'corporate',
            title: 'Quadro Societário — ABC Construções',
            source: 'Receita Federal (CNPJ/QSA)',
            date: '2023-01-15',
            snippet: 'Sócio-Administrador: [Irmão do Deputado] — Participação: 80% — Data de Entrada: 15/06/2017',
            confidence: 99,
        },
        {
            id: 'ev4',
            type: 'electoral',
            title: 'Prestação de Contas — Eleições 2022',
            source: 'TSE Doações',
            date: '2022-08-15',
            snippet: 'Doadora: MS Saúde e Serviços (CNPJ: 99.888.777/0001-22) — Valor: R$ 150.000,00 — Tipo: Pessoa Jurídica — Candidato: Dep. [Oculto]',
            confidence: 100,
        },
        {
            id: 'ev5',
            type: 'health',
            title: 'Repasses FNS — DATASUS',
            source: 'DATASUS/SIH',
            date: '2023-12-31',
            snippet: 'Estabelecimento: MS Saúde e Serviços — Total Recebido (2023): R$ 12.000.000,00 — Município Gestor: Santo André/SP — Procedimentos: 4.200 internações',
            confidence: 92,
        },
        {
            id: 'ev6',
            type: 'labor',
            title: 'Cruzamento RAIS × Folha Municipal',
            source: 'RAIS + Prefeitura',
            date: '2023-12-31',
            snippet: '34 CPFs com vínculo ativo simultâneo: ABC Construções (RAIS) + Servidor Municipal (Folha de Pagamento). Valor estimado anual dos salários duplos: R$ 2.400.000,00',
            confidence: 94,
        },
    ];

    const typeIcons: Record<string, string> = {
        document: '📄', contract: '📝', corporate: '🏢', electoral: '🗳️', health: '🏥', labor: '👷',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 16, padding: '16px 24px',
                border: '1px solid #1e293b',
                display: 'flex', alignItems: 'center', gap: 12,
            }}>
                <span style={{ fontSize: 20 }}>📎</span>
                <div>
                    <span style={{ fontWeight: 700 }}>{evidenceItems.length} evidências coletadas</span>
                    <span style={{ color: '#64748b', fontSize: 13, marginLeft: 10 }}>
                        de {new Set(evidenceItems.map(e => e.source)).size} fontes públicas distintas
                    </span>
                </div>
            </div>

            {evidenceItems.map(ev => (
                <div key={ev.id} style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderRadius: 16,
                    padding: 24,
                    border: '1px solid #1e293b',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 24 }}>{typeIcons[ev.type] || '📄'}</span>
                            <div>
                                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{ev.title}</h4>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>{ev.source}</span>
                                    <span style={{ fontSize: 11, color: '#475569' }}>•</span>
                                    <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{ev.date}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{
                            padding: '4px 10px',
                            borderRadius: 20,
                            background: ev.confidence >= 95 ? '#22c55e22' : '#f59e0b22',
                            color: ev.confidence >= 95 ? '#22c55e' : '#f59e0b',
                            fontSize: 11,
                            fontWeight: 700,
                        }}>
                            {ev.confidence}% confiança
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderRadius: 10,
                        padding: '14px 18px',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        color: '#cbd5e1',
                        lineHeight: 1.6,
                        borderLeft: '3px solid #a855f744',
                    }}>
                        {ev.snippet}
                    </div>
                </div>
            ))}
        </div>
    );
}
