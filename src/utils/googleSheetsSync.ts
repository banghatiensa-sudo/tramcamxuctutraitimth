import { StudentSubmission, EmotionType, ProcessingStatus, SubmissionCategory } from '../types/emotion';

export const DEFAULT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwdLkyRxhPvjDvtk6K-fbrV6zInYP_hgPE0fd_lprNoPuNB6Nbum1cznD_jtXA_x34/exec';

export const STORAGE_WEBHOOK_KEY = 'tram_cam_xuc_webhook_url';
export const STORAGE_SHEET_KEY = 'tram_cam_xuc_sheet_url';
export const STORAGE_LAST_SYNC_KEY = 'tram_cam_xuc_last_sync_time';

export function getSavedWebhookUrl(): string {
  try {
    return localStorage.getItem(STORAGE_WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
  } catch {
    return DEFAULT_WEBHOOK_URL;
  }
}

export function getSavedSheetUrl(): string {
  try {
    const envUrl = (
      (import.meta as any).env?.VITE_GOOGLE_SHEET_URL ||
      (import.meta as any).env?.VITE_GOOGLE_SHEET_ID ||
      ''
    ).trim();
    const stored = localStorage.getItem(STORAGE_SHEET_KEY) || '';
    return stored || envUrl || '';
  } catch {
    return '';
  }
}

export function saveSheetUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_SHEET_KEY, url.trim());
  } catch (e) {
    console.warn('Lỗi lưu Google Sheet URL:', e);
  }
}

/**
 * Trích xuất Spreadsheet ID từ URL Google Sheet
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{30,60}$/.test(url.trim())) return url.trim();
  return null;
}

/**
 * Chuẩn hóa cảm xúc từ văn bản tiếng Việt sang EmotionType
 */
export function normalizeEmotion(raw?: string): EmotionType {
  if (!raw) return 'vui_ve';
  const norm = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('buon')) return 'buon_ba';
  if (norm.includes('lo')) return 'lo_lang';
  if (norm.includes('tuc') || norm.includes('gian')) return 'tuc_gian';
  if (norm.includes('kho') || norm.includes('ngai')) return 'kho_noi';
  return 'vui_ve';
}

/**
 * Chuẩn hóa phân loại gửi
 */
export function normalizeCategory(raw?: string): SubmissionCategory {
  if (!raw) return 'chia_se';
  const low = raw.toLowerCase().trim();
  if (low.includes('ghi_am') || low.includes('ghi âm') || low.includes('âm thanh') || low.includes('audio')) return 'ghi_am';
  if (low.includes('hinh_anh') || low.includes('hình ảnh') || low.includes('tranh') || low.includes('ảnh') || low.includes('video')) return 'hinh_anh';
  if (low.includes('loi_nhan') || low.includes('lời nhắn') || low.includes('nhắn nhủ')) return 'loi_nhan';
  if (low.includes('khan_cap') || low.includes('khẩn cấp') || low.includes('sos')) return 'khan_cap';
  return 'chia_se';
}

/**
 * Chuẩn hóa trạng thái xử lý
 */
export function normalizeStatus(raw?: string): ProcessingStatus {
  if (!raw) return 'moi_tiep_nhan';
  const norm = raw.toLowerCase();
  if (norm.includes('xem') || norm.includes('dang')) return 'dang_xem_xet';
  if (norm.includes('gap') || norm.includes('trao doi')) return 'can_trao_doi';
  if (norm.includes('xong') || norm.includes('ho tro')) return 'da_ho_tro';
  return 'moi_tiep_nhan';
}

/**
 * Phân tích đối tượng bảng Google Visualization table (dùng chung cho cả GViz JSON và GViz JSONP)
 */
