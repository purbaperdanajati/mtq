// ===== KONFIGURASI =====
const SHEET_ID = '1OO7VUbHhUbsqHc_EbGQVaG2Jq6EkIaTLIbLsmFnAb94';
const FOLDER_ID = '1FHpgcmKbMrN84R29ZaVvHpNlh-AvA7_y';
const SHEET_NAME = 'Peserta';

// REGISTRATION TIME WINDOW (WIB = UTC+7)
const REGISTRATION_START = new Date('2025-10-22T00:00:00+07:00');
const REGISTRATION_END = new Date('2025-10-30T23:59:59+07:00');

// ===== ULTRA-FAST CONCURRENCY: MINIMAL LOCK TIME =====
// Strategi: Lock HANYA untuk duplicate check, BUKAN untuk nomor peserta
const LOCK_TIMEOUT_MS = 15000;      // 15 detik (singkat!)
const LOCK_WAIT_TIME_MS = 50;       // 50ms (super cepat retry)
const MAX_LOCK_ATTEMPTS = 300;      // Total: 15 detik / 50ms = 300x

// MAX PARTICIPANTS PER BRANCH
const MAX_PARTICIPANTS_PER_BRANCH = 62;

// ===== CABANG ORDER =====
const CABANG_ORDER = {
  'TA': { start: 1, end: 62, name: 'Tartil Al Qur\'an' },
  'TLA': { start: 63, end: 124, name: 'Tilawah Anak-anak' },
  'TLR': { start: 125, end: 186, name: 'Tilawah Remaja' },
  'TLD': { start: 187, end: 248, name: 'Tilawah Dewasa' },
  'QM': { start: 249, end: 310, name: 'Qira\'at Mujawwad' },
  'H1J': { start: 311, end: 372, name: 'Hafalan 1 Juz + Tilawah' },
  'H5J': { start: 373, end: 434, name: 'Hafalan 5 Juz + Tilawah' },
  'H10J': { start: 435, end: 496, name: 'Hafalan 10 Juz' },
  'H20J': { start: 497, end: 558, name: 'Hafalan 20 Juz' },
  'H30J': { start: 559, end: 620, name: 'Hafalan 30 Juz' },
  'TFI': { start: 621, end: 682, name: 'Tafsir Indonesia' },
  'TFA': { start: 683, end: 744, name: 'Tafsir Arab' },
  'TFE': { start: 745, end: 806, name: 'Tafsir Inggris' },
  'FAQ': { start: 1, end: 31, name: 'Fahm Al Qur\'an', prefix: 'F' },
  'SAQ': { start: 1, end: 31, name: 'Syarh Al Qur\'an', prefix: 'S' },
  'KN': { start: 1, end: 62, name: 'Kaligrafi Naskah', prefix: 'N' },
  'KH': { start: 63, end: 124, name: 'Kaligrafi Hiasan', prefix: 'H' },
  'KD': { start: 125, end: 186, name: 'Kaligrafi Dekorasi', prefix: 'D' },
  'KK': { start: 187, end: 248, name: 'Kaligrafi Kontemporer', prefix: 'K' },
  'KTIQ': { start: 1, end: 62, name: 'KTIQ', prefix: 'M' }
};

// ===== LOCK ACQUISITION ULTRA-FAST =====
function acquireLockWithRetry(lock, timeoutMs, waitMs, maxAttempts) {
  let attempts = 0;
  const startTime = new Date().getTime();
  
  while (attempts < maxAttempts) {
    try {
      if (lock.tryLock(timeoutMs)) {
        const elapsedMs = new Date().getTime() - startTime;
        Logger.log(`✓ Lock acquired on attempt ${attempts + 1} (${elapsedMs}ms)`);
        return true;
      }
    } catch (e) {
      Logger.log(`Lock attempt ${attempts + 1} error: ${e.message}`);
    }
    
    attempts++;
    const elapsedMs = new Date().getTime() - startTime;
    
    if (elapsedMs + waitMs > timeoutMs) {
      Logger.log(`✗ Lock timeout exceeded (${elapsedMs}ms)`);
      break;
    }
    
    Utilities.sleep(waitMs);
  }
  
  Logger.log(`✗ Could not acquire lock after ${attempts} attempts`);
  return false;
}

