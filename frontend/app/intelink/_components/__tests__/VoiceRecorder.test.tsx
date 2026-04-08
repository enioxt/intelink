/**
 * VoiceRecorder Component Tests
 * Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ)
 * Sprint 2: Voice Integration Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceRecorder } from '../VoiceRecorder';

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;
  
  constructor(public stream: MediaStream, public options?: any) {}
  
  start() {
    this.state = 'recording';
  }
  
  stop() {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  }
}

// Mock getUserMedia
const mockGetUserMedia = vi.fn();

describe('VoiceRecorder', () => {
  const mockOnTranscribed = vi.fn();
  
  beforeEach(() => {
    // Reset mocks
    mockOnTranscribed.mockClear();
    mockGetUserMedia.mockClear();
    
    // Setup MediaRecorder mock
    global.MediaRecorder = MockMediaRecorder as any;
    
    // Setup getUserMedia mock
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: mockGetUserMedia,
      },
    });
    
    // Mock successful stream
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as any);
    
    // Mock fetch for transcription
    global.fetch = vi.fn();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render in idle state', () => {
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      expect(screen.getByText(/pronto para gravar/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /iniciar gravação/i })).toBeInTheDocument();
    });

    it('should display correct initial status', () => {
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      const statusDiv = screen.getByText(/pronto para gravar/i).closest('div');
      expect(statusDiv).toBeInTheDocument();
    });
  });

  describe('Recording Flow', () => {
    it('should start recording when button clicked', async () => {
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      const startButton = screen.getByRole('button', { name: /iniciar gravação/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/gravando/i)).toBeInTheDocument();
      });
    });

    it('should show stop button while recording', async () => {
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      const startButton = screen.getByRole('button', { name: /iniciar gravação/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /parar/i })).toBeInTheDocument();
      });
    });

    it('should display timer during recording', async () => {
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      const startButton = screen.getByRole('button', { name: /iniciar gravação/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const timer = screen.getByText(/0:0\d/);
        expect(timer).toBeInTheDocument();
      });
    });

    it('should stop recording when stop button clicked', async () => {
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      // Start recording
      const startButton = screen.getByRole('button', { name: /iniciar gravação/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /parar/i })).toBeInTheDocument();
      });
      
      // Stop recording
      const stopButton = screen.getByRole('button', { name: /parar/i });
      fireEvent.click(stopButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /transcrever/i })).toBeInTheDocument();
      });
    });
  });

  describe('Transcription Flow', () => {
    it('should show transcribe button after recording', async () => {
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      // Record and stop
      const startButton = screen.getByRole('button', { name: /iniciar gravação/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /parar/i })).toBeInTheDocument();
      });
      
      const stopButton = screen.getByRole('button', { name: /parar/i });
      fireEvent.click(stopButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /transcrever/i })).toBeInTheDocument();
      });
    });

    it('should call API when transcribe clicked', async () => {
      const mockTranscription = {
        text: 'Test transcription',
        language: 'pt',
        duration: 5.2,
        model_used: 'base',
        segments: [],
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTranscription,
      });
      
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      // Record and stop
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      await waitFor(() => screen.getByRole('button', { name: /parar/i }));
      fireEvent.click(screen.getByRole('button', { name: /parar/i }));
      
      // Transcribe
      await waitFor(() => screen.getByRole('button', { name: /transcrever/i }));
      fireEvent.click(screen.getByRole('button', { name: /transcrever/i }));
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8010/api/whisper/transcribe',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('should display transcription result', async () => {
      const mockTranscription = {
        text: 'Test transcription result',
        language: 'pt',
        duration: 5.2,
        model_used: 'base',
        segments: [],
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTranscription,
      });
      
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      // Complete recording flow
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      await waitFor(() => screen.getByRole('button', { name: /parar/i }));
      fireEvent.click(screen.getByRole('button', { name: /parar/i }));
      await waitFor(() => screen.getByRole('button', { name: /transcrever/i }));
      fireEvent.click(screen.getByRole('button', { name: /transcrever/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Test transcription result')).toBeInTheDocument();
      });
    });

    it('should call onTranscribed callback with result', async () => {
      const mockTranscription = {
        text: 'Callback test',
        language: 'pt',
        duration: 3.5,
        model_used: 'base',
        segments: [],
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTranscription,
      });
      
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      // Complete flow
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      await waitFor(() => screen.getByRole('button', { name: /parar/i }));
      fireEvent.click(screen.getByRole('button', { name: /parar/i }));
      await waitFor(() => screen.getByRole('button', { name: /transcrever/i }));
      fireEvent.click(screen.getByRole('button', { name: /transcrever/i }));
      
      await waitFor(() => {
        expect(mockOnTranscribed).toHaveBeenCalledWith(
          'Callback test',
          expect.objectContaining({
            language: 'pt',
            duration: 3.5,
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when microphone access denied', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
      
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
      });
    });

    it('should show error when transcription fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      // Complete recording
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      await waitFor(() => screen.getByRole('button', { name: /parar/i }));
      fireEvent.click(screen.getByRole('button', { name: /parar/i }));
      
      // Try transcribe
      await waitFor(() => screen.getByRole('button', { name: /transcrever/i }));
      fireEvent.click(screen.getByRole('button', { name: /transcrever/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/transcription failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('UI States', () => {
    it('should show processing state during transcription', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ text: 'Test', language: 'pt', duration: 1, model_used: 'base', segments: [] }),
        }), 100))
      );
      
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      // Complete recording
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      await waitFor(() => screen.getByRole('button', { name: /parar/i }));
      fireEvent.click(screen.getByRole('button', { name: /parar/i }));
      await waitFor(() => screen.getByRole('button', { name: /transcrever/i }));
      fireEvent.click(screen.getByRole('button', { name: /transcrever/i }));
      
      // Should show processing
      expect(screen.getByText(/transcrevendo/i)).toBeInTheDocument();
    });

    it('should show success state after transcription', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Success', language: 'pt', duration: 2, model_used: 'base', segments: [] }),
      });
      
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      // Complete flow
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      await waitFor(() => screen.getByRole('button', { name: /parar/i }));
      fireEvent.click(screen.getByRole('button', { name: /parar/i }));
      await waitFor(() => screen.getByRole('button', { name: /transcrever/i }));
      fireEvent.click(screen.getByRole('button', { name: /transcrever/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/transcrição concluída/i)).toBeInTheDocument();
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should show reset button after recording', async () => {
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      await waitFor(() => screen.getByRole('button', { name: /parar/i }));
      fireEvent.click(screen.getByRole('button', { name: /parar/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /nova gravação/i })).toBeInTheDocument();
      });
    });

    it('should reset state when reset clicked', async () => {
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      // Record and stop
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      await waitFor(() => screen.getByRole('button', { name: /parar/i }));
      fireEvent.click(screen.getByRole('button', { name: /parar/i }));
      await waitFor(() => screen.getByRole('button', { name: /nova gravação/i }));
      
      // Reset
      fireEvent.click(screen.getByRole('button', { name: /nova gravação/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iniciar gravação/i })).toBeInTheDocument();
        expect(screen.getByText(/pronto para gravar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Audio Preview', () => {
    it('should show audio player after recording', async () => {
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} />);
      
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      await waitFor(() => screen.getByRole('button', { name: /parar/i }));
      fireEvent.click(screen.getByRole('button', { name: /parar/i }));
      
      await waitFor(() => {
        const audioElement = document.querySelector('audio');
        expect(audioElement).toBeInTheDocument();
      });
    });
  });

  describe('Auto-ingest', () => {
    it('should call auto-ingest when enabled', async () => {
      const mockTranscription = {
        text: 'Auto-ingest test',
        language: 'pt',
        duration: 2.5,
        model_used: 'base',
        segments: [],
      };
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTranscription,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true }),
        });
      
      render(<VoiceRecorder onTranscribed={mockOnTranscribed} autoIngest={true} />);
      
      // Complete flow
      fireEvent.click(screen.getByRole('button', { name: /iniciar gravação/i }));
      await waitFor(() => screen.getByRole('button', { name: /parar/i }));
      fireEvent.click(screen.getByRole('button', { name: /parar/i }));
      await waitFor(() => screen.getByRole('button', { name: /transcrever/i }));
      fireEvent.click(screen.getByRole('button', { name: /transcrever/i }));
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8010/api/intelink/ingest',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });
  });
});
