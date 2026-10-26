import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Unlock, Download, Search, Filter, ShieldAlert, 
  MessageSquare, Volume2, Image as ImageIcon, Video, CheckCircle, 
  Clock, AlertTriangle, Eye, ArrowLeft, Send, Sparkles, X, 
  Play, Pause, Award, KeyRound, Check, Mic, Square, RotateCcw,
  Sheet, RefreshCw, ExternalLink, Link2, Folder, CheckCircle2
} from 'lucide-react';
import { StudentSubmission, ProcessingStatus, EmotionType, EmotionFeedback } from '../../types/emotion';
import { exportSubmissionsToCsv } from '../../utils/exportCsv';
import { EmotionIconMap } from '../chibi/ChibiEmotions';
import { useAudioRecorder } from '../../utils/useAudioRecorder';
import { GoogleSheetSyncModal } from './GoogleSheetSyncModal';
import { 
  fetchSubmissionsFromGoogleSheet, 
  mergeSubmissions, 
  STORAGE_LAST_SYNC_KEY 
} from '../../utils/googleSheetsSync';
import { 
  isGoogleDriveUrl, 
  getDriveThumbnailUrl, 
  getDriveDirectStreamUrl, 
  getDrivePreviewUrl,
  getPlayableAudioUrl 
} from '../../utils/googleDriveHelpers';
import { convertBlobToDataUrl } from '../../utils/syncGoogleAppsScript';

