import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readSubmissions(): any[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn('Lỗi đọc submissions file:', err);
  }
  return [];
}

function writeSubmissions(subs: any[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(subs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Lỗi ghi submissions file:', err);
  }
}

// Trích xuất ID Spreadsheet
function extractSheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{30,60}$/.test(url.trim())) return url.trim();
  return null;
}

// Phân tích dòng CSV
function parseCsvRows(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
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
  });
}

// Phân tích phản hồi từ teacherNote trên server
function parseServerFeedbacks(note?: string, defaultStudentName?: string, studentReplyAudioUrl?: string): any[] {
  const feedbacks: any[] = [];
  if (note && note.trim()) {
    const parts = note.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);

    parts.forEach((part, idx) => {
      const urlMatch = part.match(/(https?:\/\/[^\s\]\)]+|data:audio\/[^\s\]\)]+)/);
      const audioUrlFromPart = urlMatch ? urlMatch[0].replace(/[\]\)\,\.]+$/, '') : undefined;
      const durationMatch = part.match(/\((\d+)\s*s\)/i);
      const duration = durationMatch ? parseInt(durationMatch[1], 10) : undefined;

      if (part.startsWith('[Bé nhắn lại]:') || part.startsWith('[Học sinh nhắn lại]:') || part.startsWith('[Bé:')) {
        const text = part.replace(/^\[(Bé nhắn lại|Học sinh nhắn lại|Bé)\]:\s*/, '').trim();
        feedbacks.push({
          id: `fb-note-student-${idx}-${text.slice(0, 10)}`,
          senderRole: 'student',
          senderName: defaultStudentName || 'Học sinh',
          teacherName: defaultStudentName || 'Học sinh',
          comment: text,
          timestamp: 'Trước đó',
          audioUrl: audioUrlFromPart || (idx === parts.length - 1 ? studentReplyAudioUrl : undefined),
          audioDuration: duration,
        });
      } else if (part.startsWith('[Bé gửi ghi âm') || part.startsWith('[Học sinh gửi ghi âm')) {
        feedbacks.push({
          id: `fb-note-student-audio-${idx}`,
          senderRole: 'student',
          senderName: defaultStudentName || 'Học sinh',
          teacherName: defaultStudentName || 'Học sinh',
          comment: 'Bé đã gửi một đoạn ghi âm giọng nói nhắn lại Thầy Cô.',
          timestamp: 'Trước đó',
          audioUrl: audioUrlFromPart || studentReplyAudioUrl,
          audioDuration: duration,
        });
      } else if (part.startsWith('[Cô ') || part.startsWith('[Thầy ') || part.startsWith('[Thầy Cô') || part.startsWith('[Admin')) {
        const match = part.match(/^\[([^\]]+)\]:\s*(.*)$/);
        const teacher = match ? match[1] : 'Thầy Cô Tư Vấn';
        const text = match ? match[2] : part;
        feedbacks.push({
          id: `fb-note-teacher-${idx}-${text.slice(0, 10)}`,
          senderRole: 'teacher',
          senderName: teacher,
          teacherName: teacher,
          comment: text,
          timestamp: 'Trước đó',
          audioUrl: audioUrlFromPart,
          audioDuration: duration,
        });
      } else if (part.length > 0) {
        feedbacks.push({
          id: `fb-note-gen-${idx}-${part.slice(0, 10)}`,
          senderRole: 'teacher',
          senderName: 'Thầy Cô Tư Vấn',
          teacherName: 'Thầy Cô Tư Vấn',
          comment: part,
          timestamp: 'Trước đó',
          audioUrl: audioUrlFromPart,
          audioDuration: duration,
        });
      }
    });
  }

  if (studentReplyAudioUrl && !feedbacks.some((f) => f.audioUrl === studentReplyAudioUrl)) {
    const studentFb = feedbacks.find((f) => f.senderRole === 'student');
    if (studentFb) {
      if (!studentFb.audioUrl) studentFb.audioUrl = studentReplyAudioUrl;
    } else {
      feedbacks.push({
        id: `fb-student-reply-audio-direct`,
        senderRole: 'student',
        senderName: defaultStudentName || 'Học sinh',
        teacherName: defaultStudentName || 'Học sinh',
        comment: 'Bé đã gửi một đoạn ghi âm giọng nói nhắn lại Thầy Cô.',
        timestamp: 'Trước đó',
        audioUrl: studentReplyAudioUrl,
      });
    }
  }

  return feedbacks;
}

