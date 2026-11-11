/**
 * CardGenerator - High-fidelity SVG & Canvas ID Card Generator
 * Matches the official design of SMK Negeri Cipatujah ID Card
 */
class CardGenerator {
    static escapeXml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Generate dynamic QR Code Data URL using QRCode library
     */
    static async generateQrCode(text, size = 180) {
        return new Promise((resolve) => {
            const container = document.createElement('div');
            container.style.display = 'none';
            document.body.appendChild(container);

            try {
                /* global QRCode */
                new QRCode(container, {
                    text: text || 'SMKN CIPATUJAH',
                    width: size,
                    height: size,
                    colorDark: '#101A2C',
                    colorLight: '#FFFFFF',
                    correctLevel: QRCode.CorrectLevel.M
                });

                const canvas = container.querySelector('canvas');
                if (canvas) {
                    const dataUrl = canvas.toDataURL('image/png');
                    document.body.removeChild(container);
                    resolve(dataUrl);
                    return;
                }

                setTimeout(() => {
                    const c = container.querySelector('canvas');
                    const img = container.querySelector('img');
                    let dataUrl = '';
                    if (c) {
                        dataUrl = c.toDataURL('image/png');
                    } else if (img && img.src) {
                        dataUrl = img.src;
                    }
                    if (container.parentNode) document.body.removeChild(container);
                    resolve(dataUrl);
                }, 20);
            } catch (err) {
                console.error('QR code generation error:', err);
                if (container.parentNode) document.body.removeChild(container);
                resolve('');
            }
        });
    }

    /**
     * Generate decorative dot pattern circles
     */
    static generateDecorativeDots(isFront = true) {
        let dots = '';
        const startY = isFront ? 81.35 : 69.35;
        const count = 14;
        const step = 4.3;

        for (let i = 0; i < count; i++) {
            const y1 = startY + (i * step);
            const y2 = y1 + 2.075;
            const y3 = y1 + 0.15;

            // Left edge dots
            dots += `<circle cx="1.35" cy="${y1.toFixed(2)}" r="0.35" fill="#203D7E" fill-opacity="0.17"/>`;
            dots += `<circle cx="4.42" cy="${y2.toFixed(2)}" r="0.42" fill="#203D7E" fill-opacity="0.135"/>`;
            dots += `<circle cx="7.50" cy="${y3.toFixed(2)}" r="0.50" fill="#203D7E" fill-opacity="0.1"/>`;

            // Right edge dots
            dots += `<circle cx="323.35" cy="${y1.toFixed(2)}" r="0.35" fill="#203D7E" fill-opacity="0.17"/>`;
            dots += `<circle cx="320.42" cy="${y2.toFixed(2)}" r="0.42" fill="#203D7E" fill-opacity="0.135"/>`;
            dots += `<circle cx="317.50" cy="${y3.toFixed(2)}" r="0.50" fill="#203D7E" fill-opacity="0.1"/>`;
        }
        return dots;
    }

    /**
     * Generate FRONT Card SVG string
     */
    static generateFrontSvg(student, settings, qrDataUrl) {
        const photoUrl = student.photo_data_url || student.photo_url || 'assets/avatar-placeholder.svg';
        const logoUrl = settings.logo_data_url || settings.logoUrl || 'assets/logo.png';
        const finalQrUrl = qrDataUrl || student.qr_data_url || student.qr_url || '';
        const studentName = (student.nama || 'NAMA SISWA').toUpperCase();
        const nisn = student.nisn || '-';
        const cardTitle = settings.card_title || 'KARTU PELAJAR';
        const schoolName = settings.name || 'SMK NEGERI CIPATUJAH';
        const sub1 = settings.sub1 || 'Jl. Raya Cipatujah, Kec. Cipatujah';
        const sub2 = settings.sub2 || 'Kabupaten Tasikmalaya, Jawa Barat 46189';

        // Auto font-size adjustment for student name
        let nameFontSize = 9.2;
        let nameY = 104;
        if (studentName.length > 30) {
            nameFontSize = 6.8;
            nameY = 103;
        } else if (studentName.length > 24) {
            nameFontSize = 7.6;
            nameY = 103.5;
        } else if (studentName.length > 18) {
            nameFontSize = 8.4;
        }

        const dots = this.generateDecorativeDots(true);
        const clipId = `photo-clip-${student.id || Math.random().toString(36).substring(2, 9)}`;

        return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="326" height="205" viewBox="0 0 326 205">
  <defs>
    <clipPath id="${clipId}">
      <rect x="19" y="67" width="73" height="102" rx="5"/>
    </clipPath>
    <clipPath id="card-front-clip">
      <rect width="325.04" height="204.09" rx="8" ry="8"/>
    </clipPath>
  </defs>

  <g clip-path="url(#card-front-clip)">
    <!-- Base Card Background -->
    <rect width="325.04" height="204.09" fill="#FBFCFD"/>

    <!-- Header Section -->
    <rect width="325.04" height="48" fill="#203D7E"/>
    <path d="M208 48C222 48 216 5 240 5H325V48H208Z" fill="#3159A0"/>

    <!-- School Logo Box & Image -->
    <rect x="12" y="7" width="30" height="34" rx="4" fill="white"/>
    <image x="15" y="9.5" width="24" height="29" preserveAspectRatio="xMidYMid meet" href="${this.escapeXml(logoUrl)}"/>

    <!-- School Header Text -->
    <text x="48" y="20.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="8.8" font-weight="800" fill="#FFFFFF" letter-spacing="0.5">${this.escapeXml(schoolName)}</text>
    <text x="48" y="29.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="4.9" font-weight="500" fill="#D6E2FA">${this.escapeXml(sub1)}</text>
    <text x="48" y="37" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="4.9" font-weight="500" fill="#D6E2FA">${this.escapeXml(sub2)}</text>

    <!-- Decorative Border Dots -->
    ${dots}

    <!-- Student Photo Area -->
    <rect x="16.5" y="64.5" width="78" height="107" rx="7.5" fill="white" stroke="#203D7E" stroke-width="1.2"/>
    <image x="19" y="67" width="73" height="102" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" href="${this.escapeXml(photoUrl)}"/>
    <text x="55.5" y="180" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="4.2" font-weight="600" fill="#58647A" text-anchor="middle">FOTO 3 × 4</text>

    <!-- Card Title & Student Info -->
    <text x="110" y="76.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="11" font-weight="800" fill="#203D7E" letter-spacing="0.5">${this.escapeXml(cardTitle)}</text>

    <!-- Label & Value: NAMA -->
    <text x="110" y="92.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.4" font-weight="600" fill="#58647A">NAMA</text>
    <text x="110" y="${nameY}" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="${nameFontSize}" font-weight="800" fill="#203D7E">${this.escapeXml(studentName)}</text>

    <!-- Label & Value: NISN -->
    <text x="110" y="116.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.4" font-weight="600" fill="#58647A">NISN</text>
    <text x="110" y="128" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="8.4" font-weight="700" fill="#203D7E">${this.escapeXml(nisn)}</text>

    <!-- Sub-footer labels -->
    <text x="110" y="143" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="4.6" font-weight="600" fill="#58647A" letter-spacing="0.2">IDENTITAS RESMI SISWA</text>
    <text x="110" y="151.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="6.2" font-weight="800" fill="#203D7E">${this.escapeXml(schoolName)}</text>

    <!-- QR Code Area -->
    <rect x="241" y="121" width="66" height="66" rx="4" fill="white" stroke="#CBD5E1" stroke-width="0.7"/>
    ${finalQrUrl ? `<image x="244" y="124" width="60" height="60" preserveAspectRatio="none" href="${this.escapeXml(finalQrUrl)}"/>` : ''}
    <text x="274" y="193.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="800" fill="#203D7E" text-anchor="middle" letter-spacing="0.5">SCAN HERE</text>

    <!-- Bottom Decorative Ribbons -->
    <path d="M0 195C38 190 54 196 75 204H0V195Z" fill="#203D7E"/>
    <path d="M0 201C27 196 39 198 54 204H0V201Z" fill="#CC1428"/>
    <path d="M272 204C295 193 306 193 325 196V204H272Z" fill="#EEE337"/>

    <!-- Outer Border -->
    <rect width="325.04" height="204.09" rx="8" ry="8" fill="none" stroke="#E2E8F0" stroke-width="0.8"/>
  </g>
</svg>`;
    }

    /**
     * Generate BACK Card SVG string
     */
    static generateBackSvg(student, settings) {
        const logoUrl = settings.logo_data_url || settings.logoUrl || 'assets/logo.png';
        const signatureUrl = settings.signature_data_url || settings.signatureUrl || 'assets/signature-sample.svg';
        const showSignature = settings.show_signature !== false;

        const schoolName = settings.name || 'SMK NEGERI CIPATUJAH';
        const studentName = (student.nama || 'NAMA LENGKAP SISWA').toUpperCase();
        const nisn = student.nisn || '-';
        const nipd = student.nipd || '-';
        const agama = student.agama || 'Islam';
        const jkLabel = student.jk_label || (student.jk === 'L' ? 'Laki-laki' : 'Perempuan');
        const ttl = student.ttl || '-';
        const alamat = student.alamat || '-';

        const cityDate = settings.city_date || 'Cipatujah, 15 Juli 2026';
        const principalTitle = settings.principal_title || 'Kepala Sekolah,';
        const principalName = settings.principal_name || 'Drs. H. Dede Wahyudin, M.Pd.';
        const principalNip = settings.principal_nip || 'NIP. 19680512 199403 1 004';
        const footerNote = settings.footer_note || `Berlaku selama menjadi siswa ${schoolName}`;

        const dots = this.generateDecorativeDots(false);

        // Address wrapping logic for SVG text
        let alamatSvg = '';
        if (alamat.length > 46) {
            // Split into 2 lines
            const splitIdx = alamat.lastIndexOf(',', 45) > 0 ? alamat.lastIndexOf(',', 45) + 1 : 42;
            const line1 = alamat.substring(0, splitIdx).trim();
            const line2 = alamat.substring(splitIdx).trim();
            alamatSvg = `
              <text x="86" y="130" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5" font-weight="600" fill="#203D7E">${this.escapeXml(line1)}</text>
              <text x="86" y="136" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5" font-weight="600" fill="#203D7E">${this.escapeXml(line2)}</text>
            `;
        } else {
            alamatSvg = `<text x="86" y="132" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="600" fill="#203D7E">${this.escapeXml(alamat)}</text>`;
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="326" height="205" viewBox="0 0 326 205">
  <defs>
    <clipPath id="card-back-clip">
      <rect width="325.04" height="204.09" rx="8" ry="8"/>
    </clipPath>
  </defs>

  <g clip-path="url(#card-back-clip)">
    <!-- Base Card Background -->
    <rect width="325.04" height="204.09" fill="#FBFCFD"/>

    <!-- Header Section -->
    <rect width="325.04" height="48" fill="#203D7E"/>
    <path d="M208 48C222 48 216 5 240 5H325V48H208Z" fill="#3159A0"/>

    <!-- School Logo Box & Image -->
    <rect x="12" y="7" width="30" height="34" rx="4" fill="white"/>
    <image x="15" y="9.5" width="24" height="29" preserveAspectRatio="xMidYMid meet" href="${this.escapeXml(logoUrl)}"/>

    <!-- Header Text -->
    <text x="48" y="22" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="9" font-weight="800" fill="#FFFFFF" letter-spacing="0.5">${this.escapeXml(schoolName)}</text>
    <text x="48" y="33" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.5" font-weight="600" fill="#D6E2FA" letter-spacing="0.5">IDENTITAS PELAJAR</text>

    <!-- Decorative Border Dots -->
    ${dots}

    <!-- Student Detail Attributes Table -->
    <!-- Row 1: NAMA -->
    <text x="16" y="66" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="600" fill="#58647A">NAMA</text>
    <text x="78" y="66" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="700" fill="#203D7E">:</text>
    <text x="86" y="66" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.4" font-weight="800" fill="#203D7E">${this.escapeXml(studentName)}</text>

    <!-- Row 2: NISN -->
    <text x="16" y="77" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="600" fill="#58647A">NISN</text>
    <text x="78" y="77" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="700" fill="#203D7E">:</text>
    <text x="86" y="77" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.4" font-weight="700" fill="#203D7E">${this.escapeXml(nisn)}</text>

    <!-- Row 3: NIS / NIPD -->
    <text x="16" y="88" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="600" fill="#58647A">NIS</text>
    <text x="78" y="88" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="700" fill="#203D7E">:</text>
    <text x="86" y="88" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.4" font-weight="600" fill="#203D7E">${this.escapeXml(nipd)}</text>

    <!-- Row 4: AGAMA -->
    <text x="16" y="99" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="600" fill="#58647A">AGAMA</text>
    <text x="78" y="99" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="700" fill="#203D7E">:</text>
    <text x="86" y="99" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.4" font-weight="600" fill="#203D7E">${this.escapeXml(agama)}</text>

    <!-- Row 5: JENIS KELAMIN -->
    <text x="16" y="110" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="600" fill="#58647A">JENIS KELAMIN</text>
    <text x="78" y="110" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="700" fill="#203D7E">:</text>
    <text x="86" y="110" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.4" font-weight="600" fill="#203D7E">${this.escapeXml(jkLabel)}</text>

    <!-- Row 6: TTL -->
    <text x="16" y="121" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="600" fill="#58647A">TTL</text>
    <text x="78" y="121" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="700" fill="#203D7E">:</text>
    <text x="86" y="121" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.4" font-weight="600" fill="#203D7E">${this.escapeXml(ttl)}</text>

    <!-- Row 7: ALAMAT -->
    <text x="16" y="132" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="600" fill="#58647A">ALAMAT</text>
    <text x="78" y="132" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.2" font-weight="700" fill="#203D7E">:</text>
    ${alamatSvg}

    <!-- Divider Line -->
    <rect x="16" y="142" width="293" height="0.4" fill="#D8DFED"/>

    <!-- Signature Block on the right -->
    <text x="242" y="150" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.3" font-weight="500" fill="#203D7E" text-anchor="middle">${this.escapeXml(cityDate)}</text>
    <text x="242" y="156.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.3" font-weight="600" fill="#203D7E" text-anchor="middle">${this.escapeXml(principalTitle)}</text>

    <!-- Digital Signature & Stamp -->
    ${showSignature ? `<image x="195" y="157" width="94" height="28" preserveAspectRatio="xMidYMid meet" href="${this.escapeXml(signatureUrl)}"/>` : ''}

    <text x="242" y="187.5" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="5.8" font-weight="800" fill="#203D7E" text-anchor="middle">${this.escapeXml(principalName)}</text>
    <rect x="178" y="189.5" width="128" height="0.5" fill="#203D7E"/>
    <text x="242" y="196" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="4.6" font-weight="600" fill="#58647A" text-anchor="middle">${this.escapeXml(principalNip)}</text>

    <!-- Footer Note -->
    <text x="16" y="199" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="4.8" font-weight="700" fill="#203D7E">${this.escapeXml(footerNote)}</text>

    <!-- Bottom Ribbons -->
    <path d="M0 194C26 190 39 196 52 204H0V194Z" fill="#203D7E"/>
    <path d="M0 201C15 197 25 198 36 204H0V201Z" fill="#CC1428"/>
    <path d="M285 204C303 195 313 195 325 198V204H285Z" fill="#EEE337"/>

    <!-- Outer Border -->
    <rect width="325.04" height="204.09" rx="8" ry="8" fill="none" stroke="#E2E8F0" stroke-width="0.8"/>
  </g>
</svg>`;
    }

    static imageCache = new Map();

    /**
     * Convert any URL (relative, absolute, or blob) to a base64 Data URL
     */
    static async toDataUrl(url) {
        if (!url) return '';
        if (url.startsWith('data:')) return url;
        if (this.imageCache.has(url)) return this.imageCache.get(url);

        try {
            const res = await fetch(encodeURI(url));
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result;
                    CardGenerator.imageCache.set(url, result);
                    resolve(result);
                };
                reader.onerror = () => resolve(url);
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.warn('Failed to convert to data URL:', url, err);
            return url;
        }
    }

    /**
     * Replaces any relative/external image href in an SVG string with inline base64 Data URLs
     * This is REQUIRED for browser canvas rendering, otherwise the browser security sandbox
     * blocks all external images inside an SVG loaded into an <img> element!
     */
    static async inlineSvgImages(svgString) {
        // Find all href="..." in <image> tags (supporting both href and xlink:href)
        const regex = /<image\b([^>]*?)(?:xlink:href|href)="([^"]+)"([^>]*?)>/gi;
        const matches = [];
        let match;
        while ((match = regex.exec(svgString)) !== null) {
            matches.push({
                fullMatch: match[0],
                before: match[1],
                url: match[2],
                after: match[3]
            });
        }

        let updatedSvg = svgString;
        for (const m of matches) {
            if (!m.url.startsWith('data:')) {
                const dataUrl = await this.toDataUrl(m.url);
                if (dataUrl && dataUrl.startsWith('data:')) {
                    const replacedTag = `<image ${m.before} href="${dataUrl}" ${m.after}>`;
                    updatedSvg = updatedSvg.replace(m.fullMatch, replacedTag);
                }
            }
        }
        return updatedSvg;
    }

    /**
     * Convert SVG string to HTML Canvas at high resolution
     * Scale 3x = 978 x 615 px (approx 300 DPI for CR-80)
     */
    static async svgToCanvas(svgString, scale = 3) {
        // Automatically inline all images as Data URLs so canvas renders photo, logo, QR code, and signature!
        const inlinedSvg = await this.inlineSvgImages(svgString);

        return new Promise((resolve, reject) => {
            const width = 326 * scale;
            const height = 205 * scale;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            const img = new Image();
            const blob = new Blob([inlinedSvg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(url);
                resolve(canvas);
            };

            img.onerror = (err) => {
                URL.revokeObjectURL(url);
                reject(err);
            };

            img.src = url;
        });
    }

    /**
     * Download an SVG string as a PNG file
     */
    static async downloadSvgAsPng(svgString, filename, scale = 3) {
        const canvas = await this.svgToCanvas(svgString, scale);
        const link = document.createElement('a');
        link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    /**
     * Download an SVG file directly
     */
    static downloadSvgFile(svgString, filename) {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }
}

if (typeof window !== 'undefined') {
    window.CardGenerator = CardGenerator;
}
