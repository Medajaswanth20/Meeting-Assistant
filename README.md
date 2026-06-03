# 🧠 MeetMind — AI-Powered Meeting Assistant

> A **100% free**, full-stack web application that automates meeting documentation using AI. Record or upload audio, get instant transcriptions, and generate structured summaries — all powered by free-tier APIs.

---

## ✨ Features

- 🎙️ **Live Audio Recording** — Record meetings directly in the browser
- 📁 **Audio File Upload** — Upload pre-recorded audio (up to 8 hours / 500MB, auto-compressed & chunked)
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
| fluent-ffmpeg | Audio compression & chunking (large file handling) |
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
│   │   ├── transcribe.js     # Audio upload, compression & transcription
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
│           ├── StepIndicator.jsx    # Progress stepper
│           ├── AudioRecorder.jsx    # Step 1: Record/upload audio & notes
│           ├── MeetingDetails.jsx   # Step 2: Meeting info
│           ├── SummaryStep.jsx      # Step 3: AI analysis & editing
│           └── ExportStep.jsx       # Step 4: Export to Word
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
PORT=3001
```

Start the backend:

```bash
npm run dev
```

Backend runs on → `http://localhost:3001`

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
Step 1 → Record live audio OR upload an audio file (edit transcript inline)
Step 2 → Enter meeting title & participants
Step 3 → AI analyzes and extracts structured insights
Step 4 → Export polished meeting report as Word (.docx)
```

---

## 🎵 Audio Upload & Transcription

| Limit | Value |
|---|---|
| Max duration | **8 hours** |
| Max file size | **500 MB** |
| Supported formats | MP3, WAV, M4A, OGG, FLAC, WebM, MP4 |
| Languages | English, Hindi, Kannada, Telugu |

Long recordings are automatically **compressed** to speech-friendly MP3 and **split into ~90-minute chunks** before being sent to Groq Whisper (25 MB API limit per request). Transcripts from all chunks are merged into one result.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Free API key from [console.groq.com](https://console.groq.com) |
| `PORT` | ❌ Optional | Backend port (default: `3001`) |

> ⚠️ **Never commit your `.env` file.** It is already excluded via `.gitignore`.

---

## 📦 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/transcribe` | Upload audio → returns transcript |
| `POST` | `/api/analyze` | Send transcript/notes → returns AI summary |
| `POST` | `/api/export` | Send summary data → returns `.docx` file |
| `POST` | `/api/parse-doc` | Upload document → returns extracted text |
| `GET` | `/api/health` | Health check |

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