// API: Lấy toàn bộ bài chia sẻ trên máy chủ
app.get('/api/submissions', (req, res) => {
  const subs = readSubmissions();
  res.json({ success: true, count: subs.length, submissions: subs });
});

// API: Học sinh nộp bài chia sẻ mới
app.post('/api/submissions', async (req, res) => {
  try {
    const newSub = req.body;
    if (!newSub || !newSub.secretCode) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    const subs = readSubmissions();
    const updated = [newSub, ...subs.filter((s: any) => s.secretCode !== newSub.secretCode)];
    writeSubmissions(updated);

    // Đồng bộ sang Google Apps Script trong nền
    const webhookUrl =
      process.env.APPS_SCRIPT_WEBHOOK_URL ||
      'https://script.google.com/macros/s/AKfycbzUlu-5ClA4_pNBqrdvKWfedNX6FQGjRMnsXF8IXdgZG6ru8SdHi2hyKclGA_Uyauw/exec';

    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          source: 'Tram Cam Xuc Tu Trai Tim',
          syncTime: new Date().toISOString(),
          ...newSub,
          submissions: [newSub],
        }),
      }).catch((e) => console.warn('Lỗi forward webhook ngầm:', e));
    }

    return res.json({ success: true, submission: newSub });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// API: Cập nhật phản hồi hoặc trạng thái của giáo viên
app.put('/api/submissions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    if (!updatedData) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    const subs = readSubmissions();
    const query = decodeURIComponent(id || '').trim().toUpperCase();
    const targetCode = (updatedData.secretCode || '').trim().toUpperCase();

    const index = subs.findIndex((s: any) => {
      const sId = (s.id || '').toString().trim().toUpperCase();
      const sCode = (s.secretCode || '').toString().trim().toUpperCase();
      return sId === query || sCode === query || (targetCode && sCode === targetCode);
    });

    let savedItem: any;
    if (index !== -1) {
      subs[index] = { ...subs[index], ...updatedData };
      savedItem = subs[index];
    } else {
      subs.unshift(updatedData);
      savedItem = updatedData;
    }

    writeSubmissions(subs);

    // Forward ngầm sang Apps Script Webhook
    const webhookUrl =
      process.env.APPS_SCRIPT_WEBHOOK_URL ||
      'https://script.google.com/macros/s/AKfycbzUlu-5ClA4_pNBqrdvKWfedNX6FQGjRMnsXF8IXdgZG6ru8SdHi2hyKclGA_Uyauw/exec';

    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          source: 'Tram Cam Xuc Tu Trai Tim',
          syncTime: new Date().toISOString(),
          ...savedItem,
          submissions: [savedItem],
        }),
      }).catch((e) => console.warn('Lỗi forward webhook ngầm PUT:', e));
    }

    return res.json({ success: true, submission: savedItem });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// API: Tự động kết nối và lấy dữ liệu trực tiếp từ Google Sheets / Google Apps Script
