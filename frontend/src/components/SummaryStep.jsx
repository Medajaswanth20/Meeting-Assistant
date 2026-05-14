import { useState, useEffect } from 'react';
import axios from 'axios';



const SECTION_ICONS = {
  key_points: '💡',
  decisions: '✅',
  action_items: '🎯',
  risks: '⚠️',
  summary: '📋',
};

const SECTION_LABELS = {
  key_points: 'Key Points',
  decisions: 'Decisions Made',
  action_items: 'Action Items',
  risks: 'Risks & Concerns',
  summary: 'Executive Summary',
};

export default function SummaryStep({ meetingData, transcript, notes, docText, summary, onSummaryChange, onNext, onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState({});

  useEffect(() => {
    if (!summary) analyze();
  }, []);

  const analyze = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/analyze', {
        title: meetingData.title,
        participants: meetingData.participants,
        notes,
        transcript,
        docText: docText || '',   // uploaded reference document text
      });
      onSummaryChange(res.data);
      // Pre-check all items
      const init = {};
      ['key_points', 'decisions', 'action_items', 'risks'].forEach((sec) => {
        (res.data[sec] || []).forEach((_, i) => { init[`${sec}-${i}`] = true; });
      });
      setChecked(init);
    } catch (e) {
      setError(e.response?.data?.error || 'AI analysis failed. Check your Groq API key in the backend .env file.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  const editItem = (section, index, value) => {
    onSummaryChange((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === index
          ? typeof item === 'object' ? { ...item, task: value } : value
          : item
      ),
    }));
  };

  if (loading) {
    return (
      <div className="card card-center">
        <div className="ai-loading">
          <div className="ai-spinner" />
          <h2>AI is analyzing your meeting…</h2>
          <p>Groq Llama 3 is reading your transcript and extracting insights</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert alert-error">{error}</div>
        <div className="step-nav">
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <button className="btn btn-primary" onClick={analyze}>🔄 Retry</button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">✅ Editable Summary</h2>
        <p className="card-subtitle">Check/uncheck items to include in the export. Click any item to edit it.</p>
      </div>

      {/* Executive Summary */}
      {summary.summary && (
        <div className="summary-section">
          <div className="summary-section-title">
            <span>{SECTION_ICONS.summary}</span> {SECTION_LABELS.summary}
          </div>
          <textarea
            className="summary-text-edit"
            value={summary.summary}
            onChange={(e) => onSummaryChange((p) => ({ ...p, summary: e.target.value }))}
            rows={4}
            id="edit-summary-text"
          />
        </div>
      )}

      {/* Checklist Sections */}
      {['key_points', 'decisions', 'action_items', 'risks'].map((sec) =>
        summary[sec]?.length > 0 ? (
          <div className="summary-section" key={sec}>
            <div className="summary-section-title">
              <span>{SECTION_ICONS[sec]}</span> {SECTION_LABELS[sec]}
            </div>
            <div className="summary-list">
              {summary[sec].map((item, i) => {
                const key = `${sec}-${i}`;
                return (
                  <div key={key} className={`summary-item ${!checked[key] ? 'unchecked' : ''}`}>
                    <input
                      type="checkbox"
                      id={`check-${key}`}
                      checked={!!checked[key]}
                      onChange={() => toggleCheck(key)}
                    />
                    <input
                      type="text"
                      className="form-input summary-item-text"
                      style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '14px' }}
                      value={typeof item === 'object' ? item.task : item}
                      onChange={(e) => editItem(sec, i, e.target.value)}
                      id={`edit-${key}`}
                    />
                    {typeof item === 'object' && item.owner && (
                      <span className="summary-item-owner">👤 {item.owner}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null
      )}

      <div className="step-nav">
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-secondary" onClick={analyze} id="btn-reanalyze">
          🔄 Re-analyze
        </button>
        <button className="btn btn-primary" id="btn-to-export" onClick={onNext}>
          Export to Word →
        </button>
      </div>
    </div>
  );
}
