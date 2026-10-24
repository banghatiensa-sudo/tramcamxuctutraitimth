import React from 'react';
import { Menu, X, Mail, Heart, Home } from 'lucide-react';

interface SidebarProps {
  onOpenFeedback: () => void;
  onGoHome?: () => void;
  isTeacherMode?: boolean;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenFeedback,
  onGoHome,
  isTeacherMode = false,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}) => {
  return (
    <>
      {/* ============================================================== */}
      {/* 1. TRÊN MÁY TÍNH (DESKTOP): CỘT SIDEBAR CỐ ĐỊNH BÊN TRÁI     */}
      {/* Giữ nguyên 100% bố cục và 3 banner dọc trên máy tính           */}
      {/* ============================================================== */}
      <aside className="hidden md:flex md:w-80 lg:w-[330px] shrink-0 md:h-screen md:sticky md:top-0 bg-white/95 backdrop-blur-md border-r border-pink-100 p-3.5 md:p-4 flex-col justify-between gap-4 shadow-sm select-none z-30 md:overflow-y-auto">
        <div className="flex flex-col gap-3">
          {/* BANNER 1: TRẠM CẢM XÚC TỪ TRÁI TIM & NÚT TRANG CHỦ (Theo ảnh 11_44a0e5e7.png) */}
          <div
            onClick={onGoHome}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onGoHome?.();
              }
            }}
            title="Trạm Cảm Xúc - Về Trang chủ"
            className="w-full shrink-0 group relative cursor-pointer overflow-hidden rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] border border-sky-100 bg-white"
          >
            <img
              src="/assets/aistudio/11_44a0e5e7.png"
              alt="Trạm Cảm Xúc Từ Trái Tim - Trang chủ"
              className="w-full h-auto object-contain block select-none pointer-events-none"
            />
            <div className="absolute inset-0 rounded-3xl pointer-events-none ring-2 ring-transparent group-focus-visible:ring-sky-400 group-hover:bg-sky-400/5 transition-colors" />
          </div>

          {/* BANNER 2: HÒM THƯ TÂM TÌNH - THAM GIA NHẬN PHẢN HỒI TỪ THẦY CÔ (Theo ảnh 22_6915fa01.png) */}
          <div
            onClick={onOpenFeedback}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onOpenFeedback();
              }
            }}
            title="Hòm thư tâm tình - Bấm vào xem phản hồi từ thầy cô"
            className="w-full shrink-0 group relative cursor-pointer overflow-hidden rounded-3xl shadow-md hover:shadow-xl shadow-amber-200/50 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.99] border-2 border-amber-300/80 bg-amber-50"
          >
            <img
              src="/assets/aistudio/22_6915fa01.png"
              alt="Tham gia nhận phản hồi từ thầy cô - Vào xem phản hồi"
              className="w-full h-auto object-contain block select-none pointer-events-none"
            />
            <div className="absolute inset-0 rounded-3xl pointer-events-none ring-2 ring-transparent group-focus-visible:ring-orange-400 group-hover:bg-amber-400/10 transition-colors" />
          </div>
        </div>

        {/* BANNER 3 TRÊN MÁY TÍNH: BẠN KHÔNG ĐƠN ĐỘC! (Theo ảnh 33_23debe50.png) - cố định phía dưới cùng */}
        <div className="relative overflow-hidden rounded-3xl shadow-sm border border-pink-100/80 bg-pink-50/50 mt-auto transition-transform duration-300 hover:scale-[1.01]">
          <img
            src="/assets/aistudio/33_23debe50.png"
            alt="Bạn không đơn độc! Luôn có thầy cô, bạn bè và những người quan tâm đến bạn!"
            className="w-full h-auto object-contain block select-none pointer-events-none"
          />
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. TRÊN ĐIỆN THOẠI DI ĐỘNG: BẢNG/THANH MENU TRƯỢT RA (CÓ 3 GẠCH) */}
      {/* Chứa cả 3 banner học đường ẩn, trượt ra khi bấm nút 3 gạch       */}
      {/* ============================================================== */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Bảng menu trượt ra chứa 3 banner"
        >
          {/* Màn đen mờ khi mở bảng menu trượt */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobileDrawer}
          />

          {/* Thanh menu trượt ra từ bên trái */}
          <div className="relative w-[85vw] max-w-[330px] h-full bg-gradient-to-b from-[#f0f8ff] via-[#fffbf2] to-[#fff0f5] shadow-2xl z-10 flex flex-col justify-between p-4 overflow-y-auto border-r border-amber-200">
            {/* Header của bảng menu trượt */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/90 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Menu size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 font-heading">Menu Trượt Ra</h3>
                  <p className="text-[10px] font-bold text-amber-700">3 Banner &amp; Góc Học Đường</p>
                </div>
              </div>

              {/* Nút đóng bảng menu */}
              <button
                onClick={onCloseMobileDrawer}
                className="w-8 h-8 rounded-full bg-white/90 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
                title="Đóng bảng menu"
                aria-label="Đóng bảng menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thân bảng menu: Nơi chứa 3 banner học sinh */}
            <div className="py-3 flex-1 flex flex-col gap-3.5 justify-center">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-800 px-1">
                <span>🎒</span>
                <span>3 BANNER HỌC ĐƯỜNG</span>
              </div>

              {/* BANNER 1 TRONG MENU TRƯỢT: TRẠM CẢM XÚC TỪ TRÁI TIM */}
              <div
                onClick={() => {
                  onGoHome?.();
                  onCloseMobileDrawer?.();
                }}
                role="button"
                tabIndex={0}
                title="Bấm vào để về đầu trang"
                className="group relative cursor-pointer overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] border border-sky-200 bg-white"
              >
                <img
                  src="/assets/aistudio/11_44a0e5e7.png"
                  alt="Trạm Cảm Xúc Từ Trái Tim - Trang chủ"
                  className="w-full h-auto object-contain block select-none pointer-events-none"
                />
                <div className="p-1.5 bg-sky-50 text-sky-800 font-extrabold text-[11px] text-center border-t border-sky-100 flex items-center justify-center gap-1">
                  <Home size={12} />
                  <span>Trang chủ Trạm Cảm Xúc</span>
                </div>
              </div>

              {/* BANNER 2 TRONG MENU TRƯỢT: HÒM THƯ TÂM TÌNH (NHẬN PHẢN HỒI) */}
              <div
                onClick={() => {
                  onOpenFeedback();
                  onCloseMobileDrawer?.();
                }}
                role="button"
                tabIndex={0}
                title="Bấm vào xem phản hồi từ thầy cô"
                className="group relative cursor-pointer overflow-hidden rounded-2xl shadow-md hover:shadow-lg shadow-amber-200/50 transition-all duration-200 active:scale-[0.98] border-2 border-amber-400 bg-amber-50"
              >
                <img
                  src="/assets/aistudio/22_6915fa01.png"
                  alt="Tham gia nhận phản hồi từ thầy cô - Vào xem phản hồi"
                  className="w-full h-auto object-contain block select-none pointer-events-none"
                />
                <div className="p-1.5 bg-amber-100 text-amber-900 font-extrabold text-[11px] text-center border-t border-amber-300 flex items-center justify-center gap-1">
                  <Mail size={12} className="text-amber-700" />
                  <span>Mở Hòm Thư &amp; Xem Phản Hồi</span>
                </div>
              </div>

              {/* BANNER 3 TRONG MENU TRƯỢT: BẠN KHÔNG ĐƠN ĐỘC */}
              <div
                onClick={() => {
                  const el = document.getElementById('wooden-board');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  onCloseMobileDrawer?.();
                }}
                role="button"
                tabIndex={0}
                title="Bạn không đơn độc - Luôn có người bên bạn"
                className="group relative cursor-pointer overflow-hidden rounded-2xl shadow-sm border border-pink-200 bg-pink-50/80 active:scale-[0.98] transition-all duration-200"
              >
                <img
                  src="/assets/aistudio/33_23debe50.png"
                  alt="Bạn không đơn độc! Luôn có thầy cô, bạn bè và những người quan tâm đến bạn!"
                  className="w-full h-auto object-contain block select-none pointer-events-none"
                />
                <div className="p-1.5 bg-pink-100 text-pink-900 font-extrabold text-[11px] text-center border-t border-pink-200 flex items-center justify-center gap-1">
                  <Heart size={12} className="text-rose-600 fill-rose-500" />
                  <span>Bạn Không Đơn Độc</span>
                </div>
              </div>
            </div>

            {/* Footer của bảng menu trượt */}
            <div className="pt-2.5 border-t border-amber-200/80 shrink-0 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500">Menu 3 Gạch Di Động</span>
              <button
                onClick={onCloseMobileDrawer}
                className="px-3 py-1.5 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-950 font-extrabold text-xs active:scale-95 transition-transform cursor-pointer"
              >
                Đóng menu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
