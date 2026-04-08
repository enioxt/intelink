'use client';

/**
 * Intelink MVP Demo Page
 * Integrated demo showcasing full Behavioral Intelligence pipeline
 */

import { useState } from 'react';
import DocumentUpload from '@/components/intelink/DocumentUpload';
import InvestigationGraph from '@/components/intelink/InvestigationGraph';
import DocumentList from '@/components/intelink/DocumentList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Network, List } from 'lucide-react';

interface UploadResult {
  ok: boolean;
  document_id?: string;
  filename: string;
  entities_found: number;
  patterns_detected: number;
  risk_level: string;
  entities?: Array<{
    text: string;
    label: string;
    confidence: number;
  }>;
  behavioral_tags?: Array<{
    pattern_name: string;
    confidence: number;
    severity: string;
  }>;
}

export default function IntelinkDemoPage() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('upload');

  const handleUploadComplete = (result: UploadResult) => {
    setUploadResult(result);
    
    // Add to documents list
    const newDoc = {
      id: result.document_id || Date.now().toString(),
      filename: result.filename,
      size_bytes: 0, // Would come from result
      created_at: new Date().toISOString(),
      risk_level: result.risk_level,
      entities_count: result.entities_found,
      patterns_count: result.patterns_detected,
      status: 'completed' as const,
    };
    setDocuments(prev => [newDoc, ...prev]);
    
    // Auto-switch to graph view if entities detected
    if (result.entities_found > 0) {
      setSelectedTab('graph');
    }
  };

  // Convert upload result to graph format
  const graphNodes = uploadResult?.entities?.map((entity, idx) => ({
    id: `entity-${idx}`,
    label: entity.text,
    type: entity.label as any,
    risk_level: uploadResult.risk_level as any,
    behavioral_tags: uploadResult.behavioral_tags,
  })) || [];

  // Create some sample edges (in real app, would come from relationship extraction)
  const graphEdges = graphNodes.length > 1 ? [
    {
      source: graphNodes[0].id,
      target: graphNodes[1].id,
      relationship: 'relacionado_com',
      weight: 1,
    }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Intelink MVP Demo
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Behavioral Intelligence - Diferencial Único no Mercado
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">EGOS v.2</div>
              <div className="font-mono text-xs text-gray-400 dark:text-gray-500">
                Intelink Platform
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center space-x-2">
              <Network className="w-4 h-4" />
              <span>Grafo</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center space-x-2">
              <List className="w-4 h-4" />
              <span>Documentos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📄 Análise de Documentos
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Upload de PDF, DOCX ou TXT para análise com NER (BERTimbau) + Detecção de Padrões Comportamentais
              </p>
              
              <DocumentUpload
                caseId="DEMO-001"
                onUploadComplete={handleUploadComplete}
              />
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-3xl mb-2">🧠</div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  NER BERTimbau
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  88% F1 score em textos legais PT-BR
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                  Pattern Detection
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  13 padrões psicológicos + 5 criminais
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  Risk Scoring
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Automático baseado em φ (Golden Ratio)
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="graph" className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  🌐 Grafo de Relacionamentos
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Visualização interativa com Cytoscape.js - cores por nível de risco
                </p>
              </div>
              
              <div className="h-[600px]">
                <InvestigationGraph
                  nodes={graphNodes}
                  edges={graphEdges}
                  onNodeClick={(node) => console.log('Node clicked:', node)}
                />
              </div>
            </div>

            {graphNodes.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhum grafo para visualizar</p>
                <p className="text-sm mt-2">Faça upload de um documento na aba "Upload"</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📋 Documentos Analisados
              </h2>
              
              <DocumentList
                documents={documents}
                onDocumentClick={(doc) => {
                  console.log('Document clicked:', doc);
                  setSelectedTab('graph');
                }}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Elevator Pitch */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            💡 Diferencial Competitivo
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            <strong>Palantir mostra QUEM está conectado.</strong><br />
            Intelink mostra QUEM + POR QUÊ (motivação psicológica) + COMO (padrões comportamentais) + RISCO (scoring automático).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">✅ Palantir NÃO tem:</div>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Behavioral Profiling automático</li>
                <li>• NER específico para PT-BR legal</li>
                <li>• Pattern confidence scoring</li>
                <li>• Risk level automático</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">✅ Intelink oferece:</div>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• 10x mais barato ($18M vs $410M/5 anos)</li>
                <li>• Open-source (soberania tecnológica)</li>
                <li>• Tempo processamento: ~950ms/doc</li>
                <li>• Sacred Mathematics (φ, Fibonacci)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