app.post('/api/sync-google-sheets', async (req, res) => {
  try {
    const defaultWebhook = 'https://script.google.com/macros/s/AKfycbzUlu-5ClA4_pNBqrdvKWfedNX6FQGjRMnsXF8IXdgZG6ru8SdHi2hyKclGA_Uyauw/exec';
    const webhookUrl = req.body.webhookUrl || process.env.APPS_SCRIPT_WEBHOOK_URL || defaultWebhook;
    const sheetUrl = req.body.sheetUrl || '';
    let fetchedRows: any[] = [];
    let methodUsed = '';

    // 1. Thử lấy từ Google Sheet qua CSV export
    const sheetId = extractSheetId(sheetUrl);
    if (sheetId) {
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        const csvRes = await fetch(csvUrl, { redirect: 'follow' });
        if (csvRes.ok) {
          const csvText = await csvRes.text();
          const rows = parseCsvRows(csvText);
          if (rows.length > 1) {
            const headers = rows[0];
            const colMap: Record<string, number> = {};
            headers.forEach((h, idx) => {
              const lower = (h || '').toLowerCase().trim();
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

            for (let i = 1; i < rows.length; i++) {
              const r = rows[i];
              const getVal = (colIdx: number | undefined, def: number) => {
                const idx = colIdx !== undefined ? colIdx : def;
                return (r[idx] || '').trim();
              };

              const code = getVal(colMap['code'], 1);
              if (!code) continue;

              const mediaUrl = getVal(colMap['media'], 9);
              const isVideo = mediaUrl.toLowerCase().includes('video') || mediaUrl.toLowerCase().includes('.mp4');

              fetchedRows.push({
                id: `sheet-${i}-${code}`,
                secretCode: code,
                studentName: getVal(colMap['name'], 2) || 'Ẩn danh',
                studentClass: getVal(colMap['class'], 3) || '',
                emotion: getVal(colMap['emotion'], 4) || 'vui_ve',
                category: getVal(colMap['category'], 5) || 'Chia sẻ',
                title: getVal(colMap['title'], 6) || 'Tâm sự của học sinh',
                content: getVal(colMap['content'], 7) || 'Học sinh gửi tâm sự qua hệ thống.',
                audioUrl: getVal(colMap['audio'], 8) || undefined,
                imageUrl: !isVideo && mediaUrl ? mediaUrl : undefined,
                videoUrl: isVideo && mediaUrl ? mediaUrl : undefined,
                isUrgent: getVal(colMap['priority'], 10).toUpperCase().includes('SOS'),
                status: getVal(colMap['status'], 11) || 'moi_tiep_nhan',
                teacherNote: getVal(colMap['note'], 12) || undefined,
                timestamp: getVal(colMap['time'], 13) || new Date().toISOString().slice(0, 16).replace('T', ' '),
                feedbacks: [],
              });
            }
            methodUsed = 'Google Sheet CSV Export';
          }
        }
      } catch (errSheet) {
        console.warn('Lỗi lấy dữ liệu từ Google Sheet URL:', errSheet);
      }
    }

    // 2. Thử lấy từ Google Apps Script Webhook nếu phương án 1 chưa có dữ liệu
    if (fetchedRows.length === 0 && webhookUrl) {
      try {
        const scriptRes = await fetch(webhookUrl, { redirect: 'follow' });
        if (scriptRes.ok) {
          try {
            const data = await scriptRes.json();
            if (data && Array.isArray(data.submissions) && data.submissions.length > 0) {
              fetchedRows = data.submissions;
              methodUsed = 'Google Apps Script Webhook';
            }
          } catch (jsonErr) {
            console.warn('Lỗi parse JSON từ Google Apps Script:', jsonErr);
          }
        }
      } catch (errHook) {
        console.warn('Lỗi fetch Google Apps Script:', errHook);
      }
    }

    // Gộp bài chia sẻ vào danh sách máy chủ
    const currentSubs = readSubmissions();
    const map = new Map<string, any>();
    currentSubs.forEach((s: any) => {
      if (s.secretCode) map.set(s.secretCode.trim().toUpperCase(), s);
    });

    fetchedRows.forEach((newS: any) => {
      if (!newS.secretCode) return;
      const key = newS.secretCode.trim().toUpperCase();
      const existing = map.get(key);
      const existingNote = (existing?.teacherNote || '').trim();
      const incomingNote = (newS?.teacherNote || '').trim();
      const bestNote = existingNote.length >= incomingNote.length ? existingNote : incomingNote;

      if (existing) {
        const mergedFbMap = new Map();
        (existing.feedbacks || []).forEach((f: any) => mergedFbMap.set(f.id, f));
        (newS.feedbacks || []).forEach((f: any) => {
          if (!mergedFbMap.has(f.id)) mergedFbMap.set(f.id, f);
        });
        let finalFbs = Array.from(mergedFbMap.values());
        if (finalFbs.length === 0 && bestNote) {
          finalFbs = parseServerFeedbacks(bestNote, newS.studentName || existing.studentName);
        }

        map.set(key, {
          ...existing,
          ...newS,
          teacherNote: bestNote,
          feedbacks: finalFbs,
        });
      } else {
        const fbs = (!newS.feedbacks || newS.feedbacks.length === 0) && bestNote
          ? parseServerFeedbacks(bestNote, newS.studentName)
          : (newS.feedbacks || []);
        map.set(key, { ...newS, teacherNote: bestNote, feedbacks: fbs });
      }
    });

    const merged = Array.from(map.values());
    writeSubmissions(merged);

    return res.json({
      success: true,
      count: merged.length,
      newFetchedCount: fetchedRows.length,
      method: methodUsed,
      submissions: merged,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tram Cam Xuc Fullstack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
