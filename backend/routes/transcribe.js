const express        = require('express');
const multer         = require('multer');
const Groq           = require('groq-sdk');
const fs             = require('fs');
const path           = require('path');
const os             = require('os');
const ffmpeg         = require('fluent-ffmpeg');
const ffmpegStatic   = require('ffmpeg-static');

// Point fluent-ffmpeg to the bundled binary (no system install needed)
ffmpeg.setFfmpegPath(ffmpegStatic);

const router = express.Router();

// Accept up to 500 MB so large recordings aren't rejected at the HTTP layer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

// Groq Whisper hard limit
const GROQ_MAX_BYTES = 24 * 1024 * 1024; // 24 MB (leave 1 MB headroom)

// BCP-47 → ISO-639-1 mapping for Whisper
const LANG_MAP = {
  'en-US': 'en',
  'hi-IN': 'hi',
  'kn-IN': 'kn',
  'te-IN': 'te',
};

// MIME → extension map
const MIME_EXT = {
  'audio/mpeg':   '.mp3',
  'audio/mp3':    '.mp3',
  'audio/wav':    '.wav',
  'audio/x-wav':  '.wav',
  'audio/wave':   '.wav',
  'audio/ogg':    '.ogg',
  'audio/flac':   '.flac',
  'audio/x-flac': '.flac',
  'audio/mp4':    '.mp4',
  'audio/x-m4a':  '.m4a',
  'video/mp4':    '.mp4',
  'audio/webm':   '.webm',
  'video/webm':   '.webm',
  'audio/aac':    '.aac',
  'audio/amr':    '.amr',
};

function resolveExt(file) {
  if (file.originalname) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext && ext.length > 1) return ext;
  }
  return MIME_EXT[file.mimetype] || '.webm';
}

/**
 * Compress audio to 32 kbps mono MP3 using ffmpeg-static.
 * Returns the path to the compressed temp file.
 */
function compressAudio(inputPath) {
  return new Promise((resolve, reject) => {
    const outPath = inputPath.replace(/\.[^.]+$/, '_compressed.mp3');
    ffmpeg(inputPath)
      .audioChannels(1)          // mono
      .audioBitrate('32k')       // 32 kbps – enough for speech
      .audioFrequency(16000)     // 16 kHz – Whisper's native rate
      .format('mp3')
      .on('error', reject)
      .on('end', () => resolve(outPath))
      .save(outPath);
  });
}

router.post('/', upload.single('audio'), async (req, res) => {
  const tmpFiles = [];                  // track all temp files for cleanup

  const cleanup = () => {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  };

  try {
    if (!req.file) return res.status(400).json({ error: 'No audio data received.' });

    const groq     = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const langCode = LANG_MAP[req.body.lang] || 'en';

    // Write the uploaded buffer to a temp file (preserve extension for codec detection)
    const ext        = resolveExt(req.file);
    const rawPath    = path.join(os.tmpdir(), `rec_${Date.now()}${ext}`);
    fs.writeFileSync(rawPath, req.file.buffer);
    tmpFiles.push(rawPath);

    // Decide which file path to actually send to Groq
    let sendPath = rawPath;

    if (req.file.buffer.length > GROQ_MAX_BYTES) {
      console.log(
        `[transcribe] File is ${(req.file.buffer.length / 1024 / 1024).toFixed(1)} MB ` +
        `— compressing to 32 kbps mono MP3 with ffmpeg…`
      );
      const compressedPath = await compressAudio(rawPath);
      tmpFiles.push(compressedPath);

      const compressedSize = fs.statSync(compressedPath).size;
      console.log(`[transcribe] Compressed to ${(compressedSize / 1024 / 1024).toFixed(1)} MB`);

      if (compressedSize > GROQ_MAX_BYTES) {
        // Even after heavy compression it's still too big — tell the user
        cleanup();
        return res.status(413).json({
          error:
            `Even after compression your file is ${(compressedSize / 1024 / 1024).toFixed(0)} MB. ` +
            `Groq Whisper's limit is 25 MB. Please trim the recording to under ~8 hours of speech.`,
        });
      }

      sendPath = compressedPath;
    }

    const result = await groq.audio.transcriptions.create({
      file:            fs.createReadStream(sendPath),
      model:           'whisper-large-v3',
      language:        langCode,
      response_format: 'json',
    });

    res.json({ text: result.text || '', language: langCode });
  } catch (err) {
    console.error('Whisper transcription error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Transcription failed.' });
  } finally {
    cleanup();
  }
});

module.exports = router;
