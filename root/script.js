// Data struktur cabang dan golongan dengan batas umur
const cabangsData = {
    'Seni Baca Al Qur\'an': [
        { name: 'Golongan Tartil Al Qur\'an (Putra/Putri)', maxAge: '12-11-29', isTeam: false },
        { name: 'Golongan Tilawah Anak-anak (Putra/Putri)', maxAge: '14-11-29', isTeam: false },
        { name: 'Golongan Tilawah Remaja (Putra/Putri)', maxAge: '24-11-29', isTeam: false },
        { name: 'Golongan Tilawah Dewasa (Putra/Putri)', maxAge: '40-11-29', isTeam: false }
    ],
    'Qira\'at Al Qur\'an': [
        { name: 'Qira\'at Mujawwad Dewasa (Putra/Putri)', maxAge: '40-11-29', isTeam: false }
    ],
    'Hafalan Al Qur\'an': [
        { name: 'Golongan 1 Juz & Tilawah (Putra/Putri)', maxAge: '15-11-29', isTeam: false },
        { name: 'Golongan 5 Juz & Tilawah (Putra/Putri)', maxAge: '20-11-29', isTeam: false },
        { name: 'Golongan 10 Juz (Putra/Putri)', maxAge: '20-11-29', isTeam: false },
        { name: 'Golongan 20 Juz (Putra/Putri)', maxAge: '22-11-29', isTeam: false },
        { name: 'Golongan 30 Juz (Putra/Putri)', maxAge: '22-11-29', isTeam: false }
    ],
    'Tafsir Al Qur\'an': [
        { name: 'Golongan Bahasa Arab (Putra/Putri)', maxAge: '22-11-29', isTeam: false },
        { name: 'Golongan Bahasa Indonesia (Putra/Putri)', maxAge: '34-11-29', isTeam: false },
        { name: 'Golongan Bahasa Inggris (Putra/Putri)', maxAge: '34-11-29', isTeam: false }
    ],
    'Fahm Al Qur\'an': [
        { name: 'Tim Fahm (Putra)', maxAge: '18-11-29', isTeam: true, memberCount: 3 },
        { name: 'Tim Fahm (Putri)', maxAge: '18-11-29', isTeam: true, memberCount: 3 }
    ],
    'Syarh Al Qur\'an': [
        { name: 'Tim Syarh (Putra)', maxAge: '18-11-29', isTeam: true, memberCount: 3 },
        { name: 'Tim Syarh (Putri)', maxAge: '18-11-29', isTeam: true, memberCount: 3 }
    ],
    'Seni Kaligrafi Al Qur\'an': [
        { name: 'Golongan Naskah Penulisan (Putra/Putri)', maxAge: '34-11-29', isTeam: false },
        { name: 'Golongan Hiasan Mushaf (Putra/Putri)', maxAge: '34-11-29', isTeam: false },
        { name: 'Golongan Dekorasi (Putra/Putri)', maxAge: '34-11-29', isTeam: false },
        { name: 'Golongan Kontemporer (Putra/Putri)', maxAge: '34-11-29', isTeam: false }
    ],
    'Karya Tulis Ilmiah Al Qur\'an': [
        { name: 'KTIQ (Putra/Putri)', maxAge: '24-11-29', isTeam: false }
    ]
};

let currentGolongan = null;