// ===== FUNGSI UTAMA - ULTRA OPTIMIZED =====
function doPost(e) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  const startTime = new Date().getTime();
  
  try {
    Logger.log('=== START doPost (ULTRA-FAST MODE) ===');
    
    // Check action untuk update row lengkap
    if (e.parameter.action === 'updateRow') {
      return updateCompleteRow(e);
    }
    
    if (e.parameter.action === 'uploadFiles') {
      return uploadFilesOnly(e);
    }
    
    if (e.parameter.action === 'updateStatus') {
      return updateRowStatus(parseInt(e.parameter.rowIndex), e.parameter.status, e.parameter.reason || '');
    }
    
    if (e.parameter.action === 'deleteRow') {
      return deleteRowData(parseInt(e.parameter.rowIndex));
    }
    
    // ===== VALIDATE REGISTRATION TIME (NO LOCK) =====
    Logger.log('Validating registration time...');
    const now = new Date();
    if (now < REGISTRATION_START || now > REGISTRATION_END) {
      Logger.log('ERROR: Registration outside time window');
      return createResponse(false, 'Pendaftaran hanya dapat dilakukan antara tanggal 29-30 Oktober 2025. Saat ini waktu pendaftaran telah ditutup atau belum dimulai.');
    }
    Logger.log('✓ Registration time valid');
    
    const formData = e.parameter;
    
    if (!formData.cabang || !formData.kecamatan) {
      Logger.log('ERROR: Missing cabang or kecamatan');
      return createResponse(false, 'Data cabang atau kecamatan tidak lengkap');
    }
    
    // ===== ACQUIRE LOCK UNTUK DUPLICATE CHECK ONLY =====
    Logger.log('Attempting to acquire lock for duplicate check...');
    lockAcquired = acquireLockWithRetry(lock, LOCK_TIMEOUT_MS, LOCK_WAIT_TIME_MS, MAX_LOCK_ATTEMPTS);
    
    if (!lockAcquired) {
      Logger.log('ERROR: Could not acquire lock');
      return createResponse(false, 'Server sedang sibuk menangani registrasi. Mohon coba lagi dalam beberapa detik.');
    }
    
    Logger.log('✓ Lock acquired successfully');
    
    // Buka spreadsheet DALAM LOCK
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      Logger.log('Creating new sheet: ' + SHEET_NAME);
      sheet = ss.insertSheet(SHEET_NAME);
    }
    
    if (sheet.getLastRow() === 0) {
      Logger.log('Adding headers to sheet');
      addHeaders(sheet);
    }
    
    // ===== CRITICAL: CHECK DUPLICATES ONLY =====
    Logger.log('Checking for duplicate NIK...');
    const nikList = formData.nikList ? JSON.parse(formData.nikList) : [];
    const duplicateCheck = checkDuplicates(sheet, nikList);
    
    if (!duplicateCheck.isValid) {
      Logger.log('Duplicate found: ' + duplicateCheck.message);
      lock.releaseLock();
      lockAcquired = false;
      return createResponse(false, duplicateCheck.message);
    }
    Logger.log('✓ No duplicates found');
    
    // ===== PREPARE ROW DATA (TANPA NOMOR PESERTA) =====
    Logger.log('Preparing row data...');
    const rowData = prepareRowData(formData, {}, sheet);
    
    // ===== APPEND DATA KE SHEET DALAM LOCK =====
    Logger.log('Appending data to sheet...');
    sheet.appendRow(rowData);
    const newRowIndex = sheet.getLastRow();
    Logger.log('✓ Data appended to row: ' + newRowIndex);
    
    // ===== RELEASE LOCK ASAP =====
    Logger.log('Releasing lock...');
    lock.releaseLock();
    lockAcquired = false;
    
    const lockDuration = new Date().getTime() - startTime;
    Logger.log(`✓ Lock released (duration: ${lockDuration}ms)`);
    
    // ===== FILE UPLOAD SETELAH LOCK RELEASED =====
    Logger.log('Processing file uploads (AFTER LOCK)...');
    const fileLinks = processFileUploads(e, formData, '');
    Logger.log('✓ Files processed: ' + Object.keys(fileLinks).length);
    
    // ===== UPDATE FILE LINKS (TIDAK PERLU LOCK) =====
    if (Object.keys(fileLinks).length > 0) {
      Logger.log('Updating file links...');
      updateFileLinksInSheet(sheet, newRowIndex, fileLinks);
      Logger.log('✓ File links updated');
    }
    
    const totalDuration = new Date().getTime() - startTime;
    Logger.log(`=== END doPost SUCCESS (total: ${totalDuration}ms) ===`);
    
    return createResponse(true, 'Registrasi berhasil!', '', {
      nik: formData.nik || '',
      nama: formData.nama || '',
      cabang: formData.cabang || '',
      timestamp: new Date().toLocaleString('id-ID')
    });
    
  } catch (error) {
    Logger.log('=== ERROR in doPost ===');
    Logger.log('Error: ' + error.message);
    return createResponse(false, 'Error: ' + error.toString());
  } 
  finally {
    if (lockAcquired) {
      try {
        lock.releaseLock();
        Logger.log('✓ Lock released in finally block');
      } catch (e) {
        Logger.log('Error releasing lock: ' + e.message);
      }
    }
  }
}

