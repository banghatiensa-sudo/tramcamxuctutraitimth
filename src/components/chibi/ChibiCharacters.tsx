import React from 'react';

/**
 * Logo Trạm Cảm Xúc Từ Trái Tim:
 * Icon trái tim 2 bàn tay ôm ấm áp
 */
export const HeartLogoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 48, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`select-none ${className}`}
  >
    <defs>
      <linearGradient id="logoHeartGrad" x1="20" y1="15" x2="60" y2="65" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FB7185" />
        <stop offset="0.6" stopColor="#F43F5E" />
        <stop offset="1" stopColor="#E11D48" />
      </linearGradient>
      <linearGradient id="handLeft" x1="10" y1="40" x2="35" y2="60" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38BDF8" />
        <stop offset="1" stopColor="#0284C7" />
      </linearGradient>
      <linearGradient id="handRight" x1="70" y1="40" x2="45" y2="60" gradientUnits="userSpaceOnUse">
        <stop stopColor="#34D399" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
    </defs>

    {/* Vòng hào quang dịu ngọt */}
    <circle cx="40" cy="40" r="36" fill="#FDF2F8" stroke="#FCE7F3" strokeWidth="2" />

    {/* Trái tim trung tâm */}
    <path
      d="M40 60C40 60 22 47 18 34C15 24 22 16 31 16C36 16 39 19 40 22C41 19 44 16 49 16C58 16 65 24 62 34C58 47 40 60 40 60Z"
      fill="url(#logoHeartGrad)"
    />

    {/* Ánh sáng điểm xuyết trên tim */}
    <ellipse cx="28" cy="24" rx="4" ry="2" fill="white" fillOpacity="0.5" transform="rotate(-30 28 24)" />

    {/* Bàn tay trái nâng đỡ & ôm trái tim */}
    <path
      d="M12 52C16 48 24 50 31 55C33 56.5 31 60 27 59C21 58 16 60 14 62L12 52Z"
      fill="#FBBF24"
      stroke="#D97706"
      strokeWidth="1.5"
    />
    <path
      d="M16 44C20 42 27 46 29 50C30 52 28 54 25 53C22 51 18 51 15 53L16 44Z"
      fill="#FDE68A"
      stroke="#D97706"
      strokeWidth="1.5"
    />

    {/* Bàn tay phải nâng đỡ & ôm trái tim */}
    <path
      d="M68 52C64 48 56 50 49 55C47 56.5 49 60 53 59C59 58 64 60 66 62L68 52Z"
      fill="#FBBF24"
      stroke="#D97706"
      strokeWidth="1.5"
    />
    <path
      d="M64 44C60 42 53 46 51 50C50 52 52 54 55 53C58 51 62 51 65 53L64 44Z"
      fill="#FDE68A"
      stroke="#D97706"
      strokeWidth="1.5"
    />

    {/* Chấm lấp lánh */}
    <circle cx="58" cy="20" r="1.5" fill="#FDE047" />
    <circle cx="20" cy="26" r="1.5" fill="#FDE047" />
  </svg>
);

/**
 * Minh họa Chibi giáo viên trao đổi thư từ / sách vở cùng học sinh
 * Dành riêng cho ô "Tham gia nhận phản hồi từ thầy cô" màu cam/vàng mật ong
 */
