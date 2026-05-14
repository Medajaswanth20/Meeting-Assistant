export default function TranscriptStep({ transcript, onTranscriptChange, onNext, onBack }) {
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const charCount = transcript.length;

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">📄 Review Transcript</h2>
        <p className="card-subtitle">Edit your transcript before AI analysis — fix any errors the speech engine made</p>
      </div>

      <div className="transcript-meta">
        <span className="badge">{wordCount} words</span>
        <span className="badge">{charCount} characters</span>
      </div>

      <textarea
        id="transcript-editor"
        className="transcript-textarea"
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        placeholder="Your transcript will appear here. You can edit it freely before sending to AI analysis."
        rows={16}
      />

      <div className="step-nav">
        <button className="btn btn-ghost" onClick={onBack}>← Back to Recording</button>
        <button
          className="btn btn-primary"
          id="btn-analyze"
          onClick={onNext}
          disabled={!transcript.trim()}
        >
          Analyze with AI →
        </button>
      </div>
    </div>
  );
}
