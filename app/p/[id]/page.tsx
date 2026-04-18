/**
 * /p/[id] — Short URL para entidade Person
 * UX-006: alias de /pessoa/[id] com OG tags para preview no Telegram/WhatsApp
 */

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { runQuery } from '@/lib/neo4j/server';

interface Props {
    params: { id: string };
}

type PersonRow = { p: { properties: Record<string, unknown> } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const id = decodeURIComponent(params.id);
    const isCpf = /^\d{10,11}$/.test(id.replace(/\D/g, ''));
    const where = isCpf ? 'p.cpf = $id' : 'p.reds_person_key = $id';

    try {
        const rows = await runQuery<PersonRow>(
            `MATCH (p:Person) WHERE ${where} RETURN p LIMIT 1`,
            { id: isCpf ? id.replace(/\D/g, '') : id }
        );

        if (rows.length) {
            const p = rows[0].p.properties;
            const name = String(p.nome_original ?? p.name ?? 'Pessoa').toUpperCase();
            const bairro = p.bairro ? ` · ${p.bairro}` : '';
            const cidade = p.cidade ? `, ${p.cidade}` : '';
            return {
                title: `${name} — Intelink`,
                description: `Registro REDS${bairro}${cidade}. Consulte o perfil completo no Intelink.`,
                openGraph: {
                    title: `👤 ${name}`,
                    description: `Registro REDS${bairro}${cidade}`,
                    siteName: 'Intelink',
                },
            };
        }
    } catch { /* fallback */ }

    return { title: 'Intelink — Registro não encontrado' };
}

export default function ShortPersonPage({ params }: Props) {
    const id = decodeURIComponent(params.id);
    redirect(`/pessoa/${id}`);
}