export const ChibiTeacherStudents: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 240 130"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-full max-h-32 object-contain select-none ${className}`}
  >
    <defs>
      <linearGradient id="bubbleGrad" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#FFFBEB" />
      </linearGradient>
    </defs>

    {/* Thầy cô giáo bên trái */}
    <g transform="translate(15, 10)">
      {/* Tóc cô */}
      <path d="M40 22C40 10 22 10 16 22C10 32 10 48 12 55C14 55 18 36 24 36C30 36 32 55 36 55C40 48 42 32 40 22Z" fill="#78350F" />
      {/* Khuôn mặt cô */}
      <ellipse cx="26" cy="30" rx="14" ry="13" fill="#FED7AA" />
      {/* Kính mắt dễ thương */}
      <rect x="15" y="25" width="8" height="6" rx="2" stroke="#B45309" strokeWidth="1.5" fill="none" />
      <rect x="27" y="25" width="8" height="6" rx="2" stroke="#B45309" strokeWidth="1.5" fill="none" />
      <path d="M23 28H27" stroke="#B45309" strokeWidth="1.5" />
      {/* Mắt cười */}
      <path d="M17 28Q19 26 21 28" stroke="#451A03" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M29 28Q31 26 33 28" stroke="#451A03" strokeWidth="1.5" strokeLinecap="round" />
      {/* Má hồng */}
      <circle cx="16" cy="34" r="2.5" fill="#F43F5E" opacity="0.6" />
      <circle cx="34" cy="34" r="2.5" fill="#F43F5E" opacity="0.6" />
      {/* Miệng cười */}
      <path d="M23 35Q25 38 27 35" stroke="#451A03" strokeWidth="1.5" strokeLinecap="round" />
      {/* Áo sơ mi & áo khoác cô */}
      <path d="M12 48C12 44 18 42 26 42C34 42 40 44 40 48L44 80H8L12 48Z" fill="#F43F5E" />
      <path d="M21 42L26 50L31 42" stroke="white" strokeWidth="2" fill="white" />
      {/* Cuốn sổ / Thư phản hồi của cô */}
      <rect x="28" y="52" width="22" height="18" rx="3" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.5" transform="rotate(10 28 52)" />
      <line x1="32" y1="58" x2="44" y2="60" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="33" y1="63" x2="42" y2="65" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round" />
      <polygon points="45,56 47,59 49,57" fill="#F43F5E" />
    </g>

    {/* Học sinh bé gái đứng cạnh */}
    <g transform="translate(85, 20)">
      {/* Tóc hai bím */}
      <circle cx="10" cy="22" r="6" fill="#451A03" />
      <circle cx="36" cy="22" r="6" fill="#451A03" />
      <ellipse cx="23" cy="22" rx="14" ry="12" fill="#451A03" />
      {/* Khuôn mặt bé */}
      <ellipse cx="23" cy="27" rx="11" ry="10" fill="#FED7AA" />
      {/* Mắt tròn xoe háo hức */}
      <circle cx="19" cy="26" r="1.8" fill="#451A03" />
      <circle cx="27" cy="26" r="1.8" fill="#451A03" />
      <circle cx="18.5" cy="25.5" r="0.6" fill="white" />
      <circle cx="26.5" cy="25.5" r="0.6" fill="white" />
      {/* Má hồng */}
      <circle cx="16" cy="30" r="2.2" fill="#FB7185" opacity="0.7" />
      <circle cx="30" cy="30" r="2.2" fill="#FB7185" opacity="0.7" />
      {/* Nụ cười */}
      <path d="M21 31Q23 34 25 31" stroke="#451A03" strokeWidth="1.5" strokeLinecap="round" />
      {/* Váy vàng cam */}
      <path d="M12 40C12 37 17 36 23 36C29 36 34 37 34 40L38 68H8L12 40Z" fill="#38BDF8" />
    </g>

    {/* Học sinh bé trai bên phải đang cầm phong thư */}
    <g transform="translate(150, 15)">
      {/* Tóc ngắn */}
      <path d="M12 20C12 10 32 8 38 18C42 24 40 30 38 30C34 24 30 20 23 20C17 20 14 26 12 28Z" fill="#1C1917" />
      {/* Khuôn mặt bé trai */}
      <ellipse cx="25" cy="28" rx="12" ry="11" fill="#FED7AA" />
      {/* Mắt híp cười */}
      <path d="M19 27Q22 24 24 27" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M27 27Q29 24 32 27" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="31" r="2.5" fill="#FB7185" opacity="0.7" />
      <circle cx="33" cy="31" r="2.5" fill="#FB7185" opacity="0.7" />
      <path d="M22 32Q25 35 28 32" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" />
      {/* Áo xanh lam */}
      <path d="M14 42C14 38 19 37 25 37C31 37 36 38 36 42L40 72H10L14 42Z" fill="#34D399" />
      {/* Phong thư bé cầm */}
      <rect x="0" y="44" width="22" height="15" rx="2" fill="white" stroke="#38BDF8" strokeWidth="1.5" />
      <path d="M0 44L11 52L22 44" stroke="#38BDF8" strokeWidth="1.2" />
      <circle cx="11" cy="51" r="2" fill="#F43F5E" />
    </g>

    {/* Phong thư bay bổng ở giữa */}
    <g transform="translate(130, 8)">
      <rect x="0" y="0" width="20" height="14" rx="2" fill="white" stroke="#FB923C" strokeWidth="1.5" transform="rotate(-15)" />
      <path d="M0 0L10 8L20 0" stroke="#FB923C" strokeWidth="1" transform="rotate(-15)" />
      <path d="M25 8C27 4 31 6 30 10C29 13 24 16 23 18" stroke="#F43F5E" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
    </g>

    {/* Trái tim nhỏ ấm áp bay lên */}
    <path
      d="M100 8C100 8 96 4 92 4C88 4 86 8 88 11C90 14 100 20 100 20C100 20 110 14 112 11C114 8 112 4 108 4C104 4 100 8 100 8Z"
      fill="#F43F5E"
    />
  </svg>
);

