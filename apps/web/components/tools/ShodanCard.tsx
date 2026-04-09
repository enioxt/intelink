'use client';

import { Globe, Server, Shield, AlertTriangle, ExternalLink, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Vulnerability {
  cve: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
}

interface ShodanResult {
  ip: string;
  ports: number[];
  hostnames: string[];
  city: string | null;
  country: string | null;
  isp: string | null;
  os: string | null;
  last_update: string;
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    list: Vulnerability[];
  };
  risk_indicators: string[];
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  query_url: string;
}

interface ShodanCardProps {
  result: ShodanResult;
}

const severityConfig = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50' },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/50' },
  medium: { color: 'text-amber-500', bg: 'bg-amber-500/20', border: 'border-amber-500/50' },
  low: { color: 'text-emerald-500', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50' },
};

export function ShodanCard({ result }: ShodanCardProps) {
  const config = severityConfig[result.risk_level];
  
  return (
    <div className={`rounded-lg border p-4 space-y-4 ${config.bg} ${config.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Globe className={`w-8 h-8 ${config.color}`} />
          <div>
            <h3 className="font-semibold text-lg">Shodan Analysis</h3>
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <span className="font-mono">{result.ip}</span>
              {result.hostnames.length > 0 && (
                <span className="text-neutral-500">({result.hostnames[0]})</span>
              )}
            </div>
          </div>
        </div>
        <Badge className={`${config.bg} ${config.color} border ${config.border}`}>
          Risco {result.risk_level.toUpperCase()}
        </Badge>
      </div>

      {/* Location & ISP */}
      <div className="grid grid-cols-2 gap-4">
        {(result.city || result.country) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-300">
              {[result.city, result.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        {result.isp && (
          <div className="flex items-center gap-2 text-sm">
            <Server className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-300">{result.isp}</span>
          </div>
        )}
        {result.os && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-300">{result.os}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-neutral-500" />
          <span className="text-neutral-400">Atualizado: {result.last_update}</span>
        </div>
      </div>

      {/* Ports */}
      <div>
        <h4 className="text-sm font-medium text-neutral-300 mb-2">
          Portas Abertas ({result.ports.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {result.ports.map(port => (
            <Badge key={port} variant="secondary" className="font-mono">
              {port}
            </Badge>
          ))}
        </div>
      </div>

      {/* Vulnerabilities */}
      {result.vulnerabilities.total > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-300">
            Vulnerabilidades ({result.vulnerabilities.total})
          </h4>
          <div className="flex gap-2 text-xs">
            {result.vulnerabilities.critical > 0 && (
              <span className="px-2 py-1 rounded bg-red-500/20 text-red-400">
                {result.vulnerabilities.critical} Críticas
              </span>
            )}
            {result.vulnerabilities.high > 0 && (
              <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-400">
                {result.vulnerabilities.high} Altas
              </span>
            )}
            {result.vulnerabilities.medium > 0 && (
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400">
                {result.vulnerabilities.medium} Médias
              </span>
            )}
          </div>
          
          {result.vulnerabilities.list.slice(0, 3).map((vuln) => (
            <div key={vuln.cve} className="flex items-center gap-2 text-sm p-2 rounded bg-neutral-900/50">
              <AlertTriangle className={`w-4 h-4 ${severityConfig[vuln.severity].color}`} />
              <span className="font-mono text-xs">{vuln.cve}</span>
              <span className="text-neutral-400 truncate flex-1">{vuln.summary}</span>
            </div>
          ))}
          {result.vulnerabilities.list.length > 3 && (
            <p className="text-xs text-neutral-500">
              +{result.vulnerabilities.list.length - 3} vulnerabilidades adicionais
            </p>
          )}
        </div>
      )}

      {/* Risk Indicators */}
      {result.risk_indicators.length > 0 && (
        <div className="p-3 rounded bg-neutral-900/50 border border-neutral-800">
          <h4 className="text-xs font-medium text-neutral-400 mb-2">Indicadores de Risco:</h4>
          <ul className="space-y-1">
            {result.risk_indicators.map((indicator, i) => (
              <li key={i} className="text-sm text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                {indicator}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
        <span className="text-xs text-neutral-500">Fonte: Shodan API</span>
        <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs" asChild>
          <a href={result.query_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3 mr-1" />
            Ver no Shodan
          </a>
        </Button>
      </div>
    </div>
  );
}
