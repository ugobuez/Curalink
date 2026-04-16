# curalink

Production-ready MERN monorepo for context-aware biomedical research chat with multi-source retrieval.

## Stack
- **Client:** React + Vite + Tailwind CSS
- **Server:** Node.js + Express + Mongoose
- **Database:** MongoDB
- **AI:** Ollama (local LLM integration)
- **Shared:** Common utilities/constants package

## Folder Structure
```txt
curalink/
├── client/
├── server/
├── shared/
├── .env.example
└── package.json
```

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env values:
   ```bash
   cp .env.example .env
   ```
3. Start MongoDB locally and ensure Ollama is running.
4. Run both apps:
   ```bash
   npm run dev
   ```

## Endpoints
- `POST /api/research/query`
- `GET /api/chat/history`

