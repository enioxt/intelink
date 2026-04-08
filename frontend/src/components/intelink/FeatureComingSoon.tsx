/**
 * Feature Coming Soon - Visual Placeholder Component
 * Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ)
 */

import React from 'react';
import { 
  Rocket, 
  Zap, 
  CheckCircle, 
  Clock, 
  Sparkles,
  ArrowRight 
} from 'lucide-react';

export interface Feature {
  icon?: React.ReactNode;
  title: string;
  description: string;
  status: 'implemented' | 'in_progress' | 'planned';
  eta?: string;
}

interface FeatureComingSoonProps {
  title: string;
  description: string;
  implementedFeatures: Feature[];
  upcomingFeatures: Feature[];
  backendStatus: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCompletion?: string;
  ctaText?: string;
  ctaAction?: () => void;
}

export function FeatureComingSoon({
  title,
  description,
  implementedFeatures = [],
  upcomingFeatures = [],
  backendStatus,
  priority,
  estimatedCompletion,
  ctaText,
  ctaAction,
}: FeatureComingSoonProps) {
  const priorityColors = {
    high: 'border-red-500 bg-red-50 dark:bg-red-950/30',
    medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
    low: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30',
  };

  const priorityBadges = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  };

  const StatusIcon = ({ status }: { status: Feature['status'] }) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'in_progress':
        return <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400 animate-pulse" />;
      case 'planned':
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="min-h-[500px] flex items-center justify-center p-6">
      <div className={`max-w-4xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-4 ${priorityColors[priority]} p-8`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityBadges[priority]}`}>
              {priority.toUpperCase()} PRIORITY
            </span>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        {/* Implemented Features */}
        {implementedFeatures.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                ✅ Funcionalidades Operacionais
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {implementedFeatures.map((feature, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800"
                >
                  <StatusIcon status={feature.status} />
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-white">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Features */}
        {upcomingFeatures.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Rocket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                🚀 Em Desenvolvimento
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingFeatures.map((feature, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <StatusIcon status={feature.status} />
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-white">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {feature.description}
                    </p>
                    {feature.eta && (
                      <span className="inline-block mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                        ETA: {feature.eta}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backend Status */}
        <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Status do Backend
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {backendStatus}
          </p>
        </div>

        {/* Timeline */}
        {estimatedCompletion && (
          <div className="mb-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold">Previsão de Conclusão:</span>{' '}
              <span className="text-purple-600 dark:text-purple-400 font-bold">
                {estimatedCompletion}
              </span>
            </p>
          </div>
        )}

        {/* CTA Button */}
        {ctaText && ctaAction && (
          <div className="text-center">
            <button
              onClick={ctaAction}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              {ctaText}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Sacred Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-600">
            Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ) | EGOS v.2 Intelink Platform
          </p>
        </div>
      </div>
    </div>
  );
}

export default FeatureComingSoon;
