/**
 * Các hàm hỗ trợ xử lý và hiển thị link Google Drive (Audio, Hình ảnh, Video)
 * được đồng bộ từ Google Sheets / Google Apps Script
 */

export function isGoogleDriveUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('googleusercontent.com');
}

export function extractDriveFileId(url?: string): string | null {
  if (!url) return null;
  // Khớp định dạng: /file/d/{ID}/view hoặc ?id={ID} hoặc /d/{ID}
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  return null;
}

export function getDriveThumbnailUrl(url?: string): string {
  if (!url) return '';
  const fileId = extractDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }
  return url;
}

export function getDriveDirectStreamUrl(url?: string): string {
  if (!url) return '';
  const fileId = extractDriveFileId(url);
  if (fileId) {
    return `/api/audio-proxy?id=${fileId}`;
  }
  return url;
}

export function getPlayableAudioUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:audio/') || url.startsWith('blob:') || url.startsWith('/api/audio-proxy')) {
    return url;
  }
  if (isGoogleDriveUrl(url)) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
      return `/api/audio-proxy?id=${fileId}`;
    }
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/audio-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function getDrivePreviewUrl(url?: string): string {
  if (!url) return '';
  const fileId = extractDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return url;
}
