/**
 * FuzzyMatcher - Intelligent Indonesian Name & Photo Matcher
 * Handles exact matching, Indonesian phonetics, token matching, and Levenshtein similarity.
 */
class FuzzyMatcher {
    static normalizeSimple(str) {
        if (!str) return '';
        return String(str)
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
    }

    static indoPhonetic(str) {
        if (!str) return '';
        let s = String(str).toUpperCase();
        s = s.replace(/[^A-Z0-9]/g, '');
        // Common Indonesian spelling variants
        s = s.replace(/OE/g, 'U')
             .replace(/DH/g, 'D')
             .replace(/TH/g, 'T')
             .replace(/KH/g, 'H')
             .replace(/PH/g, 'F')
             .replace(/V/g, 'F')
             .replace(/P/g, 'F')
             .replace(/Z/g, 'J')
             .replace(/SY/g, 'S')
             .replace(/SH/g, 'S')
             .replace(/Y/g, 'I');
        
        // Common Islamic/Indonesian name prefixes
        s = s.replace(/MUHAMMAD/g, 'M')
             .replace(/MUHAMAD/g, 'M')
             .replace(/MOCHAMAD/g, 'M')
             .replace(/MOHAMAD/g, 'M')
             .replace(/MOCH/g, 'M')
             .replace(/MOH/g, 'M');

        // Deduplicate repeated letters: e.g. "SS" -> "S", "LL" -> "L"
        s = s.replace(/(.)\1+/g, '$1');
        return s;
    }

    static levenshteinSimilarity(s1, s2) {
        if (!s1 && !s2) return 1.0;
        if (!s1 || !s2) return 0.0;
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        const longerLength = longer.length;
        if (longerLength === 0) return 1.0;

        const costs = [];
        for (let i = 0; i <= longer.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= shorter.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[shorter.length] = lastValue;
        }
        return (longerLength - costs[shorter.length]) / longerLength;
    }

    /**
     * Matches a list of students with a list of photo files (or File objects)
     * @param {Array} students - Array of student objects
     * @param {Array<string|File>} photoFiles - Array of photo file names or File objects
     * @returns {Array} Updated students array with photo assignments
     */
    static matchStudentsWithPhotos(students, photoFiles) {
        const assignedPhotos = new Set();
        const photoEntries = photoFiles.map(f => {
            const filename = typeof f === 'string' ? f : f.name;
            const base = filename.replace(/\.[^/.]+$/, '').trim();
            return {
                raw: f,
                filename: filename,
                base: base,
                norm: this.normalizeSimple(base),
                phon: this.indoPhonetic(base),
                words: base.split(/\s+/).map(w => this.normalizeSimple(w)).filter(Boolean)
            };
        });

        // 1. Pass 1: Exact normalized match
        students.forEach(st => {
            if (st.photo_file) return;
            const normName = this.normalizeSimple(st.nama);
            for (const p of photoEntries) {
                if (assignedPhotos.has(p.filename)) continue;
                if (normName === p.norm) {
                    st.photo_file = p.filename;
                    st.photo_raw = p.raw;
                    st.photo_status = 'exact';
                    st.match_score = 100;
                    assignedPhotos.add(p.filename);
                    break;
                }
            }
        });

        // 2. Pass 2: Phonetic match
        students.forEach(st => {
            if (st.photo_file) return;
            const phonName = this.indoPhonetic(st.nama);
            for (const p of photoEntries) {
                if (assignedPhotos.has(p.filename)) continue;
                if (phonName === p.phon) {
                    st.photo_file = p.filename;
                    st.photo_raw = p.raw;
                    st.photo_status = 'fuzzy';
                    st.match_score = 95;
                    assignedPhotos.add(p.filename);
                    break;
                }
            }
        });

        // 3. Pass 3: Token / First Name match (e.g. photo is "TEGUH" and student is "TEGUH ANUGRAH...")
        students.forEach(st => {
            if (st.photo_file) return;
            const stWords = st.nama.split(/\s+/).map(w => this.normalizeSimple(w)).filter(Boolean);
            for (const p of photoEntries) {
                if (assignedPhotos.has(p.filename)) continue;
                if (p.words.length === 1 && p.words[0].length >= 3 && stWords.includes(p.words[0])) {
                    st.photo_file = p.filename;
                    st.photo_raw = p.raw;
                    st.photo_status = 'fuzzy';
                    st.match_score = 90;
                    assignedPhotos.add(p.filename);
                    break;
                }
            }
        });

        // 4. Pass 4: Fuzzy Levenshtein Distance
        students.forEach(st => {
            if (st.photo_file) return;
            const normName = this.normalizeSimple(st.nama);
            const phonName = this.indoPhonetic(st.nama);
            let bestMatch = null;
            let highestSim = 0;

            for (const p of photoEntries) {
                if (assignedPhotos.has(p.filename)) continue;
                const sim1 = this.levenshteinSimilarity(normName, p.norm);
                const sim2 = this.levenshteinSimilarity(phonName, p.phon);
                const maxSim = Math.max(sim1, sim2);

                if (maxSim > highestSim) {
                    highestSim = maxSim;
                    bestMatch = p;
                }
            }

            if (bestMatch && highestSim >= 0.55) {
                st.photo_file = bestMatch.filename;
                st.photo_raw = bestMatch.raw;
                st.photo_status = 'fuzzy';
                st.match_score = Math.round(highestSim * 90);
                assignedPhotos.add(bestMatch.filename);
            }
        });

        // 5. Pass 5: Fallback to remaining unassigned photos if count matches
        const remaining = photoEntries.filter(p => !assignedPhotos.has(p.filename));
        students.forEach(st => {
            if (!st.photo_file && remaining.length > 0) {
                const suggested = remaining.shift();
                st.photo_file = suggested.filename;
                st.photo_raw = suggested.raw;
                st.photo_status = 'suggested';
                st.match_score = 50;
                assignedPhotos.add(suggested.filename);
            }
        });

        return students;
    }
}

if (typeof window !== 'undefined') {
    window.FuzzyMatcher = FuzzyMatcher;
}