// UTILITY FUNCTIONS
function showTab(tabName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

function updateGolongan() {
    const cabang = document.getElementById('cabang').value;
    const golonganSelect = document.getElementById('golongan');
    const teamSection = document.getElementById('teamSection');
    
    golonganSelect.innerHTML = '<option value="">-- Pilih Golongan --</option>';
    teamSection.classList.remove('show');
    document.getElementById('ageRequirement').innerHTML = '';
    
    if (cabangsData[cabang]) {
        cabangsData[cabang].forEach((gol) => {
            const option = document.createElement('option');
            option.value = JSON.stringify(gol);
            const ageText = gol.maxAge.split('-').join(' tahun ') + ' hari';
            option.textContent = `${gol.name} (Max: ${ageText})`;
            golonganSelect.appendChild(option);
        });
    }
}

function updateAgeRequirement() {
    const selectedValue = document.getElementById('golongan').value;
    const ageReqDiv = document.getElementById('ageRequirement');
    
    if (!selectedValue) {
        ageReqDiv.innerHTML = '';
        return;
    }

    try {
        currentGolongan = JSON.parse(selectedValue);
        const ageText = currentGolongan.maxAge.split('-').join(' tahun ') + ' hari';
        ageReqDiv.innerHTML = `ℹ️ Batas usia maksimal: ${ageText} (per 1 November 2025)`;

        if (currentGolongan.isTeam) {
            document.getElementById('teamSection').classList.add('show');
            generateTeamMembers(currentGolongan.memberCount);
        } else {
            document.getElementById('teamSection').classList.remove('show');
        }
    } catch (e) {
        ageReqDiv.innerHTML = '';
    }
}

function generateTeamMembers(count) {
    const container = document.getElementById('teamMembers');
    container.innerHTML = '';

    for (let i = 1; i <= count; i++) {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'team-member';
        memberDiv.innerHTML = `
            <h4>Anggota Tim #${i}</h4>
            <input type="text" name="memberNik${i}" maxlength="16" inputmode="numeric" placeholder="NIK anggota ${i} (16 digit)" required>
            <small class="small-text">Gunakan hanya angka, tanpa spasi</small>
            <input type="text" name="memberName${i}" placeholder="Nama lengkap anggota ${i}" required>
            <input type="date" name="memberBirthDate${i}" placeholder="Tanggal lahir anggota ${i}" required>
            <small class="small-text">📝 Anggota ini juga harus melengkapi dokumen persyaratan</small>
        `;
        container.appendChild(memberDiv);
    }

    // Format NIK members
    for (let i = 1; i <= count; i++) {
        const nikInput = document.querySelector(`input[name="memberNik${i}"]`);
        if (nikInput) {
            nikInput.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16);
            });
        }
    }
}

function calculateAge(birthDateStr) {
    const birthDate = new Date(birthDateStr);
    const referenceDate = new Date(2025, 10, 1);

    if (!birthDateStr) return null;

    let years = referenceDate.getFullYear() - birthDate.getFullYear();
    let months = referenceDate.getMonth() - birthDate.getMonth();
    let days = referenceDate.getDate() - birthDate.getDate();

    if (days < 0) {
        months--;
        const prevMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0);
        days += prevMonth.getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    return { years, months, days };
}

function compareAge(ageObj, maxAgeStr) {
    const [maxYears, maxMonths, maxDays] = maxAgeStr.split('-').map(Number);
    
    if (ageObj.years > maxYears) return false;
    if (ageObj.years === maxYears && ageObj.months > maxMonths) return false;
    if (ageObj.years === maxYears && ageObj.months === maxMonths && ageObj.days > maxDays) return false;
    return true;
}