export function parseGvizTableObject(data: any): StudentSubmission[] {
  if (!data || !data.table) return [];
  const cols = data.table.cols || [];
  const rows = data.table.rows || [];

  const colMap: Record<string, number> = {};
  cols.forEach((col: any, idx: number) => {
    const label = (col.label || '').toLowerCase().trim();
    if (label.includes('stt')) colMap['stt'] = idx;
    else if (label.includes('mã')) colMap['code'] = idx;
    else if (label.includes('tên')) colMap['name'] = idx;
    else if (label.includes('lớp')) colMap['class'] = idx;
    else if (label.includes('cảm xúc')) colMap['emotion'] = idx;
    else if (label.includes('thể loại')) colMap['category'] = idx;
    else if (label.includes('tiêu đề')) colMap['title'] = idx;
    else if (label.includes('nội dung')) colMap['content'] = idx;
    else if (label.includes('ghi âm')) colMap['audio'] = idx;
    else if (label.includes('hình ảnh') || label.includes('video') || label.includes('ảnh')) colMap['media'] = idx;
    else if (label.includes('ưu tiên') || label.includes('mức độ') || label.includes('sos')) colMap['priority'] = idx;
    else if (label.includes('trạng thái')) colMap['status'] = idx;
    else if (label.includes('ghi chú')) colMap['note'] = idx;
    else if (label.includes('thời gian') || label.includes('ngày')) colMap['time'] = idx;
  });

  const submissions: StudentSubmission[] = [];

  rows.forEach((r: any, rIdx: number) => {
    const c = r.c || [];
    const getVal = (colIndex: number | undefined, defaultIdx: number): string => {
      const idx = colIndex !== undefined ? colIndex : defaultIdx;
      const cell = c[idx];
      if (!cell) return '';
      return (cell.f !== undefined && cell.f !== null ? cell.f : cell.v !== undefined && cell.v !== null ? cell.v : '').toString().trim();
    };

    const secretCode = getVal(colMap['code'], 1) || (getVal(colMap['name'], 2) ? `TCX-${1000 + rIdx}` : '');
    if (!secretCode) return; // Bỏ qua dòng trống

    const studentName = getVal(colMap['name'], 2) || 'Ẩn danh';
    const studentClass = getVal(colMap['class'], 3);
    const emotionText = getVal(colMap['emotion'], 4);
    const category = normalizeCategory(getVal(colMap['category'], 5));
    const title = getVal(colMap['title'], 6) || 'Tâm sự của học sinh';
    const content = getVal(colMap['content'], 7);
    const audioUrl = getVal(colMap['audio'], 8);
    const mediaUrl = getVal(colMap['media'], 9);
    const priorityText = getVal(colMap['priority'], 10);
    const statusText = getVal(colMap['status'], 11);
    const note = getVal(colMap['note'], 12);
    const time = getVal(colMap['time'], 13) || new Date().toISOString().slice(0, 16).replace('T', ' ');

    const isUrgent = priorityText.toUpperCase().includes('SOS') || priorityText.toUpperCase().includes('KHẨN CẤP');

    let imageUrl: string | undefined = undefined;
    let videoUrl: string | undefined = undefined;
    if (mediaUrl) {
      const mLow = mediaUrl.toLowerCase();
      if (mLow.includes('video') || mLow.includes('.mp4') || mLow.includes('.webm')) {
        videoUrl = mediaUrl;
      } else {
        imageUrl = mediaUrl;
      }
    }

    submissions.push({
      id: `gviz-${rIdx}-${secretCode}`,
      secretCode,
      studentName,
      studentClass,
      emotion: normalizeEmotion(emotionText),
      category,
      title,
      content: content || 'Học sinh gửi tâm sự qua hệ thống.',
      audioUrl: audioUrl || undefined,
      imageUrl,
      videoUrl,
      isUrgent,
      status: normalizeStatus(statusText),
      teacherNote: note || undefined,
      timestamp: time,
      feedbacks: [],
    });
  });

  return submissions;
}

/**
 * Tải trực tiếp Google Sheet qua JSONP (Bỏ qua hoàn toàn CORS trên Vercel và mọi thiết bị di động/máy tính)
 */
export function fetchGvizViaJsonp(sheetId: string): Promise<StudentSubmission[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve([]);
    }

    const callbackName = `__gviz_cb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement('script');
    let isFinished = false;

    const timer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        cleanup();
        resolve([]);
      }
    }, 9000);

    const cleanup = () => {
      clearTimeout(timer);
      try {
        delete (window as any)[callbackName];
      } catch {}
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    (window as any)[callbackName] = (data: any) => {
      if (isFinished) return;
      isFinished = true;
      try {
        const subs = parseGvizTableObject(data);
        cleanup();
        resolve(subs);
      } catch (err) {
        console.warn('Lỗi phân tích JSONP data:', err);
        cleanup();
        resolve([]);
      }
    };

    script.onerror = () => {
      if (!isFinished) {
        isFinished = true;
        cleanup();
        resolve([]);
      }
    };

    script.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${callbackName}`;
    document.head.appendChild(script);
  });
}

/**
 * Phân tích dữ liệu bảng Google Sheets GViz JSON
 */
export function parseGvizData(gvizText: string): StudentSubmission[] {
  try {
    const jsonStr = gvizText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    const data = JSON.parse(jsonStr);
    return parseGvizTableObject(data);
  } catch (err) {
    console.warn('Lỗi phân tích GViz JSON:', err);
    return [];
  }
}

/**
 * Phân tích dữ liệu CSV từ Google Sheets
 */
