'use client';

import { useState, useCallback } from 'react';
import { 
  Video, FileText, Upload, File, CheckCircle, 
  AlertCircle, Clock, Loader2, X, FileVideo, FileAudio,
  MoreHorizontal
} from 'lucide-react';
import { GlassCard } from '@/components/primitives/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

interface UploadJob {
  id: string;
  filename: string;
  type: 'video' | 'document';
  size: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
}

const MOCK_JOBS: UploadJob[] = [
  { id: '1', filename: 'REDS_2024_001.mp4', type: 'video', size: '245 MB', status: 'processing', progress: 67 },
  { id: '2', filename: 'ocorrencia_12345.pdf', type: 'document', size: '1.2 MB', status: 'completed', progress: 100 },
  { id: '3', filename: 'entrevista_suspeito.m4a', type: 'video', size: '18 MB', status: 'uploading', progress: 34 },
  { id: '4', filename: 'anexo_processo.docx', type: 'document', size: '856 KB', status: 'error', progress: 0, message: 'Formato não suportado' },
];

const SUPPORTED_FORMATS = {
  video: ['.mp4', '.avi', '.mov', '.mkv', '.m4a', '.mp3', '.wav'],
  document: ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'],
};

export default function PCMGPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'queue'>('upload');
  const [jobs, setJobs] = useState<UploadJob[]>(MOCK_JOBS);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop - would process files here
  }, []);

  const getStatusIcon = (status: UploadJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'uploading':
        return <Upload className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: UploadJob['status']) => {
    const config = {
      completed: { label: 'Concluído', className: 'bg-emerald-500/20 text-emerald-400' },
      processing: { label: 'Processando', className: 'bg-blue-500/20 text-blue-400' },
      error: { label: 'Erro', className: 'bg-red-500/20 text-red-400' },
      uploading: { label: 'Enviando', className: 'bg-amber-500/20 text-amber-400' },
    };
    const { label, className } = config[status];
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="flex h-screen bg-[#050508] text-neutral-100">
      <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} conversations={[]} />
      
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="border-b border-white/[0.06] bg-[#050508]/85 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">PCMG Pipeline</h1>
              <p className="text-sm text-neutral-500">
                Processamento de vídeos e documentos policiais
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                <Video className="w-3 h-3 mr-1" />
                v2.4
              </Badge>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'upload' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('upload')}
              className={activeTab === 'upload' ? 'bg-blue-600' : ''}
            >
              <Upload className="w-4 h-4 mr-2" />
              Novo Upload
            </Button>
            <Button
              variant={activeTab === 'queue' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('queue')}
              className={activeTab === 'queue' ? 'bg-blue-600' : ''}
            >
              <Clock className="w-4 h-4 mr-2" />
              Fila de Processamento
              <Badge variant="secondary" className="ml-2">{jobs.length}</Badge>
            </Button>
          </div>

          {activeTab === 'upload' && (
            <>
              {/* Upload Zones */}
              <div className="grid grid-cols-2 gap-6">
                {/* Video Upload */}
                <GlassCard
                  elevated={isDragging}
                  className={isDragging ? 'border-blue-500/50' : ''}
                >
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                      <FileVideo className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Upload de Vídeo</h3>
                    <p className="text-sm text-neutral-500 mb-4">
                      Arraste vídeos ou áudios para análise de transcrição e extração de metadados
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {SUPPORTED_FORMATS.video.map(ext => (
                        <Badge key={ext} variant="secondary" className="text-xs">
                          {ext}
                        </Badge>
                      ))}
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar Arquivos
                    </Button>
                  </div>
                </GlassCard>

                {/* Document Upload */}
                <GlassCard
                  elevated={isDragging}
                  className={isDragging ? 'border-emerald-500/50' : ''}
                >
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Upload de Documento</h3>
                    <p className="text-sm text-neutral-500 mb-4">
                      PDFs, Word, Excel para extração de texto e análise de conteúdo
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {SUPPORTED_FORMATS.document.map(ext => (
                        <Badge key={ext} variant="secondary" className="text-xs">
                          {ext}
                        </Badge>
                      ))}
                    </div>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar Arquivos
                    </Button>
                  </div>
                </GlassCard>
              </div>

              {/* Drop Zone Full */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-xl p-12 text-center transition-colors
                  ${isDragging 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-neutral-800 hover:border-neutral-700'
                  }
                `}
              >
                <Upload className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-neutral-300">
                  Arraste arquivos aqui
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                  ou clique para selecionar vídeos e documentos
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4">
                <GlassCard>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-400" />
                    Transcrição
                  </h4>
                  <p className="text-sm text-neutral-400">
                    Whisper AI para transcrição automática de áudio com timestamp
                  </p>
                </GlassCard>
                <GlassCard>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Extração de Texto
                  </h4>
                  <p className="text-sm text-neutral-400">
                    OCR + parsing de PDFs e documentos Word com preservação de formatação
                  </p>
                </GlassCard>
                <GlassCard>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <MoreHorizontal className="w-4 h-4 text-purple-400" />
                    Análise de Contexto
                  </h4>
                  <p className="text-sm text-neutral-400">
                    Extração automática de CPF, RG, REDS, placas e entidades relevantes
                  </p>
                </GlassCard>
              </div>
            </>
          )}

          {activeTab === 'queue' && (
            <GlassCard elevated>
              <h3 className="font-semibold mb-4">Fila de Processamento</h3>
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                  >
                    {getStatusIcon(job.status)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{job.filename}</span>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                        <span>{job.size}</span>
                        <span>•</span>
                        <span className="capitalize">{job.type}</span>
                        {job.message && (
                          <span className="text-red-400">• {job.message}</span>
                        )}
                      </div>
                      {(job.status === 'uploading' || job.status === 'processing') && (
                        <div className="mt-2">
                          <Progress value={job.progress} className="h-1" />
                          <span className="text-xs text-neutral-500 mt-1">{job.progress}%</span>
                        </div>
                      )}
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </main>
    </div>
  );
}
