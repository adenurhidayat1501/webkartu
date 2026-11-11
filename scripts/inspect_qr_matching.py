import json, os, re, difflib

with open('data/students-data.json', 'r', encoding='utf-8') as f:
    dataset = json.load(f)

qr_folder_map = {
    'X TO 1': 'X_TO_1_QR_Codes',
    'X TO 2': 'X_TO_2_QR_Codes',
    'X TO 3': 'X_TO_3_QR_Codes',
    'X TJKT 1': 'X_TJKT_1_QR_Codes',
    'X TJKT 2': 'X_TJKT_2_QR_Codes',
    'X APHP': 'X_APHP_QR_Codes',
    'X PM 1': 'X_PM_1_QR_Codes',
    'X PM 2': 'X_PM_2_QR_Codes',
    'X MPLB 1': 'X_MPLB_1_QR_Codes',
    'X MPLB 2': 'X_MPLB_2_QR_Codes'
}

for c in dataset['classes']:
    cname = c['name']
    qr_dir = os.path.join('dataqr', qr_folder_map[cname])
    qr_files = os.listdir(qr_dir)
    
    assigned_qrs = set()
    unmatched_students = []
    
    for st in c['students']:
        nipd = str(st.get('nipd', '')).strip()
        found = None
        for f in qr_files:
            if nipd and nipd in f:
                found = f
                break
        if found:
            assigned_qrs.add(found)
        else:
            unmatched_students.append(st)
            
    unassigned_qrs = [f for f in qr_files if f not in assigned_qrs]
    
    if unmatched_students or unassigned_qrs:
        print(f"=== {cname} ===")
        print(f"  Unmatched Students ({len(unmatched_students)}):")
        for st in unmatched_students:
            print(f"    - {st['nama']} (NIPD: {st['nipd']})")
        print(f"  Unassigned QR Files ({len(unassigned_qrs)}):")
        for q in unassigned_qrs:
            print(f"    - {q}")

