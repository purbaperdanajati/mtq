const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzXwstIz5DjqSDjhUVBVJUGaKo7H5ZpiBjAsa263CvjxYVc9DAskn1oC1AryTPRnFu/exec';

// Logger utility
const Logger = {
    log: function(message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage, data || '');
    },
    error: function(message, error = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ERROR: ${message}`;
        console.error(logMessage, error || '');
    }
};

const cabangData = {
    'Tartil Al Qur\'an|12-11-29|personal': { name: 'Tartil Al Qur\'an', maxAge: '12-11-29', isTeam: false },
    'Tilawah Anak-anak|14-11-29|personal': { name: 'Tilawah Anak-anak', maxAge: '14-11-29', isTeam: false },
    'Tilawah Remaja|24-11-29|personal': { name: 'Tilawah Remaja', maxAge: '24-11-29', isTeam: false },
    'Tilawah Dewasa|40-11-29|personal': { name: 'Tilawah Dewasa', maxAge: '40-11-29', isTeam: false },
    'Qira\'at Mujawwad|40-11-29|personal': { name: 'Qira\'at Mujawwad', maxAge: '40-11-29', isTeam: false },
    'Hafalan 1 Juz|15-11-29|personal': { name: 'Hafalan 1 Juz', maxAge: '15-11-29', isTeam: false },
    'Hafalan 5 Juz|20-11-29|personal': { name: 'Hafalan 5 Juz', maxAge: '20-11-29', isTeam: false },
    'Hafalan 10 Juz|20-11-29|personal': { name: 'Hafalan 10 Juz', maxAge: '20-11-29', isTeam: false },
    'Hafalan 20 Juz|22-11-29|personal': { name: 'Hafalan 20 Juz', maxAge: '22-11-29', isTeam: false },
    'Hafalan 30 Juz|22-11-29|personal': { name: 'Hafalan 30 Juz', maxAge: '22-11-29', isTeam: false },
    'Tafsir Arab|22-11-29|personal': { name: 'Tafsir Arab', maxAge: '22-11-29', isTeam: false },
    'Tafsir Indonesia|34-11-29|personal': { name: 'Tafsir Indonesia', maxAge: '34-11-29', isTeam: false },
    'Tafsir Inggris|34-11-29|personal': { name: 'Tafsir Inggris', maxAge: '34-11-29', isTeam: false },
    'Kaligrafi Naskah|34-11-29|personal': { name: 'Kaligrafi Naskah', maxAge: '34-11-29', isTeam: false },
    'Kaligrafi Hiasan|34-11-29|personal': { name: 'Kaligrafi Hiasan', maxAge: '34-11-29', isTeam: false },
    'Kaligrafi Dekorasi|34-11-29|personal': { name: 'Kaligrafi Dekorasi', maxAge: '34-11-29', isTeam: false },
    'Kaligrafi Kontemporer|34-11-29|personal': { name: 'Kaligrafi Kontemporer', maxAge: '34-11-29', isTeam: false },
    'KTIQ|24-11-29|personal': { name: 'KTIQ', maxAge: '24-11-29', isTeam: false },
    'Fahm Al Qur\'an Putra|18-11-29|tim|3': { name: 'Fahm Al Qur\'an Putra', maxAge: '18-11-29', isTeam: true, memberCount: 3 },
    'Fahm Al Qur\'an Putri|18-11-29|tim|3': { name: 'Fahm Al Qur\'an Putri', maxAge: '18-11-29', isTeam: true, memberCount: 3 },
    'Syarh Al Qur\'an Putra|18-11-29|tim|3': { name: 'Syarh Al Qur\'an Putra', maxAge: '18-11-29', isTeam: true, memberCount: 3 },
    'Syarh Al Qur\'an Putri|18-11-29|tim|3': { name: 'Syarh Al Qur\'an Putri', maxAge: '18-11-29', isTeam: true, memberCount: 3 }
};

let currentCabang = null;
let currentTeamMemberCount = 2;
let uploadedFiles = {};
let savedPersonalData = null;
let savedTeamData = {};
let confirmCallback = null;

function updateProgress(percent) {
    const fill = document.getElementById('progressFill');
    if (fill) {
        fill.style.width = percent + '%';
        fill.textContent = percent + '%';
    }
}

function showTab(tabName) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

function savePersonalData() {
    Logger.log('Saving personal data');
    savedPersonalData = {
        nik: document.getElementById('nik')?.value || '',
        nama: document.getElementById('nama')?.value || '',
        jenisKelamin: document.getElementById('jenisKelamin')?.value || '',
        tempatLahir: document.getElementById('tempatLahir')?.value || '',
        tglLahir: document.getElementById('tglLahir')?.value || '',
        umur: document.getElementById('umur')?.value || '',
        alamat: document.getElementById('alamat')?.value || '',
        noTelepon: document.getElementById('noTelepon')?.value || '',
        email: document.getElementById('email')?.value || '',
        namaRek: document.getElementById('namaRek')?.value || '',
        noRek: document.getElementById('noRek')?.value || '',
        namaBank: document.getElementById('namaBank')?.value || ''
    };
    
    const savedFiles = {};
    for (let i = 1; i <= 5; i++) {
        if (uploadedFiles[`doc${i}`]) {
            savedFiles[`doc${i}`] = uploadedFiles[`doc${i}`];
        }
    }
    savedPersonalData.files = savedFiles;
    
    Logger.log('Personal data saved', savedPersonalData);
}

function saveTeamData() {
    Logger.log('Saving team data before member count change');
    savedTeamData = {
        namaRegu: document.getElementById('namaRegu')?.value || '',
        members: {}
    };
    
    for (let i = 1; i <= currentTeamMemberCount; i++) {
        const memberData = {
            nik: document.querySelector(`[name="memberNik${i}"]`)?.value || '',
            name: document.querySelector(`[name="memberName${i}"]`)?.value || '',
            jenisKelamin: document.querySelector(`[name="memberJenisKelamin${i}"]`)?.value || '',
            tempatLahir: document.querySelector(`[name="memberTempatLahir${i}"]`)?.value || '',
            birthDate: document.querySelector(`[name="memberBirthDate${i}"]`)?.value || '',
            umur: document.querySelector(`[name="memberUmur${i}"]`)?.value || '',
            alamat: document.querySelector(`[name="memberAlamat${i}"]`)?.value || '',
            noTelepon: document.querySelector(`[name="memberNoTelepon${i}"]`)?.value || '',
            email: document.querySelector(`[name="memberEmail${i}"]`)?.value || '',
            namaRek: document.querySelector(`[name="memberNamaRek${i}"]`)?.value || '',
            noRek: document.querySelector(`[name="memberNoRek${i}"]`)?.value || '',
            namaBank: document.querySelector(`[name="memberNamaBank${i}"]`)?.value || '',
            files: {}
        };
        
        for (let d = 1; d <= 5; d++) {
            if (uploadedFiles[`teamDoc${i}_${d}`]) {
                memberData.files[`doc${d}`] = uploadedFiles[`teamDoc${i}_${d}`];
            }
        }
        
        savedTeamData.members[i] = memberData;
    }
    
    Logger.log('Team data saved', savedTeamData);
}

function restoreTeamData() {
    Logger.log('Restoring team data after member count change');
    
    if (!savedTeamData || !savedTeamData.members) {
        Logger.log('No saved team data to restore');
        return;
    }
    
    if (savedTeamData.namaRegu) {
        document.getElementById('namaRegu').value = savedTeamData.namaRegu;
    }
    
    for (let i in savedTeamData.members) {
        const memberData = savedTeamData.members[i];
        
        if (document.querySelector(`[name="memberNik${i}"]`)) {
            document.querySelector(`[name="memberNik${i}"]`).value = memberData.nik;
            document.querySelector(`[name="memberName${i}"]`).value = memberData.name;
            document.querySelector(`[name="memberJenisKelamin${i}"]`).value = memberData.jenisKelamin;
            document.querySelector(`[name="memberTempatLahir${i}"]`).value = memberData.tempatLahir;
            document.querySelector(`[name="memberBirthDate${i}"]`).value = memberData.birthDate;
            document.querySelector(`[name="memberUmur${i}"]`).value = memberData.umur;
            document.querySelector(`[name="memberAlamat${i}"]`).value = memberData.alamat;
            document.querySelector(`[name="memberNoTelepon${i}"]`).value = memberData.noTelepon;
            document.querySelector(`[name="memberEmail${i}"]`).value = memberData.email;
            document.querySelector(`[name="memberNamaRek${i}"]`).value = memberData.namaRek;
            document.querySelector(`[name="memberNoRek${i}"]`).value = memberData.noRek;
            document.querySelector(`[name="memberNamaBank${i}"]`).value = memberData.namaBank;
            
            for (let d in memberData.files) {
                const docNum = d.replace('doc', '');
                uploadedFiles[`teamDoc${i}_${docNum}`] = memberData.files[d];
                const labelId = `teamDoc${i}_${docNum}Name`;
                const label = document.getElementById(labelId);
                if (label) {
                    label.textContent = memberData.files[d].name;
                    label.style.color = '#28a745';
                }
            }
            
            Logger.log(`Restored member ${i} data`);
        }
    }
}

function restoreToTeamMember1() {
    if (!savedPersonalData) return;
    
    Logger.log('Restoring personal data to team member 1');
    const fields = [
        { saved: 'nik', team: 'memberNik1' },
        { saved: 'nama', team: 'memberName1' },
        { saved: 'jenisKelamin', team: 'memberJenisKelamin1' },
        { saved: 'tempatLahir', team: 'memberTempatLahir1' },
        { saved: 'tglLahir', team: 'memberBirthDate1' },
        { saved: 'umur', team: 'memberUmur1' },
        { saved: 'alamat', team: 'memberAlamat1' },
        { saved: 'noTelepon', team: 'memberNoTelepon1' },
        { saved: 'email', team: 'memberEmail1' },
        { saved: 'namaRek', team: 'memberNamaRek1' },
        { saved: 'noRek', team: 'memberNoRek1' },
        { saved: 'namaBank', team: 'memberNamaBank1' }
    ];
    
    fields.forEach(field => {
        const input = document.querySelector(`[name="${field.team}"]`);
        if (input && savedPersonalData[field.saved]) {
            input.value = savedPersonalData[field.saved];
            Logger.log(`Restored ${field.team}: ${savedPersonalData[field.saved]}`);
        }
    });
    
    if (savedPersonalData.files) {
        for (let docKey in savedPersonalData.files) {
            const docNum = docKey.replace('doc', '');
            uploadedFiles[`teamDoc1_${docNum}`] = savedPersonalData.files[docKey];
            const labelId = `teamDoc1_${docNum}Name`;
            const label = document.getElementById(labelId);
            if (label) {
                label.textContent = savedPersonalData.files[docKey].name;
                label.style.color = '#28a745';
            }
        }
    }
}

function handleCabangChange() {
    Logger.log('Cabang changed');
    const selectedValue = document.getElementById('cabang').value;
    const data = cabangData[selectedValue];
    const dataDiriSection = document.getElementById('dataDiriSection');
    const rekeningPersonal = document.getElementById('rekeningPersonalSection');
    
    if (currentCabang && !currentCabang.isTeam) {
        savePersonalData();
    } else if (currentCabang && currentCabang.isTeam) {
        saveTeamData();
    }
    
    document.getElementById('personalSection').classList.remove('show');
    document.getElementById('teamSection').classList.remove('show');
    document.getElementById('ageRequirement').style.display = 'none';
    document.getElementById('teamMembers').innerHTML = '';
    document.getElementById('personalDocs').innerHTML = '';
    
    if (!data) {
        currentCabang = null;
        dataDiriSection.style.display = 'none';
        rekeningPersonal.style.display = 'none';
        updateSubmitButtonState();
        return;
    }
    
    currentCabang = data;
    const ageText = data.maxAge.split('-').join(' tahun ') + ' hari';
    document.getElementById('ageRequirement').innerHTML = `ℹ️ Batas usia maksimal: ${ageText} (per 1 November 2025)`;
    document.getElementById('ageRequirement').style.display = 'block';
    
    if (data.isTeam) {
        Logger.log('Switching to team mode');
        currentTeamMemberCount = 2;
        generateTeamForm(2);
        document.getElementById('teamSection').classList.add('show');
        dataDiriSection.style.display = 'none';
        rekeningPersonal.style.display = 'none';
        
        setTimeout(() => {
            if (savedPersonalData && Object.keys(savedPersonalData).length > 0) {
                restoreToTeamMember1();
            } else if (savedTeamData && Object.keys(savedTeamData).length > 0) {
                restoreTeamData();
            }
            updateSubmitButtonState();
        }, 100);
    } else {
        Logger.log('Switching to personal mode');
        dataDiriSection.style.display = 'block';
        rekeningPersonal.style.display = 'block';
        generatePersonalDocsForm();
        document.getElementById('personalSection').classList.add('show');
        
        setTimeout(() => {
            if (savedPersonalData && Object.keys(savedPersonalData).length > 0) {
                document.getElementById('nik').value = savedPersonalData.nik;
                document.getElementById('nama').value = savedPersonalData.nama;
                document.getElementById('jenisKelamin').value = savedPersonalData.jenisKelamin;
                document.getElementById('tempatLahir').value = savedPersonalData.tempatLahir;
                document.getElementById('tglLahir').value = savedPersonalData.tglLahir;
                document.getElementById('umur').value = savedPersonalData.umur;
                document.getElementById('alamat').value = savedPersonalData.alamat;
                document.getElementById('noTelepon').value = savedPersonalData.noTelepon;
                document.getElementById('email').value = savedPersonalData.email;
                document.getElementById('namaRek').value = savedPersonalData.namaRek;
                document.getElementById('noRek').value = savedPersonalData.noRek;
                document.getElementById('namaBank').value = savedPersonalData.namaBank;
                
                if (savedPersonalData.files) {
                    for (let docKey in savedPersonalData.files) {
                        uploadedFiles[docKey] = savedPersonalData.files[docKey];
                        const docNum = docKey.replace('doc', '');
                        const labelId = `personalDoc${docNum}Name`;
                        const label = document.getElementById(labelId);
                        if (label) {
                            label.textContent = savedPersonalData.files[docKey].name;
                            label.style.color = '#28a745';
                        }
                    }
                }
            }
            updateSubmitButtonState();
        }, 100);
    }
    
    updateSubmitButtonState();
}

function generatePersonalDocsForm() {
    Logger.log('Generating personal docs form');
    const container = document.getElementById('personalDocs');
    const docs = [
        { id: 1, name: 'Surat Mandat', desc: 'Ditandatangani oleh Ketua LPTQ Kecamatan' },
        { id: 2, name: 'KTP/KK/KIA', desc: 'Diterbitkan maksimal 6 bulan sebelum 1 Nov 2025' },
        { id: 3, name: 'Sertifikat Kejuaraan', desc: 'Dari MTQ Tingkat Kecamatan' },
        { id: 4, name: 'Foto Buku Tabungan', desc: 'Menunjukkan nomor rekening' },
        { id: 5, name: 'Pas Photo Terbaru', desc: 'Latar belakang biru' }
    ];
    
    container.innerHTML = '';
    docs.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label>${doc.id}. ${doc.name} *</label>
            <small class="small-text">${doc.desc}</small>
            <label for="personalDoc${doc.id}" class="file-input-label">📎 Pilih File</label>
            <input type="file" id="personalDoc${doc.id}" accept=".pdf,.jpg,.jpeg,.png">
            <span class="file-name" id="personalDoc${doc.id}Name">Belum ada file</span>
        `;
        container.appendChild(div);
    });
    
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`personalDoc${i}`);
        if (input) {
            input.addEventListener('change', function() {
                handleFileUpload(this, `personalDoc${i}Name`, `doc${i}`);
            });
        }
    }
}

