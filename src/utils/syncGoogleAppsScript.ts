import { StudentSubmission } from '../types/emotion';

export const APPS_SCRIPT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwdLkyRxhPvjDvtk6K-fbrV6zInYP_hgPE0fd_lprNoPuNB6Nbum1cznD_jtXA_x34/exec';

/**
 * Chuyển đổi blob URL thành chuỗi Base64 Data URL hoàn chỉnh để gửi tới Google Apps Script
 */
export async function convertBlobToDataUrl(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  if (url.startsWith('blob:')) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Không thể chuyển blob thành DataURL:', e);
      return undefined;
    }
  }
  return url;
}

/**
 * Tự động đồng bộ bài chia sẻ của học sinh (kèm Audio/Ảnh/Video Base64)
 * trực tiếp đến Google Apps Script & Google Drive trong nền
 */
export async function syncSubmissionToAppsScript(submission: StudentSubmission): Promise<boolean> {
  const url = APPS_SCRIPT_WEBHOOK_URL;

  try {
    // Đảm bảo audio, ảnh và video luôn ở định dạng Base64 DataURL (kể cả khi ban đầu là blob:)
    const audioBase64 = await convertBlobToDataUrl(submission.audioUrl);
    const photoBase64 = await convertBlobToDataUrl(submission.imageUrl);
    const videoBase64 = await convertBlobToDataUrl(submission.videoUrl);
    const replyAudioBase64 = await convertBlobToDataUrl(submission.studentReplyAudioUrl);

    const submissionData = {
      id: submission.id,
      secretCode: submission.secretCode,
      studentName: submission.studentName || 'Ẩn danh',
      studentClass: submission.studentClass || 'Chưa cung cấp',
      emotion: submission.emotion,
      category: submission.category,
      title: submission.title || '',
      content: submission.content || '',
      audioBase64: audioBase64 || '',
      photoBase64: photoBase64 || '',
      videoBase64: videoBase64 || '',
      replyAudioBase64: replyAudioBase64 || '',
      isUrgent: submission.isUrgent,
      sosIssue: submission.sosIssue || '',
      status: submission.status || 'moi_tiep_nhan',
      teacherNote: submission.teacherNote || '',
      timestamp: submission.timestamp,
    };

    // Gửi cả cấu trúc đơn (root) và mảng (submissions) để tương thích mọi phiên bản Code.gs
    const payload = {
      source: 'Tram Cam Xuc Tu Trai Tim',
      syncTime: new Date().toISOString(),
      ...submissionData,
      submissions: [submissionData],
    };

    // Gửi sang Google Apps Script
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    console.log('Đã gửi bài chia sẻ sang Google Apps Script thành công:', submission.secretCode);
    return true;
  } catch (error) {
    console.error('Lỗi tự động đồng bộ Google Apps Script:', error);
    return false;
  }
}
