import { useState } from 'react';
import './index.css';
import StepIndicator from './components/StepIndicator';
import AudioRecorder from './components/AudioRecorder';
import MeetingDetails from './components/MeetingDetails';
import SummaryStep from './components/SummaryStep';
import ExportStep from './components/ExportStep';

const EMPTY_DETAILS = {
  title: '', date: new Date().toISOString().split('T')[0],
  time: '', duration: '', location: '', scrumMaster: '',
  participants: '', absentees: '', agenda: '',
  sprintName: '', sprintGoal: '', sprintStatus: '',
  nextDate: '', nextTime: '', nextAgenda: '',
};

function App() {
  const [step, setStep] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState('');
  const [docText, setDocText] = useState('');
  const [meetingData, setMeetingData] = useState(EMPTY_DETAILS);
  const [summary, setSummary] = useState(null);

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-group">
            <span className="logo-icon">🧠</span>
            <span className="logo-text">MeetMind</span>
          </div>
          <p className="logo-tagline">AI-powered meeting intelligence</p>
        </div>
      </header>

      <main className="app-main">
        <StepIndicator current={step} />

        <div className="step-content">
          {step === 0 && (
            <AudioRecorder
              transcript={transcript}
              onTranscriptChange={setTranscript}
              notes={notes}
              onNotesChange={setNotes}
              docText={docText}
              onDocChange={setDocText}
              onNext={next}
            />
          )}
          {step === 1 && (
            <MeetingDetails
              data={meetingData}
              onChange={setMeetingData}
              onNext={next}
              onBack={back}
            />
          )}
          {step === 2 && (
            <SummaryStep
              meetingData={meetingData}
              transcript={transcript}
              notes={notes}
              docText={docText}
              summary={summary}
              onSummaryChange={setSummary}
              onNext={next}
              onBack={back}
            />
          )}
          {step === 3 && (
            <ExportStep
              meetingData={meetingData}
              transcript={transcript}
              notes={notes}
              summary={summary}
              onBack={back}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>MeetMind • 100% free • powered by Web Speech API &amp; Groq Llama 3</p>
      </footer>
    </div>
  );
}

export default App;
