export type EmotionType = 'vui_ve' | 'buon_ba' | 'lo_lang' | 'tuc_gian' | 'kho_noi';

export type SubmissionCategory = 'chia_se' | 'ghi_am' | 'loi_nhan' | 'hinh_anh' | 'khan_cap';

export type ProcessingStatus = 'moi_tiep_nhan' | 'dang_xem_xet' | 'can_trao_doi' | 'da_ho_tro';

export interface EmotionFeedback {
  id: string;
  teacherName: string;
  comment: string;
  sticker?: string;
  timestamp: string;
  audioUrl?: string; // Đoạn ghi âm giọng nói ấm áp của thầy cô cho học sinh lớp 1, 2 nghe
  audioDuration?: number; // Giây
}

export interface StudentSubmission {
  id: string;
  secretCode: string;
  studentName: string; // Tên học sinh hoặc "Ẩn danh"
  studentClass: string; // Ví dụ: "3A1", "4B" hoặc "Giấu tên"
  emotion: EmotionType;
  category: SubmissionCategory;
  title: string;
  content: string;
  audioUrl?: string; // Data URL hoặc Base64 âm thanh
  audioDuration?: number; // Giây
  imageUrl?: string; // Data URL hoặc Base64 hình ảnh (đã xóa EXIF)
  imageCaption?: string;
  videoUrl?: string; // Data URL hoặc Base64 video clip đã quay
  videoDuration?: number; // Giây
  isUrgent: boolean; // Khẩn cấp SOS
  sosIssue?: string; // Ví dụ: Bị bắt nạt, Sợ hãi, v.v.
  timestamp: string;
  status: ProcessingStatus;
  teacherNote?: string;
  feedbacks: EmotionFeedback[];
  studentReplyAudioUrl?: string; // Đoạn ghi âm giọng nói của bé lớp 1, 2 nhắn lại
  studentReplyDuration?: number; // Giây
  driveAudioUrl?: string; // Link Drive sau khi Apps Script tạo file
  driveImageUrl?: string; // Link Drive sau khi Apps Script tạo file
}

export interface EmotionMeta {
  type: EmotionType;
  label: string;
  subLabel: string;
  color: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  encouragement: string;
}
