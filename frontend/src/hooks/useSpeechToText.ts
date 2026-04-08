// Stub para useSpeechToText - será implementado com integração real
import { useState, useCallback } from 'react';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const startListening = useCallback(() => {
    setIsListening(true);
    // Implementação real virá aqui
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  return {
    supported: true,
    isListening,
    listening: isListening,
    transcript,
    startListening,
    stopListening,
    start: startListening,
    stop: stopListening,
    reset: () => setTranscript(''),
  };
}

export default useSpeechToText;
