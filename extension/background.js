const API_BASE_URL = "http://localhost:5000/api";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSummary") {
    chrome.storage.local.get(["sessionId", "isExtensionOn"], (data) => {
      if (data.isExtensionOn === false) {
        sendResponse({ success: false, error: "Extension is OFF" });
        return;
      }

      const sessionId = data.sessionId;
      const { prompt, response } = request.data;

      // If no session exists, create one first
      if (!sessionId) {
        fetch(`${API_BASE_URL}/session/new`, { method: "POST" })
          .then((res) => res.json())
          .then((sessionData) => {
            if (sessionData.success) {
              chrome.storage.local.set({ sessionId: sessionData.sessionId }, () => {
                sendSummaryUpdate(sessionData.sessionId, prompt, response, sendResponse);
              });
            } else {
              sendResponse({ success: false, error: "Failed to create session" });
            }
          })
          .catch((err) => {
            console.error("Error creating session:", err);
            sendResponse({ success: false, error: err.toString() });
          });
      } else {
        sendSummaryUpdate(sessionId, prompt, response, sendResponse);
      }
    });

    return true; // Keep message channel open for async response
  }

  if (request.action === "pasteViaBackground") {
    const { tabId, text } = request;
    
    // Wait for the new tab to finish loading
    chrome.tabs.onUpdated.addListener(function listener(tId, info) {
      if (tId === tabId && info.status === 'complete') {
        // Remove listener to avoid multiple fires
        chrome.tabs.onUpdated.removeListener(listener);
        
        // Execute the pasting script
        chrome.scripting.executeScript({
          target: { tabId },
          func: (textToPaste) => {
            // Give the page a slight moment to initialize its JS frameworks
            setTimeout(() => {
              const inputBox = document.querySelector('textarea, [contenteditable="true"]');
              if (inputBox) {
                if (inputBox.tagName === 'TEXTAREA') {
                  inputBox.value = textToPaste;
                } else {
                  inputBox.innerText = textToPaste;
                }
                // Trigger events so React/Vue/etc. register the change
                inputBox.dispatchEvent(new Event('input', { bubbles: true }));
                inputBox.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }, 1000);
          },
          args: [text]
        }).catch(err => console.error("Scripting error:", err));
      }
    });
    return true;
  }
});

function sendSummaryUpdate(sessionId, prompt, responseText, sendResponse) {
  fetch(`${API_BASE_URL}/summary/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId, prompt, response: responseText }),
  })
    .then((res) => res.json())
    .then((data) => {
      sendResponse(data);
    })
    .catch((err) => {
      console.error("Error updating summary:", err);
      sendResponse({ success: false, error: err.toString() });
    });
}
