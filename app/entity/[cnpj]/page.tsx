/**
 * Entity Detail Page — CNPJ (Company)
 * 
 * [EGOS-MERGE] 🔵 ADAPTED: Página nova usando dados Neo4j do BR-ACC
 * TARGET: /home/enio/intelink/app/entity/[cnpj]/page.tsx
 * OWNER: cascade-agent
 * TIMESTAMP: 2026-04-01
 */

import { notFound } from 'next/navigation';
import { neo4jClient, CompanyData, SanctionData } from '@/lib/neo4j/client';

interface EntityPageProps {
  params: {
    cnpj: string;
  };
}

async function getCompanyData(cnpj: string): Promise<{
  company: CompanyData | null;
  sanctions: SanctionData[];
  stats: {
    totalNodes: number;
    totalRelationships: number;
  } | null;
}> {
  try {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    
    const [company, sanctions, stats] = await Promise.all([
      neo4jClient.getCompanyByCNPJ(cleanCnpj),
      neo4jClient.getSanctionsByCNPJ(cleanCnpj),
      neo4jClient.getStats().catch(() => null),
    ]);
    
    return { company, sanctions, stats };
  } catch (error) {
    console.error('Error fetching company data:', error);
    return { company: null, sanctions: [], stats: null };
  }
}

export default async function EntityPage({ params }: EntityPageProps) {
  const { cnpj } = params;
  const { company, sanctions, stats } = await getCompanyData(cnpj);
  
  if (!company) {
    notFound();
  }
  
  const hasSanctions = sanctions.length > 0;
  const activeSanctions = sanctions.filter(s => !s.end_date || new Date(s.end_date) > new Date());
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            Empresa
          </span>
          {hasSanctions && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeSanctions.length > 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {activeSanctions.length > 0 ? 'Sanções Ativas' : 'Sanções Históricas'}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{company.name}</h1>
        <p className="text-lg text-gray-600 font-mono">{company.cnpj}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Details Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Dados Cadastrais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <p className={`font-medium ${
                  company.status === 'ATIVA' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {company.status}
                </p>
              </div>
              {company.address && (
                <div>
                  <label className="text-sm text-gray-500">Endereço</label>
                  <p className="font-medium">{company.address}</p>
                </div>
              )}
              {company.city && (
                <div>
                  <label className="text-sm text-gray-500">Cidade/UF</label>
                  <p className="font-medium">{company.city}{company.state && `/${company.state}`}</p>
                </div>
              )}
              {company.employees && (
                <div>
                  <label className="text-sm text-gray-500">Funcionários</label>
                  <p className="font-medium">{company.employees.toLocaleString()}</p>
                </div>
              )}
              {company.created_at && (
                <div>
                  <label className="text-sm text-gray-500">Data de Abertura</label>
                  <p className="font-medium">
                    {new Date(company.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Sanctions Card */}
          {hasSanctions && (
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <span>⚠️</span> Sanções ({sanctions.length})
              </h2>
              <div className="space-y-4">
                {sanctions.map((sanction, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg ${
                      (!sanction.end_date || new Date(sanction.end_date) > new Date())
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800">
                        {sanction.source}
                      </span>
                      <span className={`text-sm px-2 py-1 rounded ${
                        (!sanction.end_date || new Date(sanction.end_date) > new Date())
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {(!sanction.end_date || new Date(sanction.end_date) > new Date())
                          ? 'Ativa'
                          : 'Encerrada'
                        }
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{sanction.reason}</p>
                    <div className="text-sm text-gray-500">
                      <span>De: {new Date(sanction.start_date).toLocaleDateString('pt-BR')}</span>
                      {sanction.end_date && (
                        <span> até {new Date(sanction.end_date).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                    {sanction.penalties && sanction.penalties.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">Penalidades: </span>
                        <span className="text-sm font-medium text-gray-800">
                          {sanction.penalties.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* No Sanctions */}
          {!hasSanctions && (
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <span>✅</span>
                <span className="font-medium">Nenhuma sanção encontrada nos registros CEIS/CNEP</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold mb-4 text-gray-800">Ações</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Ver Rede de Relacionamentos
              </button>
              <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                Exportar Dados
              </button>
              <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                Fazer Pergunta (AI)
              </button>
            </div>
          </div>
          
          {/* Graph Stats */}
          {stats && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold mb-4 text-gray-800">Base de Dados</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de Nós</span>
                  <span className="font-mono font-medium">
                    {stats.totalNodes.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Relacionamentos</span>
                  <span className="font-mono font-medium">
                    {stats.totalRelationships.toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Dados do Neo4j (BR-ACC)
              </p>
            </div>
          )}
          
          {/* Data Source */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Fontes de Dados</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Receita Federal (CNPJ)</li>
              <li>• CGU (PEPs)</li>
              <li>• CEIS/CNEP (Sanções)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metadata
export async function generateMetadata({ params }: EntityPageProps) {
  const cleanCnpj = params.cnpj.replace(/[^\d]/g, '');
  
  try {
    const company = await neo4jClient.getCompanyByCNPJ(cleanCnpj);
    
    if (company) {
      return {
        title: `${company.name} — ${company.cnpj} | EGOS Inteligência`,
        description: `Dados cadastrais e sanções para ${company.name} (CNPJ: ${company.cnpj})`,
      };
    }
  } catch {
    // Fallback to default
  }
  
  return {
    title: `CNPJ ${cleanCnpj} | EGOS Inteligência`,
    description: 'Consulta de dados de empresa na base pública',
  };
}
