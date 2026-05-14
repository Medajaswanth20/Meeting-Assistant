# 🧠 MeetMind — AI-Powered Meeting Assistant

> A **100% free**, full-stack web application that automates meeting documentation using AI. Record or upload audio, get instant transcriptions, and generate structured summaries — all powered by free-tier APIs.

---

## ✨ Features

- 🎙️ **Live Audio Recording** — Record meetings directly in the browser
- 📁 **Audio File Upload** — Upload pre-recorded audio (up to 500MB, auto-compressed)
- 📝 **Auto Transcription** — Speech-to-text powered by **Groq Whisper**
- 🤖 **AI Analysis** — Extract key points, decisions, action items & risks via **LLaMA 3.3 70B**
- 📄 **Document Upload** — Attach reference documents (PDF, Word, Excel) for additional context
- ✏️ **Editable Summary** — Review and edit AI output before exporting
- 📤 **Word Export** — Download a structured `.docx` report with one click

---

## 🛠️ Tech Stack

### Frontend
| Tech | Purpose |
|---|---|
| React 19 + Vite | UI framework |
| Axios | HTTP requests to backend |
| Vanilla CSS | Styling & animations |
| file-saver | Word document download |

### Backend
| Tech | Purpose |
|---|---|
| Node.js + Express | REST API server |
| Groq SDK | Whisper transcription + LLaMA analysis |
| fluent-ffmpeg | Audio compression (large file handling) |
| Multer | File upload handling |
| docx | Word document generation |
| mammoth / pdf-parse / xlsx | Document parsing |

---

## 📁 Project Structure

```
meeting-assistant/
├── backend/
│   ├── index.js              # Express server entry point
│   ├── routes/
│   │   ├── transcribe.js     # Audio upload & transcription
│   │   ├── analyze.js        # AI meeting analysis
│   │   ├── export.js         # Word document generation
│   │   └── parse-doc.js      # Document text extraction
│   └── utils/
│       └── prompt.js         # AI prompt builder
│
├── frontend/
│   └── src/
│       ├── App.jsx            # Main app & step routing
│       └── components/
│           ├── MeetingDetails.jsx   # Step 1: Meeting info
│           ├── AudioRecorder.jsx    # Step 2: Record/upload audio
│           ├── TranscriptStep.jsx   # Step 3: Review transcript
│           ├── SummaryStep.jsx      # Step 4: AI analysis & editing
│           └── ExportStep.jsx       # Step 5: Export to Word
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or above
- A free **[Groq API key](https://console.groq.com)** (takes 1 minute to get)

---

### 1. Clone the repository

```bash
git clone https://github.com/Medajaswanth20/Meeting-Assistant.git
cd Meeting-Assistant
```

---

### 2. Setup the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
GROQ_API_KEY=your_free_groq_api_key_here
PORT=5000
```

Start the backend:

```bash
npm run dev
```

Backend runs on → `http://localhost:5000`

---

### 3. Setup the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on → `http://localhost:5173`

---

## 🔄 How It Works

```
Step 1 → Enter meeting title & participants
Step 2 → Record live audio OR upload an audio file
Step 3 → Review & edit the auto-generated transcript
Step 4 → AI analyzes and extracts structured insights
Step 5 → Export polished meeting report as Word (.docx)
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Free API key from [console.groq.com](https://console.groq.com) |
| `PORT` | ❌ Optional | Backend port (default: `5000`) |

> ⚠️ **Never commit your `.env` file.** It is already excluded via `.gitignore`.

---

## 📦 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/transcribe` | Upload audio → returns transcript |
| `POST` | `/api/analyze` | Send transcript/notes → returns AI summary |
| `POST` | `/api/export` | Send summary data → returns `.docx` file |
| `POST` | `/api/parse-doc` | Upload document → returns extracted text |

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Jaswanth Meda**
- GitHub: [@Medajaswanth20](https://github.com/Medajaswanth20)
