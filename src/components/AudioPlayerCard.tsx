import React, { useRef, useState, useEffect } from 'react';
import { Volume2, Play, Pause, ExternalLink, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { isGoogleDriveUrl, extractDriveFileId, getDrivePreviewUrl } from '../utils/googleDriveHelpers';
import { resolvePlayableAudioUrl, unlockAudioAutoplay } from '../utils/audioLoader';

interface AudioPlayerCardProps {
  url?: string;
  title?: string;
  duration?: number;
  theme?: 'sky' | 'amber' | 'pink' | 'emerald';
  senderRole?: 'teacher' | 'student';
  compact?: boolean;
}

export const AudioPlayerCard: React.FC<AudioPlayerCardProps> = ({
  url,
  title,
  duration,
  theme = 'sky',
  senderRole,
  compact = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [autoPlayRequested, setAutoPlayRequested] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  if (!url) return null;

  const fileId = extractDriveFileId(url);
  const isDrive = isGoogleDriveUrl(url);
  const previewDriveUrl = getDrivePreviewUrl(url);

  // Tự động phân giải link âm thanh (chuyển sang Blob MP3 trong RAM để phát ngay lập tức)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    resolvePlayableAudioUrl(url)
      .then((playableUrl) => {
        if (!isMounted) return;
        setResolvedSrc(playableUrl);
        setIsLoading(false);
        setHasError(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Lỗi phân giải audio:', err);
        setIsLoading(false);
        // Fallback về url ban đầu
        setResolvedSrc(url);
      });

    return () => {
      isMounted = false;
    };
  }, [url, reloadTrigger]);

  // Nếu người dùng đã nhấn "Nghe ngay" trong khi đang nạp thì tự động phát ngay khi nạp xong
  useEffect(() => {
    if (autoPlayRequested && resolvedSrc && audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAutoPlayRequested(false);
        })
        .catch((err) => {
          console.warn('Tự động phát không thành công:', err);
          setAutoPlayRequested(false);
        });
    }
  }, [autoPlayRequested, resolvedSrc]);

  const themeClasses = {
    sky: {
      bg: 'bg-sky-50/95',
      border: 'border-sky-300',
      badge: 'bg-sky-500 text-white',
      text: 'text-sky-950',
      subtext: 'text-sky-700',
      btn: 'bg-sky-600 hover:bg-sky-700 text-white',
    },
    amber: {
      bg: 'bg-amber-50/95',
      border: 'border-amber-300',
      badge: 'bg-amber-500 text-white',
      text: 'text-amber-950',
      subtext: 'text-amber-700',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    pink: {
      bg: 'bg-pink-50/95',
      border: 'border-pink-300',
      badge: 'bg-pink-500 text-white',
      text: 'text-pink-950',
      subtext: 'text-pink-700',
      btn: 'bg-pink-600 hover:bg-pink-700 text-white',
    },
    emerald: {
      bg: 'bg-emerald-50/95',
      border: 'border-emerald-300',
      badge: 'bg-emerald-500 text-white',
      text: 'text-emerald-950',
      subtext: 'text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  }[theme];

  const defaultTitle =
    senderRole === 'teacher'
      ? 'Lời dặn dò bằng giọng nói của Thầy Cô'
      : 'Ghi âm giọng nói tâm sự của học sinh';

  const togglePlay = () => {
    unlockAudioAutoplay();

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!resolvedSrc || isLoading) {
        setAutoPlayRequested(true);
        return;
      }

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch((err) => {
          console.warn('Lỗi khi phát audio:', err);
          // Nếu phát thất bại, thử reload lại luồng âm thanh
          setHasError(true);
          setIsPlaying(false);
        });
    }
  };

  const handleReload = () => {
    setHasError(false);
    setResolvedSrc('');
    setReloadTrigger((prev) => prev + 1);
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
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
          </div>
          <div>
            <div className={`text-xs font-black leading-tight ${themeClasses.text}`}>
              {title || defaultTitle}
            </div>
            <div className={`text-[10px] font-semibold ${themeClasses.subtext}`}>
              {totalDuration > 0 ? `Thời lượng: ~${totalDuration} giây` : 'Ghi âm âm thanh chất lượng cao'}
              {isDrive && ' • Lưu trữ Google Drive'}
              {isLoading && ' • Đang chuẩn bị âm thanh...'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading && !autoPlayRequested}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 ${themeClasses.btn}`}
          >
            {isLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={13} />
            ) : (
              <Play size={13} />
            )}
            <span>
              {isLoading
                ? autoPlayRequested
                  ? 'Đang phát...'
                  : 'Đang tải...'
                : isPlaying
                ? 'Tạm dừng'
                : 'Bấm nghe ngay'}
            </span>
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

      {/* Trình phát Audio HTML5 chuẩn có thanh trượt thời gian và âm lượng */}
      <div className="w-full bg-white/90 p-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
        {resolvedSrc ? (
          <audio
            ref={audioRef}
            src={resolvedSrc}
            controls
            playsInline
            preload="auto"
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
            onError={(e) => {
              console.warn('Lỗi phần tử audio HTML5:', e);
              setHasError(true);
              setIsPlaying(false);
            }}
          />
        ) : (
          <div className="w-full h-9 rounded-lg bg-slate-50 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <Loader2 size={14} className="animate-spin text-slate-400" />
            <span>Đang chuẩn bị luồng âm thanh trực tiếp...</span>
          </div>
        )}
      </div>

      {/* Trạng thái hỗ trợ nếu mạng chậm */}
      {hasError && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="shrink-0" />
            <span>Đường truyền đang nạp lại. Em có thể bấm "Thử lại" hoặc "Mở Drive" nhé!</span>
          </div>
          <button
            type="button"
            onClick={handleReload}
            className="px-2.5 py-1 rounded-md bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-rose-700 shadow-2xs"
          >
            <RefreshCw size={11} />
            <span>Thử lại</span>
          </button>
        </div>
      )}
    </div>
  );
};
