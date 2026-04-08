export interface AudioRecordingResult {
  blob: Blob;
  url: string;
  duration: number;
}

export async function startRecording(): Promise<MediaRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return new MediaRecorder(stream);
}

export async function transcribeAudioBlob(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');
  try {
    const res = await fetch('/api/v1/transcribe', { method: 'POST', body: formData });
    const data = await res.json();
    return data.text ?? '';
  } catch { return ''; }
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
