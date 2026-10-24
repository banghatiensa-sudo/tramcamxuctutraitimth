import React, { useState, useEffect } from 'react';
import { Mail, Send, Sparkles, X, HeartHandshake } from 'lucide-react';
import { EmotionType } from '../../types/emotion';
import { EmotionIconMap } from '../chibi/ChibiEmotions';

interface MessageModalProps {
  initialEmotion: EmotionType;
  isOpen: boolean;
  isJustListenMode?: boolean; // Khi bấm vào "Mình chỉ muốn được lắng nghe >"
  onClose: () => void;
  onSubmit: (data: {
    studentName: string;
    studentClass: string;
    emotion: EmotionType;
    title: string;
    content: string;
    isUrgent: boolean;
  }) => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  initialEmotion,
  isOpen,
  isJustListenMode = false,
  onClose,
  onSubmit,
}) => {
  const [emotion, setEmotion] = useState<EmotionType>(initialEmotion);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [receiver, setReceiver] = useState('Thầy Cô Tư Vấn Học Đường');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setEmotion(initialEmotion);
  }, [initialEmotion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg('Em hãy viết một vài dòng nhắn gửi nhé!');
      return;
    }

    onSubmit({
      studentName: isAnonymous ? 'Ẩn danh' : (studentName.trim() || 'Học sinh thân yêu'),
      studentClass: isAnonymous ? 'Giấu lớp' : (studentClass.trim() || 'Khối tiểu học'),
      emotion,
      title: isJustListenMode ? 'Em chỉ muốn được lắng nghe thôi ạ' : `Lời nhắn gửi tới: ${receiver}`,
      content: message.trim(),
      isUrgent: false,
    });

    setMessage('');
    setErrorMsg(null);
    onClose();
  };

  // Cho phép đóng bằng phím Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border-2 sm:border-4 border-emerald-100 my-auto max-h-[92dvh] overflow-y-auto">
        <button
          onClick={onClose}
          type="button"
          aria-label="Thoát khỏi giao diện"
          title="Thoát khỏi giao diện"
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer border border-slate-300 shadow-xs z-10 hover:scale-105 active:scale-95"
        >
          <X size={16} />
          <span>Thoát</span>
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3 mb-4 pr-16">
          <div className="p-2.5 sm:p-3 bg-emerald-100 text-emerald-600 rounded-2xl shrink-0">
            {isJustListenMode ? <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mail className="w-5 h-5 sm:w-6 sm:h-6" />}
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 font-heading">
              {isJustListenMode ? 'Mình chỉ muốn được lắng nghe' : 'Em muốn gửi lời nhắn'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              {isJustListenMode
                ? 'Em chỉ cần một nơi giãi bày nỗi lòng, không cần ai phán xét hay đánh giá.'
                : 'Viết những điều em muốn nói với thầy cô, bạn bè hay trường học.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl">
            {errorMsg}
          </div>
        )}

        {/* Khung lời nhắn */}
        <div className="mb-4 p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center gap-3">
          <div className="shrink-0">
            <EmotionIcon size={44} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-emerald-800 mb-1">
              Gửi kèm cùng cảm xúc:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(['vui_ve', 'buon_ba', 'lo_lang', 'tuc_gian', 'kho_noi'] as EmotionType[]).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setEmotion(type)}
                  className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                    emotion === type
                      ? 'bg-emerald-600 text-white shadow-xs scale-105'
                      : 'bg-white text-slate-600 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
                >
                  {type === 'vui_ve' && 'Vui vẻ'}
                  {type === 'buon_ba' && 'Buồn bã'}
                  {type === 'lo_lang' && 'Lo lắng'}
                  {type === 'tuc_gian' && 'Tức giận'}
                  {type === 'kho_noi' && 'Khó nói'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!isJustListenMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Em muốn gửi lời nhắn này đến ai?
              </label>
              <select
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50/50"
              >
                <option value="Thầy Cô Tư Vấn Tâm Lý Học Đường">Thầy Cô Tư Vấn Tâm Lý Học Đường</option>
                <option value="Thầy/Cô Giáo Chủ Nhiệm Lớp">Thầy/Cô Giáo Chủ Nhiệm Lớp</option>
                <option value="Thầy Tổng Phụ Trách Đội">Thầy Tổng Phụ Trách Đội</option>
                <option value="Ban Giám Hiệu Nhà Trường">Ban Giám Hiệu Nhà Trường</option>
                <option value="Gửi tới một bạn cùng lớp (nhờ thầy cô chuyển lời)">Gửi tới một bạn cùng lớp (nhờ thầy cô chuyển lời)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isJustListenMode ? 'Điều em muốn trút bầu tâm sự hôm nay:' : 'Nội dung lời nhắn của em:'}
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isJustListenMode
                  ? 'Viết ra hết những mệt mỏi hay điều em đang giữ kín trong lòng...'
                  : 'Em hãy viết những điều em muốn gửi gắm nhé...'
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50/50 resize-none leading-relaxed"
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
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
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
                placeholder={isAnonymous ? 'Giấu lớp' : 'Ví dụ: 5A'}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-400"
            />
            <span className="text-xs font-bold text-slate-600">
              Gửi thư ẩn danh (Không để lộ tên của em)
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>GỬI LỜI NHẮN ĐI</span>
            </button>

            <button
              type="button"
              onClick={onClose}
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
