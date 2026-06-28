# AI Buddy Chrome Extension

AI Buddy is a production-ready Chrome Extension and Node.js Backend that maintains a living, cumulative summary of your conversations across multiple AI platforms (ChatGPT, Gemini, Grok, etc.).

## Features
- **Cross-Platform Support**: Works with ChatGPT, Gemini, and Grok.
- **Cumulative Summaries**: Uses Groq (LLaMA 3.3 70B) to generate a structured summary of your conversation that evolves with each new prompt/response.
- **Push Summary**: Quickly push your current summary into a new prompt on any supported AI platform.
- **Modern UI**: A premium glassy/dark mode popup interface.

## Architecture
- **Extension**: Manifest V3, Content Scripts (for scraping), Background Service Worker (for communication), and a Popup UI.
- **Backend**: Node.js, Express, MongoDB (Mongoose), `@langchain/groq`.

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Groq API Key

### 2. Backend Setup
Navigate to the root directory and install dependencies (run this yourself as per the instructions):
```bash
npm install
```

Configure your environment variables in the `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aibuddy
GROQ_API_KEY=your_groq_api_key_here
```

Start the backend server:
```bash
node server/index.js
```
The server will run on `http://localhost:5000`.

### 3. Extension Loading
1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the `extension/` folder from this repository.
5. The AI Buddy extension icon will appear in your browser toolbar.

## API Endpoints

- `POST /api/session/new`: Create a new session. Returns `{ sessionId, title }`.
- `POST /api/summary/update`: Updates the summary for a session. Expects `{ sessionId, prompt, response }`.
- `GET /api/history`: Retrieves all past sessions sorted by latest updated.
- `GET /api/history/:id`: Retrieves the summary for a specific session ID.

## Development Workflow
- The **Backend** handles all LLM API calls and database interactions to avoid CORS/CSP issues in the browser extension.
- The **Extension Content Script** (`content.js`) injects into supported AI sites and scrapes the user prompt and the AI's completed response.
- The **Extension Background Script** (`background.js`) relays data between the content script and the backend API.
- The **Popup** (`popup.html`/`popup.js`) displays the current session summary, history, and provides the "Push Summary" feature.

## Troubleshooting
- **Extension Not Connecting**: Ensure the Node.js backend is running on `http://localhost:5000`.
- **Summaries Not Generating**: Verify your `GROQ_API_KEY` in the `.env` file and ensure MongoDB is running.
- **Scraping Issues**: AI websites frequently update their DOM structures. If the extension stops capturing prompts/responses, the mutation observers in `content.js` may need to be updated.