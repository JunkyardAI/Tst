const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// Scans the 'acapella' folder relative to this script
const ACAPELLAS_DIR = path.join(__dirname, 'acapella');
const OUTPUT_FILE = path.join(__dirname, 'library.json');

// --- REGEX PATTERNS ---
const BPM_PATTERN = /(\d{2,3})\s*BPM/i;
const KEY_PATTERN = /\b([A-G][#b]?(?:m|min|maj|minor|major)?)\b/;

function getMetadata(filename) {
    let bpm = 0;
    let key = "Unknown";

    const bpmMatch = filename.match(BPM_PATTERN);
    if (bpmMatch) {
        bpm = parseInt(bpmMatch[1], 10);
    }

    const keyMatch = filename.match(KEY_PATTERN);
    if (keyMatch) {
        // Normalize key names (e.g., "Cminor" -> "Cm")
        key = keyMatch[1]
            .replace("minor", "m")
            .replace("major", "")
            .trim();
    }

    return { bpm, key };
}

function scanLibrary() {
    console.log(`Scanning directory: ${ACAPELLAS_DIR}`);

    if (!fs.existsSync(ACAPELLAS_DIR)) {
        console.error(`Error: Directory not found - ${ACAPELLAS_DIR}`);
        process.exit(1);
    }

    const library = {
        generated: new Date().toISOString(),
        tracks: []
    };

    function walkDir(dir, rootDir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                walkDir(fullPath, rootDir);
            } else {
                if (file.startsWith('.') || file === 'library.json' || file === 'generate_library.js') return;

                const ext = path.extname(file).toLowerCase().replace('.', '');
                if (!['wav', 'mp3', 'aif', 'flac', 'ogg', 'm4a'].includes(ext)) return;

                // Calculate relative path for JSON (e.g., "ArtistName/Track.mp3")
                // We use path.relative to get the path from the 'acapella' folder, not root
                let relDir = path.relative(rootDir, dir);
                
                // Determine Artist (Top level folder inside acapella)
                let artist = "Unknown";
                if (relDir !== "") {
                    artist = relDir.split(path.sep)[0];
                }

                // Create web-friendly path (acapella/Artist/Track.mp3)
                // We add 'acapella/' prefix because your index.html likely expects it relative to root
                const webPath = 'acapella/' + path.join(relDir, file).split(path.sep).join('/');

                const { bpm, key } = getMetadata(file);
                const sizeMb = (stat.size / (1024 * 1024)).toFixed(1) + "MB";

                library.tracks.push({
                    artist: artist,
                    title: file,
                    bpm: bpm,
                    key: key,
                    format: ext,
                    size: sizeMb,
                    path: webPath
                });

                console.log(`Index: ${artist} -> ${file}`);
            }
        });
    }

    walkDir(ACAPELLAS_DIR, ACAPELLAS_DIR);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(library, null, 2), 'utf-8');
    console.log(`\n[SUCCESS] Generated library.json with ${library.tracks.length} tracks.`);
}

scanLibrary();