interface TeacherDashboardProps {
  submissions: StudentSubmission[];
  onUpdateSubmission: (updated: StudentSubmission) => void;
  onSubmissionsUpdated?: (merged: StudentSubmission[]) => void;
  onExitDashboard: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  submissions,
  onUpdateSubmission,
  onSubmissionsUpdated,
  onExitDashboard,
}) => {
  // Authentication credentials stored in localStorage (default: admin / tramcamxuc2026)
  const [storedUsername, setStoredUsername] = useState(() => {
    return localStorage.getItem('tram_cam_xuc_admin_user') || 'admin';
  });
  const [storedPassword, setStoredPassword] = useState(() => {
    return localStorage.getItem('tram_cam_xuc_admin_pass') || 'tramcamxuc2026';
  });

  // Yêu cầu đăng nhập tài khoản, mật khẩu quản trị Admin theo yêu cầu
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Change Password Modal
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null);

  // Tự động cập nhật bài đang xem khi có tin nhắn mới hoặc đồng bộ ngầm
  useEffect(() => {
    if (selectedSubmission) {
      const fresh = submissions.find(
        (s) =>
          s.secretCode.trim().toUpperCase() === selectedSubmission.secretCode.trim().toUpperCase() ||
          s.id === selectedSubmission.id
      );
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedSubmission)) {
        setSelectedSubmission(fresh);
      }
    }
  }, [submissions]);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Teacher Feedback State
  const [teacherReplyText, setTeacherReplyText] = useState('');
  const [teacherName, setTeacherName] = useState('Cô Thu Hà (Tư vấn học đường)');
  const [selectedSticker, setSelectedSticker] = useState('🤗 Cái Ôm Ấm Áp');
  const [teacherPrivateNote, setTeacherPrivateNote] = useState('');

  // Audio Recorder for Teacher (dành cho học sinh lớp 1, 2)
  const teacherRecorder = useAudioRecorder();
  const [isPlayingTeacherPreview, setIsPlayingTeacherPreview] = useState(false);
  const teacherPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  // Google Sheets Auto-Sync & Real-Time Sync states
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [lastSyncText, setLastSyncText] = useState<string>(() => {
    return localStorage.getItem(STORAGE_LAST_SYNC_KEY) || 'Tự động kiểm tra';
  });
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Hàm đồng bộ nhanh từ Google Sheets
  const handleQuickSync = async (isManual = true) => {
    setIsSyncingSheets(true);
    if (isManual) setSyncFeedback(null);

    try {
      const result = await fetchSubmissionsFromGoogleSheet();
      if (result.success && result.submissions.length > 0) {
        const merged = mergeSubmissions(submissions, result.submissions);
        if (onSubmissionsUpdated) {
          onSubmissionsUpdated(merged);
        }
        const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const timeText = `Lúc ${nowTime} (${result.submissions.length} bài thực tế)`;
        setLastSyncText(timeText);
        localStorage.setItem(STORAGE_LAST_SYNC_KEY, timeText);

        if (isManual) {
          setSyncFeedback({
            message: `🎉 Đã tự động kết nối và lấy ${result.submissions.length} bài chia sẻ thực tế từ Google Sheet!`,
          });
          setTimeout(() => setSyncFeedback(null), 5000);
        }
      } else if (isManual) {
        setSyncFeedback({
          message: result.message || 'Chưa tìm thấy bài mới trên Google Sheet. Thầy/Cô hãy kiểm tra đường link Google Sheet nhé!',
          isError: true,
        });
        setTimeout(() => setSyncFeedback(null), 6000);
      }
    } catch (err: any) {
      if (isManual) {
        setSyncFeedback({
          message: 'Lỗi đồng bộ: ' + (err?.message || 'Không thể kết nối'),
          isError: true,
        });
      }
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Tự động đồng bộ ngay khi vào Admin và định kỳ mỗi 15 giây
  useEffect(() => {
    if (isAuthenticated) {
      handleQuickSync(false);
      const interval = setInterval(() => {
        handleQuickSync(false);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const stickers = [
    '🤗 Cái Ôm Ấm Áp',
    '🌟 Điểm 10 Xứng Đáng',
    '🌱 Mầm Hy Vọng',
    '❤️ Thầy Cô Luôn Ở Bên Em',
    '💪 Em Thật Dũng Cảm',
    '🌈 Mọi Chuyện Sẽ Tốt Đẹp Thôi',
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputUser = usernameInput.trim();
    const inputPass = passwordInput.trim();

    if (inputUser === storedUsername && inputPass === storedPassword) {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);

    if (currentPasswordInput.trim() !== storedPassword) {
      setChangePasswordError('Mật khẩu hiện tại chưa chính xác!');
      return;
    }

    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      setChangePasswordError('Mật khẩu mới phải có ít nhất 4 ký tự!');
      return;
    }

    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setChangePasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới!');
      return;
    }

    // Save new password
    const newPass = newPasswordInput.trim();
    setStoredPassword(newPass);
    localStorage.setItem('tram_cam_xuc_admin_pass', newPass);

    setChangePasswordSuccess(true);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');

    setTimeout(() => {
      setChangePasswordSuccess(false);
      setIsChangePasswordModalOpen(false);
    }, 2000);
  };

  const handleToggleAudio = (id: string, url: string) => {
    if (playingAudioId === id) {
      if (audioElement) {
        audioElement.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const streamUrl = getPlayableAudioUrl(url);
      const audio = new Audio(streamUrl);
      audio.preload = 'auto';
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = (e) => {
        console.warn('Lỗi stream audio:', e);
      };
      audio.play().catch((err) => {
        console.warn('Audio play error, showing inline player:', err);
      });
      setAudioElement(audio);
      setPlayingAudioId(id);
    }
  };

  const handleStatusChange = (sub: StudentSubmission, newStatus: ProcessingStatus) => {
    const updated = { ...sub, status: newStatus };
    onUpdateSubmission(updated);
    if (selectedSubmission?.id === sub.id) {
      setSelectedSubmission(updated);
    }
  };

  const handleToggleTeacherPreview = () => {
    if (!teacherRecorder.audioUrl) return;
    if (isPlayingTeacherPreview) {
      teacherPreviewAudioRef.current?.pause();
      setIsPlayingTeacherPreview(false);
    } else {
      if (audioElement) audioElement.pause();
      const audio = new Audio(teacherRecorder.audioUrl);
      audio.onended = () => setIsPlayingTeacherPreview(false);
      audio.onerror = () => setIsPlayingTeacherPreview(false);
      audio.play().catch(() => {});
      teacherPreviewAudioRef.current = audio;
      setIsPlayingTeacherPreview(true);
    }
  };

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = teacherReplyText.trim().length > 0;
    const hasAudio = !!(teacherRecorder.base64Audio || teacherRecorder.audioUrl);
    if (!selectedSubmission || (!hasText && !hasAudio)) return;

    // Lấy âm thanh dạng Base64 chắc chắn không bị mất khi lưu và nghe lại
    let teacherAudio: string | undefined = undefined;
    if (teacherRecorder.getAudioBase64) {
      teacherAudio = (await teacherRecorder.getAudioBase64()) || undefined;
    }
    if (!teacherAudio && teacherRecorder.audioUrl) {
      teacherAudio = await convertBlobToDataUrl(teacherRecorder.audioUrl);
    }
    if (!teacherAudio && teacherRecorder.base64Audio) {
      teacherAudio = teacherRecorder.base64Audio;
    }

    const teacherDisplayName = teacherName.trim() || 'Cô Thu Hà (Tư vấn học đường)';
    const nowTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const audioDur = teacherRecorder.audioDuration || teacherRecorder.recordingTime || 0;

    const newFeedback: EmotionFeedback = {
      id: 'fb-' + Date.now(),
      senderRole: 'teacher',
      senderName: teacherDisplayName,
      teacherName: teacherDisplayName,
      comment:
        teacherReplyText.trim() ||
        'Thầy Cô gửi lời nhắn nhủ, yêu thương bằng giọng nói cho con ở trên nhé! ❤️',
      sticker: selectedSticker,
      timestamp: nowTime,
      audioUrl: teacherAudio || teacherRecorder.audioUrl || undefined,
      audioDuration: audioDur,
    };

    const teacherNoteAddition = `[${teacherDisplayName}]: ${newFeedback.comment}${selectedSticker ? ` (${selectedSticker})` : ''}${newFeedback.audioUrl ? ' [Kèm giọng nói]' : ''}`;
    let mergedNote = selectedSubmission.teacherNote
      ? `${selectedSubmission.teacherNote} | ${teacherNoteAddition}`
      : teacherNoteAddition;
    if (teacherPrivateNote.trim()) {
      mergedNote += ` [Ghi chú nội bộ: ${teacherPrivateNote.trim()}]`;
    }

    const updated: StudentSubmission = {
      ...selectedSubmission,
      status: selectedSubmission.status === 'moi_tiep_nhan' ? 'dang_xem_xet' : selectedSubmission.status,
      teacherNote: mergedNote,
      feedbacks: [newFeedback, ...(selectedSubmission.feedbacks || [])],
    };

    onUpdateSubmission(updated);
    setSelectedSubmission(updated);
    setTeacherReplyText('');
    setTeacherPrivateNote('');
    teacherRecorder.resetRecording();
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter((item) => {
    const matchesSearch =
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.studentClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.secretCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEmotion = selectedEmotionFilter === 'all' || item.emotion === selectedEmotionFilter;
    const matchesStatus = selectedStatusFilter === 'all' || item.status === selectedStatusFilter;
    const matchesUrgent = !onlyUrgent || item.isUrgent;

    return matchesSearch && matchesEmotion && matchesStatus && matchesUrgent;
  });

  // Metrics
  const totalCount = submissions.length;
  const urgentCount = submissions.filter((s) => s.isUrgent).length;
  const pendingCount = submissions.filter((s) => s.status === 'moi_tiep_nhan').length;
  const resolvedCount = submissions.filter((s) => s.status === 'da_ho_tro').length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border-2 sm:border-4 border-amber-200 text-center my-auto">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-100 text-amber-600 mx-auto mb-3 sm:mb-4 flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-800 font-heading mb-1">
            Khu Vực Quản Trị Thầy Cô
          </h2>
          <p className="text-xs text-slate-500 font-medium mb-5 sm:mb-6">
            Dành riêng cho Ban Giám Hiệu, Thầy Cô Chủ Nhiệm & Chuyên viên Tâm Lý Học Đường
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-center gap-1.5 font-bold">
              <AlertTriangle size={15} />
              <span>Tài khoản hoặc mật khẩu chưa chính xác!</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-3 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên tài khoản:
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Nhập tên tài khoản"
                className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-amber-500 text-sm font-bold bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mật khẩu:
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-amber-500 text-sm font-bold bg-slate-50/50"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock size={18} />
              <span>ĐĂNG NHẬP VÀO BẢNG ĐIỀU KHIỂN</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onExitDashboard}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
            >
              Quay lại Trang Chủ Học Sinh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs px-3 sm:px-6 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitDashboard}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Quay lại giao diện học sinh"
          >
            <ArrowLeft size={16} />
            <span>Trang Học Sinh</span>
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-800 font-heading flex items-center gap-2">
              <span>Bảng Quản Trị & Tư Vấn Thầy Cô</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Tiểu Học
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Dữ liệu tự động đồng bộ kết nối với Google Apps Script & Google Drive
            </p>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Lấy dữ liệu thực tế về Admin */}
          <button
            onClick={() => handleQuickSync(true)}
            disabled={isSyncingSheets}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Lấy ngay toàn bộ bài chia sẻ thực tế từ Google Sheet / Apps Script Webhook"
          >
            <RefreshCw size={14} className={isSyncingSheets ? 'animate-spin' : ''} />
            <span>{isSyncingSheets ? 'Đang lấy dữ liệu...' : 'Lấy Dữ Liệu Về Admin (Tự động 15s)'}</span>
          </button>

          <button
            onClick={() => exportSubmissionsToCsv(submissions)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border border-slate-200 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Xuất bảng tính Excel CSV chuẩn 8 cột tiếng Việt có dấu"
          >
            <Download size={14} />
            <span>Xuất CSV (8 Cột)</span>
          </button>

          <button
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 font-extrabold text-xs border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Thay đổi mật khẩu quản trị tài khoản"
          >
            <KeyRound size={14} className="text-amber-600" />
            <span>Đổi Mật Khẩu</span>
          </button>
        </div>
      </header>

      {/* Dải thông báo trạng thái đồng bộ Google Sheet thực tế */}
      <div className="bg-emerald-50/80 border-b border-emerald-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Hệ thống Admin đang tự động đồng bộ mỗi 15s tất cả dữ liệu thực từ Google Sheet / Drive: <strong className="text-emerald-950 font-extrabold">{lastSyncText}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleQuickSync(true)}
            disabled={isSyncingSheets}
            className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-bold cursor-pointer disabled:opacity-50"
          >
            {isSyncingSheets ? 'Đang cập nhật...' : 'Nhấn để làm mới ngay'}
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div
          className={`mx-4 mt-3 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in ${
            syncFeedback.isError
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-100 border border-emerald-300 text-emerald-950'
          }`}
        >
          {syncFeedback.isError ? (
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          )}
          <span>{syncFeedback.message}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tổng số chia sẻ
              </div>
              <div className="text-2xl md:text-3xl font-black text-slate-800 font-heading mt-0.5">
                {totalCount}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-sky-50 text-sky-600">
              <MessageSquare size={24} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-red-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Khẩn cấp (SOS)</span>
              </div>
              <div className="text-2xl md:text-3xl font-black text-red-600 font-heading mt-0.5">
                {urgentCount}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-red-50 text-red-600">
              <ShieldAlert size={24} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-amber-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Mới tiếp nhận
              </div>
              <div className="text-2xl md:text-3xl font-black text-amber-600 font-heading mt-0.5">
                {pendingCount}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                Đã hỗ trợ xong
              </div>
              <div className="text-2xl md:text-3xl font-black text-emerald-600 font-heading mt-0.5">
                {resolvedCount}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        {/* Thanh tìm kiếm & Bộ lọc */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên học sinh, lớp, mã số bí mật, từ khóa..."
              className="w-full pl-10 pr-3.5 py-2 text-xs font-semibold rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedEmotionFilter}
              onChange={(e) => setSelectedEmotionFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
            >
              <option value="all">Tất cả cảm xúc</option>
              <option value="vui_ve">Vui vẻ</option>
              <option value="buon_ba">Buồn bã</option>
              <option value="lo_lang">Lo lắng</option>
              <option value="tuc_gian">Tức giận</option>
              <option value="kho_noi">Khó nói</option>
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="moi_tiep_nhan">Mới tiếp nhận</option>
              <option value="dang_xem_xet">Đang xem xét</option>
              <option value="can_trao_doi">Cần trao đổi trực tiếp</option>
              <option value="da_ho_tro">Đã hỗ trợ</option>
            </select>

            <button
              onClick={() => setOnlyUrgent(!onlyUrgent)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                onlyUrgent
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
            >
              <ShieldAlert size={14} />
              <span>Chỉ xem Khẩn cấp (SOS)</span>
            </button>
          </div>
        </div>

        {/* Bảng danh sách chi tiết */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Mã / Học sinh</th>
                  <th className="px-3 py-3.5">Cảm xúc</th>
                  <th className="px-4 py-3.5">Nội dung chia sẻ</th>
                  <th className="px-3 py-3.5">Đính kèm</th>
                  <th className="px-3 py-3.5">Thời gian</th>
                  <th className="px-3 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-medium">
                      Không tìm thấy chia sẻ nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((item) => {
                    const EmotionIcon = EmotionIconMap[item.emotion] || EmotionIconMap.vui_ve;
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          item.isUrgent ? 'bg-red-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-bold text-pink-600">
                            {item.secretCode}
                          </div>
                          <div className="font-extrabold text-slate-800">
                            {item.studentName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Lớp: {item.studentClass}
                          </div>
                          {item.isUrgent && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                              <ShieldAlert size={11} />
                              <span>SOS</span>
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <EmotionIcon size={24} />
                            <span className="font-bold text-slate-700 capitalize">
                              {item.emotion.replace('_', ' ')}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="font-bold text-slate-800 truncate">
                            {item.title}
                          </div>
                          <div className="text-slate-500 line-clamp-2 leading-relaxed">
                            {item.content}
                          </div>
                          {item.feedbacks.length > 0 && (
                            <div className="mt-1 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle size={12} />
                              <span>Đã gửi {item.feedbacks.length} phản hồi</span>
                            </div>
                          )}
                        </td>

                        {/* Đính kèm Ghi âm / Tranh ảnh / Video */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {item.audioUrl && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleAudio(item.id, item.audioUrl!)}
                                  className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer ${
                                    playingAudioId === item.id
                                      ? 'bg-rose-500 text-white animate-pulse'
                                      : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                                  }`}
                                  title={isGoogleDriveUrl(item.audioUrl) ? "Ghi âm lưu trữ trên Google Drive" : "Ghi âm"}
                                >
                                  {playingAudioId === item.id ? <Pause size={12} /> : <Play size={12} />}
                                  <span>{item.audioDuration ? `${item.audioDuration}s` : 'Ghi âm'}</span>
                                </button>
                                {isGoogleDriveUrl(item.audioUrl) && (
                                  <a
                                    href={getDrivePreviewUrl(item.audioUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-slate-400 hover:text-sky-600 transition-colors"
                                    title="Mở file ghi âm trên Google Drive"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            )}

                            {item.imageUrl && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setZoomedImage(isGoogleDriveUrl(item.imageUrl!) ? getDriveThumbnailUrl(item.imageUrl!) : item.imageUrl!)}
                                  className="p-1 rounded-lg border border-slate-200 hover:border-purple-400 overflow-hidden w-9 h-9 shrink-0 relative group cursor-pointer"
                                  title="Bấm để phóng to tranh vẽ / ảnh chụp"
                                >
                                  <img 
                                    src={isGoogleDriveUrl(item.imageUrl) ? getDriveThumbnailUrl(item.imageUrl) : item.imageUrl} 
                                    alt="Art" 
                                    className="w-full h-full object-cover" 
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                                    <Eye size={12} />
                                  </div>
                                </button>
                                {isGoogleDriveUrl(item.imageUrl) && (
                                  <a
                                    href={getDrivePreviewUrl(item.imageUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-slate-400 hover:text-purple-600 transition-colors"
                                    title="Mở tranh ảnh trên Google Drive"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            )}

                            {item.videoUrl && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setActiveVideoModal(item.videoUrl!)}
                                  className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center gap-1 cursor-pointer"
                                  title="Xem video của học sinh"
                                >
                                  <Video size={13} />
                                  <span>Video {item.videoDuration ? `${item.videoDuration}s` : ''}</span>
                                </button>
                                {isGoogleDriveUrl(item.videoUrl) && (
                                  <a
                                    href={getDrivePreviewUrl(item.videoUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-slate-400 hover:text-purple-600 transition-colors"
                                    title="Mở video trên Google Drive"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            )}

                            {!item.audioUrl && !item.imageUrl && !item.videoUrl && (
                              <span className="text-slate-300">-</span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3.5 text-slate-400 whitespace-nowrap">
                          {item.timestamp}
                        </td>

                        {/* Phân loại trạng thái */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item, e.target.value as ProcessingStatus)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold outline-none border cursor-pointer ${
                              item.status === 'moi_tiep_nhan'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : item.status === 'dang_xem_xet'
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : item.status === 'can_trao_doi'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            <option value="moi_tiep_nhan">Mới tiếp nhận</option>
                            <option value="dang_xem_xet">Đang xem xét</option>
                            <option value="can_trao_doi">Cần gặp trực tiếp</option>
                            <option value="da_ho_tro">Đã hỗ trợ xong</option>
                          </select>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedSubmission(item)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center gap-1 ml-auto cursor-pointer shadow-xs"
                          >
                            <MessageSquare size={13} />
                            <span>Phản hồi & Thư</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Đổi Mật Khẩu Quản Trị */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-amber-200 animate-in zoom-in-95">
            <button
              onClick={() => {
                setIsChangePasswordModalOpen(false);
                setChangePasswordError(null);
                setChangePasswordSuccess(false);
              }}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 font-heading">
                  Đổi Mật Khẩu Quản Trị
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cập nhật mật khẩu bảo mật cho tài khoản <b>{storedUsername}</b>
                </p>
              </div>
            </div>

            {changePasswordError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-1.5 font-bold">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{changePasswordError}</span>
              </div>
            )}

            {changePasswordSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5 font-bold">
                <Check size={16} className="shrink-0 text-emerald-600" />
                <span>Đổi mật khẩu thành công! Mật khẩu mới đã được lưu.</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu hiện tại:
                </label>
                <input
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-amber-500 text-xs font-bold bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới:
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu mới (ít nhất 4 ký tự)"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-amber-500 text-xs font-bold bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận lại mật khẩu mới:
                </label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-amber-500 text-xs font-bold bg-slate-50/50"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound size={14} />
                  <span>Lưu Mật Khẩu Mới</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phản hồi & Gửi thư động viên cho học sinh */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border-2 sm:border-4 border-amber-200 my-auto max-h-[92dvh] overflow-y-auto">
            <button
              onClick={() => setSelectedSubmission(null)}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-pink-100 text-pink-700">
                {selectedSubmission.secretCode}
              </span>
              <span className="text-sm font-extrabold text-slate-800">
                {selectedSubmission.studentName} ({selectedSubmission.studentClass})
              </span>
              {selectedSubmission.isUrgent && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-600 text-white">
                  KHẨN CẤP SOS
                </span>
              )}
            </div>

            {/* Chi tiết nội dung học sinh đã gửi */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-5">
              <h4 className="font-bold text-slate-800 text-sm mb-1">
                {selectedSubmission.title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                "{selectedSubmission.content}"
              </p>

              {/* Nếu có ghi âm ban đầu */}
              {selectedSubmission.audioUrl && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-700">
                    <Volume2 size={16} />
                    <span>File ghi âm giọng nói ({selectedSubmission.audioDuration || 0}s)</span>
                    {isGoogleDriveUrl(selectedSubmission.audioUrl) && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-100 text-[10px] text-sky-800 font-semibold">
                        Google Drive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAudio(selectedSubmission.id, selectedSubmission.audioUrl!)}
                      className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {playingAudioId === selectedSubmission.id ? <Pause size={14} /> : <Play size={14} />}
                      <span>{playingAudioId === selectedSubmission.id ? 'Tạm dừng' : 'Nghe ghi âm'}</span>
                    </button>
                    {isGoogleDriveUrl(selectedSubmission.audioUrl) && (
                      <a
                        href={getDrivePreviewUrl(selectedSubmission.audioUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                        title="Mở file ghi âm trên Google Drive"
                      >
                        <ExternalLink size={12} />
                        <span>Mở Drive</span>
                      </a>
                    )}
                  </div>
                  {playingAudioId === selectedSubmission.id && (
                    <div className="w-full mt-2 pt-2 border-t border-sky-100 animate-in fade-in">
                      <audio
                        src={getPlayableAudioUrl(selectedSubmission.audioUrl!)}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-8 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Nếu bé có gửi ghi âm nhắn lại (từ studentReplyAudioUrl hoặc từ mảng feedbacks) */}
              {(() => {
                const replyAudio = selectedSubmission.studentReplyAudioUrl || selectedSubmission.feedbacks?.find((f) => f.senderRole === 'student' && f.audioUrl)?.audioUrl;
                const replyDuration = selectedSubmission.studentReplyDuration || selectedSubmission.feedbacks?.find((f) => f.senderRole === 'student' && f.audioUrl)?.audioDuration || 0;
                if (!replyAudio) return null;
                return (
                  <div className="p-3 bg-pink-50 rounded-xl border border-pink-200 flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-pink-700">
                      <Volume2 size={16} />
                      <span>Giọng nói bé nhắn lại ({replyDuration}s)</span>
                      {isGoogleDriveUrl(replyAudio) && (
                        <span className="px-2 py-0.5 rounded-md bg-pink-100 text-[10px] text-pink-800 font-semibold">
                          Google Drive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAudio('reply-' + selectedSubmission.id, replyAudio)}
                        className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {playingAudioId === 'reply-' + selectedSubmission.id ? <Pause size={14} /> : <Play size={14} />}
                        <span>{playingAudioId === 'reply-' + selectedSubmission.id ? 'Tạm dừng' : 'Nghe giọng bé'}</span>
                      </button>
                      {isGoogleDriveUrl(replyAudio) && (
                        <a
                          href={getDrivePreviewUrl(replyAudio)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-800 font-bold text-xs flex items-center gap-1"
                          title="Mở file trên Google Drive"
                        >
                          <ExternalLink size={12} />
                          <span>Mở Drive</span>
                        </a>
                      )}
                    </div>
                    {playingAudioId === 'reply-' + selectedSubmission.id && (
                      <div className="w-full mt-2 pt-2 border-t border-pink-200 animate-in fade-in">
                        <audio
                          src={getPlayableAudioUrl(replyAudio)}
                          controls
                          autoPlay
                          playsInline
                          className="w-full h-8 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Nếu có tranh ảnh */}
              {selectedSubmission.imageUrl && (
                <div className="mt-2">
                  <div className="text-[11px] font-bold text-purple-700 mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <ImageIcon size={14} />
                      <span>Tranh vẽ / Ảnh chụp đính kèm:</span>
                    </div>
                    {isGoogleDriveUrl(selectedSubmission.imageUrl) && (
                      <a
                        href={getDrivePreviewUrl(selectedSubmission.imageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 underline"
                      >
                        <ExternalLink size={12} />
                        <span>Xem ảnh gốc trên Google Drive</span>
                      </a>
                    )}
                  </div>
                  <img
                    src={isGoogleDriveUrl(selectedSubmission.imageUrl) ? getDriveThumbnailUrl(selectedSubmission.imageUrl) : selectedSubmission.imageUrl}
                    alt="Art"
                    onClick={() => setZoomedImage(isGoogleDriveUrl(selectedSubmission.imageUrl!) ? getDriveThumbnailUrl(selectedSubmission.imageUrl!) : selectedSubmission.imageUrl!)}
                    className="max-h-48 rounded-xl border border-slate-200 object-contain bg-white cursor-pointer hover:opacity-90"
                  />
                </div>
              )}

              {/* Nếu có video */}
              {selectedSubmission.videoUrl && (
                <div className="mt-2">
                  <div className="text-[11px] font-bold text-purple-700 mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Video size={14} />
                      <span>Video clip học sinh ({selectedSubmission.videoDuration || 0}s):</span>
                    </div>
                    {isGoogleDriveUrl(selectedSubmission.videoUrl) && (
                      <a
                        href={getDrivePreviewUrl(selectedSubmission.videoUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 underline"
                      >
                        <ExternalLink size={12} />
                        <span>Mở trực tiếp trên Google Drive</span>
                      </a>
                    )}
                  </div>
                  {isGoogleDriveUrl(selectedSubmission.videoUrl) ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video max-h-60">
                      <iframe
                        src={getDrivePreviewUrl(selectedSubmission.videoUrl)}
                        className="w-full h-full border-0"
                        allow="autoplay"
                        title="Video Google Drive"
                      />
                    </div>
                  ) : (
                    <video
                      src={selectedSubmission.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-48 rounded-xl border border-slate-200 bg-black"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Form Thầy Cô gửi phản hồi tới bé */}
            <form onSubmit={handleAddFeedback} className="space-y-4">
              <h5 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-amber-500" />
                <span>Viết phản hồi gửi học sinh (Bé sẽ thấy khi tra cứu mã):</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Danh xưng Thầy/Cô:
                  </label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tặng sticker khích lệ:
                  </label>
                  <select
                    value={selectedSticker}
                    onChange={(e) => setSelectedSticker(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                  >
                    {stickers.map((stk) => (
                      <option key={stk} value={stk}>
                        {stk}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* KHU VỰC THẦY CÔ THU ÂM LỜI DẶN DÒ CHO BÉ LỚP 1, 2 */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border-2 border-amber-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                    <Mic size={15} className="text-amber-600" />
                    <span>Ghi âm giọng nói Thầy Cô (Dành cho bé lớp 1, 2 chưa thạo đọc chữ):</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                    Giọng nói ấm áp
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  {!teacherRecorder.isRecording && !teacherRecorder.audioUrl && (
                    <button
                      type="button"
                      onClick={teacherRecorder.startRecording}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Mic size={15} />
                      <span>Bấm để thu âm lời dặn dò cho bé</span>
                    </button>
                  )}

                  {teacherRecorder.isRecording && (
                    <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-rose-100 border border-rose-300">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                        <span>Đang ghi âm lời Thầy Cô... ({teacherRecorder.recordingTime}s)</span>
                      </div>
                      <button
                        type="button"
                        onClick={teacherRecorder.stopRecording}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Square size={13} />
                        <span>Dừng thu</span>
                      </button>
                    </div>
                  )}

                  {teacherRecorder.audioUrl && !teacherRecorder.isRecording && (
                    <div className="w-full p-2.5 rounded-xl bg-white border border-amber-300 flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Volume2 size={15} className="text-amber-600" />
                        <span>Đã thu lời dặn dò ({teacherRecorder.audioDuration || 0}s)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleToggleTeacherPreview}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          {isPlayingTeacherPreview ? <Pause size={13} /> : <Play size={13} />}
                          <span>{isPlayingTeacherPreview ? 'Tạm dừng' : 'Nghe lại'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={teacherRecorder.resetRecording}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Thu âm lại"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {teacherRecorder.error && (
                  <p className="text-xs text-rose-600 font-bold">{teacherRecorder.error}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lời nhắn gửi ân cần tới học sinh (dạng chữ):
                </label>
                <textarea
                  rows={3}
                  value={teacherReplyText}
                  onChange={(e) => setTeacherReplyText(e.target.value)}
                  placeholder="Ví dụ: Thầy cô đã nghe tâm sự của em rồi. Em hãy yên tâm nhé, ngày mai thầy trò mình cùng..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50/50 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú nội bộ dành cho Thầy Cô (Học sinh không nhìn thấy):
                </label>
                <input
                  type="text"
                  value={teacherPrivateNote}
                  onChange={(e) => setTeacherPrivateNote(e.target.value)}
                  placeholder="Ví dụ: Đã báo cô chủ nhiệm, cần chú ý bạn A vào giờ ra chơi..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold bg-amber-50/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={!teacherReplyText.trim() && !teacherRecorder.audioUrl}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>Gửi Phản Hồi Tới Học Sinh</span>
                </button>
              </div>
            </form>

            {/* Lịch sử phản hồi và trao đổi qua lại 2 chiều */}
            {selectedSubmission.feedbacks && selectedSubmission.feedbacks.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-amber-600" />
                    <span>Hộp thư trao đổi 2 chiều ({selectedSubmission.feedbacks.length} tin nhắn):</span>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    Phản hồi qua lại trực tiếp
                  </span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {selectedSubmission.feedbacks.map((fb) => {
                    const isStudent = fb.senderRole === 'student';
                    return (
                      <div
                        key={fb.id}
                        className={`p-3 rounded-2xl border text-xs shadow-xs space-y-1.5 ${
                          isStudent
                            ? 'bg-sky-50/90 border-sky-300 text-sky-950 ml-3'
                            : 'bg-amber-50/90 border-amber-300 text-amber-950 mr-3'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] text-white shadow-xs ${
                                isStudent ? 'bg-sky-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                              }`}
                            >
                              {isStudent ? '🎒' : '👩‍🏫'}
                            </span>
                            <span className="font-extrabold text-xs">
                              {isStudent
                                ? `Bé nhắn lại: ${fb.senderName || selectedSubmission.studentName}`
                                : (fb.senderName || fb.teacherName || 'Cô Thu Hà')}
                            </span>
                            {isStudent && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                                Học sinh
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">{fb.timestamp}</span>
                        </div>

                        <p className="text-slate-800 leading-relaxed font-medium pl-8">{fb.comment}</p>

                        {fb.audioUrl && (
                          <div className="pl-8 pt-1 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleAudio('fb-' + fb.id, fb.audioUrl!)}
                              className={`px-3 py-1.5 rounded-xl text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                isStudent
                                  ? 'bg-sky-600 hover:bg-sky-700'
                                  : 'bg-amber-500 hover:bg-amber-600'
                              }`}
                            >
                              {playingAudioId === 'fb-' + fb.id ? <Pause size={13} /> : <Play size={13} />}
                              <span>
                                {playingAudioId === 'fb-' + fb.id
                                  ? 'Tạm dừng'
                                  : isStudent
                                  ? `Nghe giọng bé nhắn (${fb.audioDuration || 0}s)`
                                  : `Nghe lời dặn dò (${fb.audioDuration || 0}s)`}
                              </span>
                            </button>
                            {isGoogleDriveUrl(fb.audioUrl) && (
                              <a
                                href={getDrivePreviewUrl(fb.audioUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1"
                                title="Mở file trên Google Drive"
                              >
                                <ExternalLink size={12} />
                                <span>Drive</span>
                              </a>
                            )}
                            {playingAudioId === 'fb-' + fb.id && (
                              <div className="w-full pt-1 animate-in fade-in">
                                <audio
                                  src={getPlayableAudioUrl(fb.audioUrl)}
                                  controls
                                  autoPlay
                                  playsInline
                                  className="w-full h-8 rounded-lg max-w-sm"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {fb.sticker && (
                          <div className="pl-8 pt-0.5">
                            <span className="inline-block text-[11px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-xs">
                              {fb.sticker}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Zoom ảnh */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={zoomedImage} alt="Enlarged Art" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Play Video */}
      {activeVideoModal && (
        <div
          onClick={() => setActiveVideoModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl w-full bg-black rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {isGoogleDriveUrl(activeVideoModal) ? (
              <div className="flex flex-col items-center">
                <div className="w-full aspect-video bg-black">
                  <iframe
                    src={getDrivePreviewUrl(activeVideoModal)}
                    className="w-full h-full border-0"
                    allow="autoplay"
                    title="Video Google Drive Preview"
                  />
                </div>
                <div className="p-3 bg-slate-900 w-full flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Video lưu trữ trên Google Drive</span>
                  <a
                    href={getDrivePreviewUrl(activeVideoModal)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} />
                    <span>Mở tab mới trên Google Drive</span>
                  </a>
                </div>
              </div>
            ) : (
              <video src={activeVideoModal} controls playsInline autoPlay className="w-full max-h-[80vh] object-contain" />
            )}
            <button
              onClick={() => setActiveVideoModal(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full cursor-pointer z-10"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Cài đặt & Quản lý đồng bộ Google Sheets / Drive */}
      <GoogleSheetSyncModal
        isOpen={isGoogleSheetModalOpen}
        onClose={() => setIsGoogleSheetModalOpen(false)}
        submissions={submissions}
        onSubmissionsUpdated={onSubmissionsUpdated}
      />
    </div>
  );
};
