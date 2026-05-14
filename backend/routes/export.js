const express = require('express');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, PageNumber, Footer, Header,
} = require('docx');
const os     = require('os');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const router = express.Router();

// token → { filePath, filename, expires }
const tokenStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokenStore.entries()) {
    if (entry.expires < now) {
      try { fs.unlinkSync(entry.filePath); } catch (_) {}
      tokenStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

const FONT = 'Calibri';
const SZ_TITLE = 36;   // 18pt — Document title
const SZ_BODY = 24;   // 12pt — Body / bullets
const SZ_SMALL = 20;   // 10pt — Header / footer / table

// ── Heading 2 (uses Word's built-in Heading 2 style → automatic blue) ──
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, font: FONT })],
  spacing: { before: 240, after: 120 },
});

// ── Document Title (centered, styled like the sample) ──
const docTitle = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, font: FONT })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 120, after: 240 },
});

// ── Bullet with optional bold label ──
const bullet = (text, boldLabel) => new Paragraph({
  children: boldLabel
    ? [
      new TextRun({ text: `${boldLabel}: `, bold: true, size: SZ_BODY, font: FONT }),
      new TextRun({ text: text || '', size: SZ_BODY, font: FONT }),
    ]
    : [new TextRun({ text: text || '', size: SZ_BODY, font: FONT })],
  bullet: { level: 0 },
  spacing: { before: 60, after: 60 },
});

// ── Sub-label (Key Discussion:, Inputs from Team:) ──
const subLabel = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: SZ_BODY, font: FONT })],
  spacing: { before: 120, after: 60 },
  indent: { left: 360 },
});

// ── Plain 12pt paragraph ──
const para = (text, justify = false) => new Paragraph({
  children: [new TextRun({ text, size: SZ_BODY, font: FONT })],
  alignment: justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
  spacing: { before: 80, after: 80 },
});

const gap = () => new Paragraph({ text: '', spacing: { before: 80 } });

// ── Table builder — thin borders, bold header, no shading ──
const makeTable = (headers, rows, colWidths) => {
  const borderDef = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const allBorders = { top: borderDef, bottom: borderDef, left: borderDef, right: borderDef, insideH: borderDef, insideV: borderDef };

  const makeCell = (text, bold = false, width) => new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: text || '', bold, size: SZ_SMALL, font: FONT })],
      spacing: { before: 60, after: 60 },
    })],
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  });

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => makeCell(h, true, colWidths?.[i])),
  });

  const dataRows = rows.map(cells =>
    new TableRow({ children: cells.map((c, i) => makeCell(c, false, colWidths?.[i])) })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allBorders,
    rows: [headerRow, ...dataRows],
  });
};

