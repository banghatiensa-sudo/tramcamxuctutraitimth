import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, Camera, Upload, RotateCcw, Send, Sparkles, 
  X, ShieldCheck, Video, Play, Pause, Square, AlertCircle, Check
} from 'lucide-react';
import { EmotionType } from '../../types/emotion';
import { EmotionIconMap } from '../chibi/ChibiEmotions';
import { sanitizeAndCompressImage } from '../../utils/imageSanitizer';

interface ImageUploadModalProps {
  initialEmotion: EmotionType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    studentName: string;
    studentClass: string;
    emotion: EmotionType;
    title: string;
    content: string;
    imageUrl?: string;
    imageCaption?: string;
    videoUrl?: string;
    videoDuration?: number;
    isUrgent: boolean;
  }) => void;
}

type MediaTab = 'upload' | 'camera_photo' | 'camera_video';

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  initialEmotion,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [emotion, setEmotion] = useState<EmotionType>(initialEmotion);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [caption, setCaption] = useState('');
  
  // Tab mode
  const [activeTab, setActiveTab] = useState<MediaTab>('upload');

  // Captured media results
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  
  // Camera & Video recording states
  const [streamActive, setStreamActive] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoRecordSeconds, setVideoRecordSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [exifCleaned, setExifCleaned] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mediaSuccessMessage, setMediaSuccessMessage] = useState<string | null>(null);

  // References
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const videoBase64Ref = useRef<string | null>(null);

  useEffect(() => {
    setEmotion(initialEmotion);
  }, [initialEmotion]);

  // Clean up streams on unmount or modal close
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecordingVideo) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setStreamActive(false);
    setIsRecordingVideo(false);
  };

  // Start Camera with user audio & video, with graceful audio fallback
  const startCamera = async (needAudio = false) => {
    setErrorMsg(null);
    setMediaSuccessMessage(null);
    stopCameraStream();
    try {
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: needAudio ? { echoCancellation: true, noiseSuppression: true } : false,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        // Nếu lỗi microphone khi quay video, tự động chuyển sang chỉ bật Camera
        if (needAudio) {
          console.warn('Microphone không khả dụng, chuyển sang chế độ chỉ Camera:', mediaErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user',
            },
            audio: false,
          });
        } else {
          throw mediaErr;
        }
      }

      mediaStreamRef.current = stream;
      setStreamActive(true);

      // Gắn stream vào video element khi đã mount
      setTimeout(() => {
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
          videoElementRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: unknown) {
      console.error('Lỗi khởi động camera:', err);
      setErrorMsg('Không thể mở Camera / Micro. Em hãy bấm "Cho phép" (Allow) trên trình duyệt hoặc chuyển sang tab "Tải tranh/ảnh" từ máy nhé!');
      setStreamActive(false);
    }
  };

  // Switch tab
  const handleSwitchTab = (tab: MediaTab) => {
    setActiveTab(tab);
    setErrorMsg(null);
    setMediaSuccessMessage(null);
    if (tab === 'camera_photo') {
      startCamera(false);
    } else if (tab === 'camera_video') {
      startCamera(true);
    } else {
      stopCameraStream();
    }
  };

  // Capture Photo from Camera
  const handleSnapPhoto = () => {
    const video = videoElementRef.current;
    if (!video || !streamActive) {
      setErrorMsg('Camera chưa sẵn sàng để chụp ảnh.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể khởi tạo Canvas');

      // Chụp khung hình hiện tại
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      setPreviewImageUrl(dataUrl);
      setPreviewVideoUrl(null);
      setExifCleaned(true);
      setMediaSuccessMessage('🎉 Đã chụp ảnh thành công! Bấm "GỬI TỚI TRẠM CẢM XÚC THẦY CÔ" để gửi ngay nhé!');
      stopCameraStream();
    } catch {
      setErrorMsg('Chưa chụp được ảnh, em hãy bấm thử lại nhé.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper tìm định dạng video được hỗ trợ tốt nhất trên trình duyệt hiện tại
  const getSupportedVideoMime = (): { recorderMime: string; cleanType: string } => {
    const candidates = [
      { recorder: 'video/webm;codecs=vp8,opus', clean: 'video/webm' },
      { recorder: 'video/webm;codecs=vp9,opus', clean: 'video/webm' },
      { recorder: 'video/webm', clean: 'video/webm' },
      { recorder: 'video/mp4;codecs=avc1,mp4a.40.2', clean: 'video/mp4' },
      { recorder: 'video/mp4', clean: 'video/mp4' },
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c.recorder)) {
        return { recorderMime: c.recorder, cleanType: c.clean };
      }
    }
    return { recorderMime: '', cleanType: 'video/webm' };
  };

  // Start Recording Video
  const handleStartVideoRecording = () => {
    if (!mediaStreamRef.current || !streamActive) {
      setErrorMsg('Camera chưa sẵn sàng để quay video.');
      return;
    }

    try {
      setErrorMsg(null);
      setMediaSuccessMessage(null);
      videoChunksRef.current = [];
      videoBase64Ref.current = null;
      
      const { recorderMime, cleanType } = getSupportedVideoMime();
      const options: MediaRecorderOptions = {
        videoBitsPerSecond: 1000000, // 1 Mbps sắc nét và dung lượng vừa phải
      };
      if (recorderMime) {
        options.mimeType = recorderMime;
      }

      const recorder = new MediaRecorder(mediaStreamRef.current, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        setIsProcessingVideo(true);
        const realCleanType = (recorder.mimeType || cleanType).split(';')[0].trim() || 'video/webm';
        const videoBlob = new Blob(videoChunksRef.current, { type: realCleanType });

        // 1. Tạo ObjectURL cho xem lại tức thì, mượt mà trên mọi thiết bị
        const objectUrl = URL.createObjectURL(videoBlob);
        setPreviewVideoUrl(objectUrl);
        setPreviewImageUrl(null);

        // 2. Chuyển Blob thành Data URL Base64 sạch để lưu trữ bền vững
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            videoBase64Ref.current = reader.result;
            setMediaSuccessMessage('🎉 Đã quay xong clip video! Em có thể xem lại hoặc bấm Gửi bên dưới nhé!');
          }
          setIsProcessingVideo(false);
        };
        reader.onerror = () => {
          setErrorMsg('Có lỗi khi lưu video. Em hãy thử quay lại nhé.');
          setIsProcessingVideo(false);
        };
        reader.readAsDataURL(videoBlob);
        stopCameraStream();
      };

      recorder.start(100);
      setIsRecordingVideo(true);
      setVideoRecordSeconds(0);

      // Tối đa 60 giây cho học sinh tiểu học
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = window.setInterval(() => {
        setVideoRecordSeconds((prev) => {
          if (prev >= 60) {
            handleStopVideoRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.error('Lỗi quay video:', err);
      setErrorMsg('Không thể bắt đầu quay video trên trình duyệt này. Em hãy chọn ảnh tranh vẽ nhé!');
    }
  };

  // Stop Recording Video
  const handleStopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecordingVideo) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Lỗi dừng quay video:', e);
      }
      setIsRecordingVideo(false);
      setVideoDuration(videoRecordSeconds);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  // Handle File Upload (Image or Video)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setErrorMsg(null);
      setMediaSuccessMessage(null);

      if (file.type.startsWith('video/')) {
        // Tệp video tải lên
        const objectUrl = URL.createObjectURL(file);
        setPreviewVideoUrl(objectUrl);
        setPreviewImageUrl(null);
        setVideoDuration(10);

        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            videoBase64Ref.current = reader.result;
            setMediaSuccessMessage('🎉 Đã tải video lên thành công! Em hãy viết lời nhắn và bấm Gửi bên dưới nhé!');
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Tệp hình ảnh tải lên - Tự động nén và xóa siêu dữ liệu EXIF / GPS
        const result = await sanitizeAndCompressImage(file);
        setPreviewImageUrl(result.dataUrl);
        setPreviewVideoUrl(null);
        setExifCleaned(true);
        setMediaSuccessMessage('🎉 Đã tải ảnh thành công! Bấm "GỬI TỚI TRẠM CẢM XÚC THẦY CÔ" để gửi ngay nhé!');
      }
    } catch {
      setErrorMsg('Không thể xử lý tệp này. Em hãy chọn ảnh tranh vẽ hoặc video khác nhé!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetMedia = () => {
    if (previewVideoUrl && previewVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewVideoUrl);
    }
    videoBase64Ref.current = null;
    stopCameraStream();
    setPreviewImageUrl(null);
    setPreviewVideoUrl(null);
    setExifCleaned(false);
    setVideoRecordSeconds(0);
    setErrorMsg(null);
    setMediaSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (activeTab === 'camera_photo') {
      startCamera(false);
    } else if (activeTab === 'camera_video') {
      startCamera(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewImageUrl && !previewVideoUrl) {
      setErrorMsg('Em hãy chọn ảnh, chụp ảnh hoặc quay video trước khi gửi nhé!');
      return;
    }

    let finalVideo = videoBase64Ref.current;
    if (!finalVideo && previewVideoUrl && previewVideoUrl.startsWith('data:')) {
      finalVideo = previewVideoUrl;
    }

    if (!finalVideo && previewVideoUrl && previewVideoUrl.startsWith('blob:')) {
      try {
        setIsProcessingVideo(true);
        const res = await fetch(previewVideoUrl);
        const blob = await res.blob();
        finalVideo = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error('Lỗi chuyển đổi video blob sang base64:', err);
      } finally {
        setIsProcessingVideo(false);
      }
    }

    onSubmit({
      studentName: isAnonymous ? 'Ẩn danh' : (studentName.trim() || 'Học sinh thân yêu'),
      studentClass: isAnonymous ? 'Giấu lớp' : (studentClass.trim() || 'Khối tiểu học'),
      emotion,
      title: previewVideoUrl ? 'Em gửi video tâm sự chia sẻ' : 'Em gửi hình ảnh / tranh vẽ cảm xúc',
      content: caption.trim() || (previewVideoUrl ? 'Video tâm sự của học sinh' : 'Bức tranh cảm xúc của học sinh'),
      imageUrl: previewImageUrl || undefined,
      imageCaption: caption.trim() || 'Tranh vẽ cảm xúc',
      videoUrl: finalVideo || previewVideoUrl || undefined,
      videoDuration: videoDuration || videoRecordSeconds,
      isUrgent: false,
    });

    handleResetMedia();
    onClose();
  };

  // Cho phép đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopCameraStream();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCameraStream();
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border-2 sm:border-4 border-purple-200 my-auto max-h-[92dvh] overflow-y-auto">
        <button
          onClick={() => {
            stopCameraStream();
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
          <div className="p-2.5 sm:p-3 bg-purple-100 text-purple-600 rounded-2xl shrink-0">
            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 font-heading">
              Gửi Hình Ảnh & Quay Video
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Chụp ảnh, quay video clip hoặc tải tranh vẽ chia sẻ cùng thầy cô
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mediaSuccessMessage && (
          <div className="mb-3.5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span>{mediaSuccessMessage}</span>
          </div>
        )}

        {/* 3 Tab chọn: Tải tệp / Chụp ảnh / Quay video */}
        {!previewImageUrl && !previewVideoUrl && (
          <div className="grid grid-cols-3 gap-2 mb-3 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => handleSwitchTab('upload')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload size={14} />
              <span>Tải tranh/ảnh</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('camera_photo')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'camera_photo'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera size={14} />
              <span>Chụp ảnh</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('camera_video')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'camera_video'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Video size={14} />
              <span>Quay video</span>
            </button>
          </div>
        )}

        {/* Khung chụp / Quay video / Preview */}
        <div className="mb-4 p-4 bg-gradient-to-b from-purple-50/60 to-pink-50/40 rounded-3xl border-2 border-purple-100 flex flex-col items-center">
          {/* Cảm xúc đính kèm */}
          <div className="flex items-center gap-2 mb-3 bg-white px-3 py-1.5 rounded-full shadow-xs border border-purple-100">
            <EmotionIcon size={26} />
            <span className="text-xs font-bold text-slate-700">Cảm xúc:</span>
            <select
              value={emotion}
              onChange={(e) => setEmotion(e.target.value as EmotionType)}
              className="text-xs font-bold text-purple-600 bg-transparent outline-none cursor-pointer"
            >
              <option value="vui_ve">Vui vẻ</option>
              <option value="buon_ba">Buồn bã</option>
              <option value="lo_lang">Lo lắng</option>
              <option value="tuc_gian">Tức giận</option>
              <option value="kho_noi">Khó nói thành lời</option>
            </select>
          </div>

          {/* Vùng Video / Image Preview */}
          <div className="w-full h-64 bg-slate-900 rounded-2xl border-2 border-purple-200 flex items-center justify-center overflow-hidden relative shadow-inner">
            {/* Đang xử lý video */}
            {isProcessingVideo && (
              <div className="absolute inset-0 z-30 bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 animate-in fade-in">
                <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-xs font-bold">Đang lưu đoạn video của em... Đợi một lát nhé!</span>
              </div>
            )}

            {/* Live Camera Stream */}
            {streamActive && !previewImageUrl && !previewVideoUrl && (
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                <video
                  ref={videoElementRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Video recording indicator */}
                {isRecordingVideo && (
                  <div className="absolute top-3 left-3 bg-red-600/90 text-white font-mono font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <span>REC {String(Math.floor(videoRecordSeconds / 60)).padStart(2, '0')}:{String(videoRecordSeconds % 60).padStart(2, '0')}</span>
                  </div>
                )}

                {/* Control buttons overlay */}
                <div className="absolute bottom-3 flex items-center gap-3">
                  {activeTab === 'camera_photo' && (
                    <button
                      type="button"
                      onClick={handleSnapPhoto}
                      className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs rounded-full shadow-lg flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                    >
                      <Camera size={16} />
                      <span>Bấm Chụp Ảnh</span>
                    </button>
                  )}

                  {activeTab === 'camera_video' && (
                    !isRecordingVideo ? (
                      <button
                        type="button"
                        onClick={handleStartVideoRecording}
                        className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs rounded-full shadow-lg flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                      >
                        <Video size={16} />
                        <span>Bắt đầu quay clip</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopVideoRecording}
                        className="px-5 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black text-xs rounded-full shadow-lg flex items-center gap-2 cursor-pointer animate-pulse"
                      >
                        <Square size={16} className="fill-white" />
                        <span>Dừng quay & Lưu</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Preview Image đã chụp hoặc tải */}
            {previewImageUrl && (
              <div className="w-full h-full relative group bg-slate-950 flex items-center justify-center">
                <img src={previewImageUrl} alt="Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={handleResetMedia}
                  className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer shadow-md"
                  title="Chụp lại / Chọn lại"
                >
                  <RotateCcw size={16} />
                </button>
                <div className="absolute bottom-2 left-3 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Đã chụp ảnh thành công
                </div>
              </div>
            )}

            {/* Preview Video đã quay */}
            {previewVideoUrl && (
              <div className="w-full h-full relative group bg-black flex items-center justify-center">
                <video
                  key={previewVideoUrl}
                  src={previewVideoUrl}
                  controls
                  playsInline
                  preload="auto"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleResetMedia}
                  className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer shadow-md z-10"
                  title="Quay lại clip khác"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}

            {/* Upload Box Mode */}
            {!streamActive && !previewImageUrl && !previewVideoUrl && (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-purple-300 mb-3">
                  <Upload size={28} />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:from-purple-600 hover:to-indigo-700 transition-all cursor-pointer mb-2"
                >
                  Chọn tệp ảnh hoặc video từ máy
                </button>
                <p className="text-[11px] text-slate-400">
                  Hỗ trợ PNG, JPG, JPEG, WEBM, MP4 (tranh vẽ, ảnh chụp)
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Badge bảo mật EXIF */}
          {exifCleaned && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Đã tự động xóa dữ liệu vị trí GPS & thiết bị để bảo mật an toàn cho bé</span>
            </div>
          )}
        </div>

        {/* Form thông tin đi kèm */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lời nhắn hoặc cảm xúc về bức ảnh / video này:
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ví dụ: Bức tranh con tự vẽ / Đoạn video con quay lúc ra chơi..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50/50"
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
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
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
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-purple-500 rounded focus:ring-purple-400"
            />
            <span className="text-xs font-bold text-slate-600">
              Gửi ẩn danh an toàn (Không để lộ tên của em)
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
            <button
              type="submit"
              disabled={(!previewImageUrl && !previewVideoUrl) || isLoading || isRecordingVideo}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-purple-200 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>GỬI TỚI TRẠM CẢM XÚC THẦY CÔ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCameraStream();
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
