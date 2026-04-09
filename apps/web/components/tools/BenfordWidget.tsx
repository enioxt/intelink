'use client';

import { useMemo } from 'react';
import { AlertTriangle, Calculator, Info } from 'lucide-react';
import { GlassCard } from '@/components/primitives/GlassCard';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface BenfordData {
  digit: number;
  expected: number; // Benford's law expected percentage
  actual: number;   // Actual percentage in dataset
  count: number;
}

interface BenfordWidgetProps {
  data: number[]; // Raw numerical data to analyze
  title?: string;
  threshold?: number; // Chi-square threshold for anomaly detection
}

// Benford's Law expected frequencies
const BENFORD_EXPECTED = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];

function calculateBenfordDistribution(values: number[]): BenfordData[] {
  // Extract first digits
  const firstDigits: number[] = [];
  
  values.forEach(val => {
    const absVal = Math.abs(val);
    if (absVal > 0) {
      const firstDigit = parseInt(String(absVal).charAt(0));
      if (firstDigit >= 1 && firstDigit <= 9) {
        firstDigits.push(firstDigit);
      }
    }
  });

  // Count frequencies
  const counts = new Array(9).fill(0);
  firstDigits.forEach(d => counts[d - 1]++);
  
  const total = firstDigits.length;
  
  return counts.map((count, i) => ({
    digit: i + 1,
    expected: BENFORD_EXPECTED[i],
    actual: total > 0 ? (count / total) * 100 : 0,
    count,
  }));
}

function calculateChiSquare(data: BenfordData[]): number {
  return data.reduce((sum, d) => {
    const expectedCount = (d.expected / 100) * data.reduce((s, x) => s + x.count, 0);
    if (expectedCount === 0) return sum;
    return sum + Math.pow(d.count - expectedCount, 2) / expectedCount;
  }, 0);
}

function detectAnomalies(data: BenfordData[]): string[] {
  const anomalies: string[] = [];
  
  data.forEach(d => {
    const diff = Math.abs(d.actual - d.expected);
    if (diff > 10) {
      anomalies.push(`Dígito ${d.digit}: desvio de ${diff.toFixed(1)}%`);
    }
  });
  
  return anomalies;
}

export function BenfordWidget({ 
  data, 
  title = "Análise Benford",
  threshold = 15.51 // 95% confidence with 8 degrees of freedom
}: BenfordWidgetProps) {
  const benfordData = useMemo(() => calculateBenfordDistribution(data), [data]);
  const chiSquare = useMemo(() => calculateChiSquare(benfordData), [benfordData]);
  const anomalies = useMemo(() => detectAnomalies(benfordData), [benfordData]);
  const isAnomalous = chiSquare > threshold;
  
  const totalSamples = benfordData.reduce((sum, d) => sum + d.count, 0);

  return (
    <GlassCard className={isAnomalous ? 'border-red-500/30' : 'border-emerald-500/30'}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isAnomalous ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
            <Calculator className={`w-5 h-5 ${isAnomalous ? 'text-red-500' : 'text-emerald-500'}`} />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-neutral-500">
              Lei de Benford • {totalSamples} amostras
            </p>
          </div>
        </div>
        <Badge className={isAnomalous ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}>
          {isAnomalous ? (
            <><AlertTriangle className="w-3 h-3 mr-1" />Anômalo</>
          ) : (
            <>✓ Normal</>
          )}
        </Badge>
      </div>

      {/* Chart */}
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={benfordData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis 
              dataKey="digit" 
              stroke="#64748b" 
              fontSize={12}
              tickFormatter={(v) => `${v}`}
            />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#050508',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Bar 
              dataKey="expected" 
              fill="rgba(255,255,255,0.2)" 
              name="Esperado (Benford)"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="actual" 
              fill={isAnomalous ? '#ef4444' : '#22c55e'} 
              name="Observado"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-white/[0.03]">
          <span className="text-xs text-neutral-500">Chi-Square (χ²)</span>
          <p className={`text-lg font-mono font-bold ${isAnomalous ? 'text-red-400' : 'text-emerald-400'}`}>
            {chiSquare.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-600">
            Limite: {threshold} (95% conf.)
          </p>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.03]">
          <span className="text-xs text-neutral-500">Conformidade</span>
          <p className="text-lg font-mono font-bold text-neutral-200">
            {isAnomalous ? 'Baixa' : 'Alta'}
          </p>
          <p className="text-xs text-neutral-600">
            vs. distribuição esperada
          </p>
        </div>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Anomalias Detectadas
          </h4>
          <ul className="space-y-1">
            {anomalies.slice(0, 3).map((anomaly, i) => (
              <li key={i} className="text-sm text-red-300">• {anomaly}</li>
            ))}
            {anomalies.length > 3 && (
              <li className="text-xs text-red-400">
                +{anomalies.length - 3} anomalias adicionais
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0" />
          A Lei de Benford descreve a frequência esperada dos primeiros dígitos em 
          conjuntos de dados naturais. Desvios significativos podem indicar manipulação 
          ou fraude nos dados.
        </p>
      </div>
    </GlassCard>
  );
}

// Demo data generator
export function generateDemoData(type: 'normal' | 'anomalous' = 'normal'): number[] {
  if (type === 'normal') {
    // Generate Benford-compliant data
    const data: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const rand = Math.random();
      let num: number;
      if (rand < 0.301) num = 100 + Math.random() * 100;
      else if (rand < 0.477) num = 200 + Math.random() * 100;
      else if (rand < 0.602) num = 300 + Math.random() * 100;
      else if (rand < 0.699) num = 400 + Math.random() * 100;
      else if (rand < 0.778) num = 500 + Math.random() * 100;
      else if (rand < 0.845) num = 600 + Math.random() * 100;
      else if (rand < 0.903) num = 700 + Math.random() * 100;
      else if (rand < 0.954) num = 800 + Math.random() * 100;
      else num = 900 + Math.random() * 100;
      data.push(num);
    }
    return data;
  } else {
    // Generate anomalous data (uniform distribution)
    return Array.from({ length: 1000 }, () => 
      Math.floor(Math.random() * 900) + 100
    );
  }
}
