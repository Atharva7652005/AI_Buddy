const API_BASE_URL = "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const extensionToggle = document.getElementById("extensionToggle");
  const toggleLabel = document.getElementById("toggleLabel");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");
  
  const currentSessionView = document.getElementById("currentSessionView");
  const historyView = document.getElementById("historyView");
  
  const navCurrentBtn = document.getElementById("navCurrentBtn");
  const navHistoryBtn = document.getElementById("navHistoryBtn");
  const backToCurrentBtn = document.getElementById("backToCurrentBtn");
  const newSessionBtn = document.getElementById("newSessionBtn");
  
  const sessionTitle = document.getElementById("sessionTitle");
  const summaryContent = document.getElementById("summaryContent");
  const historyList = document.getElementById("historyList");
  
  const openPushModalBtn = document.getElementById("openPushModalBtn");
  const pushModal = document.getElementById("pushModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const targetBtns = document.querySelectorAll(".target-btn");

  // Initialize toggle state
  chrome.storage.local.get(["isExtensionOn"], (data) => {
    const isOn = data.isExtensionOn !== false; // default true
    extensionToggle.checked = isOn;
    updateToggleUI(isOn);
  });

  // Check active tab for supported site
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const url = tabs[0].url;
      if (url.includes("chatgpt.com")) {
        statusText.innerText = "Connected: ChatGPT";
        statusIndicator.className = "status-indicator active";
      } else if (url.includes("gemini.google.com")) {
        statusText.innerText = "Connected: Gemini";
        statusIndicator.className = "status-indicator active";
      } else if (url.includes("x.com") || url.includes("grok")) {
        statusText.innerText = "Connected: Grok";
        statusIndicator.className = "status-indicator active";
      } else {
        statusText.innerText = "Waiting for supported AI site...";
        statusIndicator.className = "status-indicator";
      }
    }
  });

  // Load current session
  loadCurrentSession();

  // Event Listeners
  extensionToggle.addEventListener("change", (e) => {
    const isOn = e.target.checked;
    chrome.storage.local.set({ isExtensionOn: isOn });
    updateToggleUI(isOn);
  });

  navCurrentBtn.addEventListener("click", () => switchView("current"));
  navHistoryBtn.addEventListener("click", () => {
    switchView("history");
    loadHistory();
  });
  backToCurrentBtn.addEventListener("click", () => switchView("current"));

  newSessionBtn.addEventListener("click", () => {
    // Clear session id in storage to start fresh on next prompt
    chrome.storage.local.remove("sessionId", () => {
      sessionTitle.innerText = "New Session Ready";
      summaryContent.innerText = "Your next prompt will start a new session.";
    });
  });

  // Modal logic
  openPushModalBtn.addEventListener("click", () => {
    pushModal.style.display = "flex";
  });
  
  closeModalBtn.addEventListener("click", () => {
    pushModal.style.display = "none";
  });

  targetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetUrl = btn.getAttribute("data-url");
      pushSummaryToTarget(targetUrl);
    });
  });

  // Functions
  function updateToggleUI(isOn) {
    toggleLabel.innerText = isOn ? "ON" : "OFF";
    toggleLabel.style.color = isOn ? "var(--success)" : "var(--text-muted)";
  }

  function switchView(view) {
    if (view === "current") {
      currentSessionView.style.display = "flex";
      historyView.style.display = "none";
      navCurrentBtn.classList.add("active");
      navHistoryBtn.classList.remove("active");
      loadCurrentSession();
    } else {
      currentSessionView.style.display = "none";
      historyView.style.display = "flex";
      navCurrentBtn.classList.remove("active");
      navHistoryBtn.classList.add("active");
    }
  }

  function loadCurrentSession() {
    chrome.storage.local.get(["sessionId"], (data) => {
      if (data.sessionId) {
        summaryContent.innerText = "Loading summary...";
        fetch(`${API_BASE_URL}/history/${data.sessionId}`)
          .then(res => res.json())
          .then(resData => {
            if (resData.success) {
              sessionTitle.innerText = resData.title || "Session";
              summaryContent.innerText = resData.summary || "No summary generated yet.";
            } else {
              summaryContent.innerText = "Failed to load summary.";
            }
          })
          .catch(err => {
            console.error(err);
            summaryContent.innerText = "Error connecting to backend.";
          });
      } else {
        sessionTitle.innerText = "Awaiting First Prompt...";
        summaryContent.innerText = "Interact with an AI to start building a summary.";
      }
    });
  }

  function loadHistory() {
    historyList.innerHTML = '<div class="loading-text">Loading history...</div>';
    fetch(`${API_BASE_URL}/history`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.sessions.length > 0) {
          historyList.innerHTML = "";
          data.sessions.forEach(session => {
            const item = document.createElement("div");
            item.className = "history-item";
            
            const date = new Date(session.updatedAt).toLocaleString();
            
            item.innerHTML = `
              <div class="history-title">${session.title || "Untitled Session"}</div>
              <div class="history-date">${date}</div>
            `;
            
            item.addEventListener("click", () => {
              chrome.storage.local.set({ sessionId: session.sessionId }, () => {
                switchView("current");
              });
            });
            
            historyList.appendChild(item);
          });
        } else {
          historyList.innerHTML = '<div class="loading-text">No history found.</div>';
        }
      })
      .catch(err => {
        console.error(err);
        historyList.innerHTML = '<div class="loading-text">Error loading history. Ensure backend is running.</div>';
      });
  }

  function pushSummaryToTarget(url) {
    const summaryText = summaryContent.innerText;
    if (!summaryText || summaryText.includes("Awaiting") || summaryText.includes("Loading")) {
      alert("No valid summary to push.");
      return;
    }

    pushModal.style.display = "none";
    
    // Create new tab with target URL
    chrome.tabs.create({ url }, (tab) => {
      // Wait for tab to load before sending message
      // A robust implementation would wait for webNavigation.onCompleted, 
      // but for simplicity we'll poll until the content script responds or retry.
      
      const sendPasteCommand = (retryCount = 0) => {
        chrome.tabs.sendMessage(tab.id, { action: "pasteText", text: summaryText }, (response) => {
          if (chrome.runtime.lastError || !response) {
            // Content script not ready yet, retry
            if (retryCount < 10) {
              setTimeout(() => sendPasteCommand(retryCount + 1), 1000);
            }
          }
        });
      };
      
      // Initial delay to let page start loading
      setTimeout(() => sendPasteCommand(), 2000);
    });
  }
});
