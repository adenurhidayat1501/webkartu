/**
 * Main Application Controller - SMKN Cipatujah ID Card Studio
 */
class AppController {
    constructor() {
        this.state = {
            dataset: null,
            activeClassId: 'XTO1',
            viewMode: 'grid', // 'grid', 'dual', 'table'
            filter: 'all',    // 'all', 'L', 'P', 'has_photo', 'no_photo'
            searchQuery: '',
            schoolSettings: {
                name: 'SMK NEGERI CIPATUJAH',
                sub1: 'Jl. Raya Cipatujah, Kec. Cipatujah',
                sub2: 'Kabupaten Tasikmalaya, Jawa Barat 46189',
                card_title: 'KARTU PELAJAR',
                official_label: 'IDENTITAS RESMI SISWA',
                footer_note: 'Berlaku selama menjadi siswa SMKN CIPATUJAH',
                city_date: 'Cipatujah, 15 Juli 2026',
                principal_title: 'Kepala Sekolah,',
                principal_name: 'Drs. H. Dede Wahyudin, M.Pd.',
                principal_nip: 'NIP. 19680512 199403 1 004',
                logoUrl: 'assets/logo.png',
                signatureUrl: 'assets/signature-sample.svg',
                show_signature: true,
                qr_format: 'default' // 'default', 'nisn', 'vcard'
            },
            editingStudent: null,
            qrCache: new Map(),
            photoDataCache: new Map()
        };
    }

    async init() {
        this.loadSettingsFromStorage();
        
        // Parse URL params for direct linking (e.g. ?view=dual&class=XTO1)
        const params = new URLSearchParams(window.location.search);
        if (params.get('view')) this.state.viewMode = params.get('view');
        if (params.get('class')) this.state.activeClassId = params.get('class');

        this.setupEventListeners();
        await this.loadInitialDataset();
    }

    loadSettingsFromStorage() {
        try {
            const saved = localStorage.getItem('smkn_idcard_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state.schoolSettings = { ...this.state.schoolSettings, ...parsed };
            }
        } catch (e) {
            console.warn('Could not load settings from localStorage', e);
        }
    }

    saveSettingsToStorage() {
        try {
            localStorage.setItem('smkn_idcard_settings', JSON.stringify(this.state.schoolSettings));
        } catch (e) {
            console.warn('Could not save settings to localStorage', e);
        }
    }

    async loadInitialDataset() {
        try {
            this.showLoading(true);
            const res = await fetch('data/students-data.json');
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            this.state.dataset = data;

            if (data.school) {
                this.state.schoolSettings = {
                    ...this.state.schoolSettings,
                    ...data.school
                };
            }

            // Default to first class
            if (data.classes && data.classes.length > 0) {
                this.state.activeClassId = data.classes[0].id;
            }

            this.renderSidebar();
            await this.renderActiveView();

            // Check if URL asks to open a specific modal directly
            const params = new URLSearchParams(window.location.search);
            const classData = this.getActiveClass();
            if (params.get('modal') === 'edit' && classData && classData.students.length > 0) {
                this.openEditModal(classData.students[0]);
            } else if (params.get('modal') === 'print') {
                this.openPrintModal();
            } else if (params.get('modal') === 'settings') {
                this.openSettingsModal();
            } else if (params.get('modal') === 'photo' && classData && classData.students.length > 0) {
                this.openPhotoPicker(classData.students[0]);
            }
        } catch (err) {
            console.error('Failed to load students-data.json:', err);
            alert('Gagal memuat data awal. Pastikan server lokal berjalan atau upload file Excel.');
        } finally {
            this.showLoading(false);
        }
    }

