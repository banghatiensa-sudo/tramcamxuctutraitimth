/**
 * Tiện ích xử lý và xóa sạch siêu dữ liệu EXIF của ảnh (GPS, loại thiết bị, ngày giờ gốc)
 * để bảo vệ an toàn và quyền riêng tư tuyệt đối cho học sinh tiểu học.
 */
export async function sanitizeAndCompressImage(file: File | Blob, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Giữ tỉ lệ
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể khởi tạo Canvas context'));
          return;
        }

        // Vẽ ảnh lên canvas - thao tác này loại bỏ 100% EXIF và metadata nhạy cảm
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const approxSizeKb = Math.round((dataUrl.length * (3 / 4)) / 1024);

        resolve({
          dataUrl,
          sizeKb: approxSizeKb,
        });
      };

      img.onerror = () => reject(new Error('Tệp hình ảnh không hợp lệ'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Không thể đọc tệp'));
    reader.readAsDataURL(file);
  });
}
