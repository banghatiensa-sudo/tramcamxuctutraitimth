import React, { useState } from 'react';
import { Heart, Sparkles, X } from 'lucide-react';

interface SignpostStep {
  id: string;
  title: string;
  colorBg: string;
  textColor: string;
  borderColor: string;
  desc: string;
  quote: string;
  direction: 'right' | 'left';
}

const steps: SignpostStep[] = [
  {
    id: 'lang-nghe',
    title: 'Lắng nghe',
    colorBg: 'from-pink-400 to-rose-400',
    textColor: 'text-white',
    borderColor: 'border-rose-500',
    desc: 'Thầy cô luôn sẵn sàng lắng nghe mọi câu chuyện của em, dù là niềm vui nho nhỏ hay nỗi buồn to lớn.',
    quote: 'Mọi lời em nói đều được trân trọng!',
    direction: 'right',
  },
  {
    id: 'thau-hieu',
    title: 'Thấu hiểu',
    colorBg: 'from-amber-400 to-orange-400',
    textColor: 'text-white',
    borderColor: 'border-amber-600',
    desc: 'Ở đây không có sự phán xét hay trách phạt. Thầy cô đặt mình vào vị trí của em để hiểu cảm xúc của em.',
    quote: 'Cảm xúc của em hoàn toàn tự nhiên và đáng được nâng niu.',
    direction: 'left',
  },
  {
    id: 'yeu-thuong',
    title: 'Yêu thương',
    colorBg: 'from-emerald-400 to-teal-500',
    textColor: 'text-white',
    borderColor: 'border-teal-600',
    desc: 'Trạm cảm xúc được xây dựng bằng tình thương chân thành, nơi mỗi học sinh đều là một mầm xanh quý báu.',
    quote: 'Em luôn được bảo bọc và yêu mến mỗi ngày tới trường.',
    direction: 'right',
  },
  {
    id: 'dong-hanh',
    title: 'Đồng hành',
    colorBg: 'from-sky-400 to-blue-500',
    textColor: 'text-white',
    borderColor: 'border-blue-600',
    desc: 'Bất cứ khi nào em cần, thầy cô và nhà trường luôn đi bên cạnh để hướng dẫn, giúp em tháo gỡ khó khăn.',
    quote: 'Em không phải đối mặt với thử thách một mình!',
    direction: 'left',
  },
];

export const WoodenSignpost: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<SignpostStep | null>(null);

  return (
    <div className="relative flex flex-col items-center select-none group">
      {/* Cột gỗ chính */}
      <div className="absolute top-2 bottom-0 w-4 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 rounded-sm shadow-md" />

      {/* Chóp cọc gỗ nhọn */}
      <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[14px] border-b-amber-800 -mb-1 z-10" />

      {/* 4 thanh gỗ chỉ dẫn */}
      <div className="flex flex-col gap-2.5 z-20 py-2 w-36">
        {steps.map((step) => {
          const isRight = step.direction === 'right';
          return (
            <button
              key={step.id}
              onClick={() => setSelectedStep(step)}
              title={`Bấm để xem ý nghĩa "${step.title}"`}
              className={`relative py-1.5 px-3 text-center font-bold text-sm tracking-wide rounded-md shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-r ${step.colorBg} ${step.textColor} border-b-2 ${step.borderColor}`}
              style={{
                clipPath: isRight
                  ? 'polygon(0% 0%, 88% 0%, 100% 50%, 88% 100%, 0% 100%)'
                  : 'polygon(12% 0%, 100% 0%, 100% 100%, 12% 100%, 0% 50%)',
              }}
            >
              <div className="flex items-center justify-center gap-1 drop-shadow-sm">
                <span>{step.title}</span>
              </div>

              {/* Đinh ốc giả lập phong cách mộc */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-950/40 ${
                  isRight ? 'left-1' : 'right-1'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Hoa cỏ xinh xắn ở chân cọc gỗ */}
      <div className="relative -mt-2 z-20 flex items-center justify-center">
        <span className="text-xl">🌸</span>
        <span className="text-lg -ml-1">🌿</span>
        <span className="text-xl -ml-1">🌼</span>
      </div>

      {/* Modal hiển thị chi tiết khi bé click vào 1 bậc chỉ dẫn */}
      {selectedStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border-4 border-amber-200 text-center animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedStep(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="inline-flex p-3 rounded-2xl bg-amber-50 text-amber-500 mb-3">
              <Sparkles className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-slate-800 mb-2 font-heading">
              {selectedStep.title}
            </h3>

            <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100 text-amber-900 text-sm font-semibold mb-3 italic">
              "{selectedStep.quote}"
            </div>

            <p className="text-slate-600 text-sm leading-relaxed mb-5">
              {selectedStep.desc}
            </p>

            <button
              onClick={() => setSelectedStep(null)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all"
            >
              Em đã hiểu rồi ạ!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
