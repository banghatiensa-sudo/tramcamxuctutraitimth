import React, { useState } from 'react';
import { 
  Sheet, Copy, Check, ExternalLink, RefreshCw, X, ShieldCheck, 
  CheckCircle2, AlertCircle, Folder, FileAudio, FileImage, Sparkles,
  Download, Upload, Link2
} from 'lucide-react';
import { StudentSubmission } from '../../types/emotion';
import { 
  fetchSubmissionsFromGoogleSheet, 
  mergeSubmissions,
  getSavedWebhookUrl,
  getSavedSheetUrl,
  STORAGE_WEBHOOK_KEY,
  STORAGE_SHEET_KEY
} from '../../utils/googleSheetsSync';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: StudentSubmission[];
  onSubmissionsUpdated?: (merged: StudentSubmission[]) => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  submissions,
  onSubmissionsUpdated,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(() => getSavedWebhookUrl());
  const [sheetUrl, setSheetUrl] = useState(() => getSavedSheetUrl());
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // MÃ NGUỒN CHUẨN GOOGLE APPS SCRIPT (Bao gồm CẢ doPost để lưu và doGet để lấy dữ liệu về Admin)
  const appsScriptCode = `/**
 * ============================================================================
 * TRẠM CẢM XÚC TỪ TRÁI TIM - GOOGLE APPS SCRIPT (Code.gs)
 * ============================================================================
 * 1. doPost(e): Tự động nhận bài học sinh, giải mã Audio/Video/Ảnh lưu Drive
 *    và ghi dòng mới vào Google Sheet.
 * 2. doGet(e): Tự động đọc toàn bộ bài học sinh từ Google Sheet trả về JSON
 *    cho giao diện Admin trên web hiển thị đầy đủ dữ liệu thực tế.
 */

// 1. HÀM ĐỌC DỮ LIỆU TỪ GOOGLE SHEET TRẢ VỀ CHO GIAO DIỆN ADMIN WEB
function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName("Dữ Liệu Học Sinh") || spreadsheet.getActiveSheet();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow <= 1 || lastCol === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        count: 0,
        submissions: []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      var h = (headers[c] || "").toString().toLowerCase().trim();
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
      else if (h.indexOf("thời gian") !== -1 || h.indexOf("ngày") !== -1) colMap["time"] = c;
    }

    var list = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      if (!row || row.every(function(cell) { return cell === "" || cell === null; })) continue;

      var secretCode = (colMap["code"] !== undefined ? row[colMap["code"]] : row[1]) || ("TCX-" + (1000 + r));
      secretCode = secretCode.toString().trim();
      if (!secretCode) continue;

      var studentName = (colMap["name"] !== undefined ? row[colMap["name"]] : row[2]) || "Ẩn danh";
      var studentClass = (colMap["class"] !== undefined ? row[colMap["class"]] : row[3]) || "";
      var emotionRaw = (colMap["emotion"] !== undefined ? row[colMap["emotion"]] : row[4]) || "vui_ve";
      var category = (colMap["category"] !== undefined ? row[colMap["category"]] : row[5]) || "Chia sẻ";
      var title = (colMap["title"] !== undefined ? row[colMap["title"]] : row[6]) || "Tâm sự của học sinh";
      var content = (colMap["content"] !== undefined ? row[colMap["content"]] : row[7]) || "";
      var audioUrl = (colMap["audio"] !== undefined ? row[colMap["audio"]] : "") || "";
      var mediaUrl = (colMap["media"] !== undefined ? row[colMap["media"]] : "") || "";
      var priorityText = (colMap["priority"] !== undefined ? row[colMap["priority"]] : "") || "";
      var statusText = (colMap["status"] !== undefined ? row[colMap["status"]] : "") || "Mới tiếp nhận";
      var note = (colMap["note"] !== undefined ? row[colMap["note"]] : "") || "";
      var timeText = (colMap["time"] !== undefined ? row[colMap["time"]] : "") || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm");

      var emotion = "vui_ve";
      var emLower = emotionRaw.toString().toLowerCase();
      if (emLower.indexOf("buon") !== -1) emotion = "buon_ba";
      else if (emLower.indexOf("lo") !== -1) emotion = "lo_lang";
      else if (emLower.indexOf("tuc") !== -1 || emLower.indexOf("gian") !== -1) emotion = "tuc_gian";
      else if (emLower.indexOf("kho") !== -1) emotion = "kho_noi";

      var isUrgent = priorityText.toString().toUpperCase().indexOf("SOS") !== -1 || priorityText.toString().toUpperCase().indexOf("KHẨN CẤP") !== -1;

      var imageUrl = "";
      var videoUrl = "";
      var mLower = mediaUrl.toString().toLowerCase();
      if (mLower.indexOf("video") !== -1 || mLower.indexOf(".webm") !== -1 || mLower.indexOf(".mp4") !== -1) {
        videoUrl = mediaUrl.toString();
      } else if (mediaUrl) {
        imageUrl = mediaUrl.toString();
      }

      var replyAudioUrl = "";
      var matchReply = (note || "").match(/\[(?:Bé gửi ghi âm|Học sinh gửi ghi âm)[^\]]*\]:\s*(https?:\/\/[^\s\]\)]+|data:audio\/[^\s\]\)]+)/i);
      if (matchReply && matchReply[1]) {
        replyAudioUrl = matchReply[1].replace(/[\]\)\,\.]+$/, "");
      }

      list.push({
        id: "sheet-row-" + r + "-" + secretCode,
        secretCode: secretCode,
        studentName: studentName.toString(),
        studentClass: studentClass.toString(),
        emotion: emotion,
        category: category.toString(),
        title: title.toString(),
        content: content.toString(),
        audioUrl: audioUrl.toString() || undefined,
        studentReplyAudioUrl: replyAudioUrl || undefined,
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        isUrgent: isUrgent,
        status: statusText.toString(),
        teacherNote: note.toString(),
        timestamp: timeText.toString(),
        feedbacks: []
      });
    }

    list.reverse();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: list.length,
      submissions: list
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// 2. HÀM GHI BÀI CHIA SẺ MỚI & LƯU TỆP GHI ÂM/ẢNH/VIDEO/PHẢN HỒI VÀO GOOGLE DRIVE
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

    var folderName = "Trạm Cảm Xúc - Tệp Đính Kèm";
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var numCols = sheet.getLastColumn();
    if (numCols === 0) {
      var headers = [
        "STT", "Mã bí mật", "Tên học sinh", "Lớp", "Cảm xúc", "Thể loại",
        "Tiêu đề", "Nội dung chia sẻ", "Link Ghi Âm Drive", "Link Hình Ảnh / Video Drive",
        "Mức độ ưu tiên", "Trạng thái xử lý", "Ghi chú của Thầy Cô", "Thời gian gửi"
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

    var existingHeaders = sheet.getRange(1, 1, 1, Math.max(numCols, 14)).getValues()[0];
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
      else if (h.indexOf("thời gian") !== -1 || h.indexOf("ngày") !== -1) colMap["time"] = c;
    }

    var processedCount = 0;

    for (var i = 0; i < submissions.length; i++) {
      var item = submissions[i];
      var secretCode = item.secretCode || ("TCX-" + Math.floor(1000 + Math.random() * 9000));

      // 1. Lưu ghi âm bài gốc của học sinh vào Google Drive
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
      } else if (audioData && audioData.indexOf("http") === 0) {
        driveAudioUrl = audioData;
      }

      // 2. Lưu ghi âm học sinh phản hồi lại vào Google Drive
      var driveReplyAudioUrl = "";
      var replyAudioData = item.replyAudioBase64 || item.studentReplyAudioUrl;
      if (replyAudioData && replyAudioData.indexOf("base64,") !== -1) {
        try {
          var replyParts = replyAudioData.split("base64,");
          var rHeader = replyParts[0];
          var replyMime = rHeader.indexOf(":") !== -1 ? rHeader.split(":")[1].split(";")[0] : "audio/webm";
          var replyBytes = Utilities.base64Decode(replyParts[1]);
          var replyFileName = "GhiAm_PhanHoi_" + secretCode + "_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss") + ".webm";
          var replyBlob = Utilities.newBlob(replyBytes, replyMime, replyFileName);
          var replyFile = targetFolder.createFile(replyBlob);
          replyFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          driveReplyAudioUrl = replyFile.getUrl();
        } catch (errReplyAudio) {
          driveReplyAudioUrl = "Lỗi lưu reply audio: " + errReplyAudio.toString();
        }
      } else if (replyAudioData && replyAudioData.indexOf("http") === 0) {
        driveReplyAudioUrl = replyAudioData;
      }

      // 3. Lưu hình ảnh hoặc video vào Google Drive
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
      } else if (mediaData && mediaData.indexOf("http") === 0) {
        driveImageUrl = mediaData;
      }

      var currentNote = item.teacherNote || "";
      if (driveReplyAudioUrl && currentNote.indexOf(driveReplyAudioUrl) === -1) {
        var replyTag = "[Bé gửi ghi âm: " + driveReplyAudioUrl + "]";
        currentNote = currentNote ? currentNote + " | " + replyTag : replyTag;
      }

      // 4. Kiểm tra xem mã bí mật này đã có dòng trong bảng chưa (tránh trùng lặp khi trao đổi qua lại)
      var existingRowIndex = -1;
      var curLastRow = sheet.getLastRow();
      if (curLastRow > 1) {
        var codeCol = colMap["code"] !== undefined ? colMap["code"] + 1 : 2;
        var codeRange = sheet.getRange(2, codeCol, curLastRow - 1, 1).getValues();
        for (var cIdx = 0; cIdx < codeRange.length; cIdx++) {
          if ((codeRange[cIdx][0] || "").toString().trim().toUpperCase() === secretCode.toUpperCase()) {
            existingRowIndex = cIdx + 2;
            break;
          }
        }
      }

      if (existingRowIndex !== -1) {
        // Cập nhật dòng hiện có
        if (colMap["note"] !== undefined && currentNote) {
          sheet.getRange(existingRowIndex, colMap["note"] + 1).setValue(currentNote);
        }
        if (colMap["status"] !== undefined && item.status) {
          sheet.getRange(existingRowIndex, colMap["status"] + 1).setValue(item.status);
        }
        if (colMap["audio"] !== undefined && driveAudioUrl) {
          sheet.getRange(existingRowIndex, colMap["audio"] + 1).setValue(driveAudioUrl);
        }
        if (colMap["media"] !== undefined && driveImageUrl) {
          sheet.getRange(existingRowIndex, colMap["media"] + 1).setValue(driveImageUrl);
        }
      } else {
        // Thêm dòng mới
        var nextRow = sheet.getLastRow() + 1;
        var priorityText = item.isUrgent ? "KHẨN CẤP (SOS)" : "Bình thường";
        var targetLength = Math.max(existingHeaders.length, 14);
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

        if (colMap["audio"] !== undefined) rowData[colMap["audio"]] = driveAudioUrl;
        if (colMap["media"] !== undefined) rowData[colMap["media"]] = driveImageUrl;
        if (colMap["priority"] !== undefined) rowData[colMap["priority"]] = priorityText;
        if (colMap["status"] !== undefined) rowData[colMap["status"]] = item.status || "Mới tiếp nhận";
        if (colMap["note"] !== undefined) rowData[colMap["note"]] = currentNote;
        if (colMap["time"] !== undefined) rowData[colMap["time"]] = item.timestamp || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm");

        sheet.appendRow(rowData);

        if (item.isUrgent) {
          sheet.getRange(nextRow, 1, 1, rowData.length)
            .setBackground("#FEE2E2")
            .setFontColor("#991B1B");
        }
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
    localStorage.setItem(STORAGE_WEBHOOK_KEY, url.trim());
  };

  const handleSaveSheetUrl = (url: string) => {
    setSheetUrl(url);
    localStorage.setItem(STORAGE_SHEET_KEY, url.trim());
  };

  // 1. LẤY TOÀN BỘ DỮ LIỆU TỪ GOOGLE SHEETS / DRIVE VỀ ADMIN
  const handlePullFromSheets = async () => {
    setIsPulling(true);
    setSyncStatus(null);

    try {
      const result = await fetchSubmissionsFromGoogleSheet({
        webhookUrl: webhookUrl.trim(),
        sheetUrl: sheetUrl.trim(),
      });

      if (result.success && result.submissions.length > 0) {
        const merged = mergeSubmissions(submissions, result.submissions);
        if (onSubmissionsUpdated) {
          onSubmissionsUpdated(merged);
        }
        setSyncStatus({
          success: true,
          message: `🎉 ${result.message} Đã cập nhật ${merged.length} bài trên giao diện Admin!`,
        });
      } else {
        setSyncStatus({
          success: false,
          message: result.message || 'Không tìm thấy bài chia sẻ nào trên Google Sheet. Thầy/Cô hãy kiểm tra đường link Google Sheet nhé!',
        });
      }
    } catch (err: unknown) {
      setSyncStatus({
        success: false,
        message: 'Lỗi khi lấy dữ liệu: ' + (err instanceof Error ? err.message : 'Vui lòng kiểm tra lại URL'),
      });
    } finally {
      setIsPulling(false);
    }
  };

  // 2. GỬI TẤT CẢ DỮ LIỆU LÊN GOOGLE SHEETS
  const handlePushToSheets = async () => {
    if (!webhookUrl.trim()) {
      setSyncStatus({
        success: false,
        message: 'Thầy/Cô vui lòng dán Webhook URL của Google Apps Script trước khi gửi nhé!',
      });
      return;
    }

    setIsPushing(true);
    setSyncStatus(null);

    try {
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
        audioUrl: sub.audioUrl,
        photoBase64: sub.imageUrl && sub.imageUrl.startsWith('data:') ? sub.imageUrl : undefined,
        imageUrl: sub.imageUrl,
        videoBase64: sub.videoUrl && sub.videoUrl.startsWith('data:') ? sub.videoUrl : undefined,
        videoUrl: sub.videoUrl,
        isUrgent: sub.isUrgent,
        sosIssue: sub.sosIssue,
        status: sub.status,
        teacherNote: sub.teacherNote,
        timestamp: sub.timestamp,
      }));

      await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          source: 'Tram Cam Xuc Tu Trai Tim',
          syncTime: new Date().toISOString(),
          submissions: packagedSubmissions,
        }),
        mode: 'no-cors',
      });

      setSyncStatus({
        success: true,
        message: `Đã gửi toàn bộ ${submissions.length} bài chia sẻ (kèm audio & ảnh/video) tới Google Apps Script & Google Sheet thành công!`,
      });
    } catch (err: unknown) {
      setSyncStatus({
        success: false,
        message: 'Lỗi khi gửi dữ liệu: ' + (err instanceof Error ? err.message : 'Vui lòng kiểm tra lại URL'),
      });
    } finally {
      setIsPushing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl p-5 md:p-7 shadow-2xl border-4 border-emerald-200 my-auto max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-10">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shadow-xs">
            <Sheet className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-slate-800 font-heading">
              Kết Nối & Tự Động Lấy Dữ Liệu Từ Google Sheet
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Admin tự động đồng bộ tất cả bài chia sẻ từ Google Sheet & Drive về web hiển thị rõ ràng
            </p>
          </div>
        </div>

        {/* 2 Nút hành động trực tiếp nổi bật */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={handlePullFromSheets}
            disabled={isPulling}
            className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <Download size={18} className={isPulling ? 'animate-bounce' : ''} />
            <div className="text-left">
              <div className="text-sm font-black">Lấy Dữ Liệu Từ Google Sheet Về Admin</div>
              <div className="text-[10px] text-emerald-100 font-normal">Tự động tải tất cả bài học sinh gửi để hiển thị</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handlePushToSheets}
            disabled={isPushing}
            className="p-4 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <Upload size={18} className={isPushing ? 'animate-bounce' : ''} />
            <div className="text-left">
              <div className="text-sm font-black">Gửi Toàn Bộ Bài Sang Google Sheet</div>
              <div className="text-[10px] text-sky-100 font-normal">Đẩy {submissions.length} bài chia sẻ lên Google Drive & Trang tính</div>
            </div>
          </button>
        </div>

        {syncStatus && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 mb-4 animate-in fade-in ${
              syncStatus.success
                ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-2 border-rose-300 text-rose-900'
            }`}
          >
            {syncStatus.success ? (
              <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={20} className="shrink-0 text-rose-600" />
            )}
            <span className="leading-relaxed">{syncStatus.message}</span>
          </div>
        )}

        {/* Cấu hình kết nối Google Sheet URL & Webhook URL */}
        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Link2 size={16} className="text-emerald-600" />
            <span>Địa Chỉ Bảng Tính Google Sheet Của Trường:</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              1. Đường link Google Sheet của trường (Chia sẻ quyền "Bất kỳ ai có đường liên kết đều có thể xem"):
            </label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => handleSaveSheetUrl(e.target.value)}
              placeholder="Ví dụ: https://docs.google.com/spreadsheets/d/1XyZ.../edit"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 text-xs font-mono bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              2. Webhook URL Google Apps Script (Nhận & gửi dữ liệu trực tiếp 2 chiều):
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => handleSaveWebhook(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 text-xs font-mono bg-white"
            />
          </div>
        </div>

        {/* Khung mã nguồn Code.gs nâng cấp 2 chiều (doGet + doPost) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>Mã Nguồn Chuẩn Apps Script Mới (Có Cả doGet và doPost)</span>
            </label>
            <button
              type="button"
              onClick={handleCopyScript}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedScript ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedScript ? 'Đã sao chép vào bộ nhớ!' : 'Bấm để sao chép Code.gs'}</span>
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 text-emerald-300 p-4 font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed shadow-inner">
            <pre>{appsScriptCode}</pre>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 font-medium leading-relaxed">
            💡 <strong>Hướng dẫn cập nhật:</strong> Mở Google Sheet &gt; <em>Tiện ích mở rộng</em> &gt; <em>Apps Script</em> &gt; Dán đè toàn bộ mã &gt; Bấm <em>Triển khai</em> &gt; <em>Quản lý bản triển khai</em> &gt; Chỉnh sửa phiên bản mới &gt; Quyền truy cập: <em>"Bất kỳ ai" (Anyone)</em>.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
