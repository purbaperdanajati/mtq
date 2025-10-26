// ===== KONFIGURASI =====
const SHEET_ID = '1OO7VUbHhUbsqHc_EbGQVaG2Jq6EkIaTLIbLsmFnAb94';
const FOLDER_ID = '1FHpgcmKbMrN84R29ZaVvHpNlh-AvA7_y';
const SHEET_NAME = 'Peserta';
const QUEUE_SHEET_NAME = 'Upload Queue';

// REGISTRATION TIME WINDOW (WIB = UTC+7)
const REGISTRATION_START = new Date('2025-10-22T00:00:00+07:00');
const REGISTRATION_END = new Date('2025-10-30T23:59:59+07:00');

// ===== LIGHTNING-FAST CONCURRENCY =====
// Strategi: SIMPAN DATA DULU (1-2 detik), UPLOAD FILE ASYNC NANTI
const LOCK_TIMEOUT_MS = 10000;
const LOCK_WAIT_TIME_MS = 50;
const MAX_LOCK_ATTEMPTS = 200;

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

// ===== LIGHTNING: MINIMAL LOCK - HANYA SAVE DATA =====
function doPost(e) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  const startTime = new Date().getTime();
  
  try {
    Logger.log('=== START doPost (LIGHTNING MODE) ===');
    
    // Handle non-registration actions
    if (e.parameter.action === 'updateRow') {
      return updateCompleteRow(e);
    }
    if (e.parameter.action === 'updateStatus') {
      return updateRowStatus(parseInt(e.parameter.rowIndex), e.parameter.status, e.parameter.reason || '');
    }
    if (e.parameter.action === 'deleteRow') {
      return deleteRowData(parseInt(e.parameter.rowIndex));
    }
    
    // ===== TIME CHECK (NO LOCK) =====
    const now = new Date();
    if (now < REGISTRATION_START || now > REGISTRATION_END) {
      return createResponse(false, 'Pendaftaran hanya dapat dilakukan antara tanggal 29-30 Oktober 2025.');
    }
    
    const formData = e.parameter;
    if (!formData.cabang || !formData.kecamatan) {
      return createResponse(false, 'Data cabang atau kecamatan tidak lengkap');
    }
    
    // ===== ACQUIRE LOCK - CEPAT =====
    Logger.log('Acquiring lock for registration...');
    lockAcquired = acquireLockWithRetry(lock, LOCK_TIMEOUT_MS, LOCK_WAIT_TIME_MS, MAX_LOCK_ATTEMPTS);
    
    if (!lockAcquired) {
      return createResponse(false, 'Server sedang sibuk. Mohon coba lagi dalam beberapa detik.');
    }
    
    Logger.log('✓ Lock acquired');
    
    // ===== OPEN SHEET & DUPLICATE CHECK (DALAM LOCK) =====
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }
    
    if (sheet.getLastRow() === 0) {
      addHeaders(sheet);
    }
    
    // Quick duplicate check
    const nikList = formData.nikList ? JSON.parse(formData.nikList) : [];
    const duplicateCheck = checkDuplicates(sheet, nikList);
    
    if (!duplicateCheck.isValid) {
      lock.releaseLock();
      lockAcquired = false;
      return createResponse(false, duplicateCheck.message);
    }
    
    Logger.log('✓ No duplicates');
    
    // ===== GENERATE NOMOR PESERTA (DALAM LOCK) =====
    Logger.log('Generating nomor peserta...');
    const isTeam = formData.isTeam === 'true';
    const nomorPeserta = generateNomorPeserta(sheet, formData.cabangCode, formData.genderCode || formData.memberGenderCode1, isTeam);
    if (!nomorPeserta.success) {
      lock.releaseLock();
      lockAcquired = false;
      Logger.log('Failed to generate nomor peserta: ' + nomorPeserta.message);
      return createResponse(false, nomorPeserta.message);
    }
    Logger.log('✓ Nomor peserta generated: ' + nomorPeserta.number);
    
    // ===== PREPARE & SAVE ROW (SUPER CEPAT - TANPA FILE) =====
    Logger.log('Saving registration data...');
    const rowData = prepareRowData(formData, {}, sheet, nomorPeserta.number);
    sheet.appendRow(rowData);
    const newRowIndex = sheet.getLastRow();
    
    Logger.log('✓ Data saved to row ' + newRowIndex);
    
    // ===== RELEASE LOCK IMMEDIATELY =====
    const lockDuration = new Date().getTime() - startTime;
    lock.releaseLock();
    lockAcquired = false;
    Logger.log(`✓ Lock released (${lockDuration}ms)`);
    
    // ===== PROCESS FILE UPLOADS AFTER LOCK (ASYNC) =====
    Logger.log('Processing file uploads...');
    try {
      const fileLinks = processFileUploads(e, formData, nomorPeserta.number);
      Logger.log('✓ Files processed: ' + Object.keys(fileLinks).length);
      
      // Update file links ke sheet
      if (Object.keys(fileLinks).length > 0) {
        Logger.log('Updating file links...');
        updateFileLinksInSheet(sheet, newRowIndex, fileLinks);
        Logger.log('✓ File links updated');
      }
    } catch (uploadError) {
      Logger.log('⚠️ File upload error (non-blocking): ' + uploadError.message);
      // Jangan fail - data sudah tersimpan
    }
    
    const totalTime = new Date().getTime() - startTime;
    Logger.log(`=== END doPost SUCCESS (${totalTime}ms) ===`);
    
    return createResponse(true, 'Registrasi berhasil!', nomorPeserta.number, {
      nik: formData.nik || '',
      nama: formData.nama || '',
      cabang: formData.cabang || '',
      nomorPeserta: nomorPeserta.number,
      timestamp: new Date().toLocaleString('id-ID')
    });
    
  } catch (error) {
    Logger.log('ERROR: ' + error.message);
    return createResponse(false, 'Error: ' + error.toString());
  } 
  finally {
    if (lockAcquired) {
      try {
        lock.releaseLock();
      } catch (e) {
        Logger.log('Error releasing lock: ' + e.message);
      }
    }
  }
}

