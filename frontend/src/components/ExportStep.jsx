import { useState, useEffect } from 'react';

export default function ExportStep({ meetingData, transcript, summary, onBack }) {
  const [preparing, setPreparing] = useState(true);
  const [blob, setBlob]           = useState(null);
  const [filename, setFilename]   = useState('Meeting_Report.docx');
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);
  const [saving, setSaving]       = useState(false);

  // Pre-generate the docx blob when this page opens
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingData, transcript, summary }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${response.status}`);
        }
        const { data: base64, filename: fname } = await response.json();
        if (cancelled) return;

        // Decode base64 → Blob
        const binary = atob(base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const docBlob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        setBlob(docBlob);
        setFilename(fname);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to prepare document.');
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDownload = async () => {
    if (!blob) return;
    setSaving(true);
    try {
      // Try native Save-As dialog first (Chrome 86+, Edge, Opera)
      // This CANNOT be blocked by Chrome's automatic download settings
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Word Document',
            accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback for Firefox / Safari
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      setDone(true);
    } catch (e) {
      // User cancelled the Save-As dialog — not an error
      if (e.name !== 'AbortError') setError(e.message || 'Download failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">📥 Export Report</h2>
        <p className="card-subtitle">Download your structured meeting report as a Word (.docx) document</p>
      </div>

      <div className="export-preview" style={{ textAlign: 'center', fontSize: '16px', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
        <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Your report is ready to download.</p>
        <p style={{ marginTop: '8px' }}>Includes transcript and {(summary?.key_points?.length ?? 0) + (summary?.decisions?.length ?? 0) + (summary?.action_items?.length ?? 0)} AI insights.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {done  && (
        <div className="alert alert-success">
          ✅ Your Word document has been downloaded successfully!
        </div>
      )}

      <div className="step-nav">
        <button className="btn btn-ghost" onClick={onBack}>← Back to Summary</button>

        {preparing ? (
          <button className="btn btn-primary btn-lg" disabled>⏳ Preparing document…</button>
        ) : error ? (
          <button className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>
            🔄 Retry
          </button>
        ) : (
          <button
            className="btn btn-primary btn-lg"
            id="btn-download-docx"
            onClick={handleDownload}
            disabled={saving}
          >
            {saving ? '⏳ Saving…' : '⬇ Download .docx'}
          </button>
        )}
      </div>

      {done && (
        <div className="new-meeting-wrap">
          <button
            className="btn btn-secondary"
            id="btn-new-meeting"
            onClick={() => window.location.reload()}
          >
            🔄 Start a New Meeting
          </button>
        </div>
      )}
    </div>
  );
}
