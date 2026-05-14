import { useState, useRef, useEffect } from 'react';

export default function AudioRecorder({
  transcript, onTranscriptChange,
  notes, onNotesChange,
  docText, onDocChange,
  onNext,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused]       = useState(false);
  const [duration, setDuration]       = useState(0);
  const [error, setError]             = useState('');
  const [interimText, setInterimText] = useState('');
  const [activeTab, setActiveTab]     = useState('notes'); // 'notes' | 'transcript' | 'document' | 'audio-upload'
  const [bars, setBars]               = useState(Array(32).fill(3));

  // Document upload state
  const [docFile, setDocFile]         = useState(null);
  const [docLoading, setDocLoading]   = useState(false);
  const [docError, setDocError]       = useState('');
  const [isDragging, setIsDragging]   = useState(false);
  const fileInputRef = useRef(null);

  // ── Audio file upload state ───────────────────────────────────────
  const [audioFile, setAudioFile]           = useState(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioError, setAudioError]         = useState('');
  const [audioDone, setAudioDone]           = useState(false);
  const [audioLang, setAudioLang]           = useState('en-US');
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const audioInputRef = useRef(null);

  const AUDIO_LANGS = [
    { code: 'en-US', label: '🇺🇸 English' },
    { code: 'hi-IN', label: '🇮🇳 Hindi' },
    { code: 'kn-IN', label: '🇮🇳 Kannada' },
    { code: 'te-IN', label: '🇮🇳 Telugu' },
  ];

  const SUPPORTED_AUDIO = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
    'audio/ogg', 'audio/flac', 'audio/x-flac', 'audio/mp4', 'audio/x-m4a',
    'video/mp4', 'audio/webm', 'video/webm', 'audio/aac',
  ];

  const formatBytes = (b) => b < 1024 * 1024
    ? `${(b / 1024).toFixed(1)} KB`
    : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  const recRef    = useRef(null);
  const timerRef  = useRef(null);
  const barsRef   = useRef(null);
  const activeRef = useRef(false);
  const finalRef  = useRef(transcript);

  useEffect(() => { finalRef.current = transcript; }, [transcript]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startBarsAnimation = () => {
    barsRef.current = setInterval(() => {
      setBars(Array.from({ length: 32 }, () => Math.floor(Math.random() * 28) + 3));
    }, 80);
  };
  const stopBarsAnimation = () => {
    clearInterval(barsRef.current);
    setBars(Array(32).fill(3));
  };

  const startRec = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Use Chrome or Edge for speech recognition.'); return; }

    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = 'en-US';
    recRef.current     = rec;

    rec.onresult = (e) => {
      let interim = '';
      let final = finalRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final = final ? `${final} ${t.trim()}` : t.trim();
          finalRef.current = final;
          onTranscriptChange(final);
        } else { interim += t; }
      }
      setInterimText(interim);
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted')
        setError(`Mic error: ${e.error}`);
    };

    rec.onend = () => {
      if (activeRef.current) try { rec.start(); } catch (_) { }
    };

    try { rec.start(); } catch (_) { setError('Could not access microphone.'); }
  };

  const handleStart = () => {
    setError('');
    setIsRecording(true);
    setIsPaused(false);
    activeRef.current = true;
    startRec();
    startBarsAnimation();
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const handlePause = () => {
    if (isPaused) {
      setIsPaused(false);
      activeRef.current = true;
      startRec();
      startBarsAnimation();
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      setIsPaused(true);
      activeRef.current = false;
      try { recRef.current?.stop(); } catch (_) { }
      stopBarsAnimation();
      clearInterval(timerRef.current);
    }
  };

  const handleStop = () => {
    activeRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    setInterimText('');
    try { recRef.current?.stop(); } catch (_) { }
    stopBarsAnimation();
    clearInterval(timerRef.current);
  };

  useEffect(() => () => {
    activeRef.current = false;
    try { recRef.current?.stop(); } catch (_) { }
    clearInterval(timerRef.current);
    clearInterval(barsRef.current);
  }, []);

  // ── Document upload ──────────────────────────────────────────────
  const processFile = async (file) => {
    if (!file) return;
    setDocFile(file);
    setDocError('');
    setDocLoading(true);
    onDocChange(''); // clear previous

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-doc', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to parse file');
      onDocChange(data.text);
    } catch (e) {
      setDocError(e.message || 'Could not read file.');
      setDocFile(null);
    } finally {
      setDocLoading(false);
    }
  };

  const handleFileInput = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const removeDoc = () => {
    setDocFile(null);
    setDocError('');
    onDocChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Audio file upload handlers ────────────────────────────────────
  const selectAudioFile = (file) => {
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) {
      setAudioError('File exceeds 500 MB. Please trim your recording and try again.');
      return;
    }
    setAudioFile(file);
    setAudioError('');
    setAudioDone(false);
  };

  const handleAudioInput  = (e) => selectAudioFile(e.target.files[0]);
  const handleAudioDrop   = (e) => {
    e.preventDefault();
    setIsDraggingAudio(false);
    selectAudioFile(e.dataTransfer.files[0]);
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioError('');
    setAudioDone(false);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const transcribeAudio = async () => {
    if (!audioFile) return;
    setAudioUploading(true);
    setAudioError('');
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('lang', audioLang);

      const res  = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed.');

      onTranscriptChange(data.text || '');
      setAudioDone(true);
      // Switch to transcript tab so the user can review immediately
      setActiveTab('transcript');
    } catch (e) {
      setAudioError(e.message || 'Could not transcribe file.');
    } finally {
      setAudioUploading(false);
    }
  };

  const transcriptWords = transcript.trim().split(/\s+/).filter(Boolean).length;
  const notesWords = notes.trim().split(/\s+/).filter(Boolean).length;
  const docWords = docText.trim().split(/\s+/).filter(Boolean).length;
  const totalWords = transcriptWords + notesWords + docWords;
  const estimatedTokens = Math.floor(totalWords * 1.3);

  // Safe limit for free tier AI (Groq Llama 3 API typically has 8k context window or TPM limits)
  const TOKEN_LIMIT = 6000;
  const usagePercent = Math.min((estimatedTokens / TOKEN_LIMIT) * 100, 100);

  // Average speaking speed: ~130 words per minute
  const WORDS_PER_MINUTE = 130;
  const remainingWords = Math.max(0, Math.floor((TOKEN_LIMIT - estimatedTokens) / 1.3));
  const remainingMinutes = remainingWords / WORDS_PER_MINUTE;
  const remainingMins = Math.floor(remainingMinutes);
  const remainingSecs = Math.floor((remainingMinutes - remainingMins) * 60);
  const remainingTimeStr = remainingWords <= 0
    ? '0:00'
    : `${remainingMins}m ${String(remainingSecs).padStart(2, '0')}s`;

  return (
    <div className="recorder-card">

      {/* ── Top bar ── */}
      <div className="rec-topbar">
        <div className="rec-topbar-left">
          <span className="rec-meeting-label">Meeting</span>
          <span className="rec-date-tag">@Today</span>
        </div>

        <div className="rec-topbar-right">
          {!isRecording ? (
            <button className="btn btn-primary" id="btn-start-recording" onClick={handleStart}>
              🎙 Start Recording
            </button>
          ) : (
            <>
              <div className="waveform">
                {bars.map((h, i) => (
                  <div key={i} className="wave-bar" style={{ height: `${h}px` }} />
                ))}
              </div>
              <button className="btn btn-secondary btn-sm" id="btn-pause-recording" onClick={handlePause}>
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button className="btn btn-danger-full btn-sm" id="btn-stop-recording" onClick={handleStop}>
                ⏹ Stop
              </button>
              <span className="rec-clock">{formatTime(duration)}</span>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ margin: '0 0 12px' }}>⚠️ {error}</div>}

      {/* ── Tabs ── */}
      <div className="rec-tabs">
        <button
          className={`rec-tab ${activeTab === 'notes' ? 'rec-tab-active' : ''}`}
          onClick={() => setActiveTab('notes')}
          id="tab-notes"
        >
          ✏️ Notes
        </button>
        <button
          className={`rec-tab ${activeTab === 'transcript' ? 'rec-tab-active' : ''}`}
          onClick={() => setActiveTab('transcript')}
          id="tab-transcript"
        >
          🎙 Transcript {transcriptWords > 0 && <span className="tab-badge">{transcriptWords}w</span>}
        </button>
        <button
          className={`rec-tab ${activeTab === 'document' ? 'rec-tab-active' : ''}`}
          onClick={() => setActiveTab('document')}
          id="tab-document"
        >
          📎 Document {docText && <span className="tab-badge">✓</span>}
        </button>
        <button
          className={`rec-tab ${activeTab === 'audio-upload' ? 'rec-tab-active' : ''}`}
          onClick={() => setActiveTab('audio-upload')}
          id="tab-audio-upload"
        >
          🎵 Upload Audio {audioDone && <span className="tab-badge">✓</span>}
        </button>

        {isRecording && (
          <span className="rec-live-dot">
            <span className="live-pulse" /> LIVE
          </span>
        )}
      </div>

      {/* ── Tab content ── */}
      <div className="rec-body">
        {activeTab === 'notes' && (
          <textarea
            id="meeting-notes-input"
            className="rec-notes-area"
            placeholder={
              isRecording
                ? 'Type your notes here while the meeting is being recorded…\n\nCapture key points, decisions, action items as they happen.'
                : 'Start recording, then type your notes here alongside the live transcript…'
            }
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        )}

        {activeTab === 'transcript' && (
          <div className="rec-transcript-area" style={{ padding: 0, background: 'none', border: 'none' }}>
            <textarea
              id="transcript-edit-area"
              className="rec-notes-area"
              style={{ minHeight: '220px' }}
              placeholder={
                isRecording
                  ? 'Listening\u2026 speak clearly — confirmed words will appear here.'
                  : 'Transcript will appear here after recording or audio upload. You can also type or paste manually.'
              }
              value={transcript}
              onChange={(e) => onTranscriptChange(e.target.value)}
            />
            {interimText && (
              <div style={{
                fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic',
                padding: '6px 10px', background: 'var(--bg-1)', borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--glass-border)', marginTop: '6px',
              }}>
                🎙 <span className="interim-text">{interimText}</span>
              </div>
            )}
            {transcript && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                {transcript.trim().split(/\s+/).filter(Boolean).length} words &nbsp;·&nbsp;
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                  onClick={() => onTranscriptChange('')}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}


        {activeTab === 'document' && (
          <div className="doc-upload-area">
            {!docFile ? (
              <div
                className={`doc-dropzone ${isDragging ? 'doc-dropzone-dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="doc-dropzone-icon">📄</div>
                <p className="doc-dropzone-title">Drop any file here or click to browse</p>
                <p className="doc-dropzone-sub">PDF · DOCX · XLSX · PPTX · CSV · TXT · RTF · and more</p>
                <p className="doc-dropzone-sub" style={{ opacity: 0.5, fontSize: '11px' }}>Max 30 MB · AI will read and analyse the content</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="*/*"
                  style={{ display: 'none' }}
                  onChange={handleFileInput}
                />
              </div>
            ) : docLoading ? (
              <div className="doc-loading">
                <div className="doc-loading-spinner" />
                <p>Reading <strong>{docFile.name}</strong>…</p>
              </div>
            ) : docError ? (
              <div className="doc-error-state">
                <p>⚠️ {docError}</p>
                <button className="btn btn-secondary btn-sm" onClick={removeDoc}>Try another file</button>
              </div>
            ) : (
              <div className="doc-success-state">
                <div className="doc-success-header">
                  <span className="doc-success-icon">✅</span>
                  <div>
                    <p className="doc-success-name">{docFile.name}</p>
                    <p className="doc-success-chars">{docText.length.toLocaleString()} characters extracted · AI will cross-reference this with your notes and transcript</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={removeDoc} title="Remove file">✕</button>
                </div>
                <div className="doc-preview">
                  {docText.slice(0, 400)}{docText.length > 400 ? '…' : ''}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audio-upload' && (
          <div className="doc-upload-area">
            {/* Language selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                🌐 Language:
              </label>
              <select
                id="audio-lang-select"
                value={audioLang}
                onChange={(e) => setAudioLang(e.target.value)}
                style={{
                  background: 'var(--bg-2)', border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                  padding: '6px 10px', fontSize: '13px', cursor: 'pointer',
                }}
              >
                {AUDIO_LANGS.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Choose the primary language spoken in the audio.
              </span>
            </div>

            {/* Drop zone or file selected state */}
            {!audioFile ? (
              <div
                className={`doc-dropzone ${isDraggingAudio ? 'doc-dropzone-dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingAudio(true); }}
                onDragLeave={() => setIsDraggingAudio(false)}
                onDrop={handleAudioDrop}
                onClick={() => audioInputRef.current?.click()}
              >
                <div className="doc-dropzone-icon">🎵</div>
                <p className="doc-dropzone-title">Drop an audio file or click to browse</p>
                <p className="doc-dropzone-sub">MP3 · WAV · M4A · OGG · FLAC · WebM · MP4</p>
                <p className="doc-dropzone-sub" style={{ opacity: 0.5, fontSize: '11px' }}>Max 500 MB · Large files auto-compressed · Powered by Groq Whisper</p>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,video/mp4,video/webm"
                  style={{ display: 'none' }}
                  onChange={handleAudioInput}
                />
              </div>
            ) : audioUploading ? (
              <div className="doc-loading">
                <div className="doc-loading-spinner" />
                <p>Transcribing <strong>{audioFile.name}</strong> via Groq Whisper…</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  This may take 15–60 seconds depending on file length.
                </p>
              </div>
            ) : (
              <div className="doc-success-state">
                <div className="doc-success-header">
                  <span className="doc-success-icon">{audioDone ? '✅' : '🎵'}</span>
                  <div style={{ flex: 1 }}>
                    <p className="doc-success-name">{audioFile.name}</p>
                    <p className="doc-success-chars">
                      {formatBytes(audioFile.size)}
                      {audioDone ? ' · Transcribed ✓ — see Transcript tab' : ' · Ready to transcribe'}
                    </p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={removeAudio} title="Remove file">✕</button>
                </div>

                {audioError && (
                  <div className="alert alert-error" style={{ margin: '10px 0 0' }}>⚠️ {audioError}</div>
                )}

                {!audioDone && (
                  <button
                    id="btn-transcribe-audio"
                    className="btn btn-primary"
                    style={{ marginTop: '14px', width: '100%' }}
                    onClick={transcribeAudio}
                    disabled={audioUploading}
                  >
                    🎙 Transcribe with Groq Whisper
                  </button>
                )}

                {audioDone && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '10px' }}
                    onClick={() => setActiveTab('transcript')}
                  >
                    View Transcript →
                  </button>
                )}
              </div>
            )}

            {audioError && !audioFile && (
              <div className="alert alert-error" style={{ marginTop: '10px' }}>⚠️ {audioError}</div>
            )}
          </div>
        )}
      </div>

      {/* ── AI hint & Token Usage ── */}
      <div className="rec-ai-hint" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          🤖 AI will analyse your <strong>notes</strong>, <strong>transcript</strong>
          {docText ? <>, and <strong>uploaded document</strong></> : null} together
        </div>

        <div style={{ background: 'var(--bg-1)', padding: '14px', borderRadius: 'var(--radius-md)', border: `1px solid ${usagePercent >= 90 ? 'rgba(244,63,94,0.4)' : 'var(--glass-border)'}`, textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <div style={{ flex: 1, background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }}>⏱ RECORDING TIME LEFT</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: usagePercent >= 100 ? 'var(--rose)' : usagePercent >= 70 ? 'var(--amber)' : 'var(--emerald)', fontVariantNumeric: 'tabular-nums' }}>
                {remainingTimeStr}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>at avg. 130 wpm</div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }}>📝 WORDS REMAINING</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: usagePercent >= 100 ? 'var(--rose)' : usagePercent >= 70 ? 'var(--amber)' : 'var(--emerald)', fontVariantNumeric: 'tabular-nums' }}>
                {remainingWords.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>~{estimatedTokens} / {TOKEN_LIMIT} tokens used</div>
            </div>
          </div>
          <div style={{ height: '6px', width: '100%', background: 'var(--bg-3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${usagePercent}%`, background: usagePercent >= 90 ? 'var(--rose)' : usagePercent >= 70 ? 'var(--amber)' : 'var(--emerald)', transition: 'width 0.3s ease, background 0.3s ease' }} />
          </div>
          {usagePercent >= 100 ? (
            <div style={{ fontSize: '11px', color: 'var(--rose)', marginTop: '6px' }}>⚠️ Token limit reached! Stop recording and trim your notes before analysing.</div>
          ) : usagePercent >= 70 ? (
            <div style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '6px' }}>⚡ Getting close to the limit. Wrap up soon or keep notes concise.</div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>You're within a safe range. Stop before the bar turns red to ensure AI analysis works.</div>
          )}
        </div>
      </div>

      {/* ── Next ── */}
      <div className="step-nav" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginTop: '20px' }}>
        <button
          className="btn btn-primary"
          id="btn-next-to-details"
          onClick={onNext}
          disabled={!transcript.trim() && !notes.trim() && !docText.trim()}
        >
          Next: Enter Meeting Details →
        </button>
      </div>
    </div>
  );
}