function generateTeamForm(memberCount) {
    Logger.log('Generating team form for ' + memberCount + ' members');
    const container = document.getElementById('teamMembers');
    
    let html = `<p style="margin-bottom: 20px; color: #666; font-size: 0.9em;">
        Saat ini: ${memberCount} peserta ${memberCount < 3 ? '(klik tombol Tambah untuk menambah peserta ke-3)' : ''}
    </p>`;
    
    for (let i = 1; i <= memberCount; i++) {
        html += generateTeamMemberHTML(i);
    }
    
    html += `<div style="margin-top: 20px;">
        ${memberCount === 2 ? `<button type="button" class="btn-submit" onclick="addTeamMember()" style="background: #2e8b57;">➕ Tambah Peserta ke-3</button>` : ''}
        ${memberCount === 3 ? `<button type="button" class="btn-reset" onclick="removeTeamMember()" style="background: #dc3545;">❌ Hapus Peserta ke-3</button>` : ''}
    </div>`;
    
    container.innerHTML = html;
    
    setupTeamFormListeners(memberCount);
}

function generateTeamMemberHTML(i) {
    const isOptional = i > 2;
    return `
        <div class="team-member" id="teamMember${i}">
            <h4>Anggota Tim #${i} ${isOptional ? '(Opsional)' : '(Wajib)'}</h4>
            
            <div class="form-row">
                <div class="form-group">
                    <label>NIK ${isOptional ? '' : '*'}</label>
                    <input type="text" name="memberNik${i}" maxlength="16" inputmode="numeric" placeholder="NIK (16 digit)" ${isOptional ? '' : 'required'}>
                    <small class="small-text">Hanya angka, tanpa spasi</small>
                </div>
                <div class="form-group">
                    <label>Nama Lengkap ${isOptional ? '' : '*'}</label>
                    <input type="text" name="memberName${i}" placeholder="Nama lengkap" ${isOptional ? '' : 'required'}>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Jenis Kelamin ${isOptional ? '' : '*'}</label>
                    <select name="memberJenisKelamin${i}" ${isOptional ? '' : 'required'}>
                        <option value="">-- Pilih --</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tempat Lahir ${isOptional ? '' : '*'}</label>
                    <input type="text" name="memberTempatLahir${i}" placeholder="Kota/Kabupaten" ${isOptional ? '' : 'required'}>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Tanggal Lahir ${isOptional ? '' : '*'}</label>
                    <input type="date" name="memberBirthDate${i}" ${isOptional ? '' : 'required'}>
                </div>
                <div class="form-group">
                    <label>Umur (per 1 Nov 2025)</label>
                    <input type="text" name="memberUmur${i}" readonly placeholder="Otomatis terisi">
                </div>
            </div>
            
            <div class="form-group">
                <label>Alamat Lengkap ${isOptional ? '' : '*'}</label>
                <textarea name="memberAlamat${i}" rows="2" placeholder="Jalan, RT/RW, Desa, Kecamatan" ${isOptional ? '' : 'required'}></textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>No Telepon/WhatsApp ${isOptional ? '' : '*'}</label>
                    <input type="tel" name="memberNoTelepon${i}" placeholder="08xxxxxxxxxx" ${isOptional ? '' : 'required'}>
                </div>
                <div class="form-group">
                    <label>Email ${isOptional ? '' : '*'}</label>
                    <input type="email" name="memberEmail${i}" placeholder="email@example.com" ${isOptional ? '' : 'required'}>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Nama Rekening ${isOptional ? '' : '*'}</label>
                    <input type="text" name="memberNamaRek${i}" placeholder="Nama sesuai buku tabungan" ${isOptional ? '' : 'required'}>
                </div>
                <div class="form-group">
                    <label>Nomor Rekening ${isOptional ? '' : '*'}</label>
                    <input type="text" name="memberNoRek${i}" placeholder="Nomor rekening" ${isOptional ? '' : 'required'}>
                </div>
            </div>
            
            <div class="form-group">
                <label>Nama Bank ${isOptional ? '' : '*'}</label>
                <input type="text" name="memberNamaBank${i}" placeholder="BNI, BCA, Mandiri, dll" ${isOptional ? '' : 'required'}>
            </div>
            
            <div class="team-member-docs">
                <h5>📄 Dokumen Anggota #${i}</h5>
                <div class="doc-group">
                    <label>1. Surat Mandat ${isOptional ? '' : '*'}</label>
                    <small class="small-text">Ketua LPTQ Kecamatan</small>
                    <label for="teamDoc${i}_1" class="file-input-label">📎 Pilih</label>
                    <input type="file" id="teamDoc${i}_1" accept=".pdf,.jpg,.jpeg,.png">
                    <span class="file-name" id="teamDoc${i}_1Name">Belum ada</span>
                </div>
                <div class="doc-group">
                    <label>2. KTP/KK/KIA ${isOptional ? '' : '*'}</label>
                    <small class="small-text">6 bulan sebelum 1 Nov 2025</small>
                    <label for="teamDoc${i}_2" class="file-input-label">📎 Pilih</label>
                    <input type="file" id="teamDoc${i}_2" accept=".pdf,.jpg,.jpeg,.png">
                    <span class="file-name" id="teamDoc${i}_2Name">Belum ada</span>
                </div>
                <div class="doc-group">
                    <label>3. Sertifikat Kejuaraan ${isOptional ? '' : '*'}</label>
                    <small class="small-text">MTQ Tingkat Kecamatan</small>
                    <label for="teamDoc${i}_3" class="file-input-label">📎 Pilih</label>
                    <input type="file" id="teamDoc${i}_3" accept=".pdf,.jpg,.jpeg,.png">
                    <span class="file-name" id="teamDoc${i}_3Name">Belum ada</span>
                </div>
                <div class="doc-group">
                    <label>4. Foto Buku Tabungan ${isOptional ? '' : '*'}</label>
                    <small class="small-text">Nomor rekening</small>
                    <label for="teamDoc${i}_4" class="file-input-label">📎 Pilih</label>
                    <input type="file" id="teamDoc${i}_4" accept=".pdf,.jpg,.jpeg,.png">
                    <span class="file-name" id="teamDoc${i}_4Name">Belum ada</span>
                </div>
                <div class="doc-group">
                    <label>5. Pas Photo ${isOptional ? '' : '*'}</label>
                    <small class="small-text">Latar belakang biru</small>
                    <label for="teamDoc${i}_5" class="file-input-label">📎 Pilih</label>
                    <input type="file" id="teamDoc${i}_5" accept=".jpg,.jpeg,.png">
                    <span class="file-name" id="teamDoc${i}_5Name">Belum ada</span>
                </div>
            </div>
        </div>
    `;
}

