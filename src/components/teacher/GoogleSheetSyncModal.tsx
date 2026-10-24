import React, { useState } from 'react';
import { 
  Sheet, Copy, Check, ExternalLink, RefreshCw, X, ShieldCheck, 
  CheckCircle2, AlertCircle, Folder, FileAudio, FileImage, Sparkles 
} from 'lucide-react';
import { StudentSubmission } from '../../types/emotion';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: StudentSubmission[];
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  submissions,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return (
      localStorage.getItem('tram_cam_xuc_webhook_url') ||
      'https://script.google.com/macros/s/AKfycbwdLkyRxhPvjDvtk6K-fbrV6zInYP_hgPE0fd_lprNoPuNB6Nbum1cznD_jtXA_x34/exec'
    );
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // MÃ NGUỒN CHUẨN GOOGLE APPS SCRIPT (Code.gs)
  const appsScriptCode = `/**
 * ============================================================================
 * TRẠM CẢM XÚC TỪ TRÁI TIM - GOOGLE APPS SCRIPT (Code.gs)
 * ============================================================================
 * Tự động đồng bộ dữ liệu chia sẻ của học sinh vào Google Sheet &
 * Tự động giải mã Audio / Ảnh / Video Base64 lưu vào Google Drive thư mục:
 * "Trạm Cảm Xúc - Tệp Đính Kèm" với quyền xem ANYONE_WITH_LINK.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var rawContents = e.postData.contents;
    var data = JSON.parse(rawContents);
    var submissions = data.submissions || [data];

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName("Dữ Liệu Học Sinh") || spreadsheet.getActiveSheet();
    sheet.setName("Dữ Liệu Học Sinh");

    // 1. TẠO HOẶC LẤY THƯ MỤC TRÊN GOOGLE DRIVE
    var folderName = "Trạm Cảm Xúc - Tệp Đính Kèm";
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 2. TỰ ĐỘNG ĐỌC VÀ CĂN CHỈNH ĐÚNG CÁC CỘT THEO BẢNG TÍNH CỦA TRƯỜNG
    var numCols = sheet.getLastColumn();
    if (numCols === 0) {
      // Nếu trang tính chưa có cột nào, tạo đúng thứ tự cột chuẩn
      var headers = [
        "STT",
        "Mã bí mật",
        "Tên học sinh",
        "Lớp",
        "Cảm xúc",
        "Thể loại",
        "Tiêu đề",
        "Nội dung chia sẻ",
        "Link Ghi Âm Drive",
        "Link Hình Ảnh / Video Drive",
        "Mức độ ưu tiên",
        "Trạng thái xử lý",
        "Ghi chú của Thầy Cô"
      ];
      sheet.appendRow(headers);
      numCols = headers.length;

      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold")
        .setBackground("#FFE4E6")
        .setFontColor("#881337")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");
      sheet.setRowHeight(1, 35);
      sheet.setFrozenRows(1);
    }

    // Đọc danh sách tiêu đề thực tế trên Dòng 1 của bảng tính
    var existingHeaders = sheet.getRange(1, 1, 1, Math.max(numCols, 12)).getValues()[0];
    var colMap = {};
    for (var c = 0; c < existingHeaders.length; c++) {
      var h = (existingHeaders[c] || "").toString().toLowerCase().trim();
      if (h.indexOf("stt") !== -1) colMap["stt"] = c;
      else if (h.indexOf("mã") !== -1) colMap["code"] = c;
      else if (h.indexOf("tên") !== -1) colMap["name"] = c;
      else if (h.indexOf("lớp") !== -1) colMap["class"] = c;
      else if (h.indexOf("cảm xúc") !== -1) colMap["emotion"] = c;
      else if (h.indexOf("thể loại") !== -1) colMap["category"] = c;
      else if (h.indexOf("tiêu đề") !== -1) colMap["title"] = c;
      else if (h.indexOf("nội dung") !== -1) colMap["content"] = c;
      else if (h.indexOf("ghi âm") !== -1) colMap["audio"] = c;
      else if (h.indexOf("hình ảnh") !== -1 || h.indexOf("video") !== -1 || h.indexOf("ảnh") !== -1) colMap["media"] = c;
      else if (h.indexOf("ưu tiên") !== -1 || h.indexOf("mức độ") !== -1) colMap["priority"] = c;
      else if (h.indexOf("trạng thái") !== -1) colMap["status"] = c;
      else if (h.indexOf("ghi chú") !== -1) colMap["note"] = c;
    }

    var processedCount = 0;

    // 3. XỬ LÝ TỪNG BÀI CHIA SẺ VÀ LƯU VÀO ĐÚNG CỘT
    for (var i = 0; i < submissions.length; i++) {
      var item = submissions[i];
      var secretCode = item.secretCode || ("TCX-" + Math.floor(1000 + Math.random() * 9000));

      // Xử lý File Âm Thanh Base64 (audioBase64 hoặc audioUrl)
      var driveAudioUrl = "";
      var audioData = item.audioBase64 || item.audioUrl;
      if (audioData && audioData.indexOf("base64,") !== -1) {
        try {
          var audioParts = audioData.split("base64,");
          var header = audioParts[0];
          var audioMime = header.indexOf(":") !== -1 ? header.split(":")[1].split(";")[0] : "audio/webm";
          var audioBytes = Utilities.base64Decode(audioParts[1]);
          var audioFileName = "GhiAm_" + secretCode + "_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss") + ".webm";
          var audioBlob = Utilities.newBlob(audioBytes, audioMime, audioFileName);
          var audioFile = targetFolder.createFile(audioBlob);
          audioFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          driveAudioUrl = audioFile.getUrl();
        } catch (errAudio) {
          driveAudioUrl = "Lỗi lưu audio: " + errAudio.toString();
        }
      }

      // Xử lý File Hình Ảnh / Video Base64 (photoBase64, videoBase64, imageUrl hoặc videoUrl)
      var driveImageUrl = "";
      var mediaData = item.photoBase64 || item.videoBase64 || item.imageUrl || item.videoUrl;
      if (mediaData && mediaData.indexOf("base64,") !== -1) {
        try {
          var mediaParts = mediaData.split("base64,");
          var mHeader = mediaParts[0];
          var mediaMime = mHeader.indexOf(":") !== -1 ? mHeader.split(":")[1].split(";")[0] : "image/jpeg";
          var isVideo = mediaMime.indexOf("video") !== -1;
          var ext = isVideo ? ".webm" : ".jpg";
          var prefix = isVideo ? "Video_" : "HinhAnh_";
          var mediaBytes = Utilities.base64Decode(mediaParts[1]);
          var mediaFileName = prefix + secretCode + "_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss") + ext;
          var mediaBlob = Utilities.newBlob(mediaBytes, mediaMime, mediaFileName);
          var mediaFile = targetFolder.createFile(mediaBlob);
          mediaFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          driveImageUrl = mediaFile.getUrl();
        } catch (errMedia) {
          driveImageUrl = "Lỗi lưu tệp: " + errMedia.toString();
        }
      }

      var nextRow = sheet.getLastRow() + 1;
      var priorityText = item.isUrgent ? "KHẨN CẤP (SOS)" : "Bình thường";

      // Xây dựng hàng dữ liệu: Căn chỉnh theo cấu trúc động của bảng tính
      var targetLength = Math.max(existingHeaders.length, 12);
      var rowData = new Array(targetLength).fill("");

      if (colMap["stt"] !== undefined) rowData[colMap["stt"]] = nextRow - 1;
      else rowData[0] = nextRow - 1;

      if (colMap["code"] !== undefined) rowData[colMap["code"]] = secretCode;
      else rowData[1] = secretCode;

      if (colMap["name"] !== undefined) rowData[colMap["name"]] = item.studentName || "Ẩn danh";
      else rowData[2] = item.studentName || "Ẩn danh";

      if (colMap["class"] !== undefined) rowData[colMap["class"]] = item.studentClass || "Chưa cung cấp";
      else rowData[3] = item.studentClass || "Chưa cung cấp";

      if (colMap["emotion"] !== undefined) rowData[colMap["emotion"]] = item.emotion || "";
      else rowData[4] = item.emotion || "";

      if (colMap["category"] !== undefined) rowData[colMap["category"]] = item.category || "Chia sẻ";
      else rowData[5] = item.category || "Chia sẻ";

      if (colMap["title"] !== undefined) rowData[colMap["title"]] = item.title || "";
      else rowData[6] = item.title || "";

      if (colMap["content"] !== undefined) rowData[colMap["content"]] = item.content || "";
      else rowData[7] = item.content || "";

      // Điền Link Ghi Âm & Link Hình Ảnh vào đúng cột
      if (colMap["audio"] !== undefined) {
        rowData[colMap["audio"]] = driveAudioUrl;
      }
      if (colMap["media"] !== undefined) {
        rowData[colMap["media"]] = driveImageUrl || (colMap["audio"] === undefined ? driveAudioUrl : "");
      } else if (colMap["audio"] === undefined) {
        // Nếu chỉ có 1 cột đa phương tiện
        rowData[8] = driveImageUrl || driveAudioUrl;
      }

      if (colMap["priority"] !== undefined) rowData[colMap["priority"]] = priorityText;
      else if (rowData.length > 9) rowData[rowData.length - 3] = priorityText;

      if (colMap["status"] !== undefined) rowData[colMap["status"]] = item.status || "Mới tiếp nhận";
      else if (rowData.length > 10) rowData[rowData.length - 2] = item.status || "Mới tiếp nhận";

      if (colMap["note"] !== undefined) rowData[colMap["note"]] = item.teacherNote || "";
      else if (rowData.length > 11) rowData[rowData.length - 1] = item.teacherNote || "";

      sheet.appendRow(rowData);

      // Nếu là trường hợp khẩn cấp SOS, tô nền đỏ cảnh báo
      if (item.isUrgent) {
        sheet.getRange(nextRow, 1, 1, rowData.length)
          .setBackground("#FEE2E2")
          .setFontColor("#991B1B");
      }

      processedCount++;
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đã lưu " + processedCount + " bản ghi vào Google Sheet & Drive!",
      processedCount: processedCount,
      folderUrl: targetFolder.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(appsScriptCode).catch(() => {});
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSaveWebhook = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem('tram_cam_xuc_webhook_url', url.trim());
  };

  const handleTriggerSync = async () => {
    if (!webhookUrl.trim()) {
      setSyncStatus({
        success: false,
        message: 'Thầy/Cô vui lòng dán Webhook URL của Google Apps Script trước khi đồng bộ nhé!',
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);

    try {
      // Đóng gói toàn bộ submissions cùng audioBase64 và photoBase64
      const packagedSubmissions = submissions.map((sub) => ({
        id: sub.id,
        secretCode: sub.secretCode,
        studentName: sub.studentName,
        studentClass: sub.studentClass,
        emotion: sub.emotion,
        category: sub.category,
        title: sub.title,
        content: sub.content,
        audioBase64: sub.audioUrl && sub.audioUrl.startsWith('data:') ? sub.audioUrl : undefined,
        photoBase64: sub.imageUrl && sub.imageUrl.startsWith('data:') ? sub.imageUrl : undefined,
        videoBase64: sub.videoUrl && sub.videoUrl.startsWith('data:') ? sub.videoUrl : undefined,
        isUrgent: sub.isUrgent,
        sosIssue: sub.sosIssue,
        status: sub.status,
        teacherNote: sub.teacherNote,
        timestamp: sub.timestamp,
      }));

      await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          source: 'Tram Cam Xuc Tu Trai Tim',
          syncTime: new Date().toISOString(),
          submissions: packagedSubmissions,
        }),
        mode: 'no-cors',
      });

      setSyncStatus({
        success: true,
        message: `Đã gửi toàn bộ ${submissions.length} bài chia sẻ (kèm audio & ảnh/video) tới Google Apps Script thành công! Các tệp đang được tải lên thư mục Drive "Trạm Cảm Xúc - Tệp Đính Kèm" và điền link vào trang tính.`,
      });
    } catch (err: unknown) {
      setSyncStatus({
        success: false,
        message: 'Lỗi khi gửi dữ liệu: ' + (err instanceof Error ? err.message : 'Vui lòng kiểm tra lại URL'),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-emerald-200 my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shadow-xs">
            <Sheet className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 font-heading">
              Tích Hợp Google Sheet & Google Drive
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Tự động lưu file ghi âm, hình ảnh/video vào Drive và điền link vào cột Google Sheet
            </p>
          </div>
        </div>

        {/* Thẻ mô tả tính năng nổi bật */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-4">
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2.5">
            <Folder className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-[11px] font-bold text-amber-900 leading-tight">
              Tự tạo thư mục <br />
              <span className="font-extrabold text-amber-700">"Trạm Cảm Xúc - Tệp Đính Kèm"</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 flex items-center gap-2.5">
            <FileAudio className="w-5 h-5 text-sky-600 shrink-0" />
            <div className="text-[11px] font-bold text-sky-900 leading-tight">
              Giải mã Audio Base64 <br />
              <span className="font-extrabold text-sky-700">Điền link Cột Link Ghi Âm</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center gap-2.5">
            <FileImage className="w-5 h-5 text-purple-600 shrink-0" />
            <div className="text-[11px] font-bold text-purple-900 leading-tight">
              Giải mã Ảnh/Video Base64 <br />
              <span className="font-extrabold text-purple-700">Điền link Cột Link Hình Ảnh</span>
            </div>
          </div>
        </div>

        {/* Khung mã nguồn Code.gs */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>Mã Nguồn Chuẩn Cho Google Sheet (Code.gs)</span>
            </label>
            <button
              type="button"
              onClick={handleCopyScript}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedScript ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedScript ? 'Đã sao chép vào bộ nhớ tạm!' : 'Bấm để sao chép Code.gs'}</span>
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 text-emerald-300 p-4 font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed shadow-inner">
            <pre>{appsScriptCode}</pre>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            (Thầy/Cô chỉ cần mở Google Sheet &gt; Tiện ích mở rộng &gt; Apps Script &gt; Dán đè toàn bộ mã &gt; Triển khai Web App quyền "Bất kỳ ai")
          </p>
        </div>

        {/* Ô cấu hình Webhook URL */}
        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Dán Webhook URL Google Apps Script vào đây:
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => handleSaveWebhook(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 text-xs font-mono bg-white"
            />
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Đang gửi...' : 'Đồng bộ ngay'}</span>
            </button>
          </div>
        </div>

        {syncStatus && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 mb-4 ${
              syncStatus.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {syncStatus.success ? <CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> : <AlertCircle size={18} className="shrink-0 text-rose-600" />}
            <span>{syncStatus.message}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