export function parseCsvData(csvText: string): StudentSubmission[] {
  try {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = parseCsvRow(lines[0]);
    const colMap: Record<string, number> = {};
    headers.forEach((h, idx) => {
      const lower = h.toLowerCase().trim();
      if (lower.includes('stt')) colMap['stt'] = idx;
      else if (lower.includes('mã')) colMap['code'] = idx;
      else if (lower.includes('tên')) colMap['name'] = idx;
      else if (lower.includes('lớp')) colMap['class'] = idx;
      else if (lower.includes('cảm xúc')) colMap['emotion'] = idx;
      else if (lower.includes('thể loại')) colMap['category'] = idx;
      else if (lower.includes('tiêu đề')) colMap['title'] = idx;
      else if (lower.includes('nội dung')) colMap['content'] = idx;
      else if (lower.includes('ghi âm')) colMap['audio'] = idx;
      else if (lower.includes('hình ảnh') || lower.includes('video') || lower.includes('ảnh')) colMap['media'] = idx;
      else if (lower.includes('ưu tiên') || lower.includes('mức độ')) colMap['priority'] = idx;
      else if (lower.includes('trạng thái')) colMap['status'] = idx;
      else if (lower.includes('ghi chú')) colMap['note'] = idx;
      else if (lower.includes('thời gian') || lower.includes('ngày')) colMap['time'] = idx;
    });

    const submissions: StudentSubmission[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvRow(lines[i]);
      if (!row || row.length < 2) continue;

      const getVal = (colIdx: number | undefined, defIdx: number) => {
        const idx = colIdx !== undefined ? colIdx : defIdx;
        return (row[idx] || '').trim();
      };

      const secretCode = getVal(colMap['code'], 1);
      if (!secretCode) continue;

      const studentName = getVal(colMap['name'], 2) || 'Ẩn danh';
      const studentClass = getVal(colMap['class'], 3);
      const emotion = normalizeEmotion(getVal(colMap['emotion'], 4));
      const category = normalizeCategory(getVal(colMap['category'], 5));
      const title = getVal(colMap['title'], 6) || 'Tâm sự của học sinh';
      const content = getVal(colMap['content'], 7);
      const audioUrl = getVal(colMap['audio'], 8);
      const mediaUrl = getVal(colMap['media'], 9);
      const priority = getVal(colMap['priority'], 10);
      const status = normalizeStatus(getVal(colMap['status'], 11));
      const note = getVal(colMap['note'], 12);
      const time = getVal(colMap['time'], 13) || new Date().toISOString().slice(0, 16).replace('T', ' ');

      const isUrgent = priority.toUpperCase().includes('SOS') || priority.toUpperCase().includes('KHẨN CẤP');

      let imageUrl: string | undefined = undefined;
      let videoUrl: string | undefined = undefined;
      if (mediaUrl) {
        const mLow = mediaUrl.toLowerCase();
        if (mLow.includes('video') || mLow.includes('.webm') || mLow.includes('.mp4')) {
          videoUrl = mediaUrl;
        } else {
          imageUrl = mediaUrl;
        }
      }

      submissions.push({
        id: `csv-${i}-${secretCode}`,
        secretCode,
        studentName,
        studentClass,
        emotion,
        category,
        title,
        content: content || 'Học sinh gửi tâm sự qua hệ thống.',
        audioUrl: audioUrl || undefined,
        imageUrl,
        videoUrl,
        isUrgent,
        status,
        teacherNote: note || undefined,
        timestamp: time,
        feedbacks: [],
      });
    }

    return submissions;
  } catch (err) {
    console.warn('Lỗi phân tích CSV:', err);
    return [];
  }
}