router.post('/', async (req, res) => {
  try {
    const { meetingData, summary } = req.body;
    const {
      title = 'Meeting Document',
      participants = '', date = '', time = '',
      duration = '', location = '', scrumMaster = '', absentees = '',
      agenda = '', sprintName = '', sprintGoal = '', sprintStatus = '',
      nextDate = '', nextTime = '', nextAgenda = '',
    } = meetingData || {};
    const {
      summary: execSummary = '',
      key_points = [],
      decisions = [],
      action_items = [],
      risks = [],
    } = summary || {};

    const dateStr = date
      ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

    const participantList = (participants || '').split(',').map(p => p.trim()).filter(Boolean).join(', ') || '—';

    // ── Agenda table (Topic | Owner) ──
    const agendaTable = makeTable(
      ['Topic', 'Owner'],
      [
        ['Meeting Updates & Discussion', 'Facilitator'],
        ['Action Items Review', 'Team'],
        ['Next Steps', 'Team'],
      ],
      [70, 30]
    );

    // ── Action items table (Task | Owner | Status) ──
    const actionRows = action_items.length > 0
      ? action_items.map(a => [a.task || '', a.owner || '—', 'Pending'])
      : [['', '', ''], ['', '', '']];

    const actionTable = makeTable(
      ['Task', 'Owner', 'Status'],
      actionRows,
      [60, 25, 15]
    );

    const children = [

      // ── Document Title ──
      docTitle('Meeting Document'),   // fixed title as requested

      // ── 1. Meeting Overview ──
      h2('1. Meeting Overview'),
      bullet(title, 'Meeting Title'),
      bullet(dateStr, 'Date'),
      bullet(time || '—', 'Time'),
      bullet(duration || '—', 'Duration'),
      bullet(location || '—', 'Location / Platform'),
      bullet(scrumMaster || '—', 'Scrum Master (Facilitator)'),
      bullet(participantList, 'Participants'),
      bullet(absentees || '—', 'Absentees'),
      gap(),

      // ── 2. Meeting Objective ──
      h2('2. Meeting Objective'),
      para('To review daily task progress, identify blockers, align on priorities, and ensure timely completion of ongoing activities.', true),
      gap(),

      // ── 3. Agenda ──
      h2('3. Agenda'),
      gap(),
      agendaTable,
      gap(),

      // ── 4. Discussion Points ──
      h2('4. Discussion Points'),

      ...(key_points.length > 0 ? [
        subLabel('Key Discussion:'),
        ...key_points.map(p => bullet(p)),
        gap(),
      ] : []),

      ...(decisions.length > 0 ? [
        subLabel('Decisions Made:'),
        ...decisions.map(d => bullet(d)),
        gap(),
      ] : []),

      ...(risks.length > 0 ? [
        subLabel('Risks & Blockers:'),
        ...risks.map(r => bullet(r)),
        gap(),
      ] : []),

      // ── 5. Action Items ──
      h2('5. Action Items'),
      gap(),
      actionTable,
      gap(),

      // ── 6. Key Decisions ──
      h2('6. Key Decisions'),
      ...(decisions.length > 0
        ? decisions.map(d => bullet(d))
        : [bullet('—')]),
      gap(),

      // ── 7. Next Steps ──
      h2('7. Next Steps'),
      bullet('Begin execution of assigned tasks'),
      bullet('Track progress in daily meetings'),
      bullet('Address blockers proactively'),
      bullet('Align execution with sprint roadmap'),
      gap(),

      // ── 8. Sprint Updates ──
      h2('8. Sprint Updates'),
      bullet(sprintName || '—', 'Sprint Name / Number'),
      bullet(sprintGoal || '—', 'Sprint Goal'),
      bullet(sprintStatus || '—', 'Progress Status'),
      gap(),

      // ── 9. Release Roadmap & Future (manual) ──
      h2('9. Release Roadmap & Future'),
      bullet('(To be filled manually)'),
      gap(),

      // ── 10. Next Meeting Details ──
      h2('10. Next Meeting Details'),
      bullet(nextDate ? new Date(nextDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—', 'Date'),
      bullet(nextTime || '—', 'Time'),
      bullet(nextAgenda || '—', 'Agenda'),
      gap(),
    ];

    // ── Header: Date | Title | Version ──
    const docHeader = new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: dateStr, size: SZ_SMALL, font: FONT }),
            new TextRun({ text: '\t', size: SZ_SMALL }),
            new TextRun({ text: 'Warehouse Management System', size: SZ_SMALL, font: FONT }),
            new TextRun({ text: '\t', size: SZ_SMALL }),
            new TextRun({ text: 'v 0.5.5', size: SZ_SMALL, font: FONT }),
          ],
          tabStops: [
            { type: 'center', position: 4536 },
            { type: 'right', position: 9072 },
          ],
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA', space: 1 },
          },
          spacing: { after: 120 },
        }),
      ],
    });

    // ── Footer: Page number ──
    const docFooter = new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({ children: [PageNumber.CURRENT], size: SZ_SMALL, font: FONT }),
            new TextRun({ text: ' | Page', size: SZ_SMALL, font: FONT }),
          ],
          alignment: AlignmentType.CENTER,
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA', space: 1 },
          },
        }),
      ],
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } },
        },
        headers: { default: docHeader },
        footers: { default: docFooter },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeTitle = (title || 'Meeting')
      .replace(/[^a-z0-9\s]/gi, '').trim().replace(/\s+/g, '_') || 'Meeting';
    const filename = `${safeTitle}_Report.docx`;

    // Return as base64 JSON — frontend decodes and triggers download
    res.json({ data: buffer.toString('base64'), filename });

  } catch (err) {
    console.error('Export error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Export failed.' });
  }
});

module.exports = router;
