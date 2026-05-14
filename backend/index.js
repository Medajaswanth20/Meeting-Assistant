require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const analyzeRouter = require('./routes/analyze');
const exportRouter = require('./routes/export');
const transcribeRouter = require('./routes/transcribe');
const parseDocRouter = require('./routes/parse-doc');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '30mb' }));

app.use('/api/analyze', analyzeRouter);
app.use('/api/export', exportRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/parse-doc', parseDocRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Meeting Assistant backend running' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Meeting Assistant backend running on http://localhost:${PORT}`);
  console.log(`📋 Groq API key: ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Missing – add to .env'}\n`);
});
