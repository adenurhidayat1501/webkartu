import shutil, os

src_base = 'KARTU OSIS KELAS X THN 2026-2027'
dest_base = 'photos'
os.makedirs(dest_base, exist_ok=True)

for d in os.listdir(src_base):
    s = os.path.join(src_base, d)
    if os.path.isdir(s):
        target = os.path.join(dest_base, d)
        print(f"Copying {d} -> {target}...")
        shutil.copytree(s, target, dirs_exist_ok=True)

print("Done copying all class photo folders to photos/")

