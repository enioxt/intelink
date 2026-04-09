'use client';

import { ImageIcon, MapPin, Camera, Calendar, Clock, Smartphone, AlertTriangle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface GPSData {
  coordinates: string;
  latitude: number;
  longitude: number;
  google_maps: string;
  precision: string;
}

interface DeviceInfo {
  make: string | null;
  model: string | null;
  software: string | null;
}

interface Timestamps {
  datetime_original: string | null;
  datetime_digitized: string | null;
  datetime_modified: string | null;
  timezone_offset: string | null;
}

interface ImageMetadata {
  filename: string;
  file_size: string;
  dimensions: string;
  format: string;
  has_exif: boolean;
  has_gps: boolean;
  gps: GPSData | null;
  device: DeviceInfo | null;
  timestamps: Timestamps;
  camera_settings: Record<string, string> | null;
  risk_indicators: string[];
  osint_value: 'high' | 'medium' | 'low';
  forensic_notes: string[];
}

interface ImageAnalysisCardProps {
  result: ImageMetadata;
  imageUrl?: string;
}

export function ImageAnalysisCard({ result, imageUrl }: ImageAnalysisCardProps) {
  const valueConfig = {
    high: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/50' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/50' },
    low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/50' },
  }[result.osint_value];

  return (
    <div className={`rounded-lg border p-4 space-y-4 ${valueConfig.bg} ${valueConfig.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${valueConfig.bg}`}>
            <ImageIcon className={`w-6 h-6 ${valueConfig.color}`} />
          </div>
          <div>
            <h3 className="font-semibold">Análise Forense de Imagem</h3>
            <p className="text-sm text-neutral-400">{result.filename}</p>
          </div>
        </div>
        <Badge className={`${valueConfig.bg} ${valueConfig.color} border ${valueConfig.border}`}>
          Valor OSINT: {result.osint_value.toUpperCase()}
        </Badge>
      </div>

      {/* Preview */}
      {imageUrl && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-900">
          <img src={imageUrl} alt="Analyzed" className="w-full h-full object-contain" />
          {result.has_gps && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-purple-500/80 text-white">
                <MapPin className="w-3 h-3 mr-1" />
                GPS
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-neutral-500">Dimensões</span>
          <p className="font-mono text-neutral-300">{result.dimensions}</p>
        </div>
        <div>
          <span className="text-neutral-500">Formato</span>
          <p className="text-neutral-300">{result.format}</p>
        </div>
        <div>
          <span className="text-neutral-500">Tamanho</span>
          <p className="text-neutral-300">{result.file_size}</p>
        </div>
      </div>

      {/* GPS Section */}
      {result.gps && (
        <div className="p-3 rounded-lg bg-neutral-900/50 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-purple-400" />
            <h4 className="font-medium text-purple-400">Dados de Localização GPS</h4>
          </div>
          <p className="font-mono text-sm text-neutral-300 mb-2">{result.gps.coordinates}</p>
          <p className="text-xs text-neutral-500 mb-3">Precisão: {result.gps.precision}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs" asChild>
              <a href={result.gps.google_maps} target="_blank" rel="noopener noreferrer">
                <MapPin className="w-3 h-3 mr-1" />
                Google Maps
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Device Info */}
      {result.device && (result.device.make || result.device.model) && (
        <div className="flex items-start gap-3 p-3 rounded bg-neutral-900/50">
          <Camera className="w-5 h-5 text-neutral-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-neutral-300">Dispositivo</h4>
            <p className="text-sm text-neutral-400">
              {[result.device.make, result.device.model].filter(Boolean).join(' ')}
            </p>
            {result.device.software && (
              <p className="text-xs text-neutral-500 mt-1">Software: {result.device.software}</p>
            )}
          </div>
        </div>
      )}

      {/* Timestamps */}
      {Object.values(result.timestamps).some(v => v !== null) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-500" />
            Timestamps
          </h4>
          <div className="grid gap-1 text-xs">
            {result.timestamps.datetime_original && (
              <div className="flex justify-between p-2 rounded bg-neutral-900/30">
                <span className="text-neutral-500">Original</span>
                <span className="font-mono text-neutral-300">{result.timestamps.datetime_original}</span>
              </div>
            )}
            {result.timestamps.datetime_digitized && (
              <div className="flex justify-between p-2 rounded bg-neutral-900/30">
                <span className="text-neutral-500">Digitalizado</span>
                <span className="font-mono text-neutral-300">{result.timestamps.datetime_digitized}</span>
              </div>
            )}
            {result.timestamps.datetime_modified && (
              <div className="flex justify-between p-2 rounded bg-neutral-900/30">
                <span className="text-neutral-500">Modificado</span>
                <span className="font-mono text-neutral-300">{result.timestamps.datetime_modified}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Settings */}
      {result.camera_settings && Object.keys(result.camera_settings).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
            <Eye className="w-4 h-4 text-neutral-500" />
            Configurações da Câmera
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(result.camera_settings).map(([key, value]) => (
              <div key={key} className="flex justify-between p-2 rounded bg-neutral-900/30">
                <span className="text-neutral-500 capitalize">{key}</span>
                <span className="font-mono text-neutral-300">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Indicators */}
      {result.risk_indicators.length > 0 && (
        <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30">
          <h4 className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            Alertas Forenses
          </h4>
          <ul className="space-y-1">
            {result.risk_indicators.map((indicator, i) => (
              <li key={i} className="text-sm text-amber-300">• {indicator}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Forensic Notes */}
      {result.forensic_notes.length > 0 && (
        <div className="p-3 rounded bg-neutral-900/50 border border-neutral-800">
          <h4 className="text-xs font-medium text-neutral-400 mb-2">Notas Forenses</h4>
          <ul className="space-y-1">
            {result.forensic_notes.map((note, i) => (
              <li key={i} className="text-sm text-neutral-300">• {note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* EXIF Warning */}
      {!result.has_exif && (
        <div className="p-3 rounded bg-neutral-900/50 border border-neutral-800">
          <p className="text-sm text-neutral-400">
            ⚠️ Sem dados EXIF — imagem pode ter sido processada ou capturada por software que não preserva metadados.
          </p>
        </div>
      )}
    </div>
  );
}
