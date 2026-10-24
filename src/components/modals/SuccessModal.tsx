import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles, CheckCircle2, Copy, Check, ArrowRight } from 'lucide-react';
import { playChimeSound } from '../../utils/soundEffects';

interface SuccessModalProps {
  isOpen: boolean;
  secretCode: string;
  isUrgent?: boolean;
  submissionType?: string;
  onClose: () => void;
  onOpenFeedback: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  secretCode,
  isUrgent = false,
  submissionType,
  onClose,
  onOpenFeedback,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      playChimeSound();

      // Pháo hoa Confetti rực rỡ vui tươi
      const end = Date.now() + 1500;
      const colors = ['#f43f5e', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [isOpen]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(secretCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  // Mô tả thông điệp theo thể loại gửi
  const getSuccessSubtitle = () => {
    if (isUrgent) {
      return 'Thầy cô đã nhận được tín hiệu khẩn cấp của em và sẽ có mặt ngay để che chở cho em. Em hãy yên tâm nhé!';
    }
    if (submissionType === 'video') {
      return 'Thầy cô đã nhận được đoạn video clip tâm sự của em! Thầy cô sẽ xem với tất cả sự nâng niu và phản hồi cho em sớm nhất.';
    }
    if (submissionType === 'photo' || submissionType === 'hinh_anh') {
      return 'Thầy cô đã nhận được bức ảnh / tranh vẽ cảm xúc tuyệt đẹp của em! Cảm ơn em vì đã chia sẻ thế giới sắc màu của mình.';
    }
    if (submissionType === 'audio' || submissionType === 'ghi_am') {
      return 'Thầy cô đã nhận được đoạn ghi âm tâm sự của em! Tiếng nói và cảm xúc của em luôn được thầy cô trân trọng và lắng nghe.';
    }
    return 'Trái tim của em thật quý giá. Thầy cô luôn ở bên cạnh, lắng nghe và đồng hành cùng em trong từng cảm xúc.';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border-2 sm:border-4 border-pink-200 text-center animate-in zoom-in-95 my-auto max-h-[92dvh] overflow-y-auto">
        {/* Huy hiệu thông báo trạng thái */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black mb-3 border border-emerald-300">
          <CheckCircle2 size={15} className="text-emerald-600" />
          <span>EM ĐÃ GỬI THÀNH CÔNG CHO THẦY CÔ!</span>
        </div>

        {/* Biểu tượng trái tim chúc mừng */}
        <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-tr from-pink-400 via-rose-400 to-amber-300 p-1 flex items-center justify-center shadow-lg shadow-pink-200 animate-gentle-bounce">
          <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
            <Heart className="w-10 h-10 text-rose-500 fill-rose-500 animate-pulse" />
          </div>
        </div>

        <h3 className="text-2xl md:text-3xl font-black text-slate-800 font-heading mb-2">
          Cảm ơn em đã gửi chia sẻ!
        </h3>

        <p className="text-slate-600 text-xs md:text-sm leading-relaxed mb-5 font-medium">
          {getSuccessSubtitle()}
        </p>

        {/* Mã tra cứu bí mật */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/80 border-2 border-dashed border-amber-300 flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
            <Sparkles size={14} className="text-amber-500" />
            <span>Mã số bí mật để xem phản hồi của thầy cô:</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-black font-mono tracking-widest text-pink-600">
              {secretCode}
            </span>
            <button
              onClick={handleCopyCode}
              title="Sao chép mã"
              className="p-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-700 border border-amber-200 shadow-xs transition-colors cursor-pointer"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
          </div>

          <p className="text-[11px] text-amber-700/80 mt-1 font-medium">
            (Em hãy lưu lại mã này hoặc bấm "Xem phản hồi" để đọc thư thầy cô trả lời nhé)
          </p>
        </div>

        {/* Các nút hành động */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenFeedback();
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Vào Xem Phản Hồi Ngay</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={onClose}
            className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  );
};
