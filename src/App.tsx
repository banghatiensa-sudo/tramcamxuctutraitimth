import React, { useState, useEffect } from 'react';
import { 
  Heart, Sparkles, BookOpen, Mic, Mail, Image as ImageIcon, 
  Video, HelpCircle, ShieldAlert, ChevronRight, User, Settings, 
  Lock, ArrowRight, Smile, Sun, Camera, Feather, X, Menu
} from 'lucide-react';
import { EmotionType, StudentSubmission } from './types/emotion';
import { INITIAL_SUBMISSIONS } from './data/initialData';
import { playSoftPop, playChimeSound } from './utils/soundEffects';
import { syncSubmissionToAppsScript, APPS_SCRIPT_WEBHOOK_URL } from './utils/syncGoogleAppsScript';

// Chibi Components
import { 
  ChibiVuiVe, ChibiBuonBa, ChibiLoLang, ChibiTucGian, ChibiKhoNoi 
} from './components/chibi/ChibiEmotions';
import { 
  ChibiKidsHuggingHeart, ChibiTeacherStudents, HeartLogoIcon 
} from './components/chibi/ChibiCharacters';

// Sub components
import { Sidebar } from './components/Sidebar';
import { WoodenSignpost } from './components/WoodenSignpost';

// Modals
import { ShareEmotionModal } from './components/modals/ShareEmotionModal';
import { AudioRecordModal } from './components/modals/AudioRecordModal';
import { MessageModal } from './components/modals/MessageModal';
import { ImageUploadModal } from './components/modals/ImageUploadModal';
import { SosModal } from './components/modals/SosModal';
import { SuccessModal } from './components/modals/SuccessModal';
import { FeedbackViewerModal } from './components/modals/FeedbackViewerModal';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';

import { 
  saveSubmissionsToIndexedDB, 
  loadSubmissionsFromIndexedDB, 
  safeSaveToLocalStorage, 
  safeLoadFromLocalStorage 
} from './utils/localDatabase';

