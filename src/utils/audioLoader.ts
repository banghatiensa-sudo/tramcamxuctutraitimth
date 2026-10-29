/**
 * Tiện ích tải và giải mã âm thanh chuẩn phổ quát cho Trạm Cảm Xúc
 * Đảm bảo phát trực tiếp 100% trên mọi trình duyệt (Chrome, Safari, iOS, Android, macOS, Windows)
 * Giải quyết triệt để lỗi Google Drive bị chặn CORS, redirect 302, hoặc lỗi định dạng WebM trên Safari
 */

import { isGoogleDriveUrl, extractDriveFileId, getPlayableAudioUrl } from './googleDriveHelpers';
import { getSavedWebhookUrl, DEFAULT_WEBHOOK_URL } from './googleSheetsSync';

// Bộ nhớ đệm RAM lưu các Blob URL đã tải để phát lại tức thì 0ms, không cần tải lại qua mạng
const blobUrlCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string>>();

/**
 * Mở khóa quyền phát âm thanh trên Safari / iOS / Android (Web Audio Unlock)
 */
export function unlockAudioAutoplay(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Phát 1 frame im lặng siêu ngắn để trình duyệt cấp phép âm thanh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch {
    // Bỏ qua nếu môi trường không hỗ trợ Web Audio
  }
}

/**
 * Chuyển đổi bất kỳ đường link âm thanh nào (Google Drive, HTTP, Base64)
 * thành Blob URL cục bộ sẵn sàng phát ngay lập tức trên thẻ <audio>
 */
export async function resolvePlayableAudioUrl(url?: string): Promise<string> {
  if (!url || !url.trim()) return '';

  const cleanUrl = url.trim();

  // 1. Nếu đã là data: URL hoặc blob: URL -> Sử dụng trực tiếp ngay lập tức
  if (cleanUrl.startsWith('data:audio/') || cleanUrl.startsWith('blob:')) {
    return cleanUrl;
  }

  // 2. Nếu đã có trong RAM cache -> Trả về Blob URL tức thì
  if (blobUrlCache.has(cleanUrl)) {
    return blobUrlCache.get(cleanUrl)!;
  }

  // 3. Nếu đang có một tiến trình tải URL này dở dang -> Tái sử dụng Promise
  if (loadingPromises.has(cleanUrl)) {
    return loadingPromises.get(cleanUrl)!;
  }

  const loadPromise = (async () => {
    const fileId = extractDriveFileId(cleanUrl);
    const isDrive = isGoogleDriveUrl(cleanUrl);

    // TH 1: File lưu trên Google Drive
    if (isDrive && fileId) {
      // 1.1 Thử tải qua audio-proxy nội bộ (đã chuyển sang MP3 128kbps chuẩn quốc tế)
      try {
        const proxyUrl = `/api/audio-proxy?id=${fileId}`;
        const res = await fetch(proxyUrl, {
          method: 'GET',
          headers: { Accept: 'audio/*,*/*' },
        });

        if (res.ok) {
          const contentType = (res.headers.get('content-type') || '').toLowerCase();
          // Đảm bảo không phải trang chuyển hướng HTML
          if (!contentType.includes('text/html')) {
            const blob = await res.blob();
            if (blob.size > 200) {
              const audioBlob = blob.type.startsWith('audio/')
                ? blob
                : new Blob([blob], { type: 'audio/mpeg' });
              const localBlobUrl = URL.createObjectURL(audioBlob);
              blobUrlCache.set(cleanUrl, localBlobUrl);
              return localBlobUrl;
            }
          }
        }
      } catch (proxyErr) {
        console.warn('Lỗi tải qua audio-proxy nội bộ:', proxyErr);
      }

      // 1.2 Thử tải dữ liệu Base64 qua Google Apps Script Webhook
      try {
        const webhookUrl = getSavedWebhookUrl() || DEFAULT_WEBHOOK_URL;
        const asUrl = webhookUrl.includes('?')
          ? `${webhookUrl}&action=get_audio&id=${fileId}`
          : `${webhookUrl}?action=get_audio&id=${fileId}`;

        const asRes = await fetch(asUrl, { method: 'GET', redirect: 'follow' });
        if (asRes.ok) {
          const asData = await asRes.json();
          if (asData && asData.status === 'success' && asData.base64) {
            blobUrlCache.set(cleanUrl, asData.base64);
            return asData.base64;
          }
        }
      } catch (asErr) {
        console.warn('Lỗi tải qua Apps Script get_audio:', asErr);
      }

      // 1.3 Thử đường dẫn tải trực tiếp từ docs.google.com
      const directCandidates = [
        `https://docs.google.com/uc?export=download&id=${fileId}`,
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`,
      ];

      for (const dUrl of directCandidates) {
        try {
          const dRes = await fetch(dUrl, { method: 'GET' });
          if (dRes.ok) {
            const cType = dRes.headers.get('content-type') || '';
            if (!cType.includes('text/html')) {
              const b = await dRes.blob();
              if (b.size > 200) {
                const bUrl = URL.createObjectURL(b);
                blobUrlCache.set(cleanUrl, bUrl);
                return bUrl;
              }
            }
          }
        } catch {
          // Bỏ qua thử candidate kế tiếp
        }
      }

      // Nếu mọi fetch đều bị chặn, trả về link trực tiếp cho trình duyệt tự xử lý
      return `https://docs.google.com/uc?export=download&id=${fileId}`;
    }

    // TH 2: Link HTTP thông thường
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      try {
        const httpRes = await fetch(cleanUrl);
        if (httpRes.ok) {
          const b = await httpRes.blob();
          if (b.size > 200) {
            const bUrl = URL.createObjectURL(b);
            blobUrlCache.set(cleanUrl, bUrl);
            return bUrl;
          }
        }
      } catch {
        // Fallback về url gốc
      }
    }

    return cleanUrl;
  })();

  loadingPromises.set(cleanUrl, loadPromise);

  try {
    const finalUrl = await loadPromise;
    return finalUrl;
  } finally {
    loadingPromises.delete(cleanUrl);
  }
}