function formatAge(ageObj) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${ageObj.years}-${pad(ageObj.months)}-${pad(ageObj.days)}`;
}

function resetForm() {
    document.getElementById('registrationForm').reset();
    document.getElementById('umur').value = '';
    document.getElementById('ageRequirement').innerHTML = '';
    document.getElementById('teamSection').classList.remove('show');
    document.getElementById('teamMembers').innerHTML = '';
    ['suratMandatName', 'ktpFileName', 'sertifikatName', 'fotoBukuName', 'photoFileName'].forEach(id => {
        document.getElementById(id).textContent = 'Belum ada file dipilih';
    });
}

function showResultModal(success, title, message, errorDetails = null) {
    const modal = document.getElementById('resultModal');
    document.getElementById('resultIcon').textContent = success ? '✅' : '❌';
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('resultMessage').textContent = message;
    
    const errorDetail = document.getElementById('errorDetail');
    if (errorDetails) {
        errorDetail.innerHTML = `<strong>Detail Error:</strong><br>${errorDetails}`;
        errorDetail.style.display = 'block';
    } else {
        errorDetail.style.display = 'none';
    }
    
    modal.classList.add('show');
}

function closeResultModal() {
    document.getElementById('resultModal').classList.remove('show');
}

function updateProgress(percent) {
    const fill = document.getElementById('progressFill');
    fill.style.width = percent + '%';
    fill.textContent = percent + '%';
}

function toggleLoading(show) {
    document.getElementById('progressContainer').style.display = show ? 'block' : 'none';
}

// EVENT LISTENERS - FILE UPLOADS
['suratMandatFile', 'ktpUploadFile', 'sertifikatFile', 'fotoBukuFile', 'photoUploadFile'].forEach(id => {
    const nameId = id.replace('File', 'Name');
    document.getElementById(id).addEventListener('change', function() {
        const fileName = this.files[0]?.name || 'Belum ada file dipilih';
        const fileSize = this.files[0]?.size || 0;
        if (fileSize > 5 * 1024 * 1024) {
            document.getElementById(nameId).textContent = '❌ File terlalu besar (Max 5MB)';
            this.value = '';
            return;
        }
        document.getElementById(nameId).textContent = fileName;
    });
});

// EVENT LISTENER - NIK INPUT (hanya angka)
document.getElementById('nik').addEventListener('input', function(e) {
    this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16);
});

// EVENT LISTENER - TANGGAL LAHIR
document.getElementById('tglLahir').addEventListener('change', function() {
    const ageObj = calculateAge(this.value);
    if (ageObj) {
        document.getElementById('umur').value = formatAge(ageObj);
    }
});

// MAIN FORM SUBMISSION
document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Validasi NIK panjang
    if (document.getElementById('nik').value.length !== 16) {
        showResultModal(false, 'Validasi Gagal', 'NIK harus 16 digit!');
        return;
    }

    // Validasi batas umur peserta utama
    const ageObj = calculateAge(document.getElementById('tglLahir').value);
    if (!currentGolongan || !compareAge(ageObj, currentGolongan.maxAge)) {
        const maxAge = currentGolongan.maxAge.split('-').join(' tahun ') + ' hari';
        showResultModal(false, 'Validasi Umur Gagal', 
            `Umur peserta melebihi batas maksimal.\n\nUmur Anda: ${formatAge(ageObj)}\nBatas Maksimal: ${maxAge}\n\nPeserta tidak memenuhi syarat untuk kategori ini.`);
        return;
    }

    // Validasi tim members jika ada
    if (currentGolongan.isTeam) {
        for (let i = 1; i <= currentGolongan.memberCount; i++) {
            const memberNik = document.querySelector(`input[name="memberNik${i}"]`)?.value;
            const memberBirthDate = document.querySelector(`input[name="memberBirthDate${i}"]`)?.value;
            
            if (!memberNik || memberNik.length !== 16) {
                showResultModal(false, 'Validasi Gagal', `NIK Anggota ${i} harus 16 digit!`);
                return;
            }

            if (memberBirthDate) {
                const memberAge = calculateAge(memberBirthDate);
                if (!compareAge(memberAge, currentGolongan.maxAge)) {
                    const maxAge = currentGolongan.maxAge.split('-').join(' tahun ') + ' hari';
                    showResultModal(false, 'Validasi Umur Anggota Gagal', 
                        `Anggota ${i} umurnya melebihi batas.\n\nUmur: ${formatAge(memberAge)}\nBatas: ${maxAge}`);
                    return;
                }
            }
        }
    }

    // Validasi file
    const requiredFiles = ['suratMandatFile', 'ktpUploadFile', 'sertifikatFile', 'fotoBukuFile', 'photoUploadFile'];
    for (let fileId of requiredFiles) {
        const fileInput = document.getElementById(fileId);
        if (!fileInput.files || fileInput.files.length === 0) {
            showResultModal(false, 'Dokumen Tidak Lengkap', `File ${fileId} harus diunggah!`);
            return;
        }
        if (fileInput.files[0].size > 5 * 1024 * 1024) {
            showResultModal(false, 'File Terlalu Besar', `File ${fileId} melebihi 5MB!`);
            return;
        }
    }

    toggleLoading(true);
    updateProgress(10);

    try {
        // Simulasi proses upload dan penyimpanan data
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(30);

        const pesertaData = {
            nik: document.getElementById('nik').value,
            nama: document.getElementById('nama').value,
            jenisKelamin: document.getElementById('jenisKelamin').value,
            tempatLahir: document.getElementById('tempatLahir').value,
            tglLahir: document.getElementById('tglLahir').value,
            umur: document.getElementById('umur').value,
            alamat: document.getElementById('alamat').value,
            noTelepon: document.getElementById('noTelepon').value,
            email: document.getElementById('email').value,
            cabang: document.getElementById('cabang').value,
            golongan: document.getElementById('golongan').value,
            kecamatan: document.getElementById('kecamatan').value,
            namaRek: document.getElementById('namaRek').value,
            noRek: document.getElementById('noRek').value,
            namaBank: document.getElementById('namaBank').value,
            namaRegu: document.getElementById('namaRegu').value || '-',
            timestamp: new Date().toLocaleString('id-ID')
        };

        updateProgress(50);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Persiapkan FormData untuk upload
        const formData = new FormData();
        
        // Tambah data peserta
        Object.keys(pesertaData).forEach(key => {
            formData.append(key, pesertaData[key]);
        });

        // Tambah file
        formData.append('suratMandat', document.getElementById('suratMandatFile').files[0]);
        formData.append('ktpFile', document.getElementById('ktpUploadFile').files[0]);
        formData.append('sertifikat', document.getElementById('sertifikatFile').files[0]);
        formData.append('fotoBuku', document.getElementById('fotoBukuFile').files[0]);
        formData.append('photoFile', document.getElementById('photoUploadFile').files[0]);

        // Jika ada tim members
        if (currentGolongan.isTeam) {
            for (let i = 1; i <= currentGolongan.memberCount; i++) {
                const nikInput = document.querySelector(`input[name="memberNik${i}"]`);
                const nameInput = document.querySelector(`input[name="memberName${i}"]`);
                const dateInput = document.querySelector(`input[name="memberBirthDate${i}"]`);
                
                if (nikInput && nameInput && dateInput) {
                    formData.append(`memberNik${i}`, nikInput.value);
                    formData.append(`memberName${i}`, nameInput.value);
                    formData.append(`memberBirthDate${i}`, dateInput.value);
                }
            }
        }

        updateProgress(70);
        await new Promise(resolve => setTimeout(resolve, 500));

        // INSTRUKSI: Ganti URL_APPS_SCRIPT dengan URL deployment Apps Script Anda
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIErnnyQxU9SFFsxVeQM-fWi8vYdMocR05CiR_ByR4W60DtAqtVwrqC2R_-Di3PxBB/exec';

        // Untuk demo, simulasikan success
        const isDemo = true;
        if (isDemo) {
            // Demo mode
            updateProgress(90);
            await new Promise(resolve => setTimeout(resolve, 500));
            updateProgress(100);
            
            setTimeout(() => {
                toggleLoading(false);
                const filesList = requiredFiles.map(id => `✓ ${document.getElementById(id).files[0].name}`).join('\n');
                showResultModal(true, 
                    'Registrasi Berhasil! 🎉',
                    `Data peserta telah berhasil disimpan.\n\nNama: ${pesertaData.nama}\nKecamatan: ${pesertaData.kecamatan}\nCabang: ${pesertaData.cabang}\n\nDokumen yang diunggah:\n${filesList}\n\nANDA AKAN MENERIMA EMAIL KONFIRMASI DALAM 24 JAM.`,
                    null
                );
                resetForm();
            }, 500);
        } else {
            // Production - uncomment untuk implementasi sebenarnya
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            updateProgress(90);

            if (result.success) {
                updateProgress(100);
                await new Promise(resolve => setTimeout(resolve, 500));
                toggleLoading(false);
                showResultModal(true, 'Registrasi Berhasil!', result.message);
                resetForm();
            } else {
                toggleLoading(false);
                showResultModal(false, 'Registrasi Gagal', result.message || 'Terjadi kesalahan saat memproses data');
            }
        }

    } catch (error) {
        toggleLoading(false);
        showResultModal(false, 'Error Sistem', 'Terjadi kesalahan saat memproses registrasi.\n\nSilakan coba lagi atau hubungi administrator.',
            error.message);
        console.error('Error:', error);
    }
});

// Format input untuk file sizes
document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', function() {
        if (this.files[0]) {
            const sizeInMB = (this.files[0].size / (1024 * 1024)).toFixed(2);
            console.log(`File: ${this.files[0].name} (${sizeInMB} MB)`);
        }
    });
});