function addTeamMember() {
    if (currentTeamMemberCount < 3) {
        Logger.log('Adding team member 3');
        saveTeamData();
        currentTeamMemberCount = 3;
        generateTeamForm(3);
        setTimeout(() => {
            restoreTeamData();
            updateSubmitButtonState();
        }, 100);
    }
}

function removeTeamMember() {
    if (currentTeamMemberCount === 3) {
        Logger.log('Removing team member 3');
        saveTeamData();
        currentTeamMemberCount = 2;
        
        for (let d = 1; d <= 5; d++) {
            delete uploadedFiles[`teamDoc3_${d}`];
        }
        
        generateTeamForm(2);
        setTimeout(() => {
            restoreTeamData();
            updateSubmitButtonState();
        }, 100);
    }
}

function setupTeamFormListeners(memberCount) {
    Logger.log('Setting up team form listeners for ' + memberCount + ' members');
    
    for (let i = 1; i <= memberCount; i++) {
        for (let d = 1; d <= 5; d++) {
            const input = document.getElementById(`teamDoc${i}_${d}`);
            if (input) {
                input.addEventListener('change', function() {
                    handleFileUpload(this, `teamDoc${i}_${d}Name`, `teamDoc${i}_${d}`);
                });
            }
        }
        
        const nikInput = document.querySelector(`input[name="memberNik${i}"]`);
        if (nikInput) {
            nikInput.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16);
                updateSubmitButtonState();
            });
        }
        
        const birthInput = document.querySelector(`input[name="memberBirthDate${i}"]`);
        if (birthInput) {
            birthInput.addEventListener('input', validateDateInput);
            birthInput.addEventListener('change', function() {
                if (!this.value) return;
                
                const selectedDate = new Date(this.value);
                const today = new Date();
                
                if (selectedDate > today) {
                    showResultModal(false, 'Tanggal Tidak Valid', 'Tanggal lahir tidak boleh lebih dari hari ini!');
                    this.value = '';
                    document.querySelector(`input[name="memberUmur${i}"]`).value = '';
                    updateSubmitButtonState();
                    return;
                }
                
                const ageObj = calculateAge(this.value);
                const umurInput = document.querySelector(`input[name="memberUmur${i}"]`);
                if (umurInput && ageObj) {
                    umurInput.value = formatAge(ageObj);
                }
                updateSubmitButtonState();
            });
        }
        
        const allInputs = document.querySelectorAll(`#teamMember${i} input, #teamMember${i} select, #teamMember${i} textarea`);
        allInputs.forEach(input => {
            if (!input.type || input.type !== 'file') {
                input.addEventListener('input', updateSubmitButtonState);
                input.addEventListener('change', updateSubmitButtonState);
            }
        });
    }
}

