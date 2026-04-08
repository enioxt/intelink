"""
Benford Widget — EGOS Inteligência / Intelink
BENFORD-001: Frontend widget for Benford's Law anomaly detection

Visualizes digit distribution and highlights potential anomalies
in financial/contract data for fraud detection.

Sacred Code: 000.111.369.963.1618
"""

import React, { useCallback, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DigitDistribution {
  digit: number;
  count: number;
  expected_count: number;
  actual_percentage: number;
  expected_percentage: number;
  deviation: number;
}

interface BenfordResult {
  sample_size: number;
  chi_square_statistic: number;
  chi_square_critical: number;
  degrees_of_freedom: number;
  is_anomalous: boolean;
  conformity_score: number;
  first_digit_distribution: DigitDistribution[];
  second_digit_distribution: DigitDistribution[] | null;
  risk_level: "low" | "medium" | "high" | "unknown";
  interpretation: string;
}

interface BenfordWidgetProps {
  entityId?: string;
  initialData?: BenfordResult;
  onAnalyze?: () => Promise<BenfordResult>;
}

const RISK_COLORS = {
  low: "#10b981", // emerald-500
  medium: "#f59e0b", // amber-500
  high: "#ef4444", // red-500
  unknown: "#6b7280", // gray-500
};

const RISK_LABELS = {
  low: "Baixo Risco",
  medium: "Risco Moderado",
  high: "ALTO RISCO",
  unknown: "Desconhecido",
};

export const BenfordWidget: React.FC<BenfordWidgetProps> = ({
  entityId,
  initialData,
  onAnalyze,
}) => {
  const [data, setData] = useState<BenfordResult | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"first" | "second">("first");

  const handleAnalyze = useCallback(async () => {
    if (!onAnalyze) {
      setError("Função de análise não fornecida");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onAnalyze();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar dados");
    } finally {
      setLoading(false);
    }
  }, [onAnalyze]);

  const chartData = data
    ? activeTab === "first"
      ? data.first_digit_distribution.map((d) => ({
          digit: d.digit.toString(),
          atual: d.actual_percentage,
          esperado: d.expected_percentage,
          desvio: d.deviation,
        }))
      : data.second_digit_distribution?.map((d) => ({
          digit: d.digit.toString(),
          atual: d.actual_percentage,
          esperado: d.expected_percentage,
          desvio: d.deviation,
        })) || []
    : [];

  const renderScoreCard = () => {
    if (!data) return null;

    const scoreColor =
      data.conformity_score >= 90
        ? "text-emerald-500"
        : data.conformity_score >= 70
          ? "text-amber-500"
          : "text-red-500";

    const bgColor =
      data.conformity_score >= 90
        ? "bg-emerald-500/10"
        : data.conformity_score >= 70
          ? "bg-amber-500/10"
          : "bg-red-500/10";

    return (
      <div className={`rounded-xl p-4 ${bgColor} border border-current/20`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400">Score de Conformidade</p>
            <p className={`text-3xl font-bold ${scoreColor}`}>
              {data.conformity_score.toFixed(1)}
              <span className="text-lg text-neutral-500">/100</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-400">Amostra</p>
            <p className="text-xl font-semibold text-neutral-200">
              {data.sample_size} valores
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
            style={{
              backgroundColor: `${RISK_COLORS[data.risk_level]}20`,
              color: RISK_COLORS[data.risk_level],
            }}
          >
            {RISK_LABELS[data.risk_level]}
          </span>
          {data.is_anomalous && (
            <span className="inline-flex items-center rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-400">
              ⚠️ Anômalo
            </span>
          )}
        </div>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between text-neutral-400">
            <span>χ² estatística:</span>
            <span className="font-mono text-neutral-300">
              {data.chi_square_statistic.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>χ² crítico (95%):</span>
            <span className="font-mono text-neutral-300">
              {data.chi_square_critical.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Graus de liberdade:</span>
            <span className="font-mono text-neutral-300">
              {data.degrees_of_freedom}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-neutral-100">
            Lei de Benford
          </h3>
          <p className="text-sm text-neutral-400">
            Detecção de anomalias em dados financeiros
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Analisando..." : "Analisar"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          {renderScoreCard()}

          {data.interpretation && (
            <div className="mt-4 rounded-lg bg-neutral-800/50 p-4 text-sm text-neutral-300">
              {data.interpretation}
            </div>
          )}

          <div className="mt-6">
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setActiveTab("first")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "first"
                    ? "bg-neutral-700 text-neutral-100"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                1º Dígito
              </button>
              <button
                onClick={() => setActiveTab("second")}
                disabled={!data.second_digit_distribution}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "second"
                    ? "bg-neutral-700 text-neutral-100"
                    : "text-neutral-400 hover:text-neutral-200"
                } ${!data.second_digit_distribution ? "opacity-50" : ""}`}
              >
                2º Dígito
              </button>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="digit"
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280" }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280" }}
                    label={{
                      value: "Percentual (%)",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#6b7280",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#e5e7eb" }}
                    itemStyle={{ color: "#e5e7eb" }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="#4b5563" />
                  <Bar
                    dataKey="atual"
                    name="Atual"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="esperado"
                    name="Esperado (Benford)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-neutral-500">
              <div className="rounded bg-blue-500/10 p-3">
                <span className="font-medium text-blue-400">Atual:</span>{" "}
                Distribuição observada nos dados analisados
              </div>
              <div className="rounded bg-emerald-500/10 p-3">
                <span className="font-medium text-emerald-400">Esperado:</span>{" "}
                Distribuição teórica da Lei de Benford
              </div>
            </div>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div className="flex h-64 items-center justify-center text-neutral-500">
          <div className="text-center">
            <p className="mb-2 text-4xl">📊</p>
            <p>Clique em "Analisar" para visualizar a distribuição de Benford</p>
            <p className="mt-2 text-sm text-neutral-600">
              Detecta anomalias em dados financeiros e contratos
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenfordWidget;
