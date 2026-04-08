'use client';

/**
 * VoiceRecorder Component - Intelink Voice Integration
 * Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ)
 * 
 * Features:
 * - Real-time voice recording
 * - WebRTC audio capture
 * - Auto-transcription via Whisper
 * - Visual feedback
 */

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Loader, AlertCircle, CheckCircle } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscribed: (text: string, metadata?: any) => void;
  autoIngest?: boolean;
  apiBaseUrl?: string;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export function VoiceRecorder({ 
  onTranscribed, 
  autoIngest = false,
  apiBaseUrl = 'http://localhost:8010'
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
      
      // Start recording
      mediaRecorder.start();
      setState('recording');
      setError(null);
      setDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to access microphone');
      setState('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setState('idle');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const transcribe = async () => {
    if (!audioBlob) return;
    
    setState('processing');
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      formData.append('model', 'base');
      formData.append('language', 'auto');
      formData.append('vad_filter', 'true');
      
      const response = await fetch(`${apiBaseUrl}/api/whisper/transcribe`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }
      
      const result = await response.json();
      setTranscriptionResult(result);
      
      // Call callback with transcribed text
      onTranscribed(result.text, {
        language: result.language,
        duration: result.duration,
        model: result.model_used,
        segments: result.segments
      });
      
      setState('success');
      
      // Auto-ingest if enabled
      if (autoIngest) {
        await autoIngestTranscription(result.text, result);
      }
      
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err.message || 'Transcription failed');
      setState('error');
    }
  };

  const autoIngestTranscription = async (text: string, metadata: any) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/intelink/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: text,
          metadata: {
            source_type: 'voice',
            language: metadata.language,
            duration: metadata.duration,
            model: metadata.model_used,
            recorded_at: new Date().toISOString()
          },
          source: 'api',
          filename: `voice_${Date.now()}.txt`
        }),
      });
      
      if (!response.ok) {
        console.error('Auto-ingest failed:', response.status);
      }
    } catch (err) {
      console.error('Auto-ingest error:', err);
    }
  };

  const reset = () => {
    setAudioBlob(null);
    setTranscriptionResult(null);
    setError(null);
    setDuration(0);
    setState('idle');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Status Display */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
        {state === 'idle' && !audioBlob && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Mic className="w-5 h-5" />
            <span>Pronto para gravar</span>
          </div>
        )}
        
        {state === 'recording' && (
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <div className="relative">
              <Mic className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            </div>
            <span className="font-mono">{formatDuration(duration)}</span>
            <span className="ml-2">Gravando...</span>
          </div>
        )}
        
        {state === 'processing' && (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Transcrevendo...</span>
          </div>
        )}
        
        {state === 'success' && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span>Transcrição concluída!</span>
          </div>
        )}
        
        {state === 'error' && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>Erro</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {state === 'idle' && !audioBlob && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Mic className="w-4 h-4" />
            Iniciar Gravação
          </button>
        )}
        
        {state === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Square className="w-4 h-4" />
            Parar
          </button>
        )}
        
        {audioBlob && state !== 'processing' && (
          <>
            <button
              onClick={transcribe}
              disabled={false}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              Transcrever
            </button>
            
            <button
              onClick={reset}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Nova Gravação
            </button>
          </>
        )}
      </div>

      {/* Transcription Result */}
      {transcriptionResult && (
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <h4 className="font-medium text-slate-900 dark:text-white mb-2">
            Transcrição:
          </h4>
          <p className="text-slate-700 dark:text-slate-300 mb-3 whitespace-pre-wrap">
            {transcriptionResult.text}
          </p>
          
          <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>Idioma: {transcriptionResult.language}</span>
            <span>Duração: {transcriptionResult.duration?.toFixed(1)}s</span>
            <span>Modelo: {transcriptionResult.model_used}</span>
          </div>
        </div>
      )}

      {/* Audio Preview */}
      {audioBlob && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <audio 
            controls 
            src={URL.createObjectURL(audioBlob)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