function handleFileUpload(input, labelId, fileKey) {
    Logger.log('Handling file upload: ' + fileKey);
    const label = document.getElementById(labelId);
    
    if (!input.files || input.files.length === 0) {
        label.textContent = 'Belum ada file';
        label.style.color = '#666';
        delete uploadedFiles[fileKey];
        updateSubmitButtonState();
        return;
    }
    
    const file = input.files[0];
    
    if (file.size > 5 * 1024 * 1024) {
        Logger.error('File too large: ' + file.name);
        label.textContent = 'File terlalu besar (Max 5MB)';
        label.style.color = '#dc3545';
        input.value = '';
        delete uploadedFiles[fileKey];
        updateSubmitButtonState();
        return;
    }
    
    label.textContent = file.name;
    label.style.color = '#28a745';
    uploadedFiles[fileKey] = file;
    Logger.log('File uploaded successfully: ' + file.name);
    updateSubmitButtonState();
}

function validateDateInput(e) {
    let value = e.target.value;
    value = value.replace(/[^\d-]/g, '');
    const parts = value.split('-');
    
    if (parts[0] && parts[0].length > 4) {
        parts[0] = parts[0].slice(0, 4);
    }
    
    if (parts[0]) {
        const year = parseInt(parts[0]);
        const currentYear = new Date().getFullYear();
        if (year > currentYear) {
            parts[0] = currentYear.toString();
        }
    }
    
    e.target.value = parts.join('-');
}

