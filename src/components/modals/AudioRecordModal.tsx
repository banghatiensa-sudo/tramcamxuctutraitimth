import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Send, AlertCircle, Sparkles, X, Volume2 } from 'lucide-react';
import { EmotionType } from '../../types/emotion';
import { EmotionIconMap } from '../chibi/ChibiEmotions';

interface AudioRecordModalProps {
  initialEmotion: EmotionType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    studentName: string;
    studentClass: string;
    emotion: EmotionType;
    title: string;
    content: string;
    audioUrl: string;
    audioDuration: number;
    isUrgent: boolean;
  }) => void;
}

export const AudioRecordModal: React.FC<AudioRecordModalProps> = ({
  initialEmotion,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [emotion, setEmotion] = useState<EmotionType>(initialEmotion);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [title, setTitle] = useState('');
  
  // Trạng thái ghi âm
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const base64AudioRef = useRef<string | null>(null);

  useEffect(() => {
    setEmotion(initialEmotion);
  }, [initialEmotion]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
    }
  };

  const startVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

          const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(1, '#818cf8');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          x += barWidth + 1;
        }
      };

      draw();
    } catch {
      // Visualizer error ignored gracefully
    }
  };

  const getSupportedAudioMime = (): { recorderMime: string; cleanType: string } => {
    const candidates = [
      { recorder: 'audio/webm;codecs=opus', clean: 'audio/webm' },
      { recorder: 'audio/webm', clean: 'audio/webm' },
      { recorder: 'audio/mp4', clean: 'audio/mp4' },
      { recorder: 'audio/aac', clean: 'audio/aac' },
      { recorder: 'audio/ogg;codecs=opus', clean: 'audio/ogg' },
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c.recorder)) {
        return { recorderMime: c.recorder, cleanType: c.clean };
      }
    }
    return { recorderMime: '', cleanType: 'audio/webm' };
  };

  const handleStartRecording = async () => {
    setErrorMsg(null);
    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }
      setIsPlaying(false);
      setPlaybackTime(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const { recorderMime, cleanType } = getSupportedAudioMime();
      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 64000,
      };
      if (recorderMime) {
        options.mimeType = recorderMime;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const realCleanType = (mediaRecorder.mimeType || cleanType).split(';')[0].trim() || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: realCleanType });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        setAudioDuration((prev) => (prev > 0 ? prev : Math.max(1, recordingTime)));

        // Reset player ref
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.src = '';
          audioElementRef.current = null;
        }

        // Chuyển blob thành dataURL sạch để lưu trữ lâu dài
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            base64AudioRef.current = reader.result;
          }
        };
        reader.readAsDataURL(audioBlob);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Bắt đầu đếm giây
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      startVisualizer(stream);
    } catch {
      setErrorMsg('Không thể truy cập Microphone. Em hãy nhấn "Cho phép" (Allow) trên trình duyệt nhé!');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Lỗi dừng ghi âm:', err);
      }
      setIsRecording(false);
      setIsPaused(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleResetRecording = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }
    cleanupAudio();
    base64AudioRef.current = null;
    setAudioBlobUrl(null);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioDuration(0);
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const togglePlayback = () => {
    if (!audioBlobUrl) return;

    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioElementRef.current || audioElementRef.current.src !== audioBlobUrl) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      const audio = new Audio(audioBlobUrl);
      audioElementRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
      };

      audio.ontimeupdate = () => {
        setPlaybackTime(Math.round(audio.currentTime));
      };

      audio.onerror = (e) => {
        console.error('Lỗi phát âm thanh:', e);
        setIsPlaying(false);
        setErrorMsg('Chưa thể phát âm thanh này. Em hãy thử thu âm lại nhé!');
      };
    }

    audioElementRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((err) => {
        console.warn('Lỗi khi phát âm thanh:', err);
        setIsPlaying(false);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalAudio = base64AudioRef.current;
    if (!finalAudio && audioBlobUrl && audioBlobUrl.startsWith('data:')) {
      finalAudio = audioBlobUrl;
    }

    if (!finalAudio && audioChunksRef.current.length > 0) {
      try {
        const { cleanType } = getSupportedAudioMime();
        const realCleanType = (mediaRecorderRef.current?.mimeType || cleanType).split(';')[0].trim() || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: realCleanType });
        finalAudio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
      } catch (err) {
        console.error('Lỗi chuyển base64 audio:', err);
      }
    }

    if (!finalAudio && audioBlobUrl && audioBlobUrl.startsWith('blob:')) {
      try {
        const res = await fetch(audioBlobUrl);
        const blob = await res.blob();
        finalAudio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error('Lỗi fetch blob:', err);
      }
    }

    if (!finalAudio) {
      setErrorMsg('Em hãy ghi âm một đoạn giọng nói trước khi gửi nhé!');
      return;
    }

    onSubmit({
      studentName: isAnonymous ? 'Ẩn danh' : (studentName.trim() || 'Học sinh thân yêu'),
      studentClass: isAnonymous ? 'Giấu lớp' : (studentClass.trim() || 'Khối tiểu học'),
      emotion,
      title: title.trim() || 'Tâm sự qua giọng nói',
      content: 'Học sinh đã để lại một đoạn ghi âm tâm sự.',
      audioUrl: finalAudio,
      audioDuration: audioDuration || recordingTime || 5,
      isUrgent: false,
    });

    handleResetRecording();
    onClose();
  };

  // Cho phép đóng bằng phím Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleResetRecording();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const EmotionIcon = EmotionIconMap[emotion] || EmotionIconMap.vui_ve;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleResetRecording();
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border-2 sm:border-4 border-sky-100 my-auto max-h-[92dvh] overflow-y-auto">
        <button
          onClick={() => {
            handleResetRecording();
            onClose();
          }}
          type="button"
          aria-label="Thoát khỏi giao diện"
          title="Thoát khỏi giao diện"
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer border border-slate-300 shadow-xs z-10 hover:scale-105 active:scale-95"
        >
          <X size={16} />
          <span>Thoát</span>
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3 mb-4 pr-16">
          <div className="p-2.5 sm:p-3 bg-sky-100 text-sky-600 rounded-2xl shrink-0">
            <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 font-heading">
              Em muốn ghi âm tâm sự
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Không cần viết nhiều chữ, em cứ thoải mái nói những điều trong lòng nhé!
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Khung ghi âm trung tâm */}
        <div className="mb-5 p-5 bg-gradient-to-b from-sky-50/70 to-indigo-50/40 rounded-3xl border-2 border-sky-100 flex flex-col items-center">
          {/* Cảm xúc đính kèm */}
          <div className="flex items-center gap-2 mb-3 bg-white px-3 py-1.5 rounded-full shadow-xs border border-sky-100">
            <EmotionIcon size={28} />
            <span className="text-xs font-bold text-slate-700">
              Cảm xúc hiện tại:
            </span>
            <select
              value={emotion}
              onChange={(e) => setEmotion(e.target.value as EmotionType)}
              className="text-xs font-bold text-sky-600 bg-transparent outline-none cursor-pointer"
            >
              <option value="vui_ve">Vui vẻ</option>
              <option value="buon_ba">Buồn bã</option>
              <option value="lo_lang">Lo lắng</option>
              <option value="tuc_gian">Tức giận</option>
              <option value="kho_noi">Khó nói thành lời</option>
            </select>
          </div>

          {/* Sóng âm Visualizer Canvas */}
          <div className="w-full h-20 bg-slate-900/5 rounded-2xl flex items-center justify-center overflow-hidden mb-3 relative">
            <canvas ref={canvasRef} width={280} height={70} className="w-full h-full" />
            {!isRecording && !audioBlobUrl && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-semibold gap-1.5">
                <Mic size={16} />
                <span>Nhấn nút bên dưới để bắt đầu thu âm</span>
              </div>
            )}
            {audioBlobUrl && !isRecording && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-sky-600 font-bold gap-2">
                <Volume2 size={16} />
                <span>Đã thu xong ({audioDuration || recordingTime}s) - Bấm phát để nghe lại</span>
              </div>
            )}
          </div>

          {/* Đồng hồ đếm thời gian */}
          <div className="text-2xl font-black font-mono tracking-wider text-slate-700 mb-4">
            {String(Math.floor((isRecording ? recordingTime : playbackTime) / 60)).padStart(2, '0')}:
            {String((isRecording ? recordingTime : playbackTime) % 60).padStart(2, '0')}
          </div>

          {/* Các nút điều khiển ghi âm */}
          <div className="flex items-center gap-4">
            {!isRecording && !audioBlobUrl && (
              <button
                type="button"
                onClick={handleStartRecording}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-pink-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Mic className="w-5 h-5 animate-pulse" />
                <span>Bắt đầu nói</span>
              </button>
            )}

            {isRecording && (
              <button
                type="button"
                onClick={handleStopRecording}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer animate-pulse"
              >
                <Square className="w-5 h-5 fill-white" />
                <span>Dừng & Lưu đoạn nói</span>
              </button>
            )}

            {audioBlobUrl && !isRecording && (
              <>
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="px-5 py-2.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-white" />}
                  <span>{isPlaying ? 'Tạm dừng' : 'Nghe lại'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetRecording}
                  title="Thu âm lại"
                  className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                >
                  <RotateCcw size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Thông tin học sinh */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tiêu đề ngắn về điều em muốn nói:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Lời nhắn gửi cô giáo chủ nhiệm..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên của em:
              </label>
              <input
                type="text"
                disabled={isAnonymous}
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={isAnonymous ? 'Đang ẩn danh' : 'Nhập tên của em'}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lớp của em:
              </label>
              <input
                type="text"
                disabled={isAnonymous}
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                placeholder={isAnonymous ? 'Giấu lớp' : 'Ví dụ: 3A1'}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-sky-500 rounded focus:ring-sky-400"
            />
            <span className="text-xs font-bold text-slate-600">
              Giữ bí mật tên và lớp của em (Gửi ẩn danh an toàn)
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
            <button
              type="submit"
              disabled={!audioBlobUrl || isRecording}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold rounded-2xl shadow-lg shadow-sky-200 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>GỬI GHI ÂM TỚI THẦY CÔ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleResetRecording();
                onClose();
              }}
              className="py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-300 hover:text-slate-900"
            >
              <X size={16} />
              <span>Thoát / Đóng lại</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