function parseCsvRow(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Tải toàn bộ bài chia sẻ thực tế từ Google Sheet hoặc Google Apps Script
 */
export async function fetchSubmissionsFromGoogleSheet(options?: {
  webhookUrl?: string;
  sheetUrl?: string;
}): Promise<{ success: boolean; submissions: StudentSubmission[]; message: string }> {
  const webhookUrl = (options?.webhookUrl || getSavedWebhookUrl()).trim();
  const sheetUrl = (options?.sheetUrl || getSavedSheetUrl()).trim();

  // 1. Nếu có URL Google Sheet (hoặc ID), ưu tiên kết nối trực tiếp (100% hoạt động trên Vercel không cần server)
  const sheetId = extractSpreadsheetId(sheetUrl);
  if (sheetId) {
    // 1.1 Thử qua JSONP (Bỏ qua hoàn toàn CORS trên mọi trình duyệt/Vercel)
    try {
      const jsonpData = await fetchGvizViaJsonp(sheetId);
      if (jsonpData && jsonpData.length > 0) {
        return {
          success: true,
          submissions: jsonpData,
          message: `🎉 Đã kết nối và lấy thành công ${jsonpData.length} bài chia sẻ thực tế từ Google Sheet!`,
        };
      }
    } catch (e) {
      console.warn('Lỗi fetch GViz JSONP:', e);
    }

    // 1.2 Thử qua GViz JSON fetch
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
      const res = await fetch(gvizUrl);
      if (res.ok) {
        const text = await res.text();
        const parsed = parseGvizData(text);
        if (parsed.length > 0) {
          return {
            success: true,
            submissions: parsed,
            message: `🎉 Đã kết nối trực tiếp bảng tính Google Sheet và lấy thành công ${parsed.length} bài chia sẻ thực tế!`,
          };
        }
      }
    } catch (e) {
      console.warn('Lỗi fetch GViz trực tiếp:', e);
    }

    // 1.3 Thử qua CSV Export
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const res = await fetch(csvUrl);
      if (res.ok) {
        const text = await res.text();
        const parsed = parseCsvData(text);
        if (parsed.length > 0) {
          return {
            success: true,
            submissions: parsed,
            message: `🎉 Đã xuất và nạp thành công ${parsed.length} bài chia sẻ từ Google Sheet!`,
          };
        }
      }
    } catch (e) {
      console.warn('Lỗi fetch CSV trực tiếp:', e);
    }
  }

  // 2. Thử gọi qua Backend API server nếu có chạy proxy
  try {
    const apiRes = await fetch('/api/sync-google-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, sheetUrl }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.success && Array.isArray(data.submissions) && data.submissions.length > 0) {
        return {
          success: true,
          submissions: data.submissions,
          message: `Đã tự động lấy thành công ${data.submissions.length} bài chia sẻ thực tế từ Google Sheet!`,
        };
      }
    }
  } catch {
    // Backend API không phản hồi hoặc đang chạy client-only (Vercel)
  }

  // 3. Thử tải qua Google Apps Script Webhook nếu có doGet
  if (webhookUrl) {
    try {
      const fetchUrl = webhookUrl.includes('?')
        ? `${webhookUrl}&action=get_submissions&t=${Date.now()}`
        : `${webhookUrl}?action=get_submissions&t=${Date.now()}`;

      const res = await fetch(fetchUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.submissions && Array.isArray(data.submissions) && data.submissions.length > 0) {
          return {
            success: true,
            submissions: data.submissions,
            message: `Đã lấy thành công ${data.submissions.length} bài từ Google Apps Script Webhook!`,
          };
        }
      }
    } catch (e) {
      console.warn('Lỗi fetch Apps Script Webhook:', e);
    }
  }

  if (!sheetUrl) {
    return {
      success: false,
      submissions: [],
      message: 'Chưa có đường link Google Sheet. Thầy Cô vui lòng dán đường link Google Sheet của trường để Admin tự động tải tất cả dữ liệu thực tế về nhé!',
    };
  }

  return {
    success: false,
    submissions: [],
    message: 'Chưa tìm thấy bài mới trên Google Sheet. Thầy Cô hãy đảm bảo Google Sheet đã được bật chia sẻ quyền "Bất kỳ ai có đường liên kết đều có thể xem" nhé!',
  };
}

/**
 * Gộp danh sách bài mới lấy từ Google Sheet với danh sách hiện có, không bị mất dữ liệu
 */
export function mergeSubmissions(
  currentList: StudentSubmission[],
  fetchedList: StudentSubmission[]
): StudentSubmission[] {
  const map = new Map<string, StudentSubmission>();

  // Nạp danh sách hiện tại trước
  currentList.forEach((sub) => {
    if (sub && sub.secretCode) {
      map.set(sub.secretCode.trim().toUpperCase(), sub);
    }
  });

  // Nạp danh sách mới từ Google Sheet đè lên hoặc bổ sung vào
  fetchedList.forEach((newSub) => {
    if (!newSub || !newSub.secretCode) return;
    const key = newSub.secretCode.trim().toUpperCase();
    const existing = map.get(key);

    if (existing) {
      // Giữ lại audio/video dạng Base64 nội bộ nếu có chất lượng cao hơn
      map.set(key, {
        ...newSub,
        audioUrl: existing.audioUrl?.startsWith('data:') ? existing.audioUrl : newSub.audioUrl || existing.audioUrl,
        videoUrl: existing.videoUrl?.startsWith('data:') ? existing.videoUrl : newSub.videoUrl || existing.videoUrl,
        imageUrl: existing.imageUrl?.startsWith('data:') ? existing.imageUrl : newSub.imageUrl || existing.imageUrl,
        feedbacks: existing.feedbacks && existing.feedbacks.length > 0 ? existing.feedbacks : newSub.feedbacks,
      });
    } else {
      map.set(key, newSub);
    }
  });

  return Array.from(map.values());
}