function calculateAge(birthDateStr) {
    if (!birthDateStr) return null;
    const birthDate = new Date(birthDateStr);
    const refDate = new Date(2025, 10, 1);
    
    let years = refDate.getFullYear() - birthDate.getFullYear();
    let months = refDate.getMonth() - birthDate.getMonth();
    let days = refDate.getDate() - birthDate.getDate();
    
    if (days < 0) {
        months--;
        const prevMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    
    return { years, months, days };
}

function formatAge(ageObj) {
    return `${ageObj.years}-${String(ageObj.months).padStart(2, '0')}-${String(ageObj.days).padStart(2, '0')}`;
}

function isAgeValid(ageObj, maxAgeStr) {
    const [maxYears, maxMonths, maxDays] = maxAgeStr.split('-').map(Number);
    if (ageObj.years > maxYears) return false;
    if (ageObj.years === maxYears && ageObj.months > maxMonths) return false;
    if (ageObj.years === maxYears && ageObj.months === maxMonths && ageObj.days > maxDays) return false;
    return true;
}

function updateSubmitButtonState() {
    Logger.log('Updating submit button state');
    const submitBtn = document.getElementById('submitBtn');
    const statusDiv = document.getElementById('submitStatusInfo');
    const cabang = document.getElementById('cabang').value;
    
    if (!cabang || !currentCabang) {
        submitBtn.disabled = true;
        statusDiv.innerHTML = '⚠️ Pilih cabang lomba terlebih dahulu';
        statusDiv.style.display = 'block';
        return;
    }
    
    let isComplete = false;
    let reasons = [];
    
    if (currentCabang.isTeam) {
        const result = checkTeamCompletion();
        isComplete = result.complete;
        reasons = result.reasons;
    } else {
        const result = checkPersonalCompletion();
        isComplete = result.complete;
        reasons = result.reasons;
    }
    
    if (isComplete) {
        submitBtn.disabled = false;
        statusDiv.style.display = 'none';
    } else {
        submitBtn.disabled = true;
        statusDiv.innerHTML = '⚠️ ' + reasons.join('<br>⚠️ ');
        statusDiv.style.display = 'block';
    }
}

function checkPersonalCompletion() {
    const reasons = [];
    
    const tglLahir = document.getElementById('tglLahir').value;
    const nik = document.getElementById('nik').value;
    const nama = document.getElementById('nama').value;
    const gender = document.getElementById('jenisKelamin').value;
    const tempat = document.getElementById('tempatLahir').value;
    const alamat = document.getElementById('alamat').value;
    const telepon = document.getElementById('noTelepon').value;
    const email = document.getElementById('email').value;
    const namaRek = document.getElementById('namaRek').value;
    const noRek = document.getElementById('noRek').value;
    const namaBank = document.getElementById('namaBank').value;
    
    if (!nik) reasons.push('NIK belum diisi');
    if (!nama) reasons.push('Nama lengkap belum diisi');
    if (!gender) reasons.push('Jenis kelamin belum dipilih');
    if (!tempat) reasons.push('Tempat lahir belum diisi');
    if (!tglLahir) reasons.push('Tanggal lahir belum diisi');
    if (!alamat) reasons.push('Alamat belum diisi');
    if (!telepon) reasons.push('Nomor telepon belum diisi');
    if (!email) reasons.push('Email belum diisi');
    if (!namaRek) reasons.push('Nama rekening belum diisi');
    if (!noRek) reasons.push('Nomor rekening belum diisi');
    if (!namaBank) reasons.push('Nama bank belum diisi');
    
    if (tglLahir) {
        const ageObj = calculateAge(tglLahir);
        if (!isAgeValid(ageObj, currentCabang.maxAge)) {
            reasons.push('Usia melebihi batas maksimal cabang ini');
        }
    }
    
    for (let i = 1; i <= 5; i++) {
        if (!uploadedFiles[`doc${i}`]) {
            reasons.push(`Dokumen personal #${i} belum diupload`);
        }
    }
    
    return {
        complete: reasons.length === 0,
        reasons: reasons
    };
}

function checkTeamCompletion() {
    const reasons = [];
    const namaRegu = document.getElementById('namaRegu').value;
    
    if (!namaRegu) {
        reasons.push('Nama regu/tim belum diisi');
    }
    
    for (let i = 1; i <= 2; i++) {
        const memberReasons = checkTeamMember(i, true);
        reasons.push(...memberReasons);
    }
    
    if (currentTeamMemberCount === 3) {
        const member3Filled = isTeamMemberFilled(3);
        if (member3Filled) {
            const memberReasons = checkTeamMember(3, false);
            reasons.push(...memberReasons);
        }
    }
    
    return {
        complete: reasons.length === 0,
        reasons: reasons
    };
}

function isTeamMemberFilled(memberIndex) {
    const nikEl = document.querySelector(`input[name="memberNik${memberIndex}"]`);
    const nameEl = document.querySelector(`input[name="memberName${memberIndex}"]`);
    const birthEl = document.querySelector(`input[name="memberBirthDate${memberIndex}"]`);
    
    return (nikEl?.value || nameEl?.value || birthEl?.value);
}

function checkTeamMember(memberIndex, isRequired) {
    const reasons = [];
    const prefix = `Anggota #${memberIndex}`;
    
    const nikEl = document.querySelector(`input[name="memberNik${memberIndex}"]`);
    const nameEl = document.querySelector(`input[name="memberName${memberIndex}"]`);
    const genderEl = document.querySelector(`select[name="memberJenisKelamin${memberIndex}"]`);
    const tempatEl = document.querySelector(`input[name="memberTempatLahir${memberIndex}"]`);
    const birthEl = document.querySelector(`input[name="memberBirthDate${memberIndex}"]`);
    const alamatEl = document.querySelector(`textarea[name="memberAlamat${memberIndex}"]`);
    const telEl = document.querySelector(`input[name="memberNoTelepon${memberIndex}"]`);
    const emailEl = document.querySelector(`input[name="memberEmail${memberIndex}"]`);
    const rekNamaEl = document.querySelector(`input[name="memberNamaRek${memberIndex}"]`);
    const rekNoEl = document.querySelector(`input[name="memberNoRek${memberIndex}"]`);
    const rekBankEl = document.querySelector(`input[name="memberNamaBank${memberIndex}"]`);
    
    if (!nikEl?.value) reasons.push(`${prefix}: NIK belum diisi`);
    if (!nameEl?.value) reasons.push(`${prefix}: Nama belum diisi`);
    if (!genderEl?.value) reasons.push(`${prefix}: Jenis kelamin belum dipilih`);
    if (!tempatEl?.value) reasons.push(`${prefix}: Tempat lahir belum diisi`);
    if (!birthEl?.value) reasons.push(`${prefix}: Tanggal lahir belum diisi`);
    if (!alamatEl?.value) reasons.push(`${prefix}: Alamat belum diisi`);
    if (!telEl?.value) reasons.push(`${prefix}: No telepon belum diisi`);
    if (!emailEl?.value) reasons.push(`${prefix}: Email belum diisi`);
    if (!rekNamaEl?.value) reasons.push(`${prefix}: Nama rekening belum diisi`);
    if (!rekNoEl?.value) reasons.push(`${prefix}: No rekening belum diisi`);
    if (!rekBankEl?.value) reasons.push(`${prefix}: Nama bank belum diisi`);
    
    if (birthEl?.value) {
        const ageObj = calculateAge(birthEl.value);
        if (!isAgeValid(ageObj, currentCabang.maxAge)) {
            reasons.push(`${prefix}: Usia melebihi batas maksimal`);
        }
    }
    
    for (let d = 1; d <= 5; d++) {
        if (!uploadedFiles[`teamDoc${memberIndex}_${d}`]) {
            reasons.push(`${prefix}: Dokumen #${d} belum diupload`);
        }
    }
    
    return reasons;
}

document.getElementById('nik').addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16);
    updateSubmitButtonState();
});

