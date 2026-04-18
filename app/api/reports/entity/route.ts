/**
 * INTELINK Entity Report Generation API
 * 
 * Generates dossiê and risk analysis reports for individual entities.
 * 
 * @endpoint POST /api/reports/entity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, successResponse, errorResponse } from '@/lib/api-utils';
import { withSecurity, AuthContext } from '@/lib/api-security';


interface EntityReportRequest {
    entity_id: string;
    type: 'dossie' | 'risco';
}

async function handlePost(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
    try {
        const body: EntityReportRequest = await req.json();
        const { entity_id, type } = body;

        if (!entity_id) {
            return errorResponse('entity_id é obrigatório', 400);
        }

        if (!type || !['dossie', 'risco'].includes(type)) {
            return errorResponse('type deve ser "dossie" ou "risco"', 400);
        }

        // Fetch entity data
        const { data: entity, error: entityError } = await getSupabaseAdmin()
            .from('intelink_entities')
            .select('*')
            .eq('id', entity_id)
            .single();

        if (entityError || !entity) {
            return errorResponse('Entidade não encontrada', 404);
        }

        // Fetch relationships
        const { data: relationships } = await getSupabaseAdmin()
            .from('intelink_relationships')
            .select(`
                type, description,
                source:source_entity_id(id, name, type),
                target:target_entity_id(id, name, type)
            `)
            .or(`source_entity_id.eq.${entity_id},target_entity_id.eq.${entity_id}`);

        // Fetch investigation info if available
        let investigation = null;
        if (entity.investigation_id) {
            const { data: inv } = await getSupabaseAdmin()
                .from('intelink_investigations')
                .select('id, title, status, created_at')
                .eq('id', entity.investigation_id)
                .single();
            investigation = inv;
        }

        // Fetch other investigations this entity appears in
        const { data: entityAppearances } = await getSupabaseAdmin()
            .from('intelink_entities')
            .select('investigation_id, investigation:intelink_investigations(id, title)')
            .eq('name', entity.name)
            .eq('type', entity.type)
            .neq('investigation_id', entity.investigation_id || '');

        const otherInvestigations = (entityAppearances || [])
            .filter(a => a.investigation)
            .map(a => ({
                id: (a.investigation as any).id,
                title: (a.investigation as any).title,
            }));

        // Generate report based on type
        let report = '';
        const meta = entity.metadata || {};
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        if (type === 'dossie') {
            report = generateDossieReport(entity, meta, relationships, investigation, otherInvestigations, now);
        } else {
            report = generateRiskReport(entity, meta, relationships, investigation, otherInvestigations, now);
        }

        return successResponse({ report, entity: { id: entity.id, name: entity.name, type: entity.type } });

    } catch (e: any) {
        console.error('[Reports/Entity API] Error:', e);
        return errorResponse(e.message || 'Erro ao gerar relatório', 500);
    }
}

function generateDossieReport(
    entity: any,
    meta: any,
    relationships: any[] | null,
    investigation: any,
    otherInvestigations: any[],
    generatedAt: string
): string {
    const lines: string[] = [];
    
    // Header
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('                    DOSSIÊ DE INTELIGÊNCIA');
    lines.push('                        INTELINK SYSTEM');
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`📅 Gerado em: ${generatedAt}`);
    lines.push(`📄 Tipo: DOSSIÊ COMPLETO`);
    lines.push('');
    
    // Entity identification
    lines.push('───────────────────────────────────────────────────────────────────');
    lines.push('                    1. IDENTIFICAÇÃO DO ALVO');
    lines.push('───────────────────────────────────────────────────────────────────');
    lines.push('');
    lines.push(`NOME: ${entity.name.toUpperCase()}`);
    lines.push(`TIPO: ${entity.type === 'PERSON' ? 'PESSOA FÍSICA' : entity.type === 'VEHICLE' ? 'VEÍCULO' : entity.type}`);
    
    if (meta.role) lines.push(`SITUAÇÃO: ${meta.role.toUpperCase()}`);
    if (meta.vulgo) lines.push(`VULGO/ALCUNHA: ${meta.vulgo.toUpperCase()}`);
    if (meta.cpf) lines.push(`CPF: ${meta.cpf}`);
    if (meta.rg) lines.push(`RG: ${meta.rg}${meta.rg_uf ? ` (${meta.rg_uf})` : ''}`);
    if (meta.data_nascimento) lines.push(`NASCIMENTO: ${meta.data_nascimento}`);
    if (meta.mae) lines.push(`MÃE: ${meta.mae}`);
    if (meta.pai) lines.push(`PAI: ${meta.pai}`);
    if (meta.telefone) lines.push(`TELEFONE: ${meta.telefone}`);
    if (meta.profissao) lines.push(`PROFISSÃO: ${meta.profissao}`);
    if (meta.endereco) lines.push(`ENDEREÇO: ${meta.endereco}`);
    if (meta.bairro) lines.push(`BAIRRO: ${meta.bairro}`);
    if (meta.cidade) lines.push(`CIDADE: ${meta.cidade}`);
    
    // Vehicle-specific
    if (entity.type === 'VEHICLE') {
        if (meta.placa) lines.push(`PLACA: ${meta.placa}`);
        if (meta.modelo) lines.push(`MODELO: ${meta.modelo}`);
        if (meta.marca) lines.push(`MARCA: ${meta.marca}`);
        if (meta.cor) lines.push(`COR: ${meta.cor}`);
        if (meta.chassi) lines.push(`CHASSI: ${meta.chassi}`);
        if (meta.renavam) lines.push(`RENAVAM: ${meta.renavam}`);
    }
    
    lines.push('');
    
    // Relationships
    if (relationships && relationships.length > 0) {
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('                    2. VÍNCULOS IDENTIFICADOS');
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('');
        
        relationships.forEach(rel => {
            const source = (rel.source as any)?.name || 'Desconhecido';
            const target = (rel.target as any)?.name || 'Desconhecido';
            const other = source === entity.name ? target : source;
            const relType = formatRelationshipType(rel.type);
            
            lines.push(`• ${relType}: ${other}`);
            if (rel.description) lines.push(`  └─ ${rel.description}`);
        });
        
        lines.push('');
    }
    
    // Investigation context
    if (investigation) {
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('                    3. CONTEXTO DA OPERAÇÃO');
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('');
        lines.push(`OPERAÇÃO: ${investigation.title}`);
        lines.push(`STATUS: ${investigation.status || 'Em andamento'}`);
        lines.push(`INÍCIO: ${new Date(investigation.created_at).toLocaleDateString('pt-BR')}`);
        lines.push('');
    }
    
    // Cross-case appearances
    if (otherInvestigations.length > 0) {
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('                    ⚠️ ALERTAS CROSS-CASE');
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('');
        lines.push(`APARECE EM ${otherInvestigations.length} OUTRA(S) OPERAÇÃO(ÕES):`);
        otherInvestigations.forEach(inv => {
            lines.push(`• ${inv.title}`);
        });
        lines.push('');
    }
    
    // Footer
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('        DOCUMENTO GERADO AUTOMATICAMENTE PELO INTELINK');
    lines.push('         CLASSIFICAÇÃO: USO INTERNO / INTELIGÊNCIA');
    lines.push('═══════════════════════════════════════════════════════════════════');
    
    return lines.join('\n');
}

function generateRiskReport(
    entity: any,
    meta: any,
    relationships: any[] | null,
    investigation: any,
    otherInvestigations: any[],
    generatedAt: string
): string {
    const lines: string[] = [];
    
    // Calculate risk factors
    const riskFactors: string[] = [];
    let riskScore = 0;
    
    // Risk based on role
    if (meta.role === 'suspeito' || meta.role === 'suspect' || meta.role === 'investigado') {
        riskScore += 30;
        riskFactors.push('Cadastrado como suspeito/investigado');
    }
    if (meta.role === 'lider') {
        riskScore += 40;
        riskFactors.push('Identificado como LÍDER de organização');
    }
    
    // Risk based on connections
    const connectionCount = relationships?.length || 0;
    if (connectionCount > 10) {
        riskScore += 25;
        riskFactors.push(`Alta conectividade (${connectionCount} vínculos)`);
    } else if (connectionCount > 5) {
        riskScore += 15;
        riskFactors.push(`Conectividade moderada (${connectionCount} vínculos)`);
    }
    
    // Risk based on cross-case
    if (otherInvestigations.length > 0) {
        riskScore += 20 * Math.min(otherInvestigations.length, 3);
        riskFactors.push(`Reincidência em ${otherInvestigations.length} operação(ões)`);
    }
    
    // Weapon connections
    const hasWeaponConnection = relationships?.some(r => 
        (r.source as any)?.type === 'WEAPON' || 
        (r.target as any)?.type === 'WEAPON' ||
        (r.source as any)?.type === 'FIREARM' || 
        (r.target as any)?.type === 'FIREARM'
    );
    if (hasWeaponConnection) {
        riskScore += 35;
        riskFactors.push('⚠️ VÍNCULO COM ARMAMENTO');
    }
    
    // Normalize score
    riskScore = Math.min(100, riskScore);
    
    // Risk level
    let riskLevel = 'BAIXO';
    let riskColor = '🟢';
    if (riskScore >= 70) {
        riskLevel = 'CRÍTICO';
        riskColor = '🔴';
    } else if (riskScore >= 50) {
        riskLevel = 'ALTO';
        riskColor = '🟠';
    } else if (riskScore >= 30) {
        riskLevel = 'MODERADO';
        riskColor = '🟡';
    }
    
    // Header
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('                    ANÁLISE DE RISCO');
    lines.push('                    INTELINK SYSTEM');
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`📅 Gerado em: ${generatedAt}`);
    lines.push(`📄 Tipo: AVALIAÇÃO DE PERICULOSIDADE`);
    lines.push('');
    
    // Risk summary
    lines.push('───────────────────────────────────────────────────────────────────');
    lines.push('                    RESUMO DA AVALIAÇÃO');
    lines.push('───────────────────────────────────────────────────────────────────');
    lines.push('');
    lines.push(`ALVO: ${entity.name.toUpperCase()}`);
    lines.push(`TIPO: ${entity.type === 'PERSON' ? 'PESSOA FÍSICA' : entity.type}`);
    lines.push('');
    lines.push(`${riskColor} NÍVEL DE RISCO: ${riskLevel}`);
    lines.push(`📊 SCORE: ${riskScore}/100`);
    lines.push('');
    
    // Risk factors
    if (riskFactors.length > 0) {
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('                    FATORES DE RISCO');
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('');
        riskFactors.forEach(factor => {
            lines.push(`• ${factor}`);
        });
        lines.push('');
    }
    
    // Key connections
    if (relationships && relationships.length > 0) {
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('                    VÍNCULOS RELEVANTES');
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('');
        
        // Show top 10 connections
        relationships.slice(0, 10).forEach(rel => {
            const source = (rel.source as any)?.name || 'Desconhecido';
            const target = (rel.target as any)?.name || 'Desconhecido';
            const other = source === entity.name ? target : source;
            const otherType = source === entity.name ? (rel.target as any)?.type : (rel.source as any)?.type;
            
            lines.push(`• ${other} (${otherType || 'N/A'})`);
        });
        
        if (relationships.length > 10) {
            lines.push(`  ... e mais ${relationships.length - 10} vínculos`);
        }
        lines.push('');
    }
    
    // Cross-case warning
    if (otherInvestigations.length > 0) {
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('                    ⚠️ HISTÓRICO CRIMINAL');
        lines.push('───────────────────────────────────────────────────────────────────');
        lines.push('');
        lines.push(`REINCIDÊNCIA EM ${otherInvestigations.length} OPERAÇÃO(ÕES):`);
        otherInvestigations.forEach(inv => {
            lines.push(`• ${inv.title}`);
        });
        lines.push('');
    }
    
    // Recommendations
    lines.push('───────────────────────────────────────────────────────────────────');
    lines.push('                    RECOMENDAÇÕES');
    lines.push('───────────────────────────────────────────────────────────────────');
    lines.push('');
    
    if (riskScore >= 70) {
        lines.push('⚠️ ALVO DE ALTA PRIORIDADE');
        lines.push('• Recomenda-se acompanhamento intensivo');
        lines.push('• Verificar mandados em aberto');
        lines.push('• Avaliar medidas cautelares');
    } else if (riskScore >= 50) {
        lines.push('🔶 MONITORAMENTO RECOMENDADO');
        lines.push('• Manter vigilância sobre atividades');
        lines.push('• Cruzar informações com outras bases');
    } else {
        lines.push('✓ Nenhuma ação imediata necessária');
        lines.push('• Continuar coleta de inteligência');
    }
    
    lines.push('');
    
    // Footer
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('        DOCUMENTO GERADO AUTOMATICAMENTE PELO INTELINK');
    lines.push('         CLASSIFICAÇÃO: CONFIDENCIAL / INTELIGÊNCIA');
    lines.push('═══════════════════════════════════════════════════════════════════');
    
    return lines.join('\n');
}

function formatRelationshipType(type: string): string {
    const labels: Record<string, string> = {
        'MARRIED_TO': 'Cônjuge',
        'SPOUSE': 'Cônjuge',
        'CASADO_COM': 'Cônjuge',
        'CHILD_OF': 'Filho(a) de',
        'FILHO_DE': 'Filho(a) de',
        'PARENT_OF': 'Pai/Mãe de',
        'SIBLING': 'Irmão(ã) de',
        'PARTNER': 'Sócio(a)',
        'SOCIO_DE': 'Sócio(a)',
        'ASSOCIATED': 'Vinculado a',
        'KNOWS': 'Conhecido de',
        'RESIDES_AT': 'Reside em',
        'OWNS': 'Proprietário de',
        'WORKS_AT': 'Trabalha em',
    };
    return labels[type?.toUpperCase()] || type || 'Vinculado';
}

export const POST = withSecurity(handlePost);