    setupEventListeners() {
        // Search Input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.state.searchQuery = e.target.value.toLowerCase().trim();
                this.renderActiveView();
            });
        }

        // Filter chips
        document.querySelectorAll('.filter-chips .chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.state.filter = chip.dataset.filter;
                this.renderActiveView();
            });
        });

        // View mode toggles
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.viewMode = btn.dataset.view;
                this.renderActiveView();
            });
        });

        // Global Action Buttons
        document.getElementById('btn-open-settings')?.addEventListener('click', () => this.openSettingsModal());
        document.getElementById('btn-open-upload')?.addEventListener('click', () => this.openUploadModal());
        document.getElementById('btn-open-print')?.addEventListener('click', () => this.openPrintModal());
        document.getElementById('btn-export-zip')?.addEventListener('click', () => this.exportCurrentClassZip());
        document.getElementById('btn-export-pdf')?.addEventListener('click', () => this.exportCurrentClassPdf());

        // Close modal buttons
        document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const overlay = e.target.closest('.modal-overlay');
                if (overlay) overlay.classList.remove('active');
            });
        });
    }

    getActiveClass() {
        if (!this.state.dataset || !this.state.dataset.classes) return null;
        if (this.state.activeClassId === 'ALL') {
            const allStudents = [];
            this.state.dataset.classes.forEach(c => {
                allStudents.push(...c.students);
            });
            return {
                id: 'ALL',
                name: 'Semua Kelas',
                fullname: 'Seluruh Siswa Kelas X (Tahun Pelajaran 2026-2027)',
                students: allStudents,
                total_students: allStudents.length,
                matched_count: allStudents.filter(s => s.photo_file).length
            };
        }
        return this.state.dataset.classes.find(c => c.id === this.state.activeClassId);
    }

    getFilteredStudents(classData) {
        if (!classData || !classData.students) return [];
        return classData.students.filter(st => {
            // Filter query
            if (this.state.searchQuery) {
                const q = this.state.searchQuery;
                const matchName = (st.nama || '').toLowerCase().includes(q);
                const matchNisn = (st.nisn || '').toLowerCase().includes(q);
                const matchNipd = (st.nipd || '').toLowerCase().includes(q);
                if (!matchName && !matchNisn && !matchNipd) return false;
            }

            // Filter chips
            if (this.state.filter === 'L' && st.jk !== 'L') return false;
            if (this.state.filter === 'P' && st.jk !== 'P') return false;
            if (this.state.filter === 'has_photo' && !st.photo_file) return false;
            if (this.state.filter === 'no_photo' && st.photo_file) return false;

            return true;
        });
    }

    renderSidebar() {
        const listContainer = document.getElementById('sidebar-classes-list');
        if (!listContainer || !this.state.dataset) return;

        let html = '';
        const classes = this.state.dataset.classes || [];

        // All classes option
        const totalAll = classes.reduce((sum, c) => sum + (c.total_students || 0), 0);
        const totalMatched = classes.reduce((sum, c) => sum + (c.matched_count || 0), 0);

        html += `
          <li class="class-item ${this.state.activeClassId === 'ALL' ? 'active' : ''}" data-id="ALL">
            <div class="class-info">
              <span class="class-name">Semua Kelas X</span>
              <span class="class-sub">${classes.length} Rombel Terdaftar</span>
            </div>
            <span class="class-badge">${totalAll}</span>
          </li>
        `;

        classes.forEach(c => {
            const isActive = c.id === this.state.activeClassId;
            const pct = c.total_students ? Math.round((c.matched_count / c.total_students) * 100) : 0;
            html += `
              <li class="class-item ${isActive ? 'active' : ''}" data-id="${c.id}">
                <div class="class-info">
                  <span class="class-name">${c.name}</span>
                  <span class="class-sub">${c.fullname}</span>
                </div>
                <span class="class-badge">${c.total_students}</span>
              </li>
            `;
        });

        listContainer.innerHTML = html;

        // Click handlers
        listContainer.querySelectorAll('.class-item').forEach(item => {
            item.addEventListener('click', () => {
                this.state.activeClassId = item.dataset.id;
                this.renderSidebar();
                this.renderActiveView();
            });
        });

        // Update sidebar footer stats
        const overallPercent = totalAll ? Math.round((totalMatched / totalAll) * 100) : 0;
        const countEl = document.getElementById('stat-matched-count');
        const fillEl = document.getElementById('stat-matched-fill');
        if (countEl) countEl.innerText = `${totalMatched} / ${totalAll} (${overallPercent}%)`;
        if (fillEl) fillEl.style.width = `${overallPercent}%`;
    }

    async getQrDataUrl(student, className) {
        // Priority 1: User uploaded custom QR Data URL
        if (student.qr_data_url) {
            return student.qr_data_url;
        }

        // Priority 2: Use official static QR code from dataqr folder
        if (student.qr_url && this.state.schoolSettings.qr_format === 'default') {
            return student.qr_url;
        }

        // Priority 3: Check cache
        const key = `${student.id || student.nama}_${student.nisn}`;
        if (this.state.qrCache.has(key)) {
            return this.state.qrCache.get(key);
        }

        // Priority 4: Dynamic generated QR Code
        let qrText = student.nisn ? `NISN:${student.nisn}|${student.nama}|${className}` : `${student.nama}|${className}`;
        if (this.state.schoolSettings.qr_format === 'nisn') {
            qrText = student.nisn || student.nama;
        } else if (this.state.schoolSettings.qr_format === 'vcard') {
            qrText = `BEGIN:VCARD\nVERSION:3.0\nFN:${student.nama}\nNOTE:NISN:${student.nisn};NIS:${student.nipd};${className}\nORG:${this.state.schoolSettings.name}\nEND:VCARD`;
        }

        const dataUrl = await CardGenerator.generateQrCode(qrText);
        this.state.qrCache.set(key, dataUrl);
        return dataUrl;
    }

    async renderActiveView() {
        const classData = this.getActiveClass();
        if (!classData) return;

        // Update Hero Banner
        const heroTitle = document.getElementById('hero-class-title');
        const heroSub = document.getElementById('hero-class-sub');
        const countBadge = document.getElementById('hero-student-count');
        const matchBadge = document.getElementById('hero-match-badge');

        if (heroTitle) heroTitle.innerText = classData.name;
        if (heroSub) heroSub.innerText = classData.fullname || '';
        if (countBadge) countBadge.innerText = `${classData.total_students} Siswa`;

        const pct = classData.total_students ? Math.round((classData.matched_count / classData.total_students) * 100) : 0;
        if (matchBadge) {
            matchBadge.innerText = `${pct}% Foto Terhubung (${classData.matched_count}/${classData.total_students})`;
            matchBadge.className = `status-pill ${pct === 100 ? 'exact' : (pct > 80 ? 'fuzzy' : 'suggested')}`;
        }

        // Update active view buttons
        document.querySelectorAll('.view-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.view === this.state.viewMode);
        });

        const filtered = this.getFilteredStudents(classData);
        const container = document.getElementById('cards-container');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = `
              <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="font-size: 42px; margin-bottom: 12px;">🔍</div>
                <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">Tidak ada data siswa ditemukan</h3>
                <p style="font-size: 13px; margin-top: 4px;">Coba ubah kata kunci pencarian atau filter yang dipilih.</p>
              </div>
            `;
            return;
        }

        // Render based on active view mode
        if (this.state.viewMode === 'grid') {
            await this.renderGridView(filtered, classData.name, container);
        } else if (this.state.viewMode === 'dual') {
            await this.renderDualView(filtered, classData.name, container);
        } else if (this.state.viewMode === 'table') {
            this.renderTableView(filtered, classData.name, container);
        }
    }

    async renderGridView(students, className, container) {
        container.className = 'cards-grid';
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);"><div style="font-size: 28px; margin-bottom: 8px;">⏳</div>Memuat kartu pelajar...</div>';

        // Preload all QR codes in parallel
        const qrPromises = students.map(st => this.getQrDataUrl(st, className));
        const qrCodes = await Promise.all(qrPromises);

        const cardsHtmlArray = students.map((st, i) => {
            const qrDataUrl = qrCodes[i];
            const frontSvg = CardGenerator.generateFrontSvg(st, this.state.schoolSettings, qrDataUrl);
            const backSvg = CardGenerator.generateBackSvg(st, this.state.schoolSettings);

            const statusClass = st.photo_status || (st.photo_file ? 'exact' : 'missing');
            const statusLabel = st.photo_status === 'exact' ? '✓ Foto Pas' :
                               (st.photo_status === 'fuzzy' ? '≈ Cocok Nama' :
                               (st.photo_status === 'suggested' ? '? Disarankan' : '✕ Tanpa Foto'));

            return `
              <div class="student-card-item" data-id="${st.id || i}">
                <div class="card-top-meta">
                  <span class="student-idx">#${st.no || (i + 1)}</span>
                  <span class="status-pill ${statusClass}">${statusLabel}</span>
                </div>

                <!-- 3D Interactive Flip Scene -->
                <div class="card-scene" title="Klik untuk membalik kartu (Depan / Belakang)">
                  <div class="card-flip-inner">
                    <div class="card-side card-side-front">${frontSvg}</div>
                    <div class="card-side card-side-back">${backSvg}</div>
                  </div>
                  <div class="flip-indicator-hint">↻ Klik untuk Membalik</div>
                </div>

                <!-- Bottom Actions -->
                <div class="card-bottom-actions">
                  <div class="student-name-summary" title="${st.nama}">${st.nama}</div>
                  <div class="action-icon-group">
                    <button class="btn-card-action btn-edit" title="Edit & Detail Siswa" data-idx="${i}">✏️</button>
                    <button class="btn-card-action btn-change-photo" title="Ganti / Pilih Foto" data-idx="${i}">🖼️</button>
                    <button class="btn-card-action btn-dl-front" title="Download Depan (PNG)" data-idx="${i}">⬇️</button>
                    <button class="btn-card-action btn-print-single" title="Cetak Kartu Ini" data-idx="${i}">🖨️</button>
                  </div>
                </div>
              </div>
            `;
        });

        container.innerHTML = cardsHtmlArray.join('');

        // Wire 3D flip click
        container.querySelectorAll('.card-scene').forEach(scene => {
            scene.addEventListener('click', () => {
                const inner = scene.querySelector('.card-flip-inner');
                if (inner) inner.classList.toggle('is-flipped');
            });
        });

        // Wire action buttons
        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx, 10);
                this.openEditModal(students[idx]);
            });
        });

        container.querySelectorAll('.btn-change-photo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx, 10);
                this.openPhotoPicker(students[idx]);
            });
        });

        container.querySelectorAll('.btn-dl-front').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx, 10);
                const st = students[idx];
                const cardItem = btn.closest('.student-card-item');
                const isFlipped = cardItem && cardItem.querySelector('.card-flip-inner') && cardItem.querySelector('.card-flip-inner').classList.contains('is-flipped');

                this.showLoading(true, 'Menyiapkan gambar kartu...');
                try {
                    if (isFlipped) {
                        const svg = CardGenerator.generateBackSvg(st, this.state.schoolSettings);
                        await CardGenerator.downloadSvgAsPng(svg, `${ExportManager.safeFilename(st.nama)}_BELAKANG.png`, 3);
                    } else {
                        const qr = await this.getQrDataUrl(st, className);
                        const svg = CardGenerator.generateFrontSvg(st, this.state.schoolSettings, qr);
                        await CardGenerator.downloadSvgAsPng(svg, `${ExportManager.safeFilename(st.nama)}_DEPAN.png`, 3);
                    }
                } catch (err) {
                    console.error('Download error:', err);
                    alert('Gagal mengunduh gambar: ' + err.message);
                } finally {
                    this.showLoading(false);
                }
            });
        });

        container.querySelectorAll('.btn-print-single').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx, 10);
                this.printSingleStudent(students[idx]);
            });
        });
    }

    async renderDualView(students, className, container) {
        container.className = 'cards-dual-grid';
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><div style="font-size: 28px; margin-bottom: 8px;">⏳</div>Merender tampilan berdampingan...</div>';

        // Preload all QR codes in parallel
        const qrPromises = students.map(st => this.getQrDataUrl(st, className));
        const qrCodes = await Promise.all(qrPromises);

        const htmlArray = students.map((st, i) => {
            const qrDataUrl = qrCodes[i];
            const frontSvg = CardGenerator.generateFrontSvg(st, this.state.schoolSettings, qrDataUrl);
            const backSvg = CardGenerator.generateBackSvg(st, this.state.schoolSettings);

            return `
              <div class="dual-card-wrapper">
                <div class="card-top-meta">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="student-idx">#${st.no || (i + 1)}</span>
                    <strong style="font-size: 15px; color: var(--primary);">${st.nama}</strong>
                    <span style="font-size: 12px; color: var(--text-muted);">NISN: ${st.nisn || '-'}</span>
                  </div>
                  <div class="action-icon-group">
                    <button class="btn btn-secondary btn-sm btn-edit" data-idx="${i}">✏️ Edit</button>
                    <button class="btn btn-secondary btn-sm btn-change-photo" data-idx="${i}">🖼️ Ganti Foto</button>
                    <button class="btn btn-primary btn-sm btn-dl-both" data-idx="${i}">⬇️ Download Kedua Sisi</button>
                  </div>
                </div>
                <div class="dual-card-row">
                  <div>
                    <p style="font-size: 12px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">SISI DEPAN</p>
                    <div style="aspect-ratio: 326/205; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-md);">${frontSvg}</div>
                  </div>
                  <div>
                    <p style="font-size: 12px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">SISI BELAKANG</p>
                    <div style="aspect-ratio: 326/205; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-md);">${backSvg}</div>
                  </div>
                </div>
              </div>
            `;
        });

        container.innerHTML = htmlArray.join('');

        // Wire buttons
        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                this.openEditModal(students[idx]);
            });
        });

        container.querySelectorAll('.btn-change-photo').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                this.openPhotoPicker(students[idx]);
            });
        });

        container.querySelectorAll('.btn-dl-both').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.dataset.idx, 10);
                const st = students[idx];
                this.showLoading(true, 'Menyiapkan gambar kartu...');
                try {
                    const qr = await this.getQrDataUrl(st, className);
                    const front = CardGenerator.generateFrontSvg(st, this.state.schoolSettings, qr);
                    const back = CardGenerator.generateBackSvg(st, this.state.schoolSettings);
                    await CardGenerator.downloadSvgAsPng(front, `${ExportManager.safeFilename(st.nama)}_DEPAN.png`, 3);
                    await CardGenerator.downloadSvgAsPng(back, `${ExportManager.safeFilename(st.nama)}_BELAKANG.png`, 3);
                } catch (err) {
                    console.error('Download error:', err);
                    alert('Gagal mengunduh gambar: ' + err.message);
                } finally {
                    this.showLoading(false);
                }
            });
        });
    }

    renderTableView(students, className, container) {
        container.className = 'table-wrapper';
        let rowsHtml = '';

        students.forEach((st, i) => {
            const photoSrc = st.photo_data_url || st.photo_url || 'assets/avatar-placeholder.svg';
            const statusClass = st.photo_status || (st.photo_file ? 'exact' : 'missing');
            const statusLabel = st.photo_status === 'exact' ? 'Pas' :
                               (st.photo_status === 'fuzzy' ? 'Cocok' :
                               (st.photo_status === 'suggested' ? 'Saran' : 'Kosong'));

            rowsHtml += `
              <tr>
                <td><strong>#${st.no || (i + 1)}</strong></td>
                <td><img src="${photoSrc}" class="thumb-preview" alt="Foto ${st.nama}" onerror="this.src='assets/avatar-placeholder.svg'"></td>
                <td>
                  <strong>${st.nama}</strong>
                  <div style="font-size: 11px; color: var(--text-muted);">${st.nipd ? 'NIS: ' + st.nipd : ''}</div>
                </td>
                <td><code>${st.nisn || '-'}</code></td>
                <td><span style="font-weight: 600;">${st.jk === 'L' ? 'L' : 'P'}</span></td>
                <td>${st.ttl || '-'}</td>
                <td style="max-width: 220px; font-size: 12px;">${st.alamat || '-'}</td>
                <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
                <td>
                  <div style="display: flex; gap: 4px;">
                    <button class="btn-card-action btn-edit" title="Edit" data-idx="${i}">✏️</button>
                    <button class="btn-card-action btn-change-photo" title="Ganti Foto" data-idx="${i}">🖼️</button>
                  </div>
                </td>
              </tr>
            `;
        });

        container.innerHTML = `
          <table class="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Foto</th>
                <th>Nama Siswa</th>
                <th>NISN</th>
                <th>JK</th>
                <th>TTL</th>
                <th>Alamat</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        `;

        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                this.openEditModal(students[idx]);
            });
        });

        container.querySelectorAll('.btn-change-photo').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                this.openPhotoPicker(students[idx]);
            });
        });
    }

    // Modal: Edit Student
    async openEditModal(student) {
        this.state.editingStudent = { ...student };
        const modal = document.getElementById('modal-edit-student');
        if (!modal) return;

        document.getElementById('edit-nama').value = student.nama || '';
        document.getElementById('edit-nisn').value = student.nisn || '';
        document.getElementById('edit-nipd').value = student.nipd || '';
        document.getElementById('edit-jk').value = student.jk || 'L';
        document.getElementById('edit-agama').value = student.agama || 'Islam';
        document.getElementById('edit-ttl').value = student.ttl || '';
        document.getElementById('edit-alamat').value = student.alamat || '';

        await this.updateEditModalPreview();
        modal.classList.add('active');

        // Real-time live update inside modal on input change
        const inputs = modal.querySelectorAll('input, select, textarea');
        inputs.forEach(inp => {
            inp.oninput = () => {
                this.state.editingStudent.nama = document.getElementById('edit-nama').value;
                this.state.editingStudent.nisn = document.getElementById('edit-nisn').value;
                this.state.editingStudent.nipd = document.getElementById('edit-nipd').value;
                this.state.editingStudent.jk = document.getElementById('edit-jk').value;
                this.state.editingStudent.jk_label = this.state.editingStudent.jk === 'L' ? 'Laki-laki' : 'Perempuan';
                this.state.editingStudent.agama = document.getElementById('edit-agama').value;
                this.state.editingStudent.ttl = document.getElementById('edit-ttl').value;
                this.state.editingStudent.alamat = document.getElementById('edit-alamat').value;
                this.updateEditModalPreview();
            };
        });

        document.getElementById('btn-save-student-edit').onclick = () => {
            // Apply edits to original student object
            Object.assign(student, this.state.editingStudent);
            modal.classList.remove('active');
            this.renderActiveView();
        };
    }

    async updateEditModalPreview() {
        const previewContainer = document.getElementById('edit-card-preview');
        if (!previewContainer || !this.state.editingStudent) return;

        const classData = this.getActiveClass();
        const qrDataUrl = await CardGenerator.generateQrCode(this.state.editingStudent.nisn || this.state.editingStudent.nama);
        const frontSvg = CardGenerator.generateFrontSvg(this.state.editingStudent, this.state.schoolSettings, qrDataUrl);
        const backSvg = CardGenerator.generateBackSvg(this.state.editingStudent, this.state.schoolSettings);

        previewContainer.innerHTML = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: var(--primary); margin-bottom: 6px;">PRATINJAU DEPAN</div>
              <div style="border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm);">${frontSvg}</div>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: var(--primary); margin-bottom: 6px;">PRATINJAU BELAKANG</div>
              <div style="border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm);">${backSvg}</div>
            </div>
          </div>
        `;
    }

    // Modal: Photo Picker
    openPhotoPicker(student) {
        const modal = document.getElementById('modal-photo-picker');
        if (!modal) return;

        const classData = this.getActiveClass();
        const available = classData ? (classData.photos_in_folder || []) : [];
        const listEl = document.getElementById('photo-picker-grid');

        document.getElementById('photo-picker-student-name').innerText = student.nama;

        let itemsHtml = `
          <div class="photo-select-item upload-box" id="btn-upload-custom-photo" style="display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed var(--border-color); border-radius: 8px; cursor: pointer; padding: 16px; text-align: center; background: var(--bg-app);">
            <div style="font-size: 24px; margin-bottom: 4px;">📤</div>
            <strong style="font-size: 12px; color: var(--primary);">Upload Foto Baru</strong>
            <span style="font-size: 11px; color: var(--text-muted);">Pilih file dari HP/Laptop</span>
            <input type="file" id="custom-photo-file-input" accept="image/*" style="display: none;">
          </div>
        `;

        available.forEach(photoName => {
            const isCurrent = student.photo_file === photoName;
            const folder = classData.folder || '';
            const photoUrl = `photos/${folder}/${photoName}`;

            itemsHtml += `
              <div class="photo-select-item ${isCurrent ? 'selected' : ''}" data-file="${photoName}" style="border: 2px solid ${isCurrent ? 'var(--primary)' : 'var(--border-color)'}; border-radius: 8px; padding: 6px; cursor: pointer; text-align: center; transition: all 0.15s; background: white;">
                <img src="${photoUrl}" style="width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: 4px;" onerror="this.src='assets/avatar-placeholder.svg'">
                <p style="font-size: 11px; font-weight: 600; color: var(--text-main); margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${photoName}">${photoName}</p>
              </div>
            `;
        });

        listEl.innerHTML = itemsHtml;
        modal.classList.add('active');

        // Click on existing photo
        listEl.querySelectorAll('.photo-select-item:not(.upload-box)').forEach(item => {
            item.addEventListener('click', () => {
                const chosen = item.dataset.file;
                student.photo_file = chosen;
                student.photo_url = `photos/${classData.folder}/${chosen}`;
                student.photo_data_url = null;
                student.photo_status = 'exact';
                modal.classList.remove('active');
                this.renderActiveView();
            });
        });

        // Click upload custom photo
        const uploadBox = document.getElementById('btn-upload-custom-photo');
        const fileInput = document.getElementById('custom-photo-file-input');
        if (uploadBox && fileInput) {
            uploadBox.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        student.photo_data_url = re.target.result;
                        student.photo_file = file.name;
                        student.photo_status = 'exact';
                        modal.classList.remove('active');
                        this.renderActiveView();
                    };
                    reader.readAsDataURL(file);
                }
            };
        }
    }

    // Modal: School Settings
    openSettingsModal() {
        const modal = document.getElementById('modal-settings');
        if (!modal) return;

        const s = this.state.schoolSettings;
        document.getElementById('setting-name').value = s.name || '';
        document.getElementById('setting-sub1').value = s.sub1 || '';
        document.getElementById('setting-sub2').value = s.sub2 || '';
        document.getElementById('setting-card-title').value = s.card_title || '';
        document.getElementById('setting-city-date').value = s.city_date || '';
        document.getElementById('setting-principal-title').value = s.principal_title || '';
        document.getElementById('setting-principal-name').value = s.principal_name || '';
        document.getElementById('setting-principal-nip').value = s.principal_nip || '';
        document.getElementById('setting-footer-note').value = s.footer_note || '';
        document.getElementById('setting-show-signature').checked = s.show_signature !== false;
        document.getElementById('setting-qr-format').value = s.qr_format || 'default';

        modal.classList.add('active');

        document.getElementById('btn-save-settings').onclick = () => {
            this.state.schoolSettings.name = document.getElementById('setting-name').value;
            this.state.schoolSettings.sub1 = document.getElementById('setting-sub1').value;
            this.state.schoolSettings.sub2 = document.getElementById('setting-sub2').value;
            this.state.schoolSettings.card_title = document.getElementById('setting-card-title').value;
            this.state.schoolSettings.city_date = document.getElementById('setting-city-date').value;
            this.state.schoolSettings.principal_title = document.getElementById('setting-principal-title').value;
            this.state.schoolSettings.principal_name = document.getElementById('setting-principal-name').value;
            this.state.schoolSettings.principal_nip = document.getElementById('setting-principal-nip').value;
            this.state.schoolSettings.footer_note = document.getElementById('setting-footer-note').value;
            this.state.schoolSettings.show_signature = document.getElementById('setting-show-signature').checked;
            this.state.schoolSettings.qr_format = document.getElementById('setting-qr-format').value;

            this.saveSettingsToStorage();
            modal.classList.remove('active');
            this.renderActiveView();
        };

        // Custom logo upload
        document.getElementById('input-custom-logo')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    this.state.schoolSettings.logo_data_url = re.target.result;
                    alert('Logo sekolah berhasil diperbarui!');
                };
                reader.readAsDataURL(file);
            }
        });

        // Custom signature upload
        document.getElementById('input-custom-signature')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    this.state.schoolSettings.signature_data_url = re.target.result;
                    alert('Tanda tangan digital berhasil diperbarui!');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Modal: Upload Custom Data
    openUploadModal() {
        const modal = document.getElementById('modal-upload-data');
        if (!modal) return;
        modal.classList.add('active');

        const excelInput = document.getElementById('upload-excel-file');
        const photosInput = document.getElementById('upload-photos-folder');
        const btnProcess = document.getElementById('btn-process-upload');

        let loadedWorkbook = null;
        let selectedPhotoFiles = [];

        excelInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                /* global XLSX */
                const data = new Uint8Array(re.target.result);
                loadedWorkbook = XLSX.read(data, { type: 'array' });
                document.getElementById('upload-excel-status').innerText = `✓ Terbaca ${loadedWorkbook.SheetNames.length} sheet: ${loadedWorkbook.SheetNames.join(', ')}`;
            };
            reader.readAsArrayBuffer(file);
        };

        photosInput.onchange = (e) => {
            selectedPhotoFiles = Array.from(e.target.files).filter(f => /\.(jpe?g|png|webp)$/i.test(f.name));
            document.getElementById('upload-photos-status').innerText = `✓ Terbaca ${selectedPhotoFiles.length} file foto`;
        };

        btnProcess.onclick = () => {
            if (!loadedWorkbook) {
                alert('Silakan pilih file Excel terlebih dahulu.');
                return;
            }

            // Convert sheets to classes
            const newClasses = [];
            loadedWorkbook.SheetNames.forEach(sheetName => {
                const sheet = loadedWorkbook.Sheets[sheetName];
                const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                if (!rawRows || rawRows.length < 6) return;

                const students = [];
                for (let r = 5; r < rawRows.length; r++) {
                    const row = rawRows[r];
                    if (!row || !row[1]) continue;
                    const nama = String(row[1]).trim();
                    const nipd = String(row[2] || '').trim();
                    const jk = String(row[3] || '').trim().toUpperCase();
                    const nisn = String(row[4] || '').trim();
                    const tmpLahir = String(row[5] || '').trim();
                    const tglLahir = String(row[6] || '').trim();
                    const agama = String(row[8] || 'Islam').trim();
                    const alamat = String(row[9] || '').trim();

                    students.push({
                        no: students.length + 1,
                        nama: nama,
                        nipd: nipd,
                        jk: jk,
                        jk_label: jk === 'L' ? 'Laki-laki' : 'Perempuan',
                        nisn: nisn,
                        tempat_lahir: tmpLahir,
                        tanggal_lahir: tglLahir,
                        ttl: tmpLahir ? `${tmpLahir}, ${tglLahir}` : tglLahir,
                        agama: agama,
                        alamat: alamat,
                        rombel: sheetName,
                        photo_file: '',
                        photo_url: '',
                        photo_status: 'missing'
                    });
                }

                // Match with uploaded photos
                FuzzyMatcher.matchStudentsWithPhotos(students, selectedPhotoFiles);

                // Convert assigned Photo File objects to Data URLs
                students.forEach(st => {
                    if (st.photo_raw) {
                        const url = URL.createObjectURL(st.photo_raw);
                        st.photo_data_url = url;
                    }
                });

                newClasses.push({
                    id: FuzzyMatcher.normalizeSimple(sheetName),
                    name: sheetName,
                    fullname: `Kelas ${sheetName}`,
                    folder: sheetName.toLowerCase().replace(/\s+/g, ''),
                    total_students: students.length,
                    matched_count: students.filter(s => s.photo_file).length,
                    photos_in_folder: selectedPhotoFiles.map(f => f.name),
                    students: students
                });
            });

            this.state.dataset = {
                classes: newClasses,
                summary: {
                    total_classes: newClasses.length,
                    total_students: newClasses.reduce((s, c) => s + c.total_students, 0),
                    total_matched: newClasses.reduce((s, c) => s + c.matched_count, 0)
                }
            };

            if (newClasses.length > 0) {
                this.state.activeClassId = newClasses[0].id;
            }

            modal.classList.remove('active');
            this.renderSidebar();
            this.renderActiveView();
            alert(`Berhasil memuat ${newClasses.length} kelas baru dengan ${this.state.dataset.summary.total_students} siswa!`);
        };
    }

    // Modal: Print A4 Sheet
    openPrintModal() {
        const modal = document.getElementById('modal-print-sheet');
        if (!modal) return;

        const classData = this.getActiveClass();
        document.getElementById('print-class-label').innerText = classData ? classData.name : 'Semua';
        modal.classList.add('active');

        document.getElementById('btn-start-print').onclick = async () => {
            const printMode = document.querySelector('input[name="print_mode"]:checked').value;
            modal.classList.remove('active');
            await this.generateA4PrintDocument(classData, printMode);
        };
    }

    async generateA4PrintDocument(classData, mode = 'duplex') {
        const printContainer = document.getElementById('print-container');
        if (!printContainer) return;

        this.showLoading(true, 'Menyiapkan lembar cetak A4...');

        const students = classData.students || [];
        const cardsPerPage = 10;
        const chunks = [];
        for (let i = 0; i < students.length; i += cardsPerPage) {
            chunks.push(students.slice(i, i + cardsPerPage));
        }

        let html = '';
        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];

            // 1. FRONT Page
            if (mode === 'duplex' || mode === 'fronts_only') {
                html += '<div class="a4-print-page">';
                for (let idx = 0; idx < chunk.length; idx++) {
                    const st = chunk[idx];
                    const qr = await this.getQrDataUrl(st, classData.name);
                    const frontSvg = CardGenerator.generateFrontSvg(st, this.state.schoolSettings, qr);
                    html += `<div class="print-card-cell">${frontSvg}</div>`;
                }
                html += '</div>';
            }

            // 2. BACK Page (Mirrored for duplex)
            if (mode === 'duplex' || mode === 'backs_only') {
                html += '<div class="a4-print-page">';
                // For duplex printing, reverse columns in rows of 2
                const orderedChunk = [...chunk];
                if (mode === 'duplex') {
                    for (let r = 0; r < 5; r++) {
                        const idx1 = r * 2;
                        const idx2 = r * 2 + 1;
                        if (idx2 < orderedChunk.length) {
                            const tmp = orderedChunk[idx1];
                            orderedChunk[idx1] = orderedChunk[idx2];
                            orderedChunk[idx2] = tmp;
                        }
                    }
                }

                for (let idx = 0; idx < orderedChunk.length; idx++) {
                    const st = orderedChunk[idx];
                    const backSvg = CardGenerator.generateBackSvg(st, this.state.schoolSettings);
                    html += `<div class="print-card-cell">${backSvg}</div>`;
                }
                html += '</div>';
            }
        }

        printContainer.innerHTML = html;
        this.showLoading(false);

        // Allow DOM to settle then trigger browser print dialog
        setTimeout(() => {
            window.print();
        }, 300);
    }

    async printSingleStudent(student) {
        const printContainer = document.getElementById('print-container');
        if (!printContainer) return;

        const classData = this.getActiveClass();
        const qr = await this.getQrDataUrl(student, classData ? classData.name : '');
        const front = CardGenerator.generateFrontSvg(student, this.state.schoolSettings, qr);
        const back = CardGenerator.generateBackSvg(student, this.state.schoolSettings);

        printContainer.innerHTML = `
          <div class="a4-print-page" style="display: flex !important; flex-direction: column; gap: 10mm; align-items: center; justify-content: center;">
            <div style="width: 85.6mm; height: 54mm;">${front}</div>
            <div style="width: 85.6mm; height: 54mm;">${back}</div>
          </div>
        `;

        setTimeout(() => {
            window.print();
        }, 200);
    }

    async exportCurrentClassZip() {
        const classData = this.getActiveClass();
        if (!classData) return;

        this.openProgressModal('Mengekspor ZIP Gambar Kartu');

        try {
            await ExportManager.exportClassToZip(
                classData,
                this.state.schoolSettings,
                ({ current, total, percent, statusText }) => {
                    this.updateProgress(percent, statusText);
                }
            );
        } catch (err) {
            console.error(err);
            alert('Gagal mengekspor berkas ZIP: ' + err.message);
        } finally {
            setTimeout(() => this.closeProgressModal(), 600);
        }
    }

    async exportCurrentClassPdf() {
        const classData = this.getActiveClass();
        if (!classData) return;

        this.openProgressModal('Membuat Berkas PDF A4');

        try {
            await ExportManager.exportClassToPdf(
                classData,
                this.state.schoolSettings,
                { mode: 'duplex' },
                ({ current, total, percent, statusText }) => {
                    this.updateProgress(percent, statusText);
                }
            );
        } catch (err) {
            console.error(err);
            alert('Gagal mengekspor PDF: ' + err.message);
        } finally {
            setTimeout(() => this.closeProgressModal(), 600);
        }
    }

    openProgressModal(title) {
        const modal = document.getElementById('modal-progress');
        if (!modal) return;
        document.getElementById('progress-title').innerText = title;
        document.getElementById('progress-text').innerText = 'Menyiapkan berkas...';
        document.getElementById('progress-bar-fill').style.width = '0%';
        modal.classList.add('active');
    }

    updateProgress(percent, statusText) {
        const fill = document.getElementById('progress-bar-fill');
        const text = document.getElementById('progress-text');
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.innerText = statusText || `${percent}%`;
    }

    closeProgressModal() {
        const modal = document.getElementById('modal-progress');
        if (modal) modal.classList.remove('active');
    }

    showLoading(show, message = 'Memuat...') {
        let loader = document.getElementById('app-loading-indicator');
        if (!loader && show) {
            loader = document.createElement('div');
            loader.id = 'app-loading-indicator';
            loader.style.position = 'fixed';
            loader.style.top = '16px';
            loader.style.right = '16px';
            loader.style.background = '#203D7E';
            loader.style.color = '#FFFFFF';
            loader.style.padding = '8px 16px';
            loader.style.borderRadius = '20px';
            loader.style.fontSize = '12px';
            loader.style.fontWeight = '600';
            loader.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            loader.style.zIndex = '999';
            document.body.appendChild(loader);
        }
        if (loader) {
            loader.innerText = message;
            loader.style.display = show ? 'block' : 'none';
        }
    }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
    window.app.init();
});
