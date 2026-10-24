import { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioRecorderHook {
  isRecording: boolean;
  recordingTime: number; // in seconds
  audioUrl: string | null;
  base64Audio: string | null;
  audioDuration: number;
  error: string | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  resetRecording: () => void;
}

export function useAudioRecorder(): AudioRecorderHook {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [base64Audio, setBase64Audio] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [cleanup, audioUrl]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null);
    cleanup();
    audioChunksRef.current = [];
    setAudioUrl(null);
    setBase64Audio(null);
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Chọn mimeType được trình duyệt hỗ trợ
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac',
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const cleanType = (recorder.mimeType || selectedMimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: cleanType });
        const blobUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(blobUrl);

        // Convert blob to Base64 Data URL for persistent storage
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setBase64Audio(reader.result);
          }
        };
        reader.readAsDataURL(audioBlob);

        // Calculate duration based on elapsed recording time
        const durationSec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
        setAudioDuration(durationSec);
      };

      recorder.start(200);
      setIsRecording(true);

      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsed);
        setAudioDuration(elapsed);
      }, 500);

      return true;
    } catch (err: unknown) {
      console.error('Lỗi khi mở microphone:', err);
      setError('Không thể mở micro. Vui lòng cho phép trình duyệt truy cập micro nhé!');
      setIsRecording(false);
      return false;
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const resetRecording = useCallback(() => {
    cleanup();
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setIsRecording(false);
    setRecordingTime(0);
    setAudioUrl(null);
    setBase64Audio(null);
    setAudioDuration(0);
    setError(null);
  }, [cleanup, audioUrl]);

  return {
    isRecording,
    recordingTime,
    audioUrl,
    base64Audio,
    audioDuration,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
