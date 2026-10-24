import React, { useState, useEffect } from 'react';
import { BookOpen, Send, Sparkles, X, Heart } from 'lucide-react';
import { EmotionType } from '../../types/emotion';
import { EmotionIconMap } from '../chibi/ChibiEmotions';

interface ShareEmotionModalProps {
  initialEmotion: EmotionType;
  isOpen: boolean;
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

export const ShareEmotionModal: React.FC<ShareEmotionModalProps> = ({
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
  const [content, setContent] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setEmotion(initialEmotion);
  }, [initialEmotion]);

  const emotionPrompts: Record<EmotionType, string> = {
    vui_ve: 'Hôm nay điều gì đã làm em vui vẻ và cười nhiều nhất thế?',
    buon_ba: 'Có chuyện gì làm em buồn và muốn được chia sẻ không? Thầy cô lắng nghe em...',
    lo_lang: 'Điều gì đang làm em cảm thấy bất an hay lo nghĩ nhiều thế?',
    tuc_gian: 'Chuyện gì làm em tức giận vậy? Viết ra đây để lòng nhẹ bớt nhé!',
    kho_noi: 'Nếu cảm xúc khó gọi tên, em cứ viết tự nhiên những điều em nghĩ tới nhé!',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg('Em hãy viết một vài câu chia sẻ cảm xúc của mình nhé!');
      return;
    }

    onSubmit({
      studentName: isAnonymous ? 'Ẩn danh' : (studentName.trim() || 'Học sinh thân yêu'),
      studentClass: isAnonymous ? 'Giấu lớp' : (studentClass.trim() || 'Khối tiểu học'),
      emotion,
      title: title.trim() || `Chia sẻ cảm xúc: ${emotion}`,
      content: content.trim(),
      isUrgent: false,
    });

    setTitle('');
    setContent('');
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
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border-2 sm:border-4 border-pink-100 my-auto max-h-[92dvh] overflow-y-auto">
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
          <div className="p-2.5 sm:p-3 bg-pink-100 text-pink-600 rounded-2xl shrink-0">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 font-heading">
              Em muốn chia sẻ cảm xúc
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Ghi lại cảm xúc và những điều đang suy nghĩ trong lòng em
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl">
            {errorMsg}
          </div>
        )}

        {/* Khung chọn cảm xúc */}
        <div className="mb-4 p-3.5 bg-pink-50/60 rounded-2xl border border-pink-100 flex items-center gap-3">
          <div className="shrink-0">
            <EmotionIcon size={44} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-pink-700 mb-1">
              Em đang cảm thấy:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(['vui_ve', 'buon_ba', 'lo_lang', 'tuc_gian', 'kho_noi'] as EmotionType[]).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setEmotion(type)}
                  className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                    emotion === type
                      ? 'bg-pink-500 text-white shadow-xs scale-105'
                      : 'bg-white text-slate-600 hover:bg-pink-100 border border-pink-200/60'
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
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Hôm nay chuyện gì đã xảy ra vậy em?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Giờ ra chơi hôm nay..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Nội dung em muốn tâm sự:</span>
              <span className="text-[11px] text-pink-600 font-semibold italic">
                {emotionPrompts[emotion]}
              </span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Em cứ tự nhiên viết tất cả những gì em nghĩ nhé, thầy cô luôn ở đây để lắng nghe em..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-slate-50/50 resize-none leading-relaxed"
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
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
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
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-pink-500 rounded focus:ring-pink-400"
            />
            <span className="text-xs font-bold text-slate-600">
              Gửi ẩn danh (Giấu tên và lớp để em an tâm nhất)
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold rounded-2xl shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>GỬI CHIA SẺ ĐẾN TRẠM CẢM XÚC</span>
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
