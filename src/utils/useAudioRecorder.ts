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
  getAudioBase64: () => Promise<string | null>;
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
  const lastBlobRef = useRef<Blob | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const stopPromiseResolverRef = useRef<((base64: string | null) => void) | null>(null);

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
    };
  }, [cleanup]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null);
    cleanup();
    audioChunksRef.current = [];
    lastBlobRef.current = null;
    setAudioUrl(null);
    setBase64Audio(null);
    setRecordingTime(0);
    setAudioDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Chọn mimeType tối ưu được trình duyệt hỗ trợ
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType, audioBitsPerSecond: 64000 })
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
        lastBlobRef.current = audioBlob;
        const blobUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(blobUrl);

        // Tính thời lượng chính xác
        const durationSec = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
        setAudioDuration(durationSec);

        // Chuyển blob thành Base64 Data URL hoàn chỉnh để lưu trữ vĩnh viễn
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = typeof reader.result === 'string' ? reader.result : null;
          setBase64Audio(res);
          if (stopPromiseResolverRef.current) {
            stopPromiseResolverRef.current(res);
            stopPromiseResolverRef.current = null;
          }
        };
        reader.onerror = () => {
          if (stopPromiseResolverRef.current) {
            stopPromiseResolverRef.current(null);
            stopPromiseResolverRef.current = null;
          }
        };
        reader.readAsDataURL(audioBlob);

        // Chỉ đóng track mic sau khi đã hoàn thành trích xuất dữ liệu
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();

      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
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
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Lỗi dừng recorder:', e);
      }
    }
    setIsRecording(false);
  }, []);

  const resetRecording = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setRecordingTime(0);
    setAudioUrl(null);
    setBase64Audio(null);
    setAudioDuration(0);
    setError(null);
    stopPromiseResolverRef.current = null;
  }, [cleanup]);

  const getAudioBase64 = useCallback(async (): Promise<string | null> => {
    // 1. Nếu đang ghi âm dở, dừng lại và đợi onstop hoàn tất
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      return new Promise<string | null>((resolve) => {
        stopPromiseResolverRef.current = resolve;
        stopRecording();
      });
    }

    // 2. Nếu đã có sẵn base64Audio
    if (base64Audio) return base64Audio;

    // 3. Nếu có blob đang chờ convert
    if (lastBlobRef.current) {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setBase64Audio(reader.result);
            resolve(reader.result);
          } else {
            resolve('');
          }
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(lastBlobRef.current!);
      });
    }

    if (audioUrl && audioUrl.startsWith('data:')) {
      return audioUrl;
    }

    return null;
  }, [base64Audio, audioUrl, stopRecording]);

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
    getAudioBase64,
  };
}
