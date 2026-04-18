import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertTriangle, TrendingUp, Users, Building, ShieldAlert } from 'lucide-react';
import { AnomalyDetectionResult } from '../../lib/detectors/ghost-employees';

interface AnomalyExposureWidgetProps {
    totalExposure: string;
    anomalyCount: number;
    sourcesCount: number;
    metrics: {
        critical: number;
        high: number;
        medium: number;
    };
    recentAnomalies: AnomalyDetectionResult[];
}

export function AnomalyExposureWidget({
    totalExposure,
    anomalyCount,
    sourcesCount,
    metrics,
    recentAnomalies
}: AnomalyExposureWidgetProps) {
    return (
        <Card className="col-span-1 border-destructive shadow-sm bg-background">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ShieldAlert className="text-destructive h-5 w-5" />
                    Exposição a Risco
                </CardTitle>
                <span className="text-2xl font-black text-destructive tracking-tight">
                    {totalExposure}
                </span>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" /> {anomalyCount} Irregularidades
                    </div>
                    <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" /> {sourcesCount} Fontes Ativas
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="p-2 bg-destructive/10 rounded-md border border-destructive/20 text-center">
                        <div className="text-xs font-semibold text-destructive uppercase">Crítico</div>
                        <div className="text-xl font-bold text-destructive">{metrics.critical}</div>
                    </div>
                    <div className="p-2 bg-orange-500/10 rounded-md border border-orange-500/20 text-center">
                        <div className="text-xs font-semibold text-orange-500 uppercase">Alto</div>
                        <div className="text-xl font-bold text-orange-500">{metrics.high}</div>
                    </div>
                    <div className="p-2 bg-yellow-500/10 rounded-md border border-yellow-500/20 text-center">
                        <div className="text-xs font-semibold text-yellow-600 uppercase">Médio</div>
                        <div className="text-xl font-bold text-yellow-600">{metrics.medium}</div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Identificações Recentes
                    </h4>
                    {recentAnomalies.map((anomaly, idx) => (
                        <div key={idx} className="flex justify-between items-start text-sm p-3 bg-muted rounded-md border">
                            <div>
                                <div className="font-semibold text-foreground flex items-center gap-2">
                                    {anomaly.severity === 'CRITICAL' && <div className="w-2 h-2 rounded-full bg-destructive" />}
                                    {anomaly.severity === 'HIGH' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                    {anomaly.title}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {anomaly.description}
                                </div>
                            </div>
                            <div className="text-xs font-bold px-2 py-1 bg-background rounded border ml-4 whitespace-nowrap">
                                {(anomaly.confidence * 100).toFixed(0)}% Match
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