// ===== NEW: QUEUE FILE UPLOADS =====
function queueFileUploads(rowIndex, e, formData) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Cek apakah queue sheet ada
    let queueSheet = ss.getSheetByName(QUEUE_SHEET_NAME);
    if (!queueSheet) {
      queueSheet = ss.insertSheet(QUEUE_SHEET_NAME);
      queueSheet.appendRow(['Row Index', 'Timestamp', 'Status', 'Attempt Count']);
    }
    
    // Tambahkan ke queue
    queueSheet.appendRow([
      rowIndex,
      new Date().toISOString(),
      'pending',
      0
    ]);
    
    Logger.log('Added row ' + rowIndex + ' to upload queue');
    
  } catch (error) {
    Logger.log('Error queueing uploads: ' + error.message);
  }
}

// ===== BACKGROUND PROCESSOR (JALANKAN DARI TRIGGER) =====
function processUploadQueue() {
  Logger.log('=== START processUploadQueue ===');
  
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const queueSheet = ss.getSheetByName(QUEUE_SHEET_NAME);
    
    if (!queueSheet) {
      Logger.log('Queue sheet tidak ditemukan');
      return;
    }
    
    const queueData = queueSheet.getRange(2, 1, queueSheet.getLastRow() - 1, 4).getValues();
    
    if (queueData.length === 0) {
      Logger.log('Queue kosong');
      return;
    }
    
    Logger.log('Processing ' + queueData.length + ' items in queue');
    
    for (let i = 0; i < queueData.length; i++) {
      const rowIndex = queueData[i][0];
      const status = queueData[i][2];
      const attemptCount = queueData[i][3];
      
      if (status === 'completed') {
        continue;
      }
      
      if (attemptCount > 3) {
        queueSheet.getRange(i + 2, 3).setValue('failed');
        continue;
      }
      
      try {
        Logger.log('Processing row ' + rowIndex);
        queueSheet.getRange(i + 2, 3).setValue('completed');
        queueSheet.getRange(i + 2, 4).setValue(attemptCount + 1);
        
      } catch (error) {
        Logger.log('Error processing row ' + rowIndex + ': ' + error.message);
        queueSheet.getRange(i + 2, 4).setValue(attemptCount + 1);
      }
    }
    
    Logger.log('=== END processUploadQueue ===');
    
  } catch (error) {
    Logger.log('Error in processUploadQueue: ' + error.message);
  }
}

// ===== HELPER FUNCTIONS =====

function acquireLockWithRetry(lock, timeoutMs, waitMs, maxAttempts) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      if (lock.tryLock(timeoutMs)) {
        Logger.log(`✓ Lock acquired (attempt ${attempts + 1})`);
        return true;
      }
    } catch (e) {
      // Silent fail
    }
    
    attempts++;
    Utilities.sleep(waitMs);
  }
  
  Logger.log(`✗ Lock failed after ${attempts} attempts`);
  return false;
}

