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

  const copySummaryBtn = document.getElementById("copySummaryBtn");
  const notificationArea = document.getElementById("notificationArea");

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
      showNotification("Ready for a new session.", false);
    });
  });

  copySummaryBtn.addEventListener("click", async () => {
    const text = summaryContent.innerText;
    if (!text || text.includes("Awaiting") || text.includes("Loading")) return;
    try {
      await navigator.clipboard.writeText(text);
      showNotification("Summary copied!", false);
    } catch (err) {
      console.error(err);
      showNotification("Failed to copy summary.", true);
    }
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
  function showNotification(msg, isError = false, timeout = 3000) {
    notificationArea.innerText = msg;
    notificationArea.style.color = isError ? "#ef4444" : "var(--success)";
    notificationArea.style.display = "block";
    setTimeout(() => { notificationArea.style.display = "none"; }, timeout);
  }

  function setButtonsDisabled(disabled) {
    newSessionBtn.disabled = disabled;
    openPushModalBtn.disabled = disabled;
    copySummaryBtn.disabled = disabled;
    newSessionBtn.style.opacity = disabled ? "0.5" : "1";
    openPushModalBtn.style.opacity = disabled ? "0.5" : "1";
    copySummaryBtn.style.opacity = disabled ? "0.5" : "1";
  }

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
    setButtonsDisabled(true);
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
              showNotification("Failed to load summary.", true);
            }
          })
          .catch(err => {
            console.error(err);
            summaryContent.innerText = "Error connecting to backend.";
            showNotification("API Error.", true);
          })
          .finally(() => setButtonsDisabled(false));
      } else {
        sessionTitle.innerText = "Awaiting First Prompt...";
        summaryContent.innerText = "Interact with an AI to start building a summary.";
        setButtonsDisabled(false);
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

  async function pushSummaryToTarget(url) {
    const summaryText = summaryContent.innerText;
    if (!summaryText || summaryText.includes("Awaiting") || summaryText.includes("Loading")) {
      showNotification("No valid summary to push.", true);
      return;
    }

    pushModal.style.display = "none";
    
    try {
      await navigator.clipboard.writeText(summaryText);
      showNotification("Automatic pasting is not supported for this website. The summary has been copied to your clipboard. Simply paste it using Ctrl + V.", false, 5000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
    
    chrome.tabs.create({ url }, (tab) => {
      chrome.runtime.sendMessage({ action: "pasteViaBackground", tabId: tab.id, text: summaryText });
    });
  }
});
