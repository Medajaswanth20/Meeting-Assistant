import React from 'react';

const STEPS = [
  { label: 'Record',  icon: '🎤' },
  { label: 'Details', icon: '📋' },
  { label: 'Summary', icon: '✅' },
  { label: 'Export',  icon: '📥' },
];

export default function StepIndicator({ current }) {
  return (
    <div className="step-indicator">
      {STEPS.map((s, i) => {
        const state = i < current ? 'completed' : i === current ? 'active' : 'pending';
        return (
          <div key={i} className={`step-item ${state}`}>
            <div className="step-circle">
              {state === 'completed' ? '✓' : s.icon}
            </div>
            <span className="step-label">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}
