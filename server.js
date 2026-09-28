const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// How long files should live before auto-deleting (in milliseconds)
const EXPIRY_MS = 20 * 60 * 1000; // 20 minutes

// Where uploaded files land temporarily
const UPLOAD_DIR = path.join(__dirname, 'temp-uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// In-memory "database" mapping code -> file info
// Structure: { code: { filePath, originalName, mimeType, expiresAt } }
const store = {};

// Multer config: store files with a random name, limit size, only allow images
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const uniqueName = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Generates a short, easy-to-type code like "AB12CD"
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars like O/0, I/1
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (store[code]); // avoid collisions
  return code;
}

// --- Upload endpoint: accepts multiple photos, returns a share code ---
app.post('/upload', upload.array('photos', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const code = generateCode();
  const expiresAt = Date.now() + EXPIRY_MS;

  store[code] = {
    files: req.files.map(f => ({
      filePath: f.path,
      originalName: f.originalname,
      mimeType: f.mimetype
    })),
    expiresAt
  };

  // Schedule automatic cleanup for this batch
  setTimeout(() => cleanupCode(code), EXPIRY_MS);

  res.json({ code, expiresAt });
});

// --- Info endpoint: check if a code is valid/expired before downloading ---
app.get('/info/:code', (req, res) => {
  const entry = store[req.params.code.toUpperCase()];
  if (!entry || Date.now() > entry.expiresAt) {
    return res.status(404).json({ error: 'Code not found or expired' });
  }
  res.json({
    count: entry.files.length,
    names: entry.files.map(f => f.originalName),
    expiresAt: entry.expiresAt
  });
});

// --- Download endpoint: serves a specific file by index ---
app.get('/download/:code/:index', (req, res) => {
  const entry = store[req.params.code.toUpperCase()];
  if (!entry || Date.now() > entry.expiresAt) {
    return res.status(404).json({ error: 'Code not found or expired' });
  }
  const file = entry.files[req.params.index];
  if (!file) return res.status(404).json({ error: 'File not found' });

  res.download(file.filePath, file.originalName);
});

// Deletes files from disk and removes the entry from the store
function cleanupCode(code) {
  const entry = store[code];
  if (!entry) return;
  entry.files.forEach(f => {
    fs.unlink(f.filePath, () => {}); // ignore errors if already gone
  });
  delete store[code];
  console.log(`Expired and cleaned up code: ${code}`);
}

// Safety net: sweep every 5 minutes in case a setTimeout was missed (e.g. server restart)
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(code => {
    if (now > store[code].expiresAt) cleanupCode(code);
  });
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Photo share server running at http://localhost:${PORT}`);
});
