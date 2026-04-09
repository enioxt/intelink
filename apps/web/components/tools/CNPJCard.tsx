'use client';

import { Building2, MapPin, Calendar, Users, FileText, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CNPJResult {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: 'ATIVA' | 'INATIVA' | string;
  tipo: 'MATRIZ' | 'FILIAL';
  data_abertura: string;
  cnae_principal: {
    codigo: string;
    descricao: string;
  };
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  telefone: string | null;
  email: string | null;
  capital_social: string;
  natureza_juridica: string;
  qtd_funcionarios: number | null;
  fonte: string;
}

interface CNPJCardProps {
  result: CNPJResult;
}

export function CNPJCard({ result }: CNPJCardProps) {
  const isActive = result.situacao === 'ATIVA';
  
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Building2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{result.razao_social}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono text-neutral-400">{result.cnpj}</span>
              {result.nome_fantasia && (
                <span className="text-neutral-500">— {result.nome_fantasia}</span>
              )}
            </div>
          </div>
        </div>
        <Badge className={cn(
          isActive 
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : 'bg-red-500/20 text-red-400 border-red-500/30'
        )}>
          {isActive ? (
            <><CheckCircle2 className="w-3 h-3 mr-1" />ATIVA</>
          ) : (
            <><XCircle className="w-3 h-3 mr-1" />INATIVA</>
          )}
        </Badge>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-neutral-500">Tipo</span>
          <p className="text-neutral-300">{result.tipo}</p>
        </div>
        <div>
          <span className="text-neutral-500">Abertura</span>
          <p className="text-neutral-300 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {result.data_abertura}
          </p>
        </div>
        <div>
          <span className="text-neutral-500">Capital Social</span>
          <p className="text-neutral-300 font-mono">{result.capital_social}</p>
        </div>
        <div>
          <span className="text-neutral-500">Natureza Jurídica</span>
          <p className="text-neutral-300">{result.natureza_juridica}</p>
        </div>
      </div>

      {/* CNAE */}
      <div className="p-3 rounded bg-neutral-900/50 border border-neutral-800">
        <h4 className="text-sm font-medium text-neutral-300 mb-1 flex items-center gap-2">
          <FileText className="w-4 h-4 text-neutral-500" />
          Atividade Principal (CNAE)
        </h4>
        <p className="font-mono text-xs text-emerald-400">{result.cnae_principal.codigo}</p>
        <p className="text-sm text-neutral-300 mt-1">{result.cnae_principal.descricao}</p>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-neutral-500" />
          Endereço
        </h4>
        <div className="p-3 rounded bg-neutral-900/50 text-sm space-y-1">
          <p className="text-neutral-300">
            {result.endereco.logradouro}, {result.endereco.numero}
            {result.endereco.complemento && ` — ${result.endereco.complemento}`}
          </p>
          <p className="text-neutral-400">{result.endereco.bairro}</p>
          <p className="text-neutral-300">
            {result.endereco.municipio} — {result.endereco.uf}
          </p>
          <p className="font-mono text-neutral-500">CEP: {result.endereco.cep}</p>
        </div>
      </div>

      {/* Contact */}
      {(result.telefone || result.email) && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          {result.telefone && (
            <div>
              <span className="text-neutral-500">Telefone</span>
              <p className="text-neutral-300 font-mono">{result.telefone}</p>
            </div>
          )}
          {result.email && (
            <div>
              <span className="text-neutral-500">Email</span>
              <p className="text-neutral-300">{result.email}</p>
            </div>
          )}
        </div>
      )}

      {/* Employees */}
      {result.qtd_funcionarios !== null && (
        <div className="flex items-center gap-2 text-sm p-2 rounded bg-neutral-900/30">
          <Users className="w-4 h-4 text-neutral-500" />
          <span className="text-neutral-500">Funcionários:</span>
          <span className="text-neutral-300 font-mono">{result.qtd_funcionarios}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
        <span className="text-neutral-500">Fonte: {result.fonte}</span>
        <a 
          href={`https://consulta-cnpj.com/cnpj/${result.cnpj.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline"
        >
          Consultar CNPJ →
        </a>
      </div>
    </div>
  );
}
