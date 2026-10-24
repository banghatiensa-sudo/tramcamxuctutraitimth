import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Heart,
  Send,
  Award,
  Clock,
  ShieldCheck,
  User,
  KeyRound,
  Lock,
  Unlock,
  AlertCircle,
  LogOut,
  X,
  Sparkles,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Video,
} from 'lucide-react';
import { StudentSubmission } from '../../types/emotion';
import { useAudioRecorder } from '../../utils/useAudioRecorder';
import { playReplySuccessSound } from '../../utils/soundEffects';

interface FeedbackViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: StudentSubmission[];
  initialCode?: string;
  initialName?: string;
  onSendStudentReply?: (
    submissionId: string,
    replyText: string,
    replyAudioUrl?: string,
    replyAudioDuration?: number
  ) => void;
}

const STORAGE_SESSION_KEY = 'tram_cam_xuc_student_session';

// Chuẩn hóa chuỗi tiếng Việt không dấu
const normalizeString = (str: string): string =>
  str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

// Kiểm tra so khớp tên học sinh hoặc tên ẩn danh
const isStudentNameMatch = (savedName: string, enteredName: string): boolean => {
  const normSaved = normalizeString(savedName);
  const normEntered = normalizeString(enteredName);

  if (normSaved === normEntered) return true;

  const anonAliases = [
    'an danh',
    'andanh',
    'an',
    'giau ten',
    'giauten',
    'hoc sinh',
    'hoc sinh an danh',
    'em giau ten',
    'khong ten',
  ];

  const isSavedAnon = anonAliases.includes(normSaved);
  const isEnteredAnon = anonAliases.includes(normEntered);

  if (isSavedAnon && isEnteredAnon) {
    return true;
  }

  return false;
};

