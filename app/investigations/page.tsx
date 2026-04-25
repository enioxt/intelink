/**
 * /investigations — redireciona para /
 * O header linkava aqui mas a rota correta de listagem é a landing page.
 */
import { redirect } from 'next/navigation';
export default function InvestigationsPage() { redirect('/'); }
