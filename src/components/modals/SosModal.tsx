import React, { useState } from 'react';
import { PhoneCall, ShieldAlert, Heart, Send, Sparkles, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { EmotionType } from '../../types/emotion';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    studentName: string;
    studentClass: string;
    emotion: EmotionType;
    title: string;
    content: string;
    isUrgent: boolean;
    sosIssue: string;
  }) => void;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [issueType, setIssueType] = useState('Bị bạn trêu chọc / Bắt nạt');
  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const issueOptions = [
    'Bị bạn trêu chọc / Bắt nạt',
    'Cảm thấy sợ hãi / Thiếu an toàn',
    'Bị ai đó đe dọa / Ép buộc',
    'Chuyện rất buồn ở nhà hoặc trên lớp',
    'Em muốn gặp riêng thầy cô ngay lập tức',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setErrorMsg('Em hãy viết một vài thông tin để thầy cô biết và hỗ trợ em kịp thời nhé!');
      return;
    }

    onSubmit({
      studentName: isAnonymous ? 'Ẩn danh cần giúp' : (studentName.trim() || 'Học sinh cần trợ giúp'),
      studentClass: isAnonymous ? 'Giấu lớp' : (studentClass.trim() || 'Tiểu học'),
      emotion: 'tuc_gian',
      title: `[SOS KHẨN CẤP] ${issueType}`,
      content: `${details.trim()}${location ? ` (Nơi xảy ra / Nơi em đang ở: ${location.trim()})` : ''}`,
      isUrgent: true,
      sosIssue: issueType,
    });

    setDetails('');
    setLocation('');
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border-2 sm:border-4 border-amber-300 my-auto max-h-[92dvh] overflow-y-auto">
        {/* Nút thoát góc trên bên phải to rõ ràng, nổi bật */}
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

        {/* Header nổi bật */}
        <div className="flex items-center gap-2.5 sm:gap-3 mb-4 pr-16">
          <div className="p-2.5 sm:p-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl shadow-md animate-pulse shrink-0">
            <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mb-0.5">
              <span>Hỗ Trợ Khẩn Cấp Học Đường</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 font-heading">
              Em cần thầy cô giúp đỡ
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Đừng lo sợ! Thầy cô và nhà trường luôn bảo vệ và ở bên em.
            </p>
          </div>
        </div>

        {/* Khung đường dây nóng quốc gia 111 & trường học */}
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 text-white shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">
                Tổng Đài Quốc Gia Bảo Vệ Trẻ Em (Miễn Phí 24/7)
              </div>
              <div className="text-3xl font-black font-mono tracking-wider flex items-center gap-2 mt-0.5 drop-shadow-sm">
                <PhoneCall className="w-7 h-7 animate-bounce" />
                <span>111</span>
              </div>
              <p className="text-[11px] text-white/90 font-medium mt-1 leading-snug">
                Bất kỳ lúc nào cảm thấy nguy hiểm, bị bạo lực hay xâm phạm, em có thể gọi ngay 111 từ mọi điện thoại hoàn toàn miễn phí cước gọi!
              </p>
            </div>
            <a
              href="tel:111"
              className="shrink-0 px-3 py-2 bg-white text-rose-600 rounded-xl font-extrabold text-xs shadow-md hover:bg-amber-50 transition-colors flex items-center gap-1.5"
            >
              <span>Gọi 111</span>
            </a>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] font-bold">
            <span>Đường dây tư vấn tâm lý trường học: 1900-8198</span>
            <span>Cấp cứu y tế: 115</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form gửi tín hiệu khẩn cấp tới thầy cô */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Khó khăn em đang gặp phải là gì?
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {issueOptions.map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                    issueType === opt
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="sos-issue"
                    checked={issueType === opt}
                    onChange={() => setIssueType(opt)}
                    className="w-3.5 h-3.5 text-amber-500 focus:ring-amber-400"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Vị trí hoặc nơi xảy ra (nếu có):
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ví dụ: Cổng sau trường / Phòng học 3A1 / Sân tập thể dục..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chi tiết điều em muốn thầy cô giúp đỡ:
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Em hãy kể rõ điều gì đang xảy ra... Thầy cô sẽ đọc ngay và giữ an toàn cho em!"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50/50 resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên của em (Thầy cô giữ kín tuyệt đối):
              </label>
              <input
                type="text"
                disabled={isAnonymous}
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={isAnonymous ? 'Đang ẩn danh' : 'Nhập tên của em'}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
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
                placeholder={isAnonymous ? 'Giấu lớp' : 'Ví dụ: 4C'}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
            />
            <span className="text-xs font-bold text-slate-600">
              Gửi ẩn danh an toàn nếu em e ngại
            </span>
          </label>

          {/* Các nút hành động: Gửi yêu cầu & Thoát ra ngoài */}
          <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>GỬI YÊU CẦU TRỢ GIÚP</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-300 hover:text-slate-900"
            >
              <X size={16} />
              <span>Thoát ra ngoài</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
