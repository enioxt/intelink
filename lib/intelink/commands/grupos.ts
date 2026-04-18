/**
 * ML-002: /grupos [tipo_crime] — Clustering de grupos criminais por MO
 *
 * Sem Neo4j GDS: WCC aproximado via co-ocorrência + Union-Find.
 * Agrupa pessoas que cometem crimes juntos de forma recorrente (weight ≥ 2).
 * Classifica cada grupo pelo tipo de crime dominante.
 */

import { Command, CommandContext, CommandDependencies } from './types';
import { runQuery } from '@/lib/neo4j/server';

const QUERY_EDGES = `
MATCH (a:Person)-[:ENVOLVIDO_EM]->(o:Occurrence)<-[:ENVOLVIDO_EM]-(b:Person)
WHERE a.cpf < b.cpf
  AND ($tipo = '' OR toLower(o.tipo) CONTAINS toLower($tipo))
WITH a.cpf AS cpfA, a.name AS nameA, b.cpf AS cpfB, b.name AS nameB, count(o) AS weight
WHERE weight >= 2
RETURN cpfA, nameA, cpfB, nameB, weight
ORDER BY weight DESC
LIMIT 500
`;

const QUERY_DOMINANT_TIPO = `
MATCH (p:Person)-[:ENVOLVIDO_EM]->(o:Occurrence)
WHERE p.cpf IN $cpfs
WITH o.tipo AS tipo, count(*) AS n ORDER BY n DESC
RETURN tipo LIMIT 1
`;

interface Edge { cpfA: string; nameA: string; cpfB: string; nameB: string; weight: number }
interface Group { members: Map<string, string>; totalWeight: number }

function unionFind(edges: Edge[]): Group[] {
    const parent = new Map<string, string>();
    const nameOf = new Map<string, string>();

    function find(x: string): string {
        if (!parent.has(x)) parent.set(x, x);
        if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
        return parent.get(x)!;
    }

    for (const e of edges) {
        nameOf.set(e.cpfA, e.nameA);
        nameOf.set(e.cpfB, e.nameB);
        const ra = find(e.cpfA), rb = find(e.cpfB);
        if (ra !== rb) parent.set(ra, rb);
    }

    const groups = new Map<string, Group>();
    for (const [cpf] of nameOf) {
        const root = find(cpf);
        if (!groups.has(root)) groups.set(root, { members: new Map(), totalWeight: 0 });
        groups.get(root)!.members.set(cpf, nameOf.get(cpf)!);
    }
    for (const e of edges) {
        const root = find(e.cpfA);
        if (groups.has(root)) groups.get(root)!.totalWeight += e.weight;
    }

    return [...groups.values()]
        .filter(g => g.members.size >= 2)
        .sort((a, b) => b.totalWeight - a.totalWeight);
}

export const gruposCommand: Command = {
    name: 'grupos',
    aliases: ['groups', 'quadrilha'],
    description: 'Identifica grupos criminais por co-ocorrência recorrente',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { chatId, args } = ctx;
        const { sendMessage } = deps;

        const tipo = args.trim();

        await sendMessage(chatId,
            `🔍 Calculando grupos criminais` +
            (tipo ? ` para tipo *${tipo}*` : '') + `...`
        );

        try {
            const edges = await runQuery(QUERY_EDGES, { tipo });

            if (!edges.length) {
                await sendMessage(chatId,
                    `⚠️ Nenhum par com 2+ ocorrências em comum` +
                    (tipo ? ` para tipo *${tipo}*` : '') + `.\n` +
                    `_(Tente sem filtro de tipo ou importe mais dados REDS)_`
                );
                return;
            }

            const edgeData: Edge[] = (edges as any[]).map(r => ({
                cpfA: r.get('cpfA') as string,
                nameA: r.get('nameA') as string,
                cpfB: r.get('cpfB') as string,
                nameB: r.get('nameB') as string,
                weight: r.get('weight') as number,
            }));

            const groups = unionFind(edgeData).slice(0, 8);

            if (!groups.length) {
                await sendMessage(chatId, `⚠️ Nenhum grupo com 2+ membros encontrado.`);
                return;
            }

            const lines = await Promise.all(groups.map(async (g, i) => {
                const cpfs  = [...g.members.keys()];
                const names = [...g.members.values()];

                let tipoLabel = tipo || '?';
                if (!tipo) {
                    try {
                        const tr = await runQuery(QUERY_DOMINANT_TIPO, { cpfs });
                        tipoLabel = (tr[0] as any)?.get('tipo') as string || '?';
                    } catch { /* ignore */ }
                }

                const preview = names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '');
                return (
                    `${i + 1}. 👥 *Grupo ${i + 1}* — ${g.members.size} membros\n` +
                    `   Tipo: _${tipoLabel}_\n` +
                    `   Elos: ${g.totalWeight} co-ocorrências\n` +
                    `   Membros: ${preview}`
                );
            }));

            const totalGroups = groups.length;
            const totalMembers = groups.reduce((s, g) => s + g.members.size, 0);

            await sendMessage(chatId,
                `🕵️ *Grupos criminais detectados*\n` +
                (tipo ? `Tipo: _${tipo}_\n` : '') +
                `${totalGroups} grupos | ${totalMembers} pessoas | ${edgeData.length} elos analisados\n` +
                `Critério: 2+ ocorrências em comum\n\n` +
                lines.join('\n\n') +
                `\n\n_Use /buscar <cpf> para investigar membros individuais_\n` +
                `_Use /crit <cpf> para análise de ameaça_`
            );
        } catch (err) {
            console.error('[grupos]', err);
            await sendMessage(chatId, `❌ Erro ao calcular grupos.`);
        }
    },
};
