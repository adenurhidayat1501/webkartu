/**
 * ExportManager - Handles Batch ZIP (PNG), Multi-page PDF, and A4 Print Generation
 */
class ExportManager {
    /**
     * Helper to pad student number e.g. 1 -> "01"
     */
    static padNumber(num) {
        return String(num).padStart(2, '0');
    }

    /**
     * Clean student name for safe filename
     */
    static safeFilename(name) {
        return String(name)
            .toUpperCase()
            .replace(/[^A-Z0-9_\- ]/g, '')
            .trim()
            .replace(/\s+/g, '_');
    }

    /**
     * Batch Export Class to ZIP of High-Resolution PNGs
     */
    static async exportClassToZip(classData, schoolSettings, onProgress) {
        if (!window.JSZip) {
            throw new Error('JSZip library not found');
        }

        const zip = new JSZip();
        const folderName = `IDCard_${this.safeFilename(classData.name)}`;
        const zipFolder = zip.folder(folderName);

        const students = classData.students || [];
        const total = students.length;

        // Add class metadata text
        let csvContent = "No,Nama,NISN,NIPD,Jenis Kelamin,TTL,Alamat,Status Foto\n";

        for (let i = 0; i < total; i++) {
            const st = students[i];
            const noStr = this.padNumber(st.no || (i + 1));
            const safeName = this.safeFilename(st.nama);

            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: total,
                    percent: Math.round(((i + 1) / total) * 100),
                    statusText: `Memproses ${i + 1}/${total}: ${st.nama}...`
                });
            }

            // Determine QR Code (official from dataqr or dynamic generator)
            let qrDataUrl = st.qr_data_url || (schoolSettings.qr_format === 'default' ? st.qr_url : '');
            if (!qrDataUrl) {
                let qrText = st.nisn ? `NISN:${st.nisn}|${st.nama}|${classData.name}` : `${st.nama}|${classData.name}`;
                if (schoolSettings.qr_format === 'nisn') {
                    qrText = st.nisn || st.nama;
                } else if (schoolSettings.qr_format === 'vcard') {
                    qrText = `BEGIN:VCARD\nVERSION:3.0\nFN:${st.nama}\nNOTE:NISN:${st.nisn};NIS:${st.nipd};${classData.name}\nORG:${schoolSettings.name}\nEND:VCARD`;
                }
                qrDataUrl = await CardGenerator.generateQrCode(qrText);
            }

            // Generate Front SVG and canvas
            const frontSvg = CardGenerator.generateFrontSvg(st, schoolSettings, qrDataUrl);
            const frontCanvas = await CardGenerator.svgToCanvas(frontSvg, 3);
            const frontDataUrl = frontCanvas.toDataURL('image/png').split(',')[1];
            zipFolder.file(`${noStr}_${safeName}_DEPAN.png`, frontDataUrl, { base64: true });

            // Generate Back SVG and canvas
            const backSvg = CardGenerator.generateBackSvg(st, schoolSettings);
            const backCanvas = await CardGenerator.svgToCanvas(backSvg, 3);
            const backDataUrl = backCanvas.toDataURL('image/png').split(',')[1];
            zipFolder.file(`${noStr}_${safeName}_BELAKANG.png`, backDataUrl, { base64: true });

            // Add row to CSV
            csvContent += `"${st.no || i + 1}","${st.nama}","${st.nisn || ''}","${st.nipd || ''}","${st.jk_label || st.jk}","${st.ttl || ''}","${(st.alamat || '').replace(/"/g, '""')}","${st.photo_status || ''}"\n`;

            // Give browser breathing room to maintain UI responsiveness
            await new Promise(r => setTimeout(r, 20));
        }

        zipFolder.file('daftar_siswa.csv', csvContent);

        if (onProgress) {
            onProgress({
                current: total,
                total: total,
                percent: 100,
                statusText: 'Mengompresi berkas ZIP...'
            });
        }

        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        const downloadUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `IDCard_SMKN_Cipatujah_${this.safeFilename(classData.name)}.zip`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
    }

    /**
     * Batch Export Class to Multi-Page Printable PDF
     * A4 page: 210 x 297 mm
     * 10 cards per page (2 columns x 5 rows)
     * Card: 85.6 mm x 54.0 mm
     */
    static async exportClassToPdf(classData, schoolSettings, options = {}, onProgress) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF library not found');
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const students = classData.students || [];
        const total = students.length;
        const mode = options.mode || 'duplex'; // 'duplex', 'fronts_only', 'backs_only'

        // A4 Layout dimensions
        const cardW = 85.6;
        const cardH = 54.0;
        const marginX = 14.4; // (210 - (85.6 * 2 + 5)) / 2 = 17.2 mm or 14.4 mm
        const marginY = 11.0;
        const gapX = 5.0;
        const gapY = 2.5;
        const cardsPerPage = 10;
        const cols = 2;
        const rows = 5;

        // Chunk students by 10
        const chunks = [];
        for (let i = 0; i < total; i += cardsPerPage) {
            chunks.push(students.slice(i, i + cardsPerPage));
        }

        let isFirstPage = true;

        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];

            // 1. Process FRONT Page (if duplex or fronts_only)
            if (mode === 'duplex' || mode === 'fronts_only') {
                if (!isFirstPage) pdf.addPage();
                isFirstPage = false;

                // Page Header note
                pdf.setFontSize(8);
                pdf.setTextColor(100, 116, 139);
                pdf.text(`SMK NEGERI CIPATUJAH - ID CARD [${classData.name}] - HALAMAN DEPAN (${chunkIdx + 1}/${chunks.length})`, marginX, 7);

                for (let idx = 0; idx < chunk.length; idx++) {
                    const st = chunk[idx];
                    const globalIdx = chunkIdx * cardsPerPage + idx + 1;

                    if (onProgress) {
                        onProgress({
                            current: globalIdx,
                            total: total,
                            percent: Math.round((globalIdx / total) * 100),
                            statusText: `Menyiapkan PDF Siswa ${globalIdx}/${total}: ${st.nama}...`
                        });
                    }

                    const col = idx % cols;
                    const row = Math.floor(idx / cols);
                    const x = marginX + col * (cardW + gapX);
                    const y = marginY + row * (cardH + gapY);

                    // Determine QR Code (official from dataqr or dynamic generator)
                    let qrDataUrl = st.qr_data_url || (schoolSettings.qr_format === 'default' ? st.qr_url : '');
                    if (!qrDataUrl) {
                        const qrText = st.nisn ? `NISN:${st.nisn}|${st.nama}|${classData.name}` : `${st.nama}|${classData.name}`;
                        qrDataUrl = await CardGenerator.generateQrCode(qrText);
                    }

                    // Front Canvas
                    const frontSvg = CardGenerator.generateFrontSvg(st, schoolSettings, qrDataUrl);
                    const frontCanvas = await CardGenerator.svgToCanvas(frontSvg, 2.5);
                    const imgData = frontCanvas.toDataURL('image/jpeg', 0.95);

                    // Draw card image to PDF
                    pdf.addImage(imgData, 'JPEG', x, y, cardW, cardH);

                    // Corner cutting marks
                    this.drawCropMarks(pdf, x, y, cardW, cardH);
                }
            }

            // 2. Process BACK Page (if duplex or backs_only)
            if (mode === 'duplex' || mode === 'backs_only') {
                if (!isFirstPage) pdf.addPage();
                isFirstPage = false;

                // Page Header note
                pdf.setFontSize(8);
                pdf.setTextColor(100, 116, 139);
                pdf.text(`SMK NEGERI CIPATUJAH - ID CARD [${classData.name}] - HALAMAN BELAKANG (${chunkIdx + 1}/${chunks.length})`, marginX, 7);

                for (let idx = 0; idx < chunk.length; idx++) {
                    const st = chunk[idx];
                    const col = idx % cols;
                    const row = Math.floor(idx / cols);

                    // If duplex, mirror horizontally so back card aligns with front when printed!
                    // In a 2-column layout, col 0 becomes col 1, and col 1 becomes col 0
                    const printCol = mode === 'duplex' ? (cols - 1 - col) : col;
                    const x = marginX + printCol * (cardW + gapX);
                    const y = marginY + row * (cardH + gapY);

                    const backSvg = CardGenerator.generateBackSvg(st, schoolSettings);
                    const backCanvas = await CardGenerator.svgToCanvas(backSvg, 2.5);
                    const imgData = backCanvas.toDataURL('image/jpeg', 0.95);

                    pdf.addImage(imgData, 'JPEG', x, y, cardW, cardH);
                    this.drawCropMarks(pdf, x, y, cardW, cardH);
                }
            }
        }

        pdf.save(`IDCard_SMKN_Cipatujah_${this.safeFilename(classData.name)}_A4.pdf`);
    }

    /**
     * Draw subtle crop marks around card corners
     */
    static drawCropMarks(pdf, x, y, w, h) {
        pdf.setDrawColor(180, 190, 205);
        pdf.setLineWidth(0.15);
        const markLen = 2.0;

        // Top-left
        pdf.line(x - markLen, y, x, y);
        pdf.line(x, y - markLen, x, y);

        // Top-right
        pdf.line(x + w, y, x + w + markLen, y);
        pdf.line(x + w, y - markLen, x + w, y);

        // Bottom-left
        pdf.line(x - markLen, y + h, x, y + h);
        pdf.line(x, y + h, x, y + h + markLen);

        // Bottom-right
        pdf.line(x + w, y + h, x + w + markLen, y + h);
        pdf.line(x + w, y + h, x + w, y + h + markLen);
    }
}

if (typeof window !== 'undefined') {
    window.ExportManager = ExportManager;
}

