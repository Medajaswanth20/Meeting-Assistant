const express  = require('express');
const multer   = require('multer');
const mammoth  = require('mammoth');
const xlsx     = require('xlsx');
const pdfParse = require('pdf-parse');
const path     = require('path');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { buffer, originalname } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    let text = '';

    if (ext === '.pdf') {
      const data = await pdfParse(buffer);
      text = data.text;

    } else if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;

    } else if (['.xlsx', '.xls', '.ods'].includes(ext)) {
      const wb = xlsx.read(buffer, { type: 'buffer' });
      text = wb.SheetNames.map(name => {
        const rows = xlsx.utils.sheet_to_csv(wb.Sheets[name]);
        return `=== Sheet: ${name} ===\n${rows}`;
      }).join('\n\n');

    } else if (ext === '.pptx' || ext === '.ppt') {
      // Extract text from PPTX slide XML using xlsx (which bundles jszip)
      const JSZip = require('jszip');
      const zip   = await JSZip.loadAsync(buffer);
      const slideFiles = Object.keys(zip.files)
        .filter(f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'))
        .sort();
      const parts = await Promise.all(slideFiles.map(async (f) => {
        const xml = await zip.files[f].async('string');
        return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }));
      text = parts.join('\n\n');

    } else if (ext === '.csv') {
      text = buffer.toString('utf8');

    } else if (['.txt', '.md', '.rtf', '.log', '.json', '.html', '.htm', '.xml'].includes(ext)) {
      text = buffer.toString('utf8');

    } else {
      // Try reading as plain text for unknown types
      text = buffer.toString('utf8');
    }

    // Truncate to 10 000 chars to keep within AI context window
    text = text.trim().slice(0, 10000);
    if (!text) return res.status(422).json({ error: 'No readable text found in this file.' });

    res.json({ text, filename: originalname });
  } catch (err) {
    console.error('parse-doc error:', err.message);
    res.status(500).json({ error: `Failed to parse file: ${err.message}` });
  }
});

module.exports = router;