/**
 * Minh họa Chibi hai bạn nhỏ ôm trái tim lớn:
 * "Bạn không đơn độc! Luôn có thầy cô, bạn bè và những người quan tâm đến bạn!"
 */
export const ChibiKidsHuggingHeart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 200 150"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-full max-h-36 object-contain select-none ${className}`}
  >
    <defs>
      <linearGradient id="bigHeart" x1="50" y1="30" x2="150" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDA4AF" />
        <stop offset="0.5" stopColor="#FB7185" />
        <stop offset="1" stopColor="#F43F5E" />
      </linearGradient>
    </defs>

    {/* Trái tim khổng lồ ở giữa mỉm cười */}
    <path
      d="M100 120C100 120 50 90 40 60C32 38 48 20 70 20C82 20 94 28 100 35C106 28 118 20 130 20C152 20 168 38 160 60C150 90 100 120 100 120Z"
      fill="url(#bigHeart)"
    />
    {/* Ánh sáng trái tim */}
    <ellipse cx="68" cy="35" rx="8" ry="4" fill="white" fillOpacity="0.4" transform="rotate(-30 68 35)" />
    
    {/* Khuôn mặt cười trên trái tim */}
    <path d="M90 62Q93 59 96 62" stroke="#881337" strokeWidth="2" strokeLinecap="round" />
    <path d="M104 62Q107 59 110 62" stroke="#881337" strokeWidth="2" strokeLinecap="round" />
    <circle cx="86" cy="66" r="3" fill="#FDA4AF" />
    <circle cx="114" cy="66" r="3" fill="#FDA4AF" />
    <path d="M96 68Q100 73 104 68" stroke="#881337" strokeWidth="2" strokeLinecap="round" />

    {/* Cậu bé bên trái ôm trái tim */}
    <g transform="translate(18, 40)">
      {/* Balo xanh */}
      <rect x="0" y="30" width="14" height="24" rx="4" fill="#3B82F6" />
      {/* Tóc */}
      <path d="M14 20C14 6 34 4 40 18C44 26 40 32 36 32C30 24 26 22 20 24C16 26 14 30 14 30Z" fill="#1E293B" />
      {/* Mặt bé trai */}
      <circle cx="28" cy="24" r="13" fill="#FED7AA" />
      <path d="M22 23Q25 19 28 23" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="28" r="3" fill="#F43F5E" opacity="0.6" />
      <path d="M24 29Q28 34 32 29" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      {/* Áo xanh lam */}
      <path d="M18 36C18 34 24 33 30 33C36 33 42 34 42 36L44 65H16L18 36Z" fill="#60A5FA" />
      {/* Tay ôm qua trái tim */}
      <path d="M38 42C45 42 54 45 58 50C60 52 58 55 54 54C48 52 42 50 38 48Z" fill="#FED7AA" stroke="#F97316" strokeWidth="1" />
    </g>

    {/* Cô bé bên phải ôm trái tim */}
    <g transform="translate(130, 38)">
      {/* Tóc dài */}
      <path d="M12 20C12 6 32 6 36 18C40 26 40 45 36 50C32 42 32 30 24 30C16 30 14 42 10 50C8 45 8 26 12 20Z" fill="#78350F" />
      {/* Mặt bé gái */}
      <circle cx="22" cy="24" r="13" fill="#FED7AA" />
      <path d="M18 23Q21 19 24 23" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <circle cx="28" cy="28" r="3" fill="#F43F5E" opacity="0.6" />
      <path d="M16 29Q20 34 24 29" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      {/* Áo vàng tươi */}
      <path d="M12 36C12 34 18 33 24 33C30 33 36 34 36 36L38 65H10L12 36Z" fill="#FBBF24" />
      {/* Tay ôm qua trái tim */}
      <path d="M12 42C5 42 -4 45 -8 50C-10 52 -8 55 -4 54C2 52 8 50 12 48Z" fill="#FED7AA" stroke="#F97316" strokeWidth="1" />
    </g>

    {/* Hoa cỏ xinh xinh quanh chân */}
    <g transform="translate(20, 115)">
      {/* Bụi cỏ */}
      <path d="M10 25Q15 5 20 25" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 25Q22 2 28 25" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" />
      {/* Hoa nhỏ */}
      <circle cx="25" cy="8" r="4" fill="#F472B6" />
      <circle cx="25" cy="8" r="1.5" fill="#FEF08A" />
      
      <circle cx="130" cy="12" r="5" fill="#38BDF8" />
      <circle cx="130" cy="12" r="2" fill="#FEF08A" />
      <path d="M125 25Q130 14 135 25" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" />

      <circle cx="80" cy="20" r="4" fill="#FBBF24" />
      <circle cx="80" cy="20" r="1.5" fill="#DC2626" />
    </g>
  </svg>
);
