'use client';

import { Shield, AlertTriangle, ExternalLink, Mail, Lock, CreditCard, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Breach {
  name: string;
  title: string;
  domain: string;
  breach_date: string;
  data_classes: string[];
  is_verified: boolean;
  is_sensitive: boolean;
}

interface HIBPResult {
  email: string;
  breaches_found: number;
  breaches: Breach[];
  exposed_data_types: string[];
  high_risk_data: string[];
  risk_level: 'high' | 'medium' | 'low';
  status: 'compromised' | 'clean';
  recommendation: string;
}

interface HIBPCardProps {
  result: HIBPResult;
}

const DATA_TYPE_ICONS: Record<string, React.ReactNode> = {
  'Passwords': <Lock className="w-4 h-4" />,
  'Email addresses': <Mail className="w-4 h-4" />,
  'Credit cards': <CreditCard className="w-4 h-4" />,
  'Phone numbers': <User className="w-4 h-4" />,
};

export function HIBPCard({ result }: HIBPCardProps) {
  const riskConfig = {
    high: {
      border: 'border-red-500/50',
      bg: 'bg-red-500/10',
      badge: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: 'text-red-500',
    },
    medium: {
      border: 'border-amber-500/50',
      bg: 'bg-amber-500/10',
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: 'text-amber-500',
    },
    low: {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-500/10',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: 'text-emerald-500',
    },
  }[result.risk_level];

  if (result.status === 'clean') {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-emerald-500" />
          <div>
            <h3 className="font-semibold text-emerald-400">Email Seguro</h3>
            <p className="text-sm text-neutral-400">{result.email}</p>
          </div>
          <Badge className="ml-auto bg-emerald-500/20 text-emerald-400">
            Nenhum vazamento
          </Badge>
        </div>
        <p className="text-sm text-neutral-400 mt-3">
          Este email não foi encontrado em nenhuma base de dados de vazamentos conhecidos.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border p-4 space-y-4", riskConfig.border, riskConfig.bg)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Shield className={cn("w-8 h-8", riskConfig.icon)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">Have I Been Pwned</h3>
            <Badge className={riskConfig.badge}>
              {result.breaches_found} vazamentos
            </Badge>
            <Badge 
              variant="outline" 
              className={cn(
                "uppercase text-xs",
                result.risk_level === 'high' && 'border-red-500/50 text-red-400',
                result.risk_level === 'medium' && 'border-amber-500/50 text-amber-400',
                result.risk_level === 'low' && 'border-emerald-500/50 text-emerald-400',
              )}
            >
              Risco {result.risk_level}
            </Badge>
          </div>
          <p className="text-sm text-neutral-400 font-mono mt-1">{result.email}</p>
        </div>
      </div>

      {/* Data Types Exposed */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-neutral-300">Dados Expostos:</h4>
        <div className="flex flex-wrap gap-2">
          {result.exposed_data_types.map((type) => (
            <Badge 
              key={type} 
              variant="secondary"
              className={cn(
                "flex items-center gap-1",
                result.high_risk_data.includes(type) && "bg-red-500/20 text-red-400"
              )}
            >
              {DATA_TYPE_ICONS[type] || <AlertTriangle className="w-4 h-4" />}
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {/* Breach List */}
      {result.breaches.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-300">Vazamentos:</h4>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {result.breaches.slice(0, 5).map((breach) => (
              <div 
                key={breach.name}
                className="flex items-center justify-between p-2 rounded bg-neutral-900/50 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{breach.title}</span>
                  {breach.is_sensitive && (
                    <Badge variant="destructive" className="text-xs">Sensível</Badge>
                  )}
                </div>
                <span className="text-neutral-500 text-xs">{breach.breach_date}</span>
              </div>
            ))}
            {result.breaches.length > 5 && (
              <p className="text-xs text-neutral-500 text-center">
                +{result.breaches.length - 5} vazamentos adicionais
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="p-3 rounded bg-neutral-900/50 border border-neutral-800">
        <h4 className="text-sm font-medium text-neutral-300 mb-1">Recomendações:</h4>
        <p className="text-sm text-neutral-400">{result.recommendation}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>Fonte: Have I Been Pwned (Troy Hunt)</span>
        <Button variant="ghost" size="sm" className="h-auto py-1 px-2">
          <ExternalLink className="w-3 h-3 mr-1" />
          Ver no HIBP
        </Button>
      </div>
    </div>
  );
}