document.getElementById('tglLahir').addEventListener('input', validateDateInput);

document.getElementById('tglLahir').addEventListener('change', function() {
    if (!this.value) return;
    
    const selectedDate = new Date(this.value);
    const today = new Date();
    
    if (selectedDate > today) {
        showResultModal(false, 'Tanggal Tidak Valid', 'Tanggal lahir tidak boleh lebih dari hari ini!');
        this.value = '';
        document.getElementById('umur').value = '';
        updateSubmitButtonState();
        return;
    }
    
    const ageObj = calculateAge(this.value);
    if (ageObj) {
        document.getElementById('umur').value = formatAge(ageObj);
    }
    
    updateSubmitButtonState();
});

['nik', 'nama', 'jenisKelamin', 'tempatLahir', 'alamat', 'noTelepon', 'email', 'namaRek', 'noRek', 'namaBank'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', updateSubmitButtonState);
        el.addEventListener('change', updateSubmitButtonState);
    }
});

function showConfirmModal(title, message) {
    return new Promise((resolve) => {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('show');
        
        confirmCallback = resolve;
    });
}

function closeConfirmModal(result) {
    document.getElementById('confirmModal').classList.remove('show');
    if (confirmCallback) {
        confirmCallback(result);
        confirmCallback = null;
    }
}