export const FeedbackViewerModal: React.FC<FeedbackViewerModalProps> = ({
  isOpen,
  onClose,
  submissions,
  initialCode = '',
  initialName = '',
  onSendStudentReply,
}) => {
  const [loginName, setLoginName] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const [foundSubmission, setFoundSubmission] = useState<StudentSubmission | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [sentReplySuccess, setSentReplySuccess] = useState(false);

  // Audio Playback cho thư của thầy cô hoặc tin nhắn bé
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Playback cho bài chia sẻ gốc của chính học sinh
  const [playingStudentSubmissionAudio, setPlayingStudentSubmissionAudio] = useState(false);
  const studentSubAudioRef = useRef<HTMLAudioElement | null>(null);

  // Hook ghi âm cho học sinh (đặc biệt lớp 1, 2)
  const studentRecorder = useAudioRecorder();
  const [isPlayingRecordedReply, setIsPlayingRecordedReply] = useState(false);
  const recordedAudioElemRef = useRef<HTMLAudioElement | null>(null);

  // Khi modal mở: Kiểm tra phiên duy trì đăng nhập (Session Persistence)
  useEffect(() => {
    if (isOpen) {
      setAuthError(null);
      setLogoutMessage(null);

      // 1. Kiểm tra session đã lưu trong localStorage nếu học sinh đã từng đăng nhập duy trì
      const savedSessionRaw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (savedSessionRaw) {
        try {
          const session = JSON.parse(savedSessionRaw);
          if (session && session.secretCode) {
            const queryCode = session.secretCode.trim().toUpperCase();
            const match = submissions.find(
              (s) =>
                s.secretCode.trim().toUpperCase() === queryCode &&
                (session.studentName ? isStudentNameMatch(s.studentName, session.studentName) : true)
            );
            if (match) {
              setFoundSubmission(match);
              setLoginCode(match.secretCode);
              setLoginName(match.studentName);
              return;
            }
          }
        } catch {
          // Bỏ qua lỗi json parse
        }
      }

      // 2. Nếu vừa nộp bài xong và có initialCode, initialName
      if (initialCode) {
        setLoginCode(initialCode);
      }
      if (initialName) {
        setLoginName(initialName);
      }

      if (initialCode && initialName) {
        const queryCode = initialCode.trim().toUpperCase();
        const match = submissions.find(
          (s) =>
            s.secretCode.trim().toUpperCase() === queryCode &&
            isStudentNameMatch(s.studentName, initialName)
        );
        if (match) {
          setFoundSubmission(match);
          if (rememberMe) {
            localStorage.setItem(
              STORAGE_SESSION_KEY,
              JSON.stringify({ studentName: match.studentName, secretCode: match.secretCode })
            );
          }
        }
      }
    } else {
      // Khi đóng modal: Dừng mọi âm thanh đang phát hoặc đang thu
      stopAllAudio();
      studentRecorder.resetRecording();
    }
  }, [isOpen, initialCode, initialName, submissions]);

  // Lắng nghe phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const stopAllAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setActiveAudioPlaying(null);
    if (recordedAudioElemRef.current) {
      recordedAudioElemRef.current.pause();
      recordedAudioElemRef.current = null;
    }
    setIsPlayingRecordedReply(false);
    if (studentSubAudioRef.current) {
      studentSubAudioRef.current.pause();
      studentSubAudioRef.current = null;
    }
    setPlayingStudentSubmissionAudio(false);
  };

  // Học sinh nghe lại đoạn ghi âm trong bài chia sẻ của chính mình
  const handleTogglePlayStudentSubmissionAudio = (url: string) => {
    if (playingStudentSubmissionAudio) {
      studentSubAudioRef.current?.pause();
      setPlayingStudentSubmissionAudio(false);
    } else {
      stopAllAudio();
      const audio = new Audio(url);
      studentSubAudioRef.current = audio;
      audio.onended = () => setPlayingStudentSubmissionAudio(false);
      audio.onerror = () => setPlayingStudentSubmissionAudio(false);
      audio.play().catch(() => setPlayingStudentSubmissionAudio(false));
      setPlayingStudentSubmissionAudio(true);
    }
  };

  // Phát âm thanh thư của Thầy Cô
  const handleTogglePlayTeacherAudio = (id: string, url: string) => {
    if (activeAudioPlaying === id) {
      activeAudioRef.current?.pause();
      setActiveAudioPlaying(null);
    } else {
      stopAllAudio();
      const audio = new Audio(url);
      audio.onended = () => setActiveAudioPlaying(null);
      audio.onerror = () => setActiveAudioPlaying(null);
      audio.play().catch(() => {});
      activeAudioRef.current = audio;
      setActiveAudioPlaying(id);
    }
  };

  // Học sinh nghe thử đoạn ghi âm của chính mình trước khi gửi
  const handleTogglePlayStudentPreview = () => {
    if (!studentRecorder.audioUrl) return;

    if (isPlayingRecordedReply) {
      recordedAudioElemRef.current?.pause();
      setIsPlayingRecordedReply(false);
    } else {
      stopAllAudio();
      const audio = new Audio(studentRecorder.audioUrl);
      audio.onended = () => setIsPlayingRecordedReply(false);
      audio.onerror = () => setIsPlayingRecordedReply(false);
      audio.play().catch(() => {});
      recordedAudioElemRef.current = audio;
      setIsPlayingRecordedReply(true);
    }
  };

  // Xử lý học sinh đăng nhập bằng Tên/Tên ẩn danh + Mã số bí mật
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredName = loginName.trim();
    const enteredCode = loginCode.trim().toUpperCase();

    if (!enteredName || !enteredCode) {
      setAuthError('Vui lòng nhập cả Tên (hoặc tên ẩn danh) và Mã số bí mật của em nhé!');
      return;
    }

    const match = submissions.find(
      (s) =>
        s.secretCode.trim().toUpperCase() === enteredCode &&
        isStudentNameMatch(s.studentName, enteredName)
    );

    if (match) {
      setFoundSubmission(match);
      setAuthError(null);
      setLogoutMessage(null);

      // Nếu học sinh chọn "Duy trì đăng nhập trên máy này"
      if (rememberMe) {
        localStorage.setItem(
          STORAGE_SESSION_KEY,
          JSON.stringify({ studentName: match.studentName, secretCode: match.secretCode })
        );
      } else {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } else {
      setAuthError(
        'Tên (hoặc tên ẩn danh) và Mã số bí mật chưa trùng khớp. Vì lý do bảo mật riêng tư, em hãy kiểm tra lại chính xác tên và mã đã được cấp lúc gửi nhé!'
      );
      setFoundSubmission(null);
    }
  };

  // Đăng xuất và xóa phiên duy trì đăng nhập
  const handleLogout = () => {
    stopAllAudio();
    studentRecorder.resetRecording();
    localStorage.removeItem(STORAGE_SESSION_KEY);
    setFoundSubmission(null);
    setLoginName('');
    setLoginCode('');
    setAuthError(null);
    setReplyInput('');
    setLogoutMessage('Em đã đăng xuất an toàn! Tâm sự của em luôn được bảo mật tuyệt đối.');
    setTimeout(() => {
      setLogoutMessage(null);
    }, 6000);
  };

  // Gửi phản hồi (bằng chữ hoặc bằng giọng nói cho học sinh lớp 1, 2)
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = replyInput.trim().length > 0;
    const hasAudio = !!(studentRecorder.base64Audio || studentRecorder.audioUrl);

    if ((!hasText && !hasAudio) || !foundSubmission || !onSendStudentReply) return;

    onSendStudentReply(
      foundSubmission.id,
      replyInput.trim(),
      studentRecorder.base64Audio || studentRecorder.audioUrl || undefined,
      studentRecorder.audioDuration || studentRecorder.recordingTime
    );

    // Phát âm thanh chuông ngân báo hiệu gửi phản hồi thành công
    playReplySuccessSound();

    setReplyInput('');
    studentRecorder.resetRecording();
    setSentReplySuccess(true);
    setTimeout(() => setSentReplySuccess(false), 5000);
  };

  // Danh sách các bài chia sẻ của riêng học sinh này trên máy (lọc tuyệt đối theo secretCode)
  const mySubmissions = foundSubmission
    ? submissions.filter(
        (s) => s.secretCode.trim().toUpperCase() === foundSubmission.secretCode.trim().toUpperCase()
      )
    : [];

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border-2 sm:border-4 border-amber-200 my-auto max-h-[92dvh] overflow-y-auto">
        {/* NÚT THOÁT NỔI BẬT Ở GÓC TRÊN CÙNG */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border border-slate-200 hover:border-rose-300 z-10"
          title="Thoát khỏi hòm thư"
        >
          <X size={16} />
          <span>Thoát</span>
        </button>

        {/* Header Modal */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 mb-4 sm:mb-5 pr-16 sm:pr-20">
          <div className="p-2.5 sm:p-3 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white rounded-2xl shadow-md shrink-0">
            <Mail className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-800 font-heading leading-tight">
              Hòm Thư Phản Hồi Từ Thầy Cô
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Đăng nhập duy trì tài khoản & nghe lời dặn dò bằng giọng nói của Thầy Cô
            </p>
          </div>
        </div>

        {/* CHƯA ĐĂNG NHẬP: MÀN HÌNH ĐĂNG NHẬP BẢO MẬT */}
        {!foundSubmission ? (
          <div>
            {/* Khối cam kết bảo mật quyền riêng tư */}
            <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
              </div>
              <div className="text-xs text-amber-900 leading-relaxed font-medium">
                <span className="font-extrabold block text-amber-950 mb-0.5">
                  Bảo mật quyền riêng tư của học sinh:
                </span>
                Tâm sự của em được bảo mật tuyệt đối. Em chỉ cần đăng nhập bằng{' '}
                <strong className="text-rose-700">Tên (hoặc Tên ẩn danh)</strong> và{' '}
                <strong className="text-rose-700">Mã bí mật</strong> để xem thư của Thầy Cô. Dữ liệu
                của học sinh khác không bao giờ hiển thị ở đây.
              </div>
            </div>

            {/* Thông báo đăng xuất an toàn nếu vừa bấm đăng xuất */}
            {logoutMessage && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{logoutMessage}</span>
              </div>
            )}

            {/* Thông báo lỗi xác thực nếu có */}
            {authError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{authError}</div>
              </div>
            )}

            {/* Form đăng nhập */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User size={15} className="text-amber-500" />
                  <span>Họ tên hoặc Biệt danh ẩn danh (như lúc em gửi):</span>
                </label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Ví dụ: Ẩn danh (hoặc tên thật của em như Nguyễn Văn A...)"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-amber-200 focus:outline-none focus:border-amber-500 text-sm font-bold bg-amber-50/30 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound size={15} className="text-amber-500" />
                  <span>Mã số bí mật (được cấp khi em gửi tâm sự):</span>
                </label>
                <input
                  type="text"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  placeholder="Ví dụ: TCX-9214, TCX-7832..."
                  className="w-full px-4 py-3 rounded-2xl border-2 border-amber-200 focus:outline-none focus:border-amber-500 text-sm font-black font-mono tracking-wider bg-amber-50/30 text-pink-600 placeholder:text-slate-400 uppercase"
                />
              </div>

              {/* Checkbox Duy trì đăng nhập */}
              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 select-none">
                  Duy trì đăng nhập trên thiết bị này (Lần sau vào là thấy ngay thư của Thầy Cô)
                </span>
              </label>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black text-sm shadow-lg hover:from-amber-600 hover:to-rose-600 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlock size={18} />
                  <span>Đăng Nhập Xem Thư Của Em</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
                >
                  Thoát / Đóng lại
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ĐÃ ĐĂNG NHẬP THÀNH CÔNG: MÀN HÌNH XEM PHẢN HỒI CỦA RIÊNG HỌC SINH NÀY */
          <div className="space-y-4">
            {/* Thanh trạng thái thông tin tài khoản đang duy trì + NÚT ĐĂNG XUẤT RÕ RÀNG */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-pink-500 text-white font-mono shadow-xs">
                  {foundSubmission.secretCode}
                </span>
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>Học sinh:</span>
                  <span className="text-emerald-800 font-extrabold">{foundSubmission.studentName}</span>
                  {foundSubmission.studentClass && (
                    <span className="text-slate-500 font-semibold">({foundSubmission.studentClass})</span>
                  )}
                </span>
              </div>

              {/* KHỐI NÚT ĐĂNG XUẤT NỔI BẬT Ở ĐẦU TRANG */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span>Đã đăng nhập</span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Đăng xuất khỏi thiết bị này"
                  className="px-3 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <LogOut size={13} className="text-rose-600" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>

            {/* NỘI DUNG TÂM SỰ CỦA CHÍNH EM ĐÃ ĐĂNG NHẬP (Chỉ em mới thấy, học sinh khác không thấy) */}
            <div className="p-4 rounded-2xl bg-indigo-50/90 border-2 border-indigo-200 text-indigo-950 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-indigo-800" />
                  </div>
                  <div>
                    <h6 className="font-extrabold text-xs text-indigo-950">
                      Nội dung tâm sự của riêng em (Bảo mật tuyệt đối):
                    </h6>
                    <span className="text-[10px] text-indigo-600 font-medium">
                      Chỉ có em đăng nhập mới xem được nội dung này, học sinh khác được bảo mật không xem được
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 whitespace-nowrap">
                  🔒 Riêng tư của em
                </span>
              </div>

              {/* Chi tiết nội dung của em */}
              <div className="bg-white/90 p-3.5 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-800">{foundSubmission.title}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{foundSubmission.timestamp}</span>
                </div>
                {foundSubmission.content && (
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    {foundSubmission.content}
                  </p>
                )}

                {/* Nếu em có đoạn ghi âm */}
                {foundSubmission.audioUrl && (
                  <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-3 mt-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                      <Volume2 size={16} className="text-sky-600" />
                      <span>Đoạn giọng nói em đã ghi âm ({foundSubmission.audioDuration || 0}s)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePlayStudentSubmissionAudio(foundSubmission.audioUrl!)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                        playingStudentSubmissionAudio
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-sky-500 hover:bg-sky-600 text-white'
                      }`}
                    >
                      {playingStudentSubmissionAudio ? <Pause size={13} /> : <Play size={13} />}
                      <span>{playingStudentSubmissionAudio ? 'Tạm dừng' : 'Bấm nghe lại'}</span>
                    </button>
                  </div>
                )}

                {/* Nếu em có video clip */}
                {foundSubmission.videoUrl && (
                  <div className="mt-2 p-2.5 rounded-xl bg-purple-50 border border-purple-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                      <Video size={16} className="text-purple-600" />
                      <span>Video clip tâm sự em đã quay ({foundSubmission.videoDuration || 0}s):</span>
                    </div>
                    <div className="w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                      <video
                        src={foundSubmission.videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="max-h-56 w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Nếu em có gửi hình ảnh */}
                {foundSubmission.imageUrl && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                    <div className="text-xs font-bold text-amber-900">Tranh vẽ / hình ảnh em đã gửi:</div>
                    <img
                      src={foundSubmission.imageUrl}
                      alt="Hình ảnh của em"
                      className="max-h-48 rounded-lg object-contain bg-white border border-amber-200"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* DANH SÁCH PHẢN HỒI & ĐỘNG VIÊN TỪ THẦY CÔ */}
            <div className="space-y-3 pt-1">
              <h5 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>Thư phản hồi & lời dặn dò từ Thầy Cô:</span>
              </h5>

              {foundSubmission.feedbacks.length === 0 ? (
                <div className="p-6 rounded-2xl bg-amber-50/70 border-2 border-dashed border-amber-300 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-sm font-black text-amber-900">
                    Thầy cô đã nhận được tâm sự của em!
                  </p>
                  <p className="text-xs text-amber-700 max-w-md mx-auto leading-relaxed">
                    Thầy cô đang đọc thư và chuẩn bị những lời chia sẻ ấm áp nhất. Hệ thống vẫn đang duy
                    trì tài khoản của em, em hãy quay lại sau ít phút để nghe lời nhắn nhé!
                  </p>
                </div>
              ) : (
                foundSubmission.feedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4.5 rounded-2xl bg-white border-2 border-amber-200 shadow-md relative overflow-hidden space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 text-white flex items-center justify-center font-black text-xs shadow-xs">
                          GV
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-amber-950">
                            {fb.teacherName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {fb.timestamp}
                          </div>
                        </div>
                      </div>

                      {fb.sticker && (
                        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white font-black text-xs shadow-xs flex items-center gap-1.5">
                          <Award size={13} />
                          <span>{fb.sticker}</span>
                        </div>
                      )}
                    </div>

                    {/* LỜI NHẮN BẰNG GIỌNG NÓI CỦA THẦY CÔ (Dành cho bé lớp 1, 2) */}
                    {fb.audioUrl && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-amber-300 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <Volume2 size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-black text-amber-950">
                              Giọng nói của Cô/Thầy dặn dò con:
                            </div>
                            <div className="text-[10px] text-amber-700 font-semibold">
                              (Dành cho bé lớp 1, 2 nghe cô đọc thư)
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTogglePlayTeacherAudio(fb.id, fb.audioUrl!)}
                          className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                            activeAudioPlaying === fb.id
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}
                        >
                          {activeAudioPlaying === fb.id ? <Pause size={14} /> : <Play size={14} />}
                          <span>{activeAudioPlaying === fb.id ? 'Tạm dừng' : 'Bấm nghe giọng cô'}</span>
                        </button>
                      </div>
                    )}

                    {/* Nội dung phản hồi dạng chữ */}
                    <p className="text-sm text-slate-700 font-medium leading-relaxed pl-2 sm:pl-11">
                      {fb.comment}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* KHU VỰC DÀNH CHO HỌC SINH (LỚP 1, 2) PHẢN HỒI LẠI BẰNG MICROPHONE GHI ÂM HOẶC GÕ CHỮ */}
            <div className="pt-2 p-4 rounded-2xl bg-gradient-to-br from-pink-50/90 via-rose-50/60 to-amber-50/90 border-2 border-pink-300 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-pink-600" />
                  <span>Bé lớp 1, 2 bấm Micro để nói chuyện với Thầy Cô (không cần gõ chữ):</span>
                </span>
                <span className="text-[10px] font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full border border-pink-200">
                  Micro dành cho bé
                </span>
              </div>

              {/* KHỐI MIC GHI ÂM TRỰC TIẾP */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {!studentRecorder.isRecording && !studentRecorder.audioUrl && (
                  <button
                    type="button"
                    onClick={studentRecorder.startRecording}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-extrabold text-xs shadow-md hover:from-pink-600 hover:to-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <div className="w-3 h-3 rounded-full bg-white animate-ping"></div>
                    <Mic size={16} />
                    <span>Bấm vào đây để nói lời cảm ơn / trả lời Thầy Cô</span>
                  </button>
                )}

                {/* Đang thu âm giọng nói của bé */}
                {studentRecorder.isRecording && (
                  <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-rose-100 border-2 border-rose-300 animate-pulse">
                    <div className="flex items-center gap-2 text-rose-800 font-black text-xs">
                      <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping"></span>
                      <span>Đang lắng nghe giọng của bé... ({studentRecorder.recordingTime}s)</span>
                    </div>
                    <button
                      type="button"
                      onClick={studentRecorder.stopRecording}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Square size={13} />
                      <span>Xong rồi / Dừng nói</span>
                    </button>
                  </div>
                )}

                {/* Đã thu âm xong: Cho bé nghe lại và nút thu lại */}
                {studentRecorder.audioUrl && !studentRecorder.isRecording && (
                  <div className="w-full p-3 rounded-2xl bg-white border-2 border-pink-300 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Volume2 size={16} className="text-pink-600" />
                      <span>Đoạn giọng nói của bé ({studentRecorder.audioDuration || studentRecorder.recordingTime || 0}s)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTogglePlayStudentPreview}
                        className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        {isPlayingRecordedReply ? <Pause size={13} /> : <Play size={13} />}
                        <span>{isPlayingRecordedReply ? 'Tạm dừng' : 'Nghe lại giọng mình'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={studentRecorder.resetRecording}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        title="Thu âm lại"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {studentRecorder.error && (
                <p className="text-xs font-bold text-rose-600">{studentRecorder.error}</p>
              )}

              {/* Ô gõ chữ dành cho học sinh biết viết chữ hoặc muốn bổ sung */}
              <form onSubmit={handleSendReply} className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder="Hoặc gõ chữ: Em cảm ơn thầy cô ạ..."
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 text-xs bg-white font-medium"
                />
                <button
                  type="submit"
                  disabled={!replyInput.trim() && !studentRecorder.audioUrl}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Send size={14} />
                  <span>Gửi cho Thầy Cô</span>
                </button>
              </form>

              {/* THÔNG BÁO KHI HỌC SINH PHẢN HỒI XONG (KÈM ÂM THANH BÁO HIỆU) */}
              {sentReplySuccess && (
                <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>🔔 Lời nhắn và giọng nói của bé đã được chuyển tới Thầy Cô rồi nhé! ❤️</span>
                </div>
              )}
            </div>

            {/* NÚT THOÁT VÀ NÚT ĐĂNG XUẤT BẢO VỆ RIÊNG TƯ */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 hover:text-rose-800 text-rose-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-300 shadow-xs"
              >
                <LogOut size={14} />
                <span>Đăng xuất tài khoản của em (Để người khác không xem được)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Thoát / Đóng lại
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Trạm Cảm Xúc • Trường Học Hạnh Phúc
        </div>
      </div>
    </div>
  );
};