// ===== STUBS UNTUK doGet =====
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getData') {
    return getAllDataAsJSON();
  } else if (action === 'getRejectedData') {
    return getRejectedDataAsJSON();
  } else if (action === 'updateStatus') {
    const rowIndex = parseInt(e.parameter.rowIndex);
    const newStatus = e.parameter.status;
    const reason = e.parameter.reason || '';
    return updateRowStatus(rowIndex, newStatus, reason);
  } else if (action === 'deleteRow') {
    const rowIndex = parseInt(e.parameter.rowIndex);
    return deleteRowData(rowIndex);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: 'Invalid action'
  })).setMimeType(ContentService.MimeType.JSON);
}

function getAllDataAsJSON() {
  try {
    Logger.log('Getting all data from Peserta sheet');
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Sheet tidak ditemukan'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        headers: [],
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headerRange = sheet.getRange(1, 1, 1, lastCol);
    const headers = headerRange.getValues()[0];
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    const data = dataRange.getValues();
    
    Logger.log('Total rows: ' + data.length);
    
    const response = {
      success: true,
      headers: headers,
      data: data,
      totalRows: data.length
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in getAllDataAsJSON: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getRejectedDataAsJSON() {
  try {
    Logger.log('Getting rejected data from Peserta sheet');
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Sheet tidak ditemukan'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headerRange = sheet.getRange(1, 1, 1, lastCol);
    const headers = headerRange.getValues()[0];
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    const allData = dataRange.getValues();
    
    const nomorPesertaIdx = headers.indexOf('Nomor Peserta');
    const cabangIdx = headers.indexOf('Cabang Lomba');
    const kecamatanIdx = headers.indexOf('Kecamatan');
    const namaReguIdx = headers.indexOf('Nama Regu/Tim');
    const namaIdx = headers.indexOf('Nama Lengkap');
    const statusIdx = headers.indexOf('Status');
    const alasanIdx = headers.indexOf('Alasan Ditolak');
    
    const rejectedData = [];
    for (let i = 0; i < allData.length; i++) {
      const row = allData[i];
      if (row[statusIdx] === 'Ditolak') {
        rejectedData.push({
          nomorPeserta: row[nomorPesertaIdx] || '-',
          namaTimPeserta: row[namaReguIdx] && row[namaReguIdx] !== '-' ? row[namaReguIdx] : row[namaIdx],
          cabang: row[cabangIdx] || '-',
          kecamatan: row[kecamatanIdx] || '-',
          status: row[statusIdx] || '-',
          alasan: row[alasanIdx] || '-'
        });
      }
    }
    
    Logger.log('Rejected data count: ' + rejectedData.length);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: rejectedData,
      totalRows: rejectedData.length
    })).setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in getRejectedDataAsJSON: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateCompleteRow(e) {
  try {
    Logger.log('Updating complete row');
    const rowIndex = parseInt(e.parameter.rowIndex);
    const updatedData = JSON.parse(e.parameter.updatedData);
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Sheet tidak ditemukan'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const actualRow = rowIndex + 2;
    
    if (actualRow > sheet.getLastRow()) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Row tidak ditemukan'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    for (let field in updatedData) {
      const colIndex = headers.indexOf(field);
      if (colIndex !== -1) {
        sheet.getRange(actualRow, colIndex + 1).setValue(updatedData[field]);
      }
    }
    
    Logger.log('Row updated successfully at row ' + actualRow);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data berhasil diperbarui'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in updateCompleteRow: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function uploadFilesOnly(e) {
  try {
    Logger.log('Uploading files only');
    const nomorPeserta = e.parameter.nomorPeserta || '';
    const fileLinks = processFileUploads(e, e.parameter, nomorPeserta);
    
    Logger.log('Files uploaded: ' + Object.keys(fileLinks).length);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Files berhasil diupload',
      fileLinks: fileLinks
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in uploadFilesOnly: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateRowStatus(rowIndex, newStatus, reason) {
  try {
    Logger.log('Updating row ' + rowIndex + ' status to ' + newStatus);
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Sheet tidak ditemukan'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusIdx = headers.indexOf('Status');
    const alasanIdx = headers.indexOf('Alasan Ditolak');
    const actualRow = rowIndex + 2;
    
    if (actualRow > sheet.getLastRow()) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Row tidak ditemukan'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    sheet.getRange(actualRow, statusIdx + 1).setValue(newStatus);
    
    if (newStatus === 'Ditolak' && alasanIdx !== -1) {
      sheet.getRange(actualRow, alasanIdx + 1).setValue(reason || '-');
    } else if (alasanIdx !== -1) {
      sheet.getRange(actualRow, alasanIdx + 1).setValue('-');
    }
    
    Logger.log('Status updated successfully at row ' + actualRow);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Status berhasil diperbarui'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in updateRowStatus: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function deleteRowData(rowIndex) {
  try {
    Logger.log('Deleting row ' + rowIndex);
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Sheet tidak ditemukan'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const actualRow = rowIndex + 2;
    
    if (actualRow > sheet.getLastRow()) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Row tidak ditemukan'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    sheet.deleteRow(actualRow);
    
    Logger.log('Row deleted successfully');
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data berhasil dihapus'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in deleteRowData: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function checkDuplicates(sheet, nikList) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('No existing data, duplicate check passed');
      return { isValid: true };
    }
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const data = dataRange.getValues();
    
    Logger.log('Checking against ' + data.length + ' existing registrations');
    
    const kecamatanCol = 3;
    const cabangCol = 4;
    const nikCol = 7;
    const member1NikCol = 19;
    const member2NikCol = 31;
    const member3NikCol = 43;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowKecamatan = row[kecamatanCol];
      const rowCabang = row[cabangCol];
      
      const existingNiks = [
        row[nikCol],
        row[member1NikCol],
        row[member2NikCol],
        row[member3NikCol]
      ].filter(nik => nik && nik !== '-' && nik.toString().trim() !== '');
      
      for (let newNik of nikList) {
        if (newNik && newNik.trim() !== '') {
          const trimmedNewNik = newNik.trim();
          
          for (let existingNik of existingNiks) {
            const trimmedExistingNik = existingNik.toString().trim();
            
            if (trimmedExistingNik === trimmedNewNik) {
              const message = `NIK ${trimmedNewNik} sudah terdaftar di Kecamatan "${rowKecamatan}", Cabang "${rowCabang}". Setiap peserta hanya boleh mendaftar satu kali di seluruh cabang lomba.`;
              Logger.log('DUPLICATE NIK FOUND: ' + message);
              return {
                isValid: false,
                message: message
              };
            }
          }
        }
      }
    }
    
    Logger.log('No duplicates found');
    return { isValid: true };
    
  } catch (error) {
    Logger.log('Error in checkDuplicates: ' + error.message);
    return { 
      isValid: false, 
      message: 'Terjadi kesalahan saat validasi data. Silakan coba lagi atau hubungi admin.' 
    };
  }
}

function createResponse(success, message, nomorPeserta, details) {
  const response = {
    success: success,
    message: message
  };
  
  if (nomorPeserta) {
    response.nomorPeserta = nomorPeserta;
  }
  
  if (details) {
    response.details = details;
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function addHeaders(sheet) {
  const headers = [
    'No', 'Nomor Peserta', 'Timestamp', 'Kecamatan', 'Cabang Lomba', 'Batas Usia Max',
    'Nama Regu/Tim', 'NIK', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir',
    'Umur', 'Alamat', 'No Telepon', 'Email', 'Nama Rekening', 'No Rekening', 'Nama Bank',
    'Anggota Tim #1 - NIK', 'Anggota Tim #1 - Nama', 'Anggota Tim #1 - Jenis Kelamin',
    'Anggota Tim #1 - Tempat Lahir', 'Anggota Tim #1 - Tgl Lahir', 'Anggota Tim #1 - Umur',
    'Anggota Tim #1 - Alamat', 'Anggota Tim #1 - No Telepon', 'Anggota Tim #1 - Email',
    'Anggota Tim #1 - Nama Rekening', 'Anggota Tim #1 - No Rekening', 'Anggota Tim #1 - Nama Bank',
    'Anggota Tim #2 - NIK', 'Anggota Tim #2 - Nama', 'Anggota Tim #2 - Jenis Kelamin',
    'Anggota Tim #2 - Tempat Lahir', 'Anggota Tim #2 - Tgl Lahir', 'Anggota Tim #2 - Umur',
    'Anggota Tim #2 - Alamat', 'Anggota Tim #2 - No Telepon', 'Anggota Tim #2 - Email',
    'Anggota Tim #2 - Nama Rekening', 'Anggota Tim #2 - No Rekening', 'Anggota Tim #2 - Nama Bank',
    'Anggota Tim #3 - NIK', 'Anggota Tim #3 - Nama', 'Anggota Tim #3 - Jenis Kelamin',
    'Anggota Tim #3 - Tempat Lahir', 'Anggota Tim #3 - Tgl Lahir', 'Anggota Tim #3 - Umur',
    'Anggota Tim #3 - Alamat', 'Anggota Tim #3 - No Telepon', 'Anggota Tim #3 - Email',
    'Anggota Tim #3 - Nama Rekening', 'Anggota Tim #3 - No Rekening', 'Anggota Tim #3 - Nama Bank',
    'Link - Doc Surat Mandat Personal', 'Link - Doc KTP Personal', 'Link - Doc Sertifikat Personal',
    'Link - Doc Rekening Personal', 'Link - Doc Pas Photo Personal', 'Link - Doc Surat Mandat Team 1',
    'Link - Doc KTP Team 1', 'Link - Doc Sertifikat Team 1', 'Link - Doc Rekening Team 1',
    'Link - Doc Pas Photo Team 1', 'Link - Doc Surat Mandat Team 2', 'Link - Doc KTP Team 2',
    'Link - Doc Sertifikat Team 2', 'Link - Doc Rekening Team 2', 'Link - Doc Pas Photo Team 2',
    'Link - Doc Surat Mandat Team 3', 'Link - Doc KTP Team 3', 'Link - Doc Sertifikat Team 3',
    'Link - Doc Rekening Team 3', 'Link - Doc Pas Photo Team 3', 'Status', 'Alasan Ditolak'
  ];
  sheet.appendRow(headers);
}

function processFileUploads(e, formData, nomorPeserta) {
  const fileLinks = {};
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const timestamp = new Date().getTime();
  
  try {
    const allBlobs = e.parameters || e.parameter;
    Logger.log('Processing file blobs: ' + Object.keys(allBlobs).length);
    
    for (let key in allBlobs) {
      if (key.endsWith('_type') || key.endsWith('_name') || key === 'action' || key === 'nomorPeserta' || key === 'updatedData' || key === 'rowIndex') {
        continue;
      }
      
      if (key.startsWith('doc') || key.startsWith('teamDoc') || key.startsWith('Link')) {
        try {
          const base64Data = Array.isArray(allBlobs[key]) ? allBlobs[key][0] : allBlobs[key];
          if (base64Data && base64Data.length > 0) {
            const originalName = allBlobs[key + '_name'] ? (Array.isArray(allBlobs[key + '_name']) ? allBlobs[key + '_name'][0] : allBlobs[key + '_name']) : key;
            const mimeType = allBlobs[key + '_type'] ? (Array.isArray(allBlobs[key + '_type']) ? allBlobs[key + '_type'][0] : allBlobs[key + '_type']) : 'application/octet-stream';
            
            const lastDotIndex = originalName.lastIndexOf('.');
            const extension = lastDotIndex > -1 ? originalName.substring(lastDotIndex) : '';
            
            const uniqueFileName = (nomorPeserta || 'doc') + '_' + key + '_' + timestamp + extension;
            
            const blob = Utilities.newBlob(
              Utilities.base64Decode(base64Data),
              mimeType,
              uniqueFileName
            );
            
            const file = folder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            fileLinks[key] = file.getUrl();
            Logger.log('Uploaded file: ' + key);
          }
        } catch (fileError) {
          Logger.log('Error uploading file ' + key + ': ' + fileError.message);
        }
      }
    }
    
  } catch (error) {
    Logger.log('Upload error: ' + error.message);
  }
  
  return fileLinks;
}

function updateFileLinksInSheet(sheet, rowIndex, fileLinks) {
  try {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const linkMappings = {
      'doc1': 'Link - Doc Surat Mandat Personal',
      'doc2': 'Link - Doc KTP Personal',
      'doc3': 'Link - Doc Sertifikat Personal',
      'doc4': 'Link - Doc Rekening Personal',
      'doc5': 'Link - Doc Pas Photo Personal',
      'teamDoc1_1': 'Link - Doc Surat Mandat Team 1',
      'teamDoc1_2': 'Link - Doc KTP Team 1',
      'teamDoc1_3': 'Link - Doc Sertifikat Team 1',
      'teamDoc1_4': 'Link - Doc Rekening Team 1',
      'teamDoc1_5': 'Link - Doc Pas Photo Team 1',
      'teamDoc2_1': 'Link - Doc Surat Mandat Team 2',
      'teamDoc2_2': 'Link - Doc KTP Team 2',
      'teamDoc2_3': 'Link - Doc Sertifikat Team 2',
      'teamDoc2_4': 'Link - Doc Rekening Team 2',
      'teamDoc2_5': 'Link - Doc Pas Photo Team 2',
      'teamDoc3_1': 'Link - Doc Surat Mandat Team 3',
      'teamDoc3_2': 'Link - Doc KTP Team 3',
      'teamDoc3_3': 'Link - Doc Sertifikat Team 3',
      'teamDoc3_4': 'Link - Doc Rekening Team 3',
      'teamDoc3_5': 'Link - Doc Pas Photo Team 3'
    };
    
    for (let fileKey in fileLinks) {
      const headerName = linkMappings[fileKey];
      const colIndex = headers.indexOf(headerName);
      
      if (colIndex !== -1) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(fileLinks[fileKey]);
        Logger.log(`Updated ${fileKey} at row ${rowIndex}`);
      }
    }
  } catch (error) {
    Logger.log('Error updating file links: ' + error.message);
  }
}

function prepareRowData(formData, fileLinks, sheet) {
  const no = sheet.getLastRow();
  const timestamp = new Date().toLocaleString('id-ID');
  
  // TANPA NOMOR PESERTA - LANGSUNG ROW INDEX
  const rowData = [
    no, '', timestamp, formData.kecamatan || '', formData.cabang || '',
    formData.maxAge || '', formData.namaRegu || '-', formData.nik || '', formData.nama || '',
    formData.jenisKelamin || '', formData.tempatLahir || '', formData.tglLahir || '',
    formData.umur || '', formData.alamat || '', formData.noTelepon || '', formData.email || '',
    formData.namaRek || '', formData.noRek || '', formData.namaBank || '',
    
    formData.memberNik1 || '-', formData.memberName1 || '-', formData.memberJenisKelamin1 || '-',
    formData.memberTempatLahir1 || '-', formData.memberBirthDate1 || '-', formData.memberUmur1 || '-',
    formData.memberAlamat1 || '-', formData.memberNoTelepon1 || '-', formData.memberEmail1 || '-',
    formData.memberNamaRek1 || '-', formData.memberNoRek1 || '-', formData.memberNamaBank1 || '-',
    
    formData.memberNik2 || '-', formData.memberName2 || '-', formData.memberJenisKelamin2 || '-',
    formData.memberTempatLahir2 || '-', formData.memberBirthDate2 || '-', formData.memberUmur2 || '-',
    formData.memberAlamat2 || '-', formData.memberNoTelepon2 || '-', formData.memberEmail2 || '-',
    formData.memberNamaRek2 || '-', formData.memberNoRek2 || '-', formData.memberNamaBank2 || '-',
    
    formData.memberNik3 || '-', formData.memberName3 || '-', formData.memberJenisKelamin3 || '-',
    formData.memberTempatLahir3 || '-', formData.memberBirthDate3 || '-', formData.memberUmur3 || '-',
    formData.memberAlamat3 || '-', formData.memberNoTelepon3 || '-', formData.memberEmail3 || '-',
    formData.memberNamaRek3 || '-', formData.memberNoRek3 || '-', formData.memberNamaBank3 || '-',
    
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'Menunggu Verifikasi', '-'
  ];
  
  return rowData;
}