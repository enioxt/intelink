export interface AudioRecordingResult {
  blob: Blob;
  url: string;
  duration: number;
}

export async function startRecording(): Promise<MediaRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return new MediaRecorder(stream);
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
  duration_ms?: number;
}

export async function transcribeAudioBlob(
  blob: Blob,
  options?: { language?: string; filename?: string }
): Promise<TranscriptionResult> {
  const t0 = Date.now();
  const formData = new FormData();
  formData.append('audio', blob, options?.filename ?? 'recording.webm');
  if (options?.language) formData.append('language', options.language);
  try {
    const res = await fetch('/api/v1/transcribe', { method: 'POST', body: formData });
    const data = await res.json();
    return { success: true, text: data.text ?? '', duration_ms: Date.now() - t0 };
  } catch (e) {
    return { success: false, error: String(e), duration_ms: Date.now() - t0 };
  }
}

export function stopRecording(recorder: MediaRecorder): Promise<AudioRecordingResult> {
  return new Promise((resolve) => {
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      resolve({ blob, url: URL.createObjectURL(blob), duration: 0 });
    };
    recorder.stop();
  });
}