async function resetForm() {
    const confirmed = await showConfirmModal(
        'Konfirmasi Bersihkan Form',
        'Apakah Anda yakin ingin membersihkan semua isian form?\n\nSemua data yang sudah diisi akan hilang.'
    );
    
    if (!confirmed) {
        Logger.log('Form reset cancelled by user');
        return;
    }
    
    Logger.log('Resetting form');
    document.getElementById('registrationForm').reset();
    document.getElementById('umur').value = '';
    document.getElementById('ageRequirement').style.display = 'none';
    document.getElementById('dataDiriSection').style.display = 'none';
    document.getElementById('rekeningPersonalSection').style.display = 'none';
    document.getElementById('personalSection').classList.remove('show');
    document.getElementById('teamSection').classList.remove('show');
    document.getElementById('teamMembers').innerHTML = '';
    document.getElementById('personalDocs').innerHTML = '';
    
    uploadedFiles = {};
    savedPersonalData = null;
    savedTeamData = {};
    
    currentCabang = null;
    currentTeamMemberCount = 2;
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitStatusInfo').style.display = 'none';
    
    Logger.log('Form reset complete');
}

function showResultModal(success, title, message) {
    const modal = document.getElementById('resultModal');
    document.getElementById('resultIcon').textContent = success ? '✅' : '❌';
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('resultMessage').textContent = message;
    modal.classList.add('show');
}

function closeResultModal() {
    document.getElementById('resultModal').classList.remove('show');
}

