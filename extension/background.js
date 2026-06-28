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
