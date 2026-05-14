const buildPrompt = (data) => {
  const { title, participants, notes, transcript, docText } = data;

  return `You are a professional meeting analyst AI. Analyze the following meeting and return ONLY valid JSON — no markdown, no code fences, no extra text.

Meeting Title: ${title || 'Untitled Meeting'}
Participants: ${participants || 'Not specified'}
Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Manual Notes from Host:
${notes || 'No additional notes provided.'}

Meeting Transcript (Voice):
${transcript || 'No transcript provided.'}

Reference Document (Uploaded File):
${docText || 'No reference document uploaded.'}

Return this exact JSON structure:
{
  "summary": "A 2-3 sentence executive summary of the meeting.",
  "key_points": ["string", "string"],
  "decisions": ["string", "string"],
  "action_items": [
    { "task": "string", "owner": "person name or Unknown" },
    { "task": "string", "owner": "person name or Unknown" }
  ],
  "risks": ["string", "string"]
}

Rules:
- summary: 2–3 sentences capturing the overall purpose and outcome
- key_points: 3–6 bullet points capturing the most important topics discussed
- decisions: list every decision agreed upon (can be empty array if none)
- action_items: list every task/follow-up with who should do it (use "Unknown" if unclear)
- risks: any blockers, risks, or concerns mentioned (can be empty array if none)
- Cross-reference all three inputs (notes, transcript, reference document) for a complete picture
- Be concise, professional, and actionable
- Do NOT include anything outside the JSON object`;
};

module.exports = { buildPrompt };
