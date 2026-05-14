const express = require('express');
const Groq = require('groq-sdk');
const { buildPrompt } = require('../utils/prompt');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { title, participants, notes, transcript, docText } = req.body;

    if (!transcript && !notes && !docText) {
      return res.status(400).json({ error: 'No transcript, notes, or document provided.' });
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_free_groq_key_here') {
      return res.status(500).json({
        error: 'Groq API key not configured. Please add GROQ_API_KEY to backend/.env'
      });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = buildPrompt({ title, participants, notes, transcript, docText });


    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a professional meeting analyst. Always respond with valid JSON only. Never use markdown code fences.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const rawContent = completion.choices[0]?.message?.content || '';

    // Strip any accidental markdown fences
    const cleaned = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message);
      console.error('Raw content:', rawContent);
      return res.status(500).json({
        error: 'AI returned invalid JSON. Please try again.',
        raw: rawContent
      });
    }

    // Ensure all required fields exist with defaults
    const result = {
      summary: parsed.summary || parsed.executive_summary || '',
      key_points: parsed.key_points || [],
      decisions: parsed.decisions || [],
      action_items: (parsed.action_items || []).map(item =>
        typeof item === 'string'
          ? { task: item, owner: '' }
          : { task: item.task || item.text || '', owner: item.owner || item.assigned_to || '' }
      ),
      risks: parsed.risks || [],
    };

    res.json(result);

  } catch (err) {
    console.error('Analyze error:', err.message);
    res.status(500).json({ error: err.message || 'Analysis failed. Please try again.' });
  }
});

module.exports = router;
