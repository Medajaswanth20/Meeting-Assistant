import { useState } from 'react';

export default function MeetingDetails({ data, onChange, onNext, onBack }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const set = (field) => (e) => onChange((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">📋 Meeting Details</h2>
        <p className="card-subtitle">
          Just the essentials. The AI will extract the rest from your notes and transcript!
        </p>
      </div>

      {/* ── Basic Essentials ── */}
      <div className="form-group">
        <label className="form-label" htmlFor="f-title">Meeting Title <span className="req">*</span></label>
        <input id="f-title" className="form-input form-input-lg" placeholder="e.g. Daily Standup, Weekly Sync..." value={data.title} onChange={set('title')} autoFocus />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="f-date">Date</label>
        <input id="f-date" type="date" className="form-input" value={data.date} onChange={set('date')} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="f-participants">Participants <span className="optional-tag">(optional)</span></label>
          <input id="f-participants" className="form-input" placeholder="e.g. Alice, Bob, Charlie" value={data.participants} onChange={set('participants')} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="f-absentees">Absentees <span className="optional-tag">(optional)</span></label>
          <input id="f-absentees" className="form-input" placeholder="e.g. David, Eve" value={data.absentees} onChange={set('absentees')} />
        </div>
      </div>


      <div className="step-nav" style={{ marginTop: '30px' }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back to Recording</button>
        <button
          className="btn btn-primary btn-lg"
          id="btn-next-to-summary"
          onClick={onNext}
          disabled={!data.title.trim()}
        >
          ✨ Analyze with AI →
        </button>
      </div>
    </div>
  );
}
