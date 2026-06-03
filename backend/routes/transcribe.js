const express      = require('express');
const multer       = require('multer');
const Groq         = require('groq-sdk');
const fs           = require('fs');
const path         = require('path');
const os           = require('os');
const { spawn }    = require('child_process');
const ffmpeg       = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const GROQ_MAX_BYTES     = 24 * 1024 * 1024;
const MAX_DURATION_SEC   = 8 * 60 * 60;
const CHUNK_DURATION_SEC = 90 * 60;

const LANG_MAP = {
  'en-US': 'en',
  'hi-IN': 'hi',
  'kn-IN': 'kn',
  'te-IN': 'te',
};

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

function parseDurationFromFfmpegStderr(stderr) {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return (
    parseInt(match[1], 10) * 3600 +
    parseInt(match[2], 10) * 60 +
    parseFloat(match[3])
  );
}

function getDurationViaFfmpeg(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegStatic, ['-i', filePath, '-f', 'null', '-'], {
      windowsHide: true,
    });
    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('close', () => {
      const seconds = parseDurationFromFfmpegStderr(stderr);
      if (seconds == null) return reject(new Error('Could not read audio duration.'));
      resolve(seconds);
    });
    proc.on('error', reject);
  });
}

function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, async (err, metadata) => {
      if (!err && metadata?.format?.duration) {
        return resolve(metadata.format.duration);
      }
      try {
        resolve(await getDurationViaFfmpeg(filePath));
      } catch (fallbackErr) {
        reject(err || fallbackErr);
      }
    });
  });
}

function compressAudio(inputPath) {
  const outPath = inputPath.replace(/\.[^.]+$/, '_compressed.mp3');
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioBitrate('32k')
      .audioFrequency(16000)
      .format('mp3')
      .on('error', reject)
      .on('end', () => resolve(outPath))
      .save(outPath);
  });
}

function extractSegment(inputPath, startSec, durationSec, outPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startSec)
      .duration(durationSec)
      .outputOptions('-c copy')
      .on('error', () => {
        ffmpeg(inputPath)
          .setStartTime(startSec)
          .duration(durationSec)
          .audioChannels(1)
          .audioBitrate('32k')
          .audioFrequency(16000)
          .format('mp3')
          .on('error', reject)
          .on('end', () => resolve(outPath))
          .save(outPath);
      })
      .on('end', () => resolve(outPath))
      .save(outPath);
  });
}

async function splitIntoChunks(compressedPath, tmpFiles) {
  const duration = await getDuration(compressedPath);
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < duration - 0.5) {
    const segDuration = Math.min(CHUNK_DURATION_SEC, duration - start);
    const outPath = path.join(
      os.tmpdir(),
      `rec_chunk_${Date.now()}_${index}.mp3`,
    );
    await extractSegment(compressedPath, start, segDuration, outPath);
    tmpFiles.push(outPath);

    const size = fs.statSync(outPath).size;
    if (size > GROQ_MAX_BYTES) {
      throw new Error(
        `Internal error: chunk ${index + 1} is ${(size / 1024 / 1024).toFixed(0)} MB (limit 25 MB).`,
      );
    }

    chunks.push(outPath);
    start += CHUNK_DURATION_SEC;
    index++;
  }

  return chunks;
}

async function transcribeFile(groq, filePath, langCode) {
  const result = await groq.audio.transcriptions.create({
    file:            fs.createReadStream(filePath),
    model:           'whisper-large-v3',
    language:        langCode,
    response_format: 'json',
  });
  return (result.text || '').trim();
}

router.post('/', upload.single('audio'), async (req, res) => {
  const tmpFiles = [];

  const cleanup = () => {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  };

  try {
    if (!req.file) return res.status(400).json({ error: 'No audio data received.' });

    const groq     = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const langCode = LANG_MAP[req.body.lang] || 'en';

    const ext     = resolveExt(req.file);
    const rawPath = path.join(os.tmpdir(), `rec_${Date.now()}${ext}`);
    fs.writeFileSync(rawPath, req.file.buffer);
    tmpFiles.push(rawPath);

    let duration;
    try {
      duration = await getDuration(rawPath);
    } catch (probeErr) {
      console.warn('[transcribe] ffprobe failed:', probeErr.message);
      duration = 0;
    }

    if (duration > MAX_DURATION_SEC) {
      cleanup();
      const hrs = (duration / 3600).toFixed(1);
      return res.status(413).json({
        error: `Audio is ${hrs} hours long. Maximum allowed duration is 8 hours.`,
      });
    }

    console.log(
      `[transcribe] ${(req.file.buffer.length / 1024 / 1024).toFixed(1)} MB upload` +
      (duration ? `, ${(duration / 60).toFixed(1)} min` : '') +
      ' — compressing…',
    );

    const compressedPath = await compressAudio(rawPath);
    tmpFiles.push(compressedPath);

    const compressedSize = fs.statSync(compressedPath).size;
    const compressedDuration = await getDuration(compressedPath);

    if (compressedDuration > MAX_DURATION_SEC) {
      cleanup();
      return res.status(413).json({
        error: 'Audio exceeds the 8 hour maximum duration.',
      });
    }

    console.log(
      `[transcribe] Compressed to ${(compressedSize / 1024 / 1024).toFixed(1)} MB` +
      ` (${(compressedDuration / 60).toFixed(1)} min)`,
    );

    let fullText;

    if (compressedSize <= GROQ_MAX_BYTES) {
      fullText = await transcribeFile(groq, compressedPath, langCode);
    } else {
      const chunks = await splitIntoChunks(compressedPath, tmpFiles);
      console.log(`[transcribe] Split into ${chunks.length} chunks for Groq Whisper`);

      const parts = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`[transcribe] Chunk ${i + 1}/${chunks.length}…`);
        const text = await transcribeFile(groq, chunks[i], langCode);
        if (text) parts.push(text);
      }
      fullText = parts.join(' ');
    }

    res.json({
      text:     fullText,
      language: langCode,
      duration: compressedDuration || duration || null,
      chunks:   compressedSize > GROQ_MAX_BYTES
        ? Math.ceil((compressedDuration || duration) / CHUNK_DURATION_SEC)
        : 1,
    });
  } catch (err) {
    console.error('Whisper transcription error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Transcription failed.' });
  } finally {
    cleanup();
  }
});

module.exports = router;