function showLoadingOverlay(show, message = 'Memproses...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    
    if (show) {
        loadingMessage.textContent = message;
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const confirmed = await showConfirmModal(
        'Konfirmasi Pendaftaran',
        'Apakah Anda yakin semua data sudah benar?\n\nData yang sudah dikirim tidak dapat diubah.'
    );
    
    if (!confirmed) {
        Logger.log('Form submission cancelled by user');
        return;
    }
    
    Logger.log('=== FORM SUBMISSION STARTED ===');
    showLoadingOverlay(true, 'Memvalidasi data...');
    document.getElementById('progressContainer').style.display = 'block';
    updateProgress(5);
    
    try {
        const formData = new FormData();
        
        formData.append('kecamatan', document.getElementById('kecamatan').value);
        formData.append('cabang', currentCabang.name);
        formData.append('maxAge', currentCabang.maxAge);
        formData.append('namaRegu', document.getElementById('namaRegu')?.value || '-');
        formData.append('memberCount', currentTeamMemberCount);
        
        Logger.log('Basic data added');
        updateProgress(10);
        
        let nikList = [];
        let nameList = [];
        
        if (!currentCabang.isTeam) {
            const nik = document.getElementById('nik').value;
            const nama = document.getElementById('nama').value;
            
            nikList.push(nik);
            nameList.push(nama);
            
            formData.append('nik', nik);
            formData.append('nama', nama);
            formData.append('jenisKelamin', document.getElementById('jenisKelamin').value);
            formData.append('tempatLahir', document.getElementById('tempatLahir').value);
            formData.append('tglLahir', document.getElementById('tglLahir').value);
            formData.append('umur', document.getElementById('umur').value);
            formData.append('alamat', document.getElementById('alamat').value);
            formData.append('noTelepon', document.getElementById('noTelepon').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('namaRek', document.getElementById('namaRek').value);
            formData.append('noRek', document.getElementById('noRek').value);
            formData.append('namaBank', document.getElementById('namaBank').value);
            Logger.log('Personal data added');
        } else {
            for (let i = 1; i <= currentTeamMemberCount; i++) {
                const nik = document.querySelector(`[name="memberNik${i}"]`)?.value;
                const nama = document.querySelector(`[name="memberName${i}"]`)?.value;
                
                if (nik && nik !== '-') nikList.push(nik);
                if (nama && nama !== '-') nameList.push(nama);
                
                const fields = ['Nik', 'Name', 'JenisKelamin', 'TempatLahir', 'BirthDate', 'Umur', 'Alamat', 'NoTelepon', 'Email', 'NamaRek', 'NoRek', 'NamaBank'];
                fields.forEach(field => {
                    const el = document.querySelector(`[name="member${field}${i}"]`);
                    formData.append(`member${field}${i}`, el?.value || '-');
                });
            }
            Logger.log('Team data added for ' + currentTeamMemberCount + ' members');
        }
        
        formData.append('nikList', JSON.stringify(nikList));
        formData.append('nameList', JSON.stringify(nameList));
        
        Logger.log('NIK List for validation: ' + JSON.stringify(nikList));
        Logger.log('Name List for validation: ' + JSON.stringify(nameList));
        
        updateProgress(15);
        showLoadingOverlay(true, 'Mengkonversi file...');
        
        let fileCount = 0;
        const totalFiles = Object.keys(uploadedFiles).length;
        
        for (let key in uploadedFiles) {
            if (uploadedFiles[key]) {
                try {
                    const file = uploadedFiles[key];
                    const base64 = await fileToBase64(file);
                    formData.append(key, base64);
                    formData.append(key + '_name', file.name);
                    formData.append(key + '_type', file.type);
                    fileCount++;
                    Logger.log(`File converted: ${key} (${fileCount}/${totalFiles})`);
                    updateProgress(15 + (fileCount / totalFiles) * 45);
                } catch (fileError) {
                    Logger.error('Error converting file: ' + key, fileError);
                }
            }
        }
        
        updateProgress(60);
        showLoadingOverlay(true, 'Mengirim data ke server...');
        Logger.log('Sending data to Google Apps Script');
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        updateProgress(80);
        Logger.log('Response received, parsing...');
        
        const result = await response.json();
        Logger.log('Result:', result);
        
        updateProgress(100);
        showLoadingOverlay(false);
        
        if (result.success) {
            const displayName = currentCabang.isTeam ? 
                document.querySelector(`input[name="memberName1"]`)?.value : 
                document.getElementById('nama').value;
            showResultModal(true, 'Registrasi Berhasil!', 
                `Nama: ${displayName}\nCabang: ${currentCabang.name}\n\nData Anda telah tersimpan.\nEmail konfirmasi akan dikirim dalam 24 jam.`);
            Logger.log('=== FORM SUBMISSION SUCCESS ===');
            
            setTimeout(() => {
                Logger.log('Auto-clearing form after successful submission');
                document.getElementById('registrationForm').reset();
                document.getElementById('umur').value = '';
                document.getElementById('ageRequirement').style.display = 'none';
                document.getElementById('dataDiriSection').style.display = 'none';
                document.getElementById('rekeningPersonalSection').style.display = 'none';
                document.getElementById('personalSection').classList.remove('show');
                document.getElementById('teamSection').classList.remove('show');
                document.getElementById('teamMembers').innerHTML = '';
                document.getElementById('personalDocs').innerHTML = '';
                
                uploadedFiles = {};
                savedPersonalData = null;
                savedTeamData = {};
                
                currentCabang = null;
                currentTeamMemberCount = 2;
                document.getElementById('submitBtn').disabled = false;
                document.getElementById('submitStatusInfo').style.display = 'none';
            }, 2000);
        } else {
            Logger.error('Submission failed:', result.message);
            showResultModal(false, 'Registrasi Ditolak', result.message || 'Terjadi kesalahan saat menyimpan data');
        }
        
    } catch (error) {
        Logger.error('Submit error:', error);
        showLoadingOverlay(false);
        showResultModal(false, 'Kesalahan Sistem', 'Terjadi kesalahan saat mengirim data: ' + error.message + '\n\nSilakan coba lagi atau hubungi admin jika masalah berlanjut.');
    } finally {
        document.getElementById('progressContainer').style.display = 'none';
    }
});