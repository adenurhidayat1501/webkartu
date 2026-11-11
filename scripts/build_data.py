import openpyxl, os, json, re, difflib
from datetime import datetime

os.makedirs('data', exist_ok=True)

wb = openpyxl.load_workbook('KARTU OSIS KELAS X THN 2026-2027/Data Untuk Kartu Osis Tahun Pelajaran 2026-2027.xlsx', data_only=True)
sheet_map = [
    ('X TO 1', '1. to1', 'X_TO_1_QR_Codes', 'Teknik Otomotif 1'),
    ('X TO 2', '2. to2', 'X_TO_2_QR_Codes', 'Teknik Otomotif 2'),
    ('X TO 3', '3. to3', 'X_TO_3_QR_Codes', 'Teknik Otomotif 3'),
    ('X TJKT 1', '4. tkj1', 'X_TJKT_1_QR_Codes', 'Teknik Jaringan Komputer & Telekomunikasi 1'),
    ('X TJKT 2', '5. tkj2', 'X_TJKT_2_QR_Codes', 'Teknik Jaringan Komputer & Telekomunikasi 2'),
    ('X APHP', '6. aphp', 'X_APHP_QR_Codes', 'Agribisnis Pengolahan Hasil Pertanian'),
    ('X PM 1', '7. br1', 'X_PM_1_QR_Codes', 'Pemasaran 1 / Bisnis Ritel 1'),
    ('X PM 2', '8. br2', 'X_PM_2_QR_Codes', 'Pemasaran 2 / Bisnis Ritel 2'),
    ('X MPLB 1', '9. mplb1', 'X_MPLB_1_QR_Codes', 'Manajemen Perkantoran & Layanan Bisnis 1'),
    ('X MPLB 2', '10. mplb2', 'X_MPLB_2_QR_Codes', 'Manajemen Perkantoran & Layanan Bisnis 2')
]

bulan_indo = {
    1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April', 5: 'Mei', 6: 'Juni',
    7: 'Juli', 8: 'Agustus', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
}

def format_date_id(val):
    if not val:
        return ''
    if isinstance(val, datetime):
        b = bulan_indo.get(val.month, '')
        return f"{val.day:02d} {b} {val.year}"
    s = str(val).strip()
    match = re.match(r'(\d{4})-(\d{1,2})-(\d{1,2})', s)
    if match:
        y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
        b = bulan_indo.get(m, '')
        return f"{d:02d} {b} {y}"
    return s

def normalize_simple(s):
    return re.sub(r'[^a-zA-Z0-9]', '', str(s)).upper()

def indo_phonetic(s):
    s = str(s).upper()
    s = re.sub(r'[^A-Z0-9]', '', s)
    s = s.replace('OE', 'U').replace('DH', 'D').replace('TH', 'T').replace('KH', 'H')
    s = s.replace('PH', 'F').replace('V', 'F').replace('P', 'F')
    s = s.replace('Z', 'J').replace('SY', 'S').replace('SH', 'S')
    s = s.replace('Y', 'I')
    s = s.replace('MUHAMMAD', 'M').replace('MUHAMAD', 'M').replace('MOCHAMAD', 'M').replace('MOHAMAD', 'M').replace('MOCH', 'M').replace('MOH', 'M')
    s = re.sub(r'(.)\1+', r'\1', s)
    return s

dataset = {
    'school': {
        'name': 'SMK NEGERI CIPATUJAH',
        'sub1': 'Jl. Raya Cipatujah, Kec. Cipatujah',
        'sub2': 'Kabupaten Tasikmalaya, Jawa Barat 46189',
        'card_title': 'KARTU PELAJAR',
        'official_label': 'IDENTITAS RESMI SISWA',
        'footer_note': 'Berlaku selama menjadi siswa SMKN CIPATUJAH',
        'city_date': 'Cipatujah, 15 Juli 2026',
        'principal_title': 'Kepala Sekolah,',
        'principal_name': 'Drs. H. Dede Wahyudin, M.Pd.',
        'principal_nip': 'NIP. 19680512 199403 1 004'
    },
    'classes': []
}

total_students = 0
total_matched_photos = 0
total_matched_qrs = 0

for sname, folder, qr_folder, fullname in sheet_map:
    sheet = wb[sname]
    folder_path = os.path.join('KARTU OSIS KELAS X THN 2026-2027', folder)
    photo_files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    
    qr_dir = os.path.join('dataqr', qr_folder)
    qr_files = [f for f in os.listdir(qr_dir) if f.lower().endswith('.png')] if os.path.exists(qr_dir) else []
    
    class_info = {
        'id': normalize_simple(sname),
        'name': sname,
        'fullname': fullname,
        'folder': folder,
        'qr_folder': qr_folder,
        'total_students': 0,
        'matched_count': 0,
        'qr_matched_count': 0,
        'photos_in_folder': photo_files,
        'qrs_in_folder': qr_files,
        'students': []
    }
    
    assigned_photos = set()
    assigned_qrs = set()
    
    # First pass: load students
    for r in range(6, sheet.max_row + 1):
        nama = sheet.cell(r, 2).value
        if not nama:
            continue
        nama = str(nama).strip()
        nipd = str(sheet.cell(r, 3).value or '').strip()
        jk = str(sheet.cell(r, 4).value or '').strip().upper()
        nisn = str(sheet.cell(r, 5).value or '').strip()
        tmp_lahir = str(sheet.cell(r, 6).value or '').strip()
        tgl_lahir_raw = sheet.cell(r, 7).value
        tgl_lahir_str = format_date_id(tgl_lahir_raw)
        nik = str(sheet.cell(r, 8).value or '').strip()
        agama = str(sheet.cell(r, 9).value or 'ISLAM').strip().title()
        alamat_raw = str(sheet.cell(r, 10).value or '').strip().rstrip(',')
        rt = str(sheet.cell(r, 11).value or '').strip()
        rw = str(sheet.cell(r, 12).value or '').strip()
        dusun = str(sheet.cell(r, 13).value or '').strip()
        desa = str(sheet.cell(r, 14).value or '').strip()
        kec = str(sheet.cell(r, 15).value or '').strip()
        kd_pos = str(sheet.cell(r, 16).value or '').strip()
        
        # Build clean address
        addr_parts = []
        if alamat_raw:
            addr_parts.append(alamat_raw)
        if rt or rw:
            rt_str = f"RT {int(rt):02d}" if rt.isdigit() else (f"RT {rt}" if rt else "")
            rw_str = f"RW {int(rw):02d}" if rw.isdigit() else (f"RW {rw}" if rw else "")
            if rt_str and rw_str:
                addr_parts.append(f"{rt_str}/{rw_str}")
            elif rt_str:
                addr_parts.append(rt_str)
            elif rw_str:
                addr_parts.append(rw_str)
        if dusun and dusun.upper() != alamat_raw.upper():
            addr_parts.append(f"Dsn. {dusun.title()}")
        if desa:
            addr_parts.append(f"Ds. {desa.title()}")
        if kec:
            addr_parts.append(kec.title() if 'KEC' not in kec.upper() else kec.title())
        full_address = ', '.join([p for p in addr_parts if p])
        
        ttl = f"{tmp_lahir.title()}, {tgl_lahir_str}" if tmp_lahir else tgl_lahir_str
        
        student = {
            'no': len(class_info['students']) + 1,
            'nama': nama,
            'nipd': nipd,
            'jk': jk,
            'jk_label': 'Laki-laki' if jk == 'L' else ('Perempuan' if jk == 'P' else jk),
            'nisn': nisn,
            'tempat_lahir': tmp_lahir.title(),
            'tanggal_lahir': tgl_lahir_str,
            'ttl': ttl,
            'nik': nik,
            'agama': agama,
            'alamat': full_address,
            'rt': rt,
            'rw': rw,
            'dusun': dusun,
            'kelurahan': desa,
            'kecamatan': kec,
            'kode_pos': kd_pos,
            'rombel': sname,
            'photo_file': '',
            'photo_url': '',
            'photo_status': 'missing',
            'match_score': 0,
            'qr_file': '',
            'qr_url': '',
            'qr_source': 'generated'
        }
        class_info['students'].append(student)
        
    class_info['total_students'] = len(class_info['students'])
    total_students += len(class_info['students'])
    
    # Photo matching logic
    # 1. Exact match
    for st in class_info['students']:
        norm_nama = normalize_simple(st['nama'])
        for f in photo_files:
            if f in assigned_photos:
                continue
            norm_f = normalize_simple(os.path.splitext(f)[0])
            if norm_nama == norm_f:
                st['photo_file'] = f
                st['photo_url'] = f"photos/{folder}/{f}"
                st['photo_status'] = 'exact'
                st['match_score'] = 100
                assigned_photos.add(f)
                break
                
    # 2. Phonetic match
    for st in class_info['students']:
        if st['photo_file']:
            continue
        phon_nama = indo_phonetic(st['nama'])
        for f in photo_files:
            if f in assigned_photos:
                continue
            phon_f = indo_phonetic(os.path.splitext(f)[0])
            if phon_nama == phon_f:
                st['photo_file'] = f
                st['photo_url'] = f"photos/{folder}/{f}"
                st['photo_status'] = 'fuzzy'
                st['match_score'] = 95
                assigned_photos.add(f)
                break

    # 3. Token match
    for st in class_info['students']:
        if st['photo_file']:
            continue
        st_words = [normalize_simple(w) for w in st['nama'].split() if w]
        for f in photo_files:
            if f in assigned_photos:
                continue
            p_base = os.path.splitext(f)[0]
            p_words = [normalize_simple(w) for w in p_base.split() if w]
            if len(p_words) == 1 and len(p_words[0]) >= 3 and p_words[0] in st_words:
                st['photo_file'] = f
                st['photo_url'] = f"photos/{folder}/{f}"
                st['photo_status'] = 'fuzzy'
                st['match_score'] = 90
                assigned_photos.add(f)
                break
                
    # 4. Fuzzy distance match
    for st in class_info['students']:
        if st['photo_file']:
            continue
        norm_nama = normalize_simple(st['nama'])
        best_f = None
        best_sim = 0
        for f in photo_files:
            if f in assigned_photos:
                continue
            norm_f = normalize_simple(os.path.splitext(f)[0])
            sim = difflib.SequenceMatcher(None, norm_nama, norm_f).ratio()
            if sim > best_sim:
                best_sim = sim
                best_f = f
        if best_f and best_sim >= 0.55:
            st['photo_file'] = best_f
            st['photo_url'] = f"photos/{folder}/{best_f}"
            st['photo_status'] = 'fuzzy'
            st['match_score'] = int(best_sim * 90)
            assigned_photos.add(best_f)
            
    # 5. Suggested from remaining unassigned photos
    unassigned_photos = [f for f in photo_files if f not in assigned_photos]
    for st in class_info['students']:
        if not st['photo_file'] and unassigned_photos:
            suggested = unassigned_photos.pop(0)
            st['photo_file'] = suggested
            st['photo_url'] = f"photos/{folder}/{suggested}"
            st['photo_status'] = 'suggested'
            st['match_score'] = 50
            assigned_photos.add(suggested)

    # QR Code matching from dataqr/<qr_folder>
    # 1. Match by NIPD
    for st in class_info['students']:
        st_nipd = st['nipd']
        if st_nipd:
            for q in qr_files:
                if q in assigned_qrs:
                    continue
                if f"_{st_nipd}_" in q or q.startswith(f"QR_{st_nipd}_") or st_nipd in q:
                    st['qr_file'] = q
                    st['qr_url'] = f"dataqr/{qr_folder}/{q}"
                    st['qr_source'] = 'dataqr'
                    assigned_qrs.add(q)
                    break

    # 2. Match by normalized student name
    for st in class_info['students']:
        if st['qr_file']:
            continue
        norm_nama = normalize_simple(st['nama'])
        for q in qr_files:
            if q in assigned_qrs:
                continue
            clean_q = re.sub(r'[^A-Z0-9]', '', q.replace('.png', '').upper())
            if norm_nama in clean_q or clean_q.endswith(norm_nama):
                st['qr_file'] = q
                st['qr_url'] = f"dataqr/{qr_folder}/{q}"
                st['qr_source'] = 'dataqr'
                assigned_qrs.add(q)
                break

    # 3. Fallback to remaining unassigned QR in that class folder if only 1-to-1 left
    unassigned_qrs = [q for q in qr_files if q not in assigned_qrs]
    for st in class_info['students']:
        if not st['qr_file'] and unassigned_qrs:
            suggested_q = unassigned_qrs.pop(0)
            st['qr_file'] = suggested_q
            st['qr_url'] = f"dataqr/{qr_folder}/{suggested_q}"
            st['qr_source'] = 'dataqr'
            assigned_qrs.add(suggested_q)

    matched_in_class = sum(1 for st in class_info['students'] if st['photo_file'])
    qr_matched_in_class = sum(1 for st in class_info['students'] if st['qr_file'])
    class_info['matched_count'] = matched_in_class
    class_info['qr_matched_count'] = qr_matched_in_class
    total_matched_photos += matched_in_class
    total_matched_qrs += qr_matched_in_class
    dataset['classes'].append(class_info)
    print(f"{sname:10}: {class_info['total_students']} students, {matched_in_class} photos, {qr_matched_in_class} QR codes matched from {qr_folder}")

dataset['summary'] = {
    'total_classes': len(dataset['classes']),
    'total_students': total_students,
    'total_matched_photos': total_matched_photos,
    'total_matched_qrs': total_matched_qrs,
    'photo_match_rate': round(total_matched_photos / total_students * 100, 1),
    'qr_match_rate': round(total_matched_qrs / total_students * 100, 1)
}

with open('data/students-data.json', 'w', encoding='utf-8') as f:
    json.dump(dataset, f, ensure_ascii=False, indent=2)

print(f"\nFinished indexing {total_students} students across {len(dataset['classes'])} classes.")
print(f"Photo match rate: {dataset['summary']['photo_match_rate']}%.")
print(f"QR Code match rate: {dataset['summary']['qr_match_rate']}%.")