export default function App() {
  // Ensure the live Google Apps Script Webhook URL is set by default
  useEffect(() => {
    try {
      localStorage.setItem('tram_cam_xuc_webhook_url', APPS_SCRIPT_WEBHOOK_URL);
    } catch {
      // ignore
    }
  }, []);

  // Lọc chỉ giữ lại dữ liệu thật do học sinh gửi, không có số liệu ảo
  const filterOnlyRealSubmissions = (list: StudentSubmission[] | null): StudentSubmission[] => {
    if (!list) return [];
    return list.filter((s) => !['sub-1', 'sub-2', 'sub-3', 'sub-4'].includes(s.id));
  };

  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Local persistence for submissions (khởi tạo nhanh từ LocalStorage)
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => {
    const saved = safeLoadFromLocalStorage();
    return filterOnlyRealSubmissions(saved);
  });

  // Tự động tải dữ liệu đầy đủ từ IndexedDB (chỉ nhận dữ liệu thật)
  useEffect(() => {
    loadSubmissionsFromIndexedDB()
      .then((indexedData) => {
        const realData = filterOnlyRealSubmissions(indexedData);
        if (realData && realData.length > 0) {
          setSubmissions(realData);
        }
        setIsDbLoaded(true);
      })
      .catch(() => {
        setIsDbLoaded(true);
      });
  }, []);

  // Tự động lưu an toàn vào IndexedDB (dung lượng không giới hạn) và LocalStorage (được lọc quota an toàn)
  // Chỉ lưu khi đã hoàn tất nạp dữ liệu ban đầu từ IndexedDB để tránh ghi đè dữ liệu rỗng
  useEffect(() => {
    if (!isDbLoaded) return;
    saveSubmissionsToIndexedDB(submissions);
    safeSaveToLocalStorage(submissions);
  }, [submissions, isDbLoaded]);

  // Selected emotion state on Home
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('vui_ve');

  // Mobile slide-out drawer state (Bảng/Thanh menu trượt ra có 3 gạch chứa 3 banner trên điện thoại di động)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Modals visibility
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isJustListenMode, setIsJustListenMode] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Success modal & thank-you toast
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastSubmittedCode, setLastSubmittedCode] = useState('');
  const [lastSubmittedStudentName, setLastSubmittedStudentName] = useState('');
  const [lastSubmittedIsUrgent, setLastSubmittedIsUrgent] = useState(false);
  const [lastSubmittedType, setLastSubmittedType] = useState<string>('chia_se');
  const [toastNotification, setToastNotification] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Teacher dashboard toggle
  const [isTeacherDashboardOpen, setIsTeacherDashboardOpen] = useState(false);

  // Helper generate random secret code
  const generateSecretCode = (isUrgent: boolean) => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return isUrgent ? `TCX-SOS-${randomDigits.toString().slice(0, 2)}` : `TCX-${randomDigits}`;
  };

  // Submit handler - Tự động đồng bộ ngầm trực tiếp sang Google Apps Script & Google Drive
  const handleSubmission = (data: {
    studentName: string;
    studentClass: string;
    emotion: EmotionType;
    category?: any;
    title: string;
    content: string;
    audioUrl?: string;
    audioDuration?: number;
    imageUrl?: string;
    imageCaption?: string;
    videoUrl?: string;
    videoDuration?: number;
    isUrgent: boolean;
    sosIssue?: string;
  }) => {
    const code = generateSecretCode(data.isUrgent);
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    let category = data.category;
    let detectedType = 'chia_se';
    if (data.isUrgent) {
      category = 'khan_cap';
      detectedType = 'sos';
    } else if (data.videoUrl) {
      category = 'hinh_anh';
      detectedType = 'video';
    } else if (data.imageUrl) {
      category = 'hinh_anh';
      detectedType = 'photo';
    } else if (data.audioUrl) {
      category = 'ghi_am';
      detectedType = 'audio';
    } else if (data.title?.includes('lời nhắn') || data.title?.includes('lắng nghe')) {
      category = 'loi_nhan';
      detectedType = 'loi_nhan';
    } else {
      category = category || 'chia_se';
      detectedType = 'chia_se';
    }

    const newSub: StudentSubmission = {
      id: 'sub-' + Date.now(),
      secretCode: code,
      studentName: data.studentName,
      studentClass: data.studentClass,
      emotion: data.emotion,
      category,
      title: data.title,
      content: data.content,
      audioUrl: data.audioUrl,
      audioDuration: data.audioDuration,
      imageUrl: data.imageUrl,
      imageCaption: data.imageCaption,
      videoUrl: data.videoUrl,
      videoDuration: data.videoDuration,
      isUrgent: data.isUrgent,
      sosIssue: data.sosIssue,
      timestamp: now,
      status: 'moi_tiep_nhan',
      feedbacks: [],
    };

    setSubmissions((prev) => [newSub, ...prev]);
    setLastSubmittedCode(code);
    setLastSubmittedStudentName(data.studentName);
    setLastSubmittedIsUrgent(data.isUrgent);
    setLastSubmittedType(detectedType);
    setIsSuccessModalOpen(true);

    // Bật thông báo cảm ơn / em đã gửi
    const toastMsg = data.videoUrl
      ? 'Cảm ơn em đã gửi đoạn video tâm sự cho thầy cô!'
      : data.imageUrl
      ? 'Cảm ơn em đã gửi bức tranh / hình ảnh cảm xúc cho thầy cô!'
      : data.audioUrl
      ? 'Cảm ơn em đã gửi đoạn ghi âm tâm sự cho thầy cô!'
      : data.isUrgent
      ? 'Thầy cô đã nhận được tín hiệu khẩn cấp của em và sẽ có mặt ngay!'
      : 'Cảm ơn em đã dũng cảm gửi chia sẻ cùng thầy cô!';

    setToastNotification({
      title: '🎉 Em đã gửi thành công!',
      message: toastMsg,
    });

    setTimeout(() => {
      setToastNotification(null);
    }, 5000);

    // Tự động đồng bộ ngay vào Google Apps Script & Drive trong nền
    syncSubmissionToAppsScript(newSub).catch(() => {});
  };

  const handleUpdateSubmission = (updated: StudentSubmission) => {
    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    // Đồng bộ lại khi thầy cô cập nhật trạng thái/phản hồi
    syncSubmissionToAppsScript(updated).catch(() => {});
  };

  const handleSendStudentReply = (
    subId: string,
    replyText: string,
    replyAudioUrl?: string,
    replyAudioDuration?: number
  ) => {
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id === subId) {
          const noteAddition = replyText
            ? `[Bé nhắn lại]: ${replyText}`
            : replyAudioUrl
            ? `[Bé gửi ghi âm giọng nói (${replyAudioDuration || 0}s)]`
            : '';
          const updatedSub: StudentSubmission = {
            ...s,
            teacherNote: s.teacherNote
              ? `${s.teacherNote} | ${noteAddition}`
              : noteAddition,
            studentReplyAudioUrl: replyAudioUrl || s.studentReplyAudioUrl,
            studentReplyDuration: replyAudioDuration || s.studentReplyDuration,
          };
          syncSubmissionToAppsScript(updatedSub).catch(() => {});
          return updatedSub;
        }
        return s;
      })
    );
  };

  // Emotion card click
  const handleSelectEmotion = (type: EmotionType) => {
    setSelectedEmotion(type);
    playSoftPop();
  };

  // Render Teacher Dashboard if active
  if (isTeacherDashboardOpen) {
    return (
      <TeacherDashboard
        submissions={submissions}
        onUpdateSubmission={handleUpdateSubmission}
        onExitDashboard={() => setIsTeacherDashboardOpen(false)}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#edf6fc] text-slate-800 flex flex-col md:flex-row md:h-screen md:overflow-hidden">
      {/* 1. GIAO DIỆN CHÍNH & SIDEBAR BÊN TRÁI: CỐ ĐỊNH BÊN TRÁI TRÊN DESKTOP, BẢNG TRƯỢT RA CÓ 3 GẠCH TRÊN MOBILE */}
      <Sidebar
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onGoHome={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          const mainEl = document.querySelector('main');
          if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isTeacherMode={false}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
      />

      {/* 2. NỘI DUNG TRANG CHỦ (STUDENT HOME) VỚI THANH LĂN MƯỢT MÀ TRÊN TẤT CẢ THIẾT BỊ */}
      <main className="flex-1 w-full md:h-screen md:overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth">
        {/* Top Header Bar: Tối ưu cho cả màn hình nhỏ và lớn */}
        <header className="px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-white/85 backdrop-blur-md border-b border-pink-100 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {/* Nút 3 gạch mở Bảng/Thanh menu trượt ra (Nơi chứa 3 banner học sinh) trên điện thoại di động */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0"
              title="Bảng/Thanh menu trượt ra (Nơi chứa các banner/mục ẩn)"
              aria-label="Mở bảng menu 3 gạch"
            >
              <Menu size={20} className="text-amber-800" />
            </button>

            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-sky-400 p-0.5 shadow-sm shrink-0">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                <span className="text-base sm:text-xl">🎒</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold text-slate-800 font-heading truncate">
                Xin chào, bạn nhỏ!
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-sky-600 truncate">
                Hãy chia sẻ cảm xúc của mình nhé!
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Phím tắt Hòm thư nhanh trên màn hình điện thoại di động */}
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="md:hidden px-2.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs transition-all flex items-center gap-1 cursor-pointer border border-rose-300 shadow-xs active:scale-95"
              title="Vào xem phản hồi từ Thầy Cô"
            >
              <Mail size={13} className="text-rose-500" />
              <span>Hòm Thư</span>
            </button>

            {/* Nút truy cập cổng Thầy Cô */}
            <button
              onClick={() => setIsTeacherDashboardOpen(true)}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-xs transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer border border-amber-300 shadow-xs active:scale-95"
              title="Khu vực dành cho Thầy Cô & Tư Vấn Học Đường"
            >
              <Lock size={13} className="text-amber-600" />
              <span className="hidden sm:inline">Khu Vực Thầy Cô</span>
              <span className="sm:hidden">Thầy Cô</span>
            </button>
          </div>
        </header>

        {/* Nội dung chính: Tự động co giãn mượt mà theo từng cỡ màn hình */}
        <div className="px-3 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 space-y-4 sm:space-y-6 w-full max-w-[1450px] mx-auto">
          {/* ẢNH TRÊN CÙNG: ARTWORK 2D "TRẠM CẢM XÚC TỪ TRÁI TIM" BẮT MẮT RỰC RỠ */}
          <div className="relative rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-lg sm:shadow-xl shadow-sky-200/50 border-2 sm:border-4 border-white bg-gradient-to-b from-[#87CEEB] to-[#E0F7FA] group">
            {/* Hình ảnh nghệ thuật 2D sắc nét */}
            <div className="w-full relative overflow-hidden bg-sky-200">
              <img
                src="/assets/aistudio/d89cdef1-a11c-4b51-b1de-a18f8ef749dd_aa611aa0.png"
                alt="Trạm Cảm Xúc Từ Trái Tim - Banner 2D Học Đường"
                className="w-full h-auto max-h-[220px] xs:max-h-[280px] sm:max-h-[360px] md:max-h-[460px] object-cover sm:object-contain mx-auto drop-shadow-md select-none transform transition-transform duration-500 group-hover:scale-[1.01]"
              />
            </div>

            {/* Dải thông điệp ấm áp bên dưới tranh: Vui vẻ • Biết ơn • Bình yên • Tự tin */}
            <div className="bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 border-t-2 border-pink-100 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-xl">💖</span>
                <span className="text-xs md:text-sm font-black text-rose-600 uppercase tracking-wider font-heading">
                  Lắng Nghe • Kết Nối • Yêu Thương
                </span>
              </div>

              {/* 4 huy hiệu cảm xúc tích cực như chồng sách trong tranh */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold">
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  🧡 Vui vẻ
                </span>
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                  💙 Biết ơn
                </span>
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  💚 Bình yên
                </span>
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                  💜 Tự tin
                </span>
              </div>
            </div>
          </div>

          {/* BANNER CHÀO ĐÓN ẤM ÁP: HÔM NAY TRÁI TIM BẠN ĐANG CẢM THẤY THẾ NÀO? */}
          <div className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 bg-gradient-to-r from-pink-100/90 via-amber-50 to-sky-100/90 border-2 border-pink-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white text-rose-500 shadow-md flex items-center justify-center shrink-0 border-2 border-pink-200 animate-gentle-bounce">
                <Heart size={26} className="fill-rose-400 text-rose-500 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-800 font-heading">
                  Chào bạn! Hôm nay trái tim bạn đang cảm thấy thế nào?
                </h3>
                <p className="text-xs md:text-sm text-slate-600 font-bold mt-0.5">
                  Hãy chạm vào cảm xúc bên dưới và chia sẻ cùng thầy cô nhé, mọi câu chuyện đều được giữ bí mật!
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Chia sẻ ngay</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* 5 THẺ CẢM XÚC LỚN Ở HÀNG TRÊN (ĐỒ HỌA 2D CHIBI SỐNG ĐỘNG) */}
          <section className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-[2.5rem] p-3.5 sm:p-5 md:p-6 shadow-sm border-2 border-pink-100/80">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-extrabold text-sm sm:text-base md:text-lg text-slate-800 flex items-center gap-1.5 sm:gap-2 font-heading">
                <span>Chọn cảm xúc của bạn:</span>
                <span className="text-pink-600 text-[11px] sm:text-xs font-bold bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                  Chạm để giãi bày
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3 md:gap-4">
              {/* 1. Vui vẻ */}
              <button
                onClick={() => handleSelectEmotion('vui_ve')}
                className={`relative flex flex-col items-center justify-between p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 transform cursor-pointer border-2 ${
                  selectedEmotion === 'vui_ve'
                    ? 'bg-gradient-to-b from-amber-100 via-amber-50 to-white border-amber-400 shadow-lg shadow-amber-200/50 scale-105 -translate-y-1'
                    : 'bg-amber-50/50 border-amber-200/70 hover:bg-amber-50 hover:scale-102 shadow-xs'
                }`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center my-1">
                  <ChibiVuiVe size={64} />
                </div>
                <span className="font-extrabold text-xs sm:text-sm md:text-base text-amber-900 mt-1 sm:mt-2 font-heading">
                  Vui vẻ
                </span>
                {selectedEmotion === 'vui_ve' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1" />
                )}
              </button>

              {/* 2. Buồn bã */}
              <button
                onClick={() => handleSelectEmotion('buon_ba')}
                className={`relative flex flex-col items-center justify-between p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 transform cursor-pointer border-2 ${
                  selectedEmotion === 'buon_ba'
                    ? 'bg-gradient-to-b from-sky-100 via-sky-50 to-white border-sky-400 shadow-lg shadow-sky-200/50 scale-105 -translate-y-1'
                    : 'bg-sky-50/50 border-sky-200/70 hover:bg-sky-50 hover:scale-102 shadow-xs'
                }`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center my-1">
                  <ChibiBuonBa size={64} />
                </div>
                <span className="font-extrabold text-xs sm:text-sm md:text-base text-sky-900 mt-1 sm:mt-2 font-heading">
                  Buồn bã
                </span>
                {selectedEmotion === 'buon_ba' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 mt-1" />
                )}
              </button>

              {/* 3. Lo lắng */}
              <button
                onClick={() => handleSelectEmotion('lo_lang')}
                className={`relative flex flex-col items-center justify-between p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 transform cursor-pointer border-2 ${
                  selectedEmotion === 'lo_lang'
                    ? 'bg-gradient-to-b from-purple-100 via-purple-50 to-white border-purple-400 shadow-lg shadow-purple-200/50 scale-105 -translate-y-1'
                    : 'bg-purple-50/50 border-purple-200/70 hover:bg-purple-50 hover:scale-102 shadow-xs'
                }`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center my-1">
                  <ChibiLoLang size={64} />
                </div>
                <span className="font-extrabold text-xs sm:text-sm md:text-base text-purple-900 mt-1 sm:mt-2 font-heading">
                  Lo lắng
                </span>
                {selectedEmotion === 'lo_lang' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1" />
                )}
              </button>

              {/* 4. Tức giận */}
              <button
                onClick={() => handleSelectEmotion('tuc_gian')}
                className={`relative flex flex-col items-center justify-between p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 transform cursor-pointer border-2 ${
                  selectedEmotion === 'tuc_gian'
                    ? 'bg-gradient-to-b from-rose-100 via-rose-50 to-white border-rose-400 shadow-lg shadow-rose-200/50 scale-105 -translate-y-1'
                    : 'bg-rose-50/50 border-rose-200/70 hover:bg-rose-50 hover:scale-102 shadow-xs'
                }`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center my-1">
                  <ChibiTucGian size={64} />
                </div>
                <span className="font-extrabold text-xs sm:text-sm md:text-base text-rose-900 mt-1 sm:mt-2 font-heading">
                  Tức giận
                </span>
                {selectedEmotion === 'tuc_gian' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1" />
                )}
              </button>

              {/* 5. Khó nói thành lời */}
              <button
                onClick={() => handleSelectEmotion('kho_noi')}
                className={`col-span-2 sm:col-span-1 relative flex flex-col items-center justify-between p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 transform cursor-pointer border-2 ${
                  selectedEmotion === 'kho_noi'
                    ? 'bg-gradient-to-b from-emerald-100 via-emerald-50 to-white border-emerald-400 shadow-lg shadow-emerald-200/50 scale-105 -translate-y-1'
                    : 'bg-emerald-50/50 border-emerald-200/70 hover:bg-emerald-50 hover:scale-102 shadow-xs'
                }`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center my-1">
                  <ChibiKhoNoi size={64} />
                </div>
                <span className="font-extrabold text-xs sm:text-sm md:text-base text-emerald-900 mt-1 sm:mt-2 font-heading text-center">
                  Khó nói thành lời
                </span>
                {selectedEmotion === 'kho_noi' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1" />
                )}
              </button>
            </div>

            {/* Lời an ủi động viên theo cảm xúc đã chọn */}
            <div className="mt-3 sm:mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Sparkles size={16} className="text-pink-500 shrink-0" />
                <span className="font-bold">
                  {selectedEmotion === 'vui_ve' && 'Thật tuyệt vời! Hãy lan tỏa nụ cười và niềm vui này đến mọi người nhé!'}
                  {selectedEmotion === 'buon_ba' && 'Thầy cô luôn ở bên em. Đừng giữ nỗi buồn một mình trong lòng nhé...'}
                  {selectedEmotion === 'lo_lang' && 'Hít thở thật sâu nào em. Mọi chuyện rồi sẽ ổn thôi, thầy cô sẽ giúp em!'}
                  {selectedEmotion === 'tuc_gian' && 'Cảm xúc tức giận là bình thường. Em hãy bình tĩnh lại và tâm sự với thầy cô nhé.'}
                  {selectedEmotion === 'kho_noi' && 'Nếu chưa biết bắt đầu từ đâu, em có thể vẽ tranh hoặc gửi một đoạn ghi âm ngắn nhé!'}
                </span>
              </div>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="self-end sm:self-auto shrink-0 font-extrabold text-pink-600 hover:text-pink-700 hover:underline cursor-pointer ml-auto sm:ml-2"
              >
                Bắt đầu viết &gt;
              </button>
            </div>
          </section>

          {/* THANH DÀI NGANG: NÚT "MÌNH CHỈ MUỐN ĐƯỢC LẮNG NGHE >" MÀU HỒNG ĐÀO NỔI BẬT */}
          <div>
            <button
              onClick={() => {
                setIsJustListenMode(true);
                setIsMessageModalOpen(true);
              }}
              className="w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-400 text-white font-extrabold text-sm sm:text-base md:text-lg shadow-md shadow-pink-300/50 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 sm:gap-3 cursor-pointer group"
            >
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-white animate-pulse shrink-0" />
              <span>Mình chỉ muốn được lắng nghe</span>
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-1.5 shrink-0" />
            </button>
          </div>

          {/* 5 KHỐI CHỨC NĂNG BÊN DƯỚI & BIỂN GỖ CHỈ DẪN 4 BẬC */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* 5 Khối chức năng (Chiếm 9 cột trên màn hình lớn) */}
            <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
              {/* 1. Em muốn chia sẻ */}
              <div
                onClick={() => setIsShareModalOpen(true)}
                className="group bg-gradient-to-b from-pink-50/80 to-white rounded-3xl p-4 border-2 border-pink-200/80 shadow-xs hover:shadow-md hover:border-pink-400 transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="font-extrabold text-sm md:text-base text-slate-800 font-heading mb-1">
                    Em muốn chia sẻ
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Ghi lại cảm xúc, điều đang suy nghĩ
                  </p>
                </div>
                <div className="mt-4 pt-2 flex justify-end">
                  <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center group-hover:bg-pink-600 transition-colors shadow-xs">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>

              {/* 2. Em muốn ghi âm */}
              <div
                onClick={() => setIsAudioModalOpen(true)}
                className="group bg-gradient-to-b from-sky-50/80 to-white rounded-3xl p-4 border-2 border-sky-200/80 shadow-xs hover:shadow-md hover:border-sky-400 transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform">
                    <Mic size={24} />
                  </div>
                  <h4 className="font-extrabold text-sm md:text-base text-slate-800 font-heading mb-1">
                    Em muốn ghi âm
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Ghi âm tâm sự của em một cách an toàn
                  </p>
                </div>
                <div className="mt-4 pt-2 flex justify-end">
                  <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center group-hover:bg-sky-600 transition-colors shadow-xs">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>

              {/* 3. Em muốn gửi lời nhắn */}
              <div
                onClick={() => {
                  setIsJustListenMode(false);
                  setIsMessageModalOpen(true);
                }}
                className="group bg-gradient-to-b from-emerald-50/80 to-white rounded-3xl p-4 border-2 border-emerald-200/80 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform">
                    <Mail size={24} />
                  </div>
                  <h4 className="font-extrabold text-sm md:text-base text-slate-800 font-heading mb-1">
                    Em muốn gửi lời nhắn
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Viết những điều em muốn nói
                  </p>
                </div>
                <div className="mt-4 pt-2 flex justify-end">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-xs">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>

              {/* 4. Em muốn gửi hình ảnh & Quay video */}
              <div
                onClick={() => setIsImageModalOpen(true)}
                className="group bg-gradient-to-b from-purple-50/80 to-white rounded-3xl p-4 border-2 border-purple-200/80 shadow-xs hover:shadow-md hover:border-purple-400 transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform">
                    <Camera size={24} />
                  </div>
                  <h4 className="font-extrabold text-sm md:text-base text-slate-800 font-heading mb-1">
                    Em muốn gửi ảnh / video
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Chụp ảnh, quay video clip hoặc tranh vẽ
                  </p>
                </div>
                <div className="mt-4 pt-2 flex justify-end">
                  <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center group-hover:bg-purple-600 transition-colors shadow-xs">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>

              {/* 5. Em cần thầy cô giúp đỡ (Màu vàng cam nổi bật: Khẩn cấp/SOS) */}
              <div
                onClick={() => setIsSosModalOpen(true)}
                className="group col-span-1 sm:col-span-2 md:col-span-1 bg-gradient-to-b from-amber-100/90 via-orange-50 to-white rounded-3xl p-4 border-2 border-amber-400 shadow-md shadow-amber-200/50 hover:shadow-lg hover:border-orange-500 transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                    <ShieldAlert size={26} className="animate-pulse" />
                  </div>
                  <h4 className="font-extrabold text-sm md:text-base text-amber-950 font-heading mb-1 flex items-center gap-1">
                    <span>Em cần thầy cô giúp đỡ</span>
                  </h4>
                  <p className="text-xs text-amber-900/80 font-bold leading-relaxed">
                    Khi em gặp khó khăn hoặc cảm thấy không an toàn
                  </p>
                </div>
                <div className="mt-4 pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                    SOS 111
                  </span>
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center group-hover:bg-orange-600 transition-colors shadow-xs">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* Biển gỗ chỉ dẫn 4 bậc ở góc phải (Chiếm 3 cột trên màn hình lớn) */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-white/70 backdrop-blur-xs rounded-3xl border border-pink-100 shadow-xs">
              <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider text-center">
                Kim chỉ nam Trạm Cảm Xúc
              </div>
              <WoodenSignpost />
            </div>
          </div>

          {/* DÒNG THÔNG ĐIỆP CHÂN TRANG */}
          <footer className="text-center py-4 text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5">
            <Heart size={14} className="text-rose-500 fill-rose-500 animate-pulse" />
            <span>Cùng nhau xây dựng một ngôi trường tràn đầy yêu thương!</span>
          </footer>
        </div>
      </main>

      {/* CÁC MODAL TƯƠNG TÁC ĐẦY ĐỦ */}
      {/* 1. Modal Chia sẻ */}
      <ShareEmotionModal
        isOpen={isShareModalOpen}
        initialEmotion={selectedEmotion}
        onClose={() => setIsShareModalOpen(false)}
        onSubmit={handleSubmission}
      />

      {/* 2. Modal Ghi âm */}
      <AudioRecordModal
        isOpen={isAudioModalOpen}
        initialEmotion={selectedEmotion}
        onClose={() => setIsAudioModalOpen(false)}
        onSubmit={handleSubmission}
      />

      {/* 3. Modal Lời nhắn / Lắng nghe */}
      <MessageModal
        isOpen={isMessageModalOpen}
        initialEmotion={selectedEmotion}
        isJustListenMode={isJustListenMode}
        onClose={() => {
          setIsMessageModalOpen(false);
          setIsJustListenMode(false);
        }}
        onSubmit={handleSubmission}
      />

      {/* 4. Modal Hình ảnh & Quay video */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        initialEmotion={selectedEmotion}
        onClose={() => setIsImageModalOpen(false)}
        onSubmit={handleSubmission}
      />

      {/* 5. Modal Khẩn cấp SOS */}
      <SosModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        onSubmit={handleSubmission}
      />

      {/* Modal Phản hồi của Thầy Cô cho học sinh tra cứu */}
      <FeedbackViewerModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        submissions={submissions}
        initialCode={lastSubmittedCode}
        initialName={lastSubmittedStudentName}
        onSendStudentReply={handleSendStudentReply}
      />

      {/* Toast thông báo cảm ơn / Em đã gửi thành công */}
      {toastNotification && (
        <div className="fixed top-5 right-5 z-50 max-w-md bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 border-emerald-400 text-slate-800 animate-in slide-in-from-top-4 duration-300 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles size={20} className="text-emerald-500 fill-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-sm text-emerald-800 flex items-center gap-1.5 font-heading">
              <span>{toastNotification.title}</span>
            </h4>
            <p className="text-xs text-slate-600 font-bold mt-0.5 leading-snug">
              {toastNotification.message}
            </p>
          </div>
          <button 
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modal Chúc mừng thành công với Confetti */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        secretCode={lastSubmittedCode}
        isUrgent={lastSubmittedIsUrgent}
        submissionType={lastSubmittedType}
        onClose={() => setIsSuccessModalOpen(false)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
      />
    </div>
  );
}
