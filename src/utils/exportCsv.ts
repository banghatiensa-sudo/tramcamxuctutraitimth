import { StudentSubmission } from '../types/emotion';

const emotionLabels: Record<string, string> = {
  vui_ve: 'Vui vẻ',
  buon_ba: 'Buồn bã',
  lo_lang: 'Lo lắng',
  tuc_gian: 'Tức giận',
  kho_noi: 'Khó nói thành lời',
};

const categoryLabels: Record<string, string> = {
  chia_se: 'Em muốn chia sẻ',
  ghi_am: 'Em muốn ghi âm',
  loi_nhan: 'Em muốn gửi lời nhắn',
  hinh_anh: 'Em muốn gửi hình ảnh',
  khan_cap: 'Cần giúp đỡ khẩn cấp (SOS)',
};

const statusLabels: Record<string, string> = {
  moi_tiep_nhan: 'Mới tiếp nhận',
  dang_xem_xet: 'Đang xem xét',
  can_trao_doi: 'Cần trao đổi trực tiếp',
  da_ho_tro: 'Đã hỗ trợ xong',
};

/**
 * Xuất danh sách chia sẻ cảm xúc ra tệp CSV chuẩn 8 cột tiếng Việt có dấu.
 * Có gắn tiền tố UTF-8 BOM (\uFEFF) để Microsoft Excel mở trực tiếp không bị lỗi font.
 */
export function exportSubmissionsToCsv(submissions: StudentSubmission[]): void {
  const headers = [
    'STT',
    'Thời gian gửi',
    'Mã / Tên học sinh',
    'Lớp',
    'Cảm xúc',
    'Nội dung chia sẻ / Thể loại',
    'Mức độ ưu tiên',
    'Trạng thái xử lý & Ghi chú của Thầy Cô',
  ];

  const rows = submissions.map((item, index) => {
    const stt = (index + 1).toString();
    const time = item.timestamp;
    const nameCode = `${item.secretCode} - ${item.studentName || 'Ẩn danh'}`;
    const studentClass = item.studentClass || 'Chưa cung cấp';
    const emotion = emotionLabels[item.emotion] || item.emotion;
    
    // Tổng hợp nội dung
    let contentSummary = `[${categoryLabels[item.category] || item.category}] `;
    if (item.title) contentSummary += `${item.title}: `;
    if (item.content) contentSummary += item.content;
    if (item.audioUrl) contentSummary += ` (Kèm file ghi âm ${item.audioDuration || 0}s)`;
    if (item.imageUrl) contentSummary += ` (Kèm hình ảnh: ${item.imageCaption || 'Tranh vẽ'})`;
    
    const priority = item.isUrgent ? 'KHẨN CẤP (SOS)' : 'Bình thường';
    
    let statusNote = statusLabels[item.status] || item.status;
    if (item.teacherNote) {
      statusNote += ` - Ghi chú: ${item.teacherNote}`;
    }
    if (item.feedbacks && item.feedbacks.length > 0) {
      statusNote += ` (Đã gửi ${item.feedbacks.length} phản hồi)`;
    }

    return [
      escapeCsvField(stt),
      escapeCsvField(time),
      escapeCsvField(nameCode),
      escapeCsvField(studentClass),
      escapeCsvField(emotion),
      escapeCsvField(contentSummary),
      escapeCsvField(priority),
      escapeCsvField(statusNote),
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `Tram_Cam_Xuc_Du_Lieu_${now}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(val: string): string {
  if (val === undefined || val === null) return '""';
  const text = String(val).replace(/"/g, '""');
  return `"${text}"`;
}
