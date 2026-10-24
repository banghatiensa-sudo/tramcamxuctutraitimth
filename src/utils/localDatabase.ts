import { StudentSubmission } from '../types/emotion';

const DB_NAME = 'TramCamXucDB';
const DB_VERSION = 1;
const STORE_NAME = 'submissions';
const LOCAL_STORAGE_KEY = 'tram_cam_xuc_submissions';

/**
 * Khởi tạo IndexedDB với quota rộng rãi (hàng trăm MB) để lưu trữ Video, Audio và Ảnh
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB không được hỗ trợ'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lưu toàn bộ danh sách submissions vào IndexedDB an toàn không lo tràn Quota
 */
export async function saveSubmissionsToIndexedDB(submissions: StudentSubmission[]): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Đọc các bản ghi hiện tại để bảo toàn videoUrl và audioUrl nếu bản ghi mới thiếu
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const oldMap = new Map<string, StudentSubmission>();
        const oldItems = getAllReq.result as StudentSubmission[];
        if (Array.isArray(oldItems)) {
          oldItems.forEach((item) => {
            if (item && item.id) {
              oldMap.set(item.id, item);
            }
          });
        }

        store.clear();
        submissions.forEach((sub) => {
          const existing = oldMap.get(sub.id);
          const preserved: StudentSubmission = {
            ...sub,
            videoUrl: sub.videoUrl || existing?.videoUrl,
            audioUrl: sub.audioUrl || existing?.audioUrl,
            imageUrl: sub.imageUrl || existing?.imageUrl,
          };
          store.put(preserved);
        });
      };

      getAllReq.onerror = () => {
        submissions.forEach((sub) => store.put(sub));
      };

      transaction.oncomplete = () => {
        db.close();
        resolve(true);
      };
      transaction.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('Lưu vào IndexedDB thất bại, fallback sang storage khác:', err);
    return false;
  }
}

/**
 * Lấy toàn bộ submissions từ IndexedDB
 */
export async function loadSubmissionsFromIndexedDB(): Promise<StudentSubmission[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        db.close();
        const results = request.result as StudentSubmission[];
        if (Array.isArray(results) && results.length > 0) {
          resolve(results);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Đọc từ IndexedDB thất bại:', err);
    return null;
  }
}

/**
 * Lưu an toàn vào LocalStorage (IndexedDB lưu bản đầy đủ không giới hạn, LocalStorage lưu dự phòng)
 */
export function safeSaveToLocalStorage(submissions: StudentSubmission[]) {
  try {
    // Thử lưu trực tiếp
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(submissions));
  } catch {
    // Nếu chạm giới hạn quota LocalStorage (~5MB), lọc bớt file video/ảnh dung lượng lớn trên LocalStorage
    // Trong khi đó IndexedDB vẫn lưu trữ trọn vẹn 100% video và audio
    try {
      const lightweightSubmissions = submissions.map((sub) => {
        const isVideoTooLarge = !!(sub.videoUrl && sub.videoUrl.length > 500000);
        const isImageTooLarge = !!(sub.imageUrl && sub.imageUrl.length > 1000000);
        const isAudioTooLarge = !!(sub.audioUrl && sub.audioUrl.length > 1000000);

        if (!isVideoTooLarge && !isImageTooLarge && !isAudioTooLarge) {
          return sub;
        }

        return {
          ...sub,
          videoUrl: isVideoTooLarge ? undefined : sub.videoUrl,
          imageUrl: isImageTooLarge ? undefined : sub.imageUrl,
          audioUrl: isAudioTooLarge ? undefined : sub.audioUrl,
          hasLargeMedia: true,
        };
      });

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweightSubmissions));
    } catch {
      try {
        const minimalSubmissions = submissions.slice(0, 10).map((s) => ({
          id: s.id,
          secretCode: s.secretCode,
          studentName: s.studentName,
          studentClass: s.studentClass,
          emotion: s.emotion,
          category: s.category,
          title: s.title,
          content: s.content,
          timestamp: s.timestamp,
          status: s.status,
          feedbacks: s.feedbacks,
        }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(minimalSubmissions));
      } catch {
        // Bỏ qua nếu LocalStorage hoàn toàn đầy, IndexedDB đã lưu trữ đầy đủ
      }
    }
  }
}

/**
 * Đọc an toàn từ LocalStorage
 */
export function safeLoadFromLocalStorage(): StudentSubmission[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