function checkDuplicates(sheet, nikList) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { isValid: true };
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const data = dataRange.getValues();
    
    const nikCol = 7;
    const member1NikCol = 19;
    const member2NikCol = 31;
    const member3NikCol = 43;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const existingNiks = [
        row[nikCol],
        row[member1NikCol],
        row[member2NikCol],
        row[member3NikCol]
      ].filter(nik => nik && nik !== '-' && nik.toString().trim() !== '');
      
      for (let newNik of nikList) {
        if (newNik && newNik.trim() !== '') {
          for (let existingNik of existingNiks) {
            if (existingNik.toString().trim() === newNik.trim()) {
              return {
                isValid: false,
                message: `NIK ${newNik.trim()} sudah terdaftar. Setiap peserta hanya boleh mendaftar satu kali.`
              };
            }
          }
        }
      }
    }
    
    return { isValid: true };
  } catch (error) {
    Logger.log('Error in checkDuplicates: ' + error.message);
    return { isValid: false, message: 'Error saat validasi data.' };
  }
}

function createResponse(success, message, nomorPeserta, details) {
  const response = {
    success: success,
    message: message
  };
  if (nomorPeserta) response.nomorPeserta = nomorPeserta;
  if (details) response.details = details;
  
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

function prepareRowData(formData, fileLinks, sheet, nomorPeserta) {
  const no = sheet.getLastRow();
  const timestamp = new Date().toLocaleString('id-ID');
  
  const rowData = [
    no, nomorPeserta || '', timestamp, formData.kecamatan || '', formData.cabang || '',
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

// Stubs untuk doGet dan functions lainnya
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'checkUploadStatus') {
    return checkUploadStatus(e);
  } else if (action === 'getData') {
    return getAllDataAsJSON();
  } else if (action === 'getRejectedData') {
    return getRejectedDataAsJSON();
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: 'Invalid action'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ===== NEW: CHECK UPLOAD STATUS =====
function checkUploadStatus(e) {
  try {
    const nomorPeserta = e.parameter.nomorPeserta;
    Logger.log('Checking upload status for: ' + nomorPeserta);
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        uploadComplete: true,
        filesUploaded: 0,
        totalFiles: 0,
        message: 'Sheet tidak ditemukan'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Cari row dengan nomor peserta ini
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const nomorPesertaIdx = headers.indexOf('Nomor Peserta');
    
    if (nomorPesertaIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        uploadComplete: true,
        filesUploaded: 0,
        totalFiles: 0
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const lastRow = sheet.getLastRow();
    let rowIndex = -1;
    
    for (let i = 2; i <= lastRow; i++) {
      const cellValue = sheet.getRange(i, nomorPesertaIdx + 1).getValue();
      if (cellValue.toString() === nomorPeserta.toString()) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      Logger.log('Row not found for: ' + nomorPeserta);
      return ContentService.createTextOutput(JSON.stringify({
        uploadComplete: false,
        filesUploaded: 0,
        totalFiles: 20 // Estimasi
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Count uploaded files (non-empty links)
    const linkColumns = [
      'Link - Doc Surat Mandat Personal',
      'Link - Doc KTP Personal',
      'Link - Doc Sertifikat Personal',
      'Link - Doc Rekening Personal',
      'Link - Doc Pas Photo Personal',
      'Link - Doc Surat Mandat Team 1',
      'Link - Doc KTP Team 1',
      'Link - Doc Sertifikat Team 1',
      'Link - Doc Rekening Team 1',
      'Link - Doc Pas Photo Team 1',
      'Link - Doc Surat Mandat Team 2',
      'Link - Doc KTP Team 2',
      'Link - Doc Sertifikat Team 2',
      'Link - Doc Rekening Team 2',
      'Link - Doc Pas Photo Team 2',
      'Link - Doc Surat Mandat Team 3',
      'Link - Doc KTP Team 3',
      'Link - Doc Sertifikat Team 3',
      'Link - Doc Rekening Team 3',
      'Link - Doc Pas Photo Team 3'
    ];
    
    let filesUploaded = 0;
    
    for (let colName of linkColumns) {
      const colIdx = headers.indexOf(colName);
      if (colIdx !== -1) {
        const cellValue = sheet.getRange(rowIndex, colIdx + 1).getValue();
        if (cellValue && cellValue.toString().includes('drive.google.com')) {
          filesUploaded++;
        }
      }
    }
    
    const uploadComplete = filesUploaded === linkColumns.length;
    
    Logger.log(`Upload status: ${filesUploaded}/${linkColumns.length} files`);
    
    return ContentService.createTextOutput(JSON.stringify({
      uploadComplete: uploadComplete,
      filesUploaded: filesUploaded,
      totalFiles: linkColumns.length,
      nomorPeserta: nomorPeserta
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in checkUploadStatus: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      uploadComplete: true,
      filesUploaded: 0,
      totalFiles: 0,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getAllDataAsJSON() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        headers: [],
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      headers: headers,
      data: data,
      totalRows: data.length
    })).setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getRejectedDataAsJSON() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    
    const statusIdx = headers.indexOf('Status');
    const rejectedData = data.filter(row => row[statusIdx] === 'Ditolak');
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: rejectedData,
      totalRows: rejectedData.length
    })).setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateRowStatus(rowIndex, newStatus, reason) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusIdx = headers.indexOf('Status');
    const alasanIdx = headers.indexOf('Alasan Ditolak');
    const actualRow = rowIndex + 2;
    
    sheet.getRange(actualRow, statusIdx + 1).setValue(newStatus);
    if (newStatus === 'Ditolak' && alasanIdx !== -1) {
      sheet.getRange(actualRow, alasanIdx + 1).setValue(reason || '-');
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Status berhasil diperbarui'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateCompleteRow(e) {
  try {
    const rowIndex = parseInt(e.parameter.rowIndex);
    const updatedData = JSON.parse(e.parameter.updatedData);
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const actualRow = rowIndex + 2;
    
    for (let field in updatedData) {
      const colIndex = headers.indexOf(field);
      if (colIndex !== -1) {
        sheet.getRange(actualRow, colIndex + 1).setValue(updatedData[field]);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data berhasil diperbarui'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function deleteRowData(rowIndex) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const actualRow = rowIndex + 2;
    
    sheet.deleteRow(actualRow);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data berhasil dihapus'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== GENERATE NOMOR PESERTA (OPTIMIZED) =====
function generateNomorPeserta(sheet, cabangCode, genderCode, isTeam) {
  try {
    Logger.log('[LOCK] Generating nomor peserta for cabang: ' + cabangCode);
    
    const cabangInfo = CABANG_ORDER[cabangCode];
    if (!cabangInfo) {
      return {
        success: false,
        message: 'Kode cabang tidak valid'
      };
    }
    
    const lastRow = sheet.getLastRow();
    const existingNumbers = [];
    
    if (lastRow > 1) {
      const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
      const data = dataRange.getValues();
      const nomorPesertaCol = 1;
      
      for (let i = 0; i < data.length; i++) {
        const nomorPeserta = data[i][nomorPesertaCol];
        if (nomorPeserta) {
          const nomorStr = nomorPeserta.toString();
          let num;
          
          if (cabangInfo.prefix) {
            const prefixMatch = nomorStr.match(new RegExp('^' + cabangInfo.prefix + '\\.\\s*(\\d+)));
            if (prefixMatch) {
              num = parseInt(prefixMatch[1]);
              if (!isNaN(num)) {
                existingNumbers.push(num);
              }
            }
          } else {
            num = parseInt(nomorStr);
            if (!isNaN(num) && num >= cabangInfo.start && num <= cabangInfo.end) {
              existingNumbers.push(num);
            }
          }
        }
      }
    }
    
    Logger.log('[LOCK] Found ' + existingNumbers.length + ' existing numbers');
    
    // Determine odd/even berdasarkan gender
    let isOdd;
    if (genderCode === 'female' || genderCode === 'perempuan') {
      isOdd = true;
    } else {
      isOdd = false;
    }
    
    Logger.log('[LOCK] Gender: ' + genderCode + ', isOdd: ' + isOdd);
    
    // Find next available number
    let nextNumber;
    
    if (isOdd) {
      nextNumber = cabangInfo.start % 2 === 0 ? cabangInfo.start + 1 : cabangInfo.start;
    } else {
      nextNumber = cabangInfo.start % 2 === 0 ? cabangInfo.start : cabangInfo.start + 1;
    }
    
    let attempts = 0;
    const maxAttempts = (cabangInfo.end - cabangInfo.start) / 2 + 1;
    
    while (existingNumbers.indexOf(nextNumber) !== -1) {
      nextNumber += 2;
      attempts++;
      
      if (attempts > maxAttempts || nextNumber > cabangInfo.end) {
        Logger.log('[LOCK] ERROR: Kuota penuh setelah ' + attempts + ' attempts');
        return {
          success: false,
          message: 'Maaf, kuota peserta untuk cabang ' + cabangInfo.name + ' (' + (isOdd ? 'Putri' : 'Putra') + ') sudah penuh.'
        };
      }
    }
    
    // Format nomor peserta
    let nomorPeserta;
    if (cabangInfo.prefix) {
      nomorPeserta = cabangInfo.prefix + '. ' + String(nextNumber).padStart(2, '0');
    } else {
      nomorPeserta = String(nextNumber).padStart(3, '0');
    }
    
    Logger.log('[LOCK] ✓ Generated nomor peserta: ' + nomorPeserta);
    
    return {
      success: true,
      number: nomorPeserta
    };
    
  } catch (error) {
    Logger.log('[LOCK] Error in generateNomorPeserta: ' + error.message);
    return {
      success: false,
      message: 'Terjadi kesalahan saat membuat nomor peserta. Silakan coba lagi.'
    };
  }
}