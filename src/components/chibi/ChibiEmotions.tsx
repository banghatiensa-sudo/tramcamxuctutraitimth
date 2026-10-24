import React from 'react';
import { EmotionType } from '../../types/emotion';

interface ChibiProps {
  className?: string;
  size?: number;
}

/**
 * 1. "Vui vẻ" - Mặt trời vàng rạng rỡ với mắt cười, má hồng, tia nắng lấp lánh
 */
export const ChibiVuiVe: React.FC<ChibiProps> = ({ className = '', size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md select-none ${className}`}
  >
    <defs>
      <linearGradient id="sunGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="0.6" stopColor="#FACC15" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
      <radialGradient id="sunRay" cx="50" cy="50" r="48" gradientUnits="userSpaceOnUse">
        <stop offset="0.75" stopColor="#FDE047" stopOpacity="0" />
        <stop offset="1" stopColor="#FBBF24" stopOpacity="0.8" />
      </radialGradient>
      <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Tia nắng chibi dạng hạt và cánh hoa */}
    <g opacity="0.9">
      <circle cx="50" cy="8" r="4" fill="#FBBF24" />
      <circle cx="50" cy="92" r="4" fill="#FBBF24" />
      <circle cx="8" cy="50" r="4" fill="#FBBF24" />
      <circle cx="92" cy="50" r="4" fill="#FBBF24" />
      <circle cx="20" cy="20" r="3.5" fill="#FBBF24" />
      <circle cx="80" cy="20" r="3.5" fill="#FBBF24" />
      <circle cx="20" cy="80" r="3.5" fill="#FBBF24" />
      <circle cx="80" cy="80" r="3.5" fill="#FBBF24" />
      {/* Tia vạch ngắn */}
      <path d="M50 14V17M50 83V86M14 50H17M83 50H86" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    </g>

    {/* Thân mặt trời hình tròn ấm áp */}
    <circle cx="50" cy="50" r="35" fill="url(#sunGrad)" filter="url(#softGlow)" />
    {/* Ánh sáng phản chiếu trên đầu */}
    <ellipse cx="40" cy="27" rx="14" ry="7" fill="white" fillOpacity="0.45" />

    {/* Mắt cười híp tít hạnh phúc */}
    <path
      d="M34 46C34 46 38 41 43 46"
      stroke="#78350F"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <path
      d="M57 46C57 46 62 41 66 46"
      stroke="#78350F"
      strokeWidth="3.5"
      strokeLinecap="round"
    />

    {/* Má hồng hào tươi tắn */}
    <ellipse cx="32" cy="54" rx="5.5" ry="3.5" fill="#F87171" fillOpacity="0.7" />
    <ellipse cx="68" cy="54" rx="5.5" ry="3.5" fill="#F87171" fillOpacity="0.7" />

    {/* Miệng cười mở to đáng yêu */}
    <path
      d="M42 54C42 61 58 61 58 54"
      fill="#DC2626"
      stroke="#78350F"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Chiếc lưỡi hồng */}
    <path
      d="M47 57C48 59 52 59 53 57"
      fill="#FCA5A5"
    />

    {/* Lấp lánh nhỏ */}
    <polygon points="76,28 78,32 82,34 78,36 76,40 74,36 70,34 74,32" fill="#FEF08A" />
  </svg>
);

/**
 * 2. "Buồn bã" - Giọt nước xanh da trời có giọt lệ lăn tăn
 */
export const ChibiBuonBa: React.FC<ChibiProps> = ({ className = '', size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md select-none ${className}`}
  >
    <defs>
      <linearGradient id="dropGrad" x1="30" y1="20" x2="70" y2="85" gradientUnits="userSpaceOnUse">
        <stop stopColor="#93C5FD" />
        <stop offset="0.6" stopColor="#60A5FA" />
        <stop offset="1" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="tearGrad" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#BAE6FD" />
        <stop offset="1" stopColor="#0284C7" />
      </linearGradient>
    </defs>

    {/* Bong bóng nước phụ nhỏ */}
    <circle cx="20" cy="30" r="3.5" fill="#93C5FD" opacity="0.6" />
    <circle cx="82" cy="45" r="4.5" fill="#93C5FD" opacity="0.6" />
    <circle cx="78" cy="22" r="2.5" fill="#60A5FA" opacity="0.5" />

    {/* Thân giọt nước hình bầu tròn mềm mại */}
    <path
      d="M50 16C50 16 22 46 22 62C22 77 34.5 86 50 86C65.5 86 78 77 78 62C78 46 50 16 50 16Z"
      fill="url(#dropGrad)"
    />

    {/* Vết bóng sáng trên chóp */}
    <path
      d="M48 24C44 32 30 50 30 60C30 64 32 67 34 68C32 64 34 50 48 34C50 32 50 26 48 24Z"
      fill="white"
      fillOpacity="0.45"
    />

    {/* Lông mày buồn cụp xuống */}
    <path d="M35 45L43 49" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M65 45L57 49" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" />

    {/* Đôi mắt long lanh ngấn lệ */}
    <circle cx="39" cy="54" r="5" fill="#1E3A8A" />
    <circle cx="37.5" cy="52" r="2" fill="white" />
    <circle cx="41" cy="55.5" r="1" fill="white" />

    <circle cx="61" cy="54" r="5" fill="#1E3A8A" />
    <circle cx="59.5" cy="52" r="2" fill="white" />
    <circle cx="63" cy="55.5" r="1" fill="white" />

    {/* Giọt lệ xanh lăn xuống má */}
    <path
      d="M66 60C66 60 72 68 72 73C72 76.5 69.5 79 66 79C62.5 79 60 76.5 60 73C60 68 66 60 66 60Z"
      fill="url(#tearGrad)"
    />
    <circle cx="64" cy="71" r="1" fill="white" />

    {/* Má ửng xanh nhạt */}
    <ellipse cx="33" cy="59" rx="4.5" ry="2.5" fill="#38BDF8" fillOpacity="0.5" />

    {/* Miệng mếu cong xuống */}
    <path
      d="M44 68C47 65 53 65 56 68"
      stroke="#1E3A8A"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 3. "Lo lắng" - Đám mây tím lúng túng, bối rối
 */
export const ChibiLoLang: React.FC<ChibiProps> = ({ className = '', size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md select-none ${className}`}
  >
    <defs>
      <linearGradient id="cloudGrad" x1="25" y1="20" x2="75" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#D8B4FE" />
        <stop offset="0.6" stopColor="#C084FC" />
        <stop offset="1" stopColor="#A855F7" />
      </linearGradient>
    </defs>

    {/* Vệt xoắn rối rắm bối rối trên đầu */}
    <path
      d="M70 20C73 17 78 19 76 24C74 29 82 28 80 34"
      stroke="#9333EA"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="2 3"
      opacity="0.8"
    />
    <circle cx="22" cy="30" r="3" fill="#D8B4FE" opacity="0.6" />
    <circle cx="16" cy="40" r="2" fill="#C084FC" opacity="0.5" />

    {/* Thân đám mây bồng bềnh */}
    <path
      d="M30 68C22 68 16 62 16 54C16 47 21 41 28 40C29 30 38 22 49 22C59 22 68 29 70 39C77 40 83 46 83 53C83 61 77 68 69 68H30Z"
      fill="url(#cloudGrad)"
    />

    {/* Đốm sáng trên đỉnh mây */}
    <ellipse cx="48" cy="31" rx="12" ry="5" fill="white" fillOpacity="0.4" />

    {/* Giọt mồ hôi lo lắng bên trán */}
    <path
      d="M68 34C68 34 72 39 72 42C72 44.5 70 46 68 46C66 46 64 44.5 64 42C64 39 68 34 68 34Z"
      fill="#67E8F9"
    />
    <circle cx="67" cy="41" r="0.8" fill="white" />

    {/* Lông mày gợn sóng lúng túng */}
    <path d="M35 45Q39 43 43 46" stroke="#4A044E" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M57 46Q61 43 65 45" stroke="#4A044E" strokeWidth="2.2" strokeLinecap="round" />

    {/* Đôi mắt mở to tròn ngơ ngác */}
    <circle cx="39" cy="52" r="4.5" fill="#4A044E" />
    <circle cx="37.5" cy="50.5" r="1.8" fill="white" />

    <circle cx="61" cy="52" r="4.5" fill="#4A044E" />
    <circle cx="59.5" cy="50.5" r="1.8" fill="white" />

    {/* Má hồng tía lúng túng */}
    <ellipse cx="32" cy="57" rx="4" ry="2.5" fill="#F472B6" fillOpacity="0.5" />
    <ellipse cx="68" cy="57" rx="4" ry="2.5" fill="#F472B6" fillOpacity="0.5" />

    {/* Miệng zíc zắc bối rối ngập ngừng */}
    <path
      d="M44 60L47 62L50 60L53 62L56 60"
      stroke="#4A044E"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 4. "Tức giận" - Quả đào đỏ ửng phụng phịu, lông mày cau có
 */
export const ChibiTucGian: React.FC<ChibiProps> = ({ className = '', size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md select-none ${className}`}
  >
    <defs>
      <linearGradient id="peachGrad" x1="30" y1="20" x2="70" y2="85" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FCA5A5" />
        <stop offset="0.5" stopColor="#F87171" />
        <stop offset="1" stopColor="#EF4444" />
      </linearGradient>
    </defs>

    {/* Dấu khói tức giận chibi 4 cánh đỏ */}
    <g transform="translate(68, 14)">
      <path d="M4 0V8M0 4H8" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M1 1L7 7M7 1L1 7" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Thân quả đào / trái tròn đỏ ửng có khía trên đầu */}
    <path
      d="M50 28C43 20 22 25 22 52C22 75 42 85 50 85C58 85 78 75 78 52C78 25 57 20 50 28Z"
      fill="url(#peachGrad)"
    />

    {/* Cuống lá đào nhỏ trên đầu */}
    <path
      d="M50 28C50 22 53 17 56 15"
      stroke="#15803D"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M53 20C57 18 63 19 63 23C63 26 57 24 53 20Z"
      fill="#4ADE80"
    />

    {/* Điểm phản chiếu ánh sáng */}
    <ellipse cx="36" cy="38" rx="8" ry="4" fill="white" fillOpacity="0.35" transform="rotate(-15 36 38)" />

    {/* Lông mày cau có xéo ngược giận dỗi */}
    <path d="M32 44L44 50" stroke="#7F1D1D" strokeWidth="3" strokeLinecap="round" />
    <path d="M68 44L56 50" stroke="#7F1D1D" strokeWidth="3" strokeLinecap="round" />

    {/* Đôi mắt hình tròn nhìn chằm chằm phụng phịu */}
    <circle cx="39" cy="55" r="4.5" fill="#7F1D1D" />
    <circle cx="37.5" cy="53.5" r="1.5" fill="white" />

    <circle cx="61" cy="55" r="4.5" fill="#7F1D1D" />
    <circle cx="59.5" cy="53.5" r="1.5" fill="white" />

    {/* Hai má phúng phính đỏ lựng vì giận */}
    <circle cx="28" cy="62" r="6" fill="#DC2626" fillOpacity="0.7" />
    <circle cx="72" cy="62" r="6" fill="#DC2626" fillOpacity="0.7" />

    {/* Miệng mím lại hình tam giác ngược bực bội */}
    <path
      d="M44 68C46 64 54 64 56 68"
      stroke="#7F1D1D"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 5. "Khó nói thành lời" - Mầm cây xanh ngơ ngác kèm bong bóng thoại `...`
 */
export const ChibiKhoNoi: React.FC<ChibiProps> = ({ className = '', size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md select-none ${className}`}
  >
    <defs>
      <linearGradient id="sproutGrad" x1="30" y1="30" x2="70" y2="85" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6EE7B7" />
        <stop offset="0.6" stopColor="#34D399" />
        <stop offset="1" stopColor="#10B981" />
      </linearGradient>
    </defs>

    {/* Thân tròn xanh mint êm đềm */}
    <circle cx="50" cy="58" r="30" fill="url(#sproutGrad)" />

    {/* Hai chiếc lá mầm xinh xắn trên đầu */}
    <path
      d="M50 28V36"
      stroke="#047857"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Lá bên trái */}
    <path
      d="M50 31C43 27 41 19 46 16C51 16 51 25 50 31Z"
      fill="#A7F3D0"
      stroke="#047857"
      strokeWidth="1.5"
    />
    {/* Lá bên phải */}
    <path
      d="M50 33C57 29 62 23 60 18C55 18 52 27 50 33Z"
      fill="#6EE7B7"
      stroke="#047857"
      strokeWidth="1.5"
    />

    {/* Đốm sáng trên đầu */}
    <ellipse cx="42" cy="40" rx="9" ry="4" fill="white" fillOpacity="0.4" />

    {/* Mắt tròn xoe ngơ ngác hiền lành */}
    <circle cx="39" cy="56" r="4.5" fill="#064E3B" />
    <circle cx="37.5" cy="54.5" r="1.7" fill="white" />

    <circle cx="61" cy="56" r="4.5" fill="#064E3B" />
    <circle cx="59.5" cy="54.5" r="1.7" fill="white" />

    {/* Má hồng cam nhẹ */}
    <ellipse cx="32" cy="62" rx="4" ry="2.5" fill="#F472B6" fillOpacity="0.5" />
    <ellipse cx="68" cy="62" rx="4" ry="2.5" fill="#F472B6" fillOpacity="0.5" />

    {/* Miệng nhỏ hình chữ o ngơ ngác */}
    <ellipse cx="50" cy="65" rx="2.5" ry="3.5" fill="#064E3B" />

    {/* Bong bóng thoại nhỏ xíu với dấu ba chấm '...' ở góc phải */}
    <g transform="translate(62, 28)">
      <rect x="0" y="0" width="28" height="17" rx="8" fill="white" stroke="#10B981" strokeWidth="1.5" />
      <path d="M5 16L0 21L8 16Z" fill="white" />
      <path d="M5 16L0 21L8 16" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* 3 chấm tròn ... */}
      <circle cx="7" cy="8.5" r="1.5" fill="#059669" />
      <circle cx="14" cy="8.5" r="1.5" fill="#059669" />
      <circle cx="21" cy="8.5" r="1.5" fill="#059669" />
    </g>
  </svg>
);

export const EmotionIconMap: Record<EmotionType, React.FC<ChibiProps>> = {
  vui_ve: ChibiVuiVe,
  buon_ba: ChibiBuonBa,
  lo_lang: ChibiLoLang,
  tuc_gian: ChibiTucGian,
  kho_noi: ChibiKhoNoi,
};
