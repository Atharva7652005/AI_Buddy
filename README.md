# File Structure for Chrome Extension with Express Backend
```
    AI_Buddy/
    ├── extension/                # The actual Chrome Extension code
    │   ├── manifest.json         # Extension configuration (The most important file)
    │   ├── popup.html            # The UI when you click the extension icon
    │   ├── popup.js              # Logic for the popup (calls your Express API)
    │   ├── background.js         # Service worker for background tasks
    │   ├── content.js            # Script that runs on web pages
    │   └── icons/                # Extension icons (16x16, 48x48, 128x128)
    │       └── icon.png
    │
    ├── server/                   
    │   ├── node_modules/
    │   ├── controllers/          # Logic for your API endpoints
    │   ├── routes/               # API route definitions
    │   ├── models/               # Database schemas
    │   ├── index.js              # Entry point for Express server
    │   └── package.json          # Backend dependencies
    │
    ├── .gitignore                # Ignore node_modules and .env
    └── README.md
```