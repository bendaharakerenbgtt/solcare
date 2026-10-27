/**
 * GOOGLE APPS SCRIPT — SOLEFUL SOAKS! SHOES CARE
 *
 * Script ini dipasang pada akun Google khusus bisnis Soleful Soaks!
 * Mengizinkan upload aman dari backend/dashboard tanpa mengekspos
 * kredensial Google di browser pengguna.
 *
 * CARA SETUP:
 * 1. Buat folder di Google Drive bisnis, misal: "Soleful_Documentation_Photos".
 * 2. Buka https://script.google.com -> Buat Proyek Baru.
 * 3. Salin seluruh kode di bawah ini ke editor Apps Script.
 * 4. Ganti FOLDER_ID dan SHARED_SECRET di bawah.
 * 5. Klik "Deploy" -> "New deployment" -> Jenis "Web App".
 *    - Execute as: Me (akun Google pemilik Drive)
 *    - Who has access: Anyone (diautentikasi lewat secret token di header/payload)
 * 6. Salin URL Web App yang dihasilkan ke VITE_PHOTO_UPLOAD_ENDPOINT di .env.local
 */

const FOLDER_ID = 'GANTI_DENGAN_GOOGLE_DRIVE_FOLDER_ID';
const SHARED_SECRET = 'GANTI_DENGAN_TOKEN_RAHASIA_PANJANG_DAN_ACAK';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Validasi token rahasia
    if (!data.secret || data.secret !== SHARED_SECRET) {
      return responseJSON({ ok: false, error: 'Unauthorized: Invalid secret token' }, 401);
    }

    if (!data.base64 || !data.filename) {
      return responseJSON({ ok: false, error: 'Bad Request: Missing base64 or filename' }, 400);
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const decoded = Utilities.base64Decode(data.base64);
    const blob = Utilities.newBlob(decoded, data.mimeType || 'image/jpeg', data.filename);

    const file = folder.createFile(blob);
    file.setDescription(data.caption || 'Dokumentasi Soleful Soaks!');

    // Opsional: atur akses agar dapat dilihat (view-only) jika ingin ditampilkan ke publik
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return responseJSON({
      ok: true,
      fileId: file.getId(),
      folderId: FOLDER_ID,
      fileUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      name: file.getName(),
      size: file.getSize()
    });

  } catch (err) {
    return responseJSON({ ok: false, error: err.toString() }, 500);
  }
}

function doDelete(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.secret || data.secret !== SHARED_SECRET) {
      return responseJSON({ ok: false, error: 'Unauthorized' }, 401);
    }

    const file = DriveApp.getFileById(data.fileId);
    file.setTrashed(true); // Pindahkan ke trash untuk keamanan

    return responseJSON({ ok: true, fileId: data.fileId, status: 'trashed' });
  } catch (err) {
    return responseJSON({ ok: false, error: err.toString() }, 500);
  }
}

function responseJSON(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
