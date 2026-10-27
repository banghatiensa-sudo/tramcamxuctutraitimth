import React, { useRef, useState, useEffect } from 'react';
import { Volume2, Play, Pause, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { isGoogleDriveUrl, extractDriveFileId, getDrivePreviewUrl, getPlayableAudioUrl } from '../utils/googleDriveHelpers';

interface AudioPlayerCardProps {
  url?: string;
  title?: string;
  duration?: number;
  theme?: 'sky' | 'amber' | 'pink' | 'emerald';
  senderRole?: 'teacher' | 'student';
}

export const AudioPlayerCard: React.FC<AudioPlayerCardProps> = ({
  url,
  title,
  duration,
  theme = 'sky',
  senderRole,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  if (!url) return null;

  const fileId = extractDriveFileId(url);
  const isDrive = isGoogleDriveUrl(url);

  // URL phát chính: qua proxy máy chủ (tự động transcode sang MP3 và hỗ trợ Range 206)
  const proxyStreamUrl = isDrive && fileId ? `/api/audio-proxy?id=${fileId}` : getPlayableAudioUrl(url);
  // URL dự phòng trực tiếp từ Google Drive
  const fallbackDriveUrl = fileId ? `https://docs.google.com/uc?export=download&id=${fileId}` : url;
  const previewDriveUrl = getDrivePreviewUrl(url);

  const themeClasses = {
    sky: {
      bg: 'bg-sky-50/90',
      border: 'border-sky-300',
      badge: 'bg-sky-500 text-white',
      text: 'text-sky-900',
      subtext: 'text-sky-700',
      btn: 'bg-sky-600 hover:bg-sky-700 text-white',
    },
    amber: {
      bg: 'bg-amber-50/90',
      border: 'border-amber-300',
      badge: 'bg-amber-500 text-white',
      text: 'text-amber-900',
      subtext: 'text-amber-700',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    pink: {
      bg: 'bg-pink-50/90',
      border: 'border-pink-300',
      badge: 'bg-pink-500 text-white',
      text: 'text-pink-900',
      subtext: 'text-pink-700',
      btn: 'bg-pink-600 hover:bg-pink-700 text-white',
    },
    emerald: {
      bg: 'bg-emerald-50/90',
      border: 'border-emerald-300',
      badge: 'bg-emerald-500 text-white',
      text: 'text-emerald-900',
      subtext: 'text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  }[theme];

  const defaultTitle = senderRole === 'teacher'
    ? 'Lời dặn dò bằng giọng nói của Thầy Cô'
    : 'Ghi âm giọng nói tâm sự';

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn('Lỗi khi phát audio:', err);
      });
    }
  };

  const handleReload = () => {
    setHasError(false);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div
      className={`w-full rounded-2xl border-2 p-3 sm:p-3.5 space-y-2.5 shadow-xs transition-all ${themeClasses.bg} ${themeClasses.border}`}
    >
      {/* Tiêu đề & Nút bấm nhanh */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${themeClasses.badge} ${
              isPlaying ? 'animate-pulse' : ''
            }`}
          >
            <Volume2 size={16} />
          </div>
          <div>
            <div className={`text-xs font-black leading-tight ${themeClasses.text}`}>
              {title || defaultTitle}
            </div>
            <div className={`text-[10px] font-semibold ${themeClasses.subtext}`}>
              {totalDuration > 0 ? `Thời lượng: ~${totalDuration} giây` : 'Ghi âm âm thanh chất lượng cao'}
              {isDrive && ' • Lưu trữ Google Drive'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${themeClasses.btn}`}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? 'Tạm dừng' : 'Nghe ngay'}</span>
          </button>

          {isDrive && (
            <a
              href={previewDriveUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 hover:text-sky-700 font-bold text-xs flex items-center gap-1 border border-slate-200 shadow-2xs transition-colors"
              title="Mở nghe trực tiếp hoặc tải về trên Google Drive"
            >
              <ExternalLink size={12} />
              <span>Mở Drive</span>
            </a>
          )}
        </div>
      </div>

      {/* Trình phát Audio HTML5 chuẩn hiển thị rõ ràng */}
      <div className="w-full bg-white/80 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
        <audio
          key={reloadKey}
          ref={audioRef}
          controls
          playsInline
          preload="metadata"
          className="w-full h-9 rounded-lg"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onTimeUpdate={(e) => {
            setCurrentTime(Math.round(e.currentTarget.currentTime));
            if (e.currentTarget.duration && !isNaN(e.currentTarget.duration) && isFinite(e.currentTarget.duration)) {
              setTotalDuration(Math.round(e.currentTarget.duration));
            }
          }}
          onError={() => {
            setHasError(true);
            setIsPlaying(false);
          }}
        >
          <source src={proxyStreamUrl} type="audio/mpeg" />
          {isDrive && <source src={fallbackDriveUrl} type="audio/webm" />}
          <source src={url} />
          Trình duyệt của bạn không hỗ trợ thẻ audio HTML5.
        </audio>
      </div>

      {hasError && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="shrink-0" />
            <span>Đường truyền đang nạp. Em có thể bấm "Tải lại" hoặc mở Drive nhé!</span>
          </div>
          <button
            type="button"
            onClick={handleReload}
            className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={11} />
            <span>Tải lại</span>
          </button>
        </div>
      )}
    </div>
  );
};
