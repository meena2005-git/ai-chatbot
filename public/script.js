```javascript
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChat");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const toast = document.getElementById("toast");

const STORAGE_KEY = "bluebot-chat-v1";

let history = [];
let busy = false;

// Load saved chat history
try {
  const saved = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "[]"
  );

  if (Array.isArray(saved)) {
    history = saved
      .filter(
        (message) =>
          message &&
          ["user", "assistant"].includes(message.role) &&
          typeof message.content === "string"
      )
      .slice(-40);
  }
} catch (error) {
  console.error("Could not load chat history:", error);
  history = [];
}

// Save chat history
function saveHistory() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(history.slice(-40))
    );
  } catch (error) {
    console.error("Could not save chat:", error);
    showToast("Chat could not be saved in this browser.");
  }
}

// Display toast message
function showToast(message) {
  if (!toast) {
    console.error(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// Scroll to bottom
function scrollToBottom() {
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth"
  });
}

// Add a chat message
function addMessage(role, content, options = {}) {
  if (welcomeEl) {
    welcomeEl.hidden = true;
  }

  const row = document.createElement("div");
  row.className = "message " + role;

  if (options.error) {
    row.classList.add("error");
  }

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "Y" : "✦";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  // Display plain text safely
  bubble.textContent = content;

  row.append(avatar, bubble);
  messagesEl.appendChild(row);

  scrollToBottom();

  return row;
}

// Render saved messages
function renderHistory() {
  messagesEl.replaceChildren();

  if (history.length === 0) {
    if (welcomeEl) {
      welcomeEl.hidden = false;
    }
    return;
  }

  if (welcomeEl) {
    welcomeEl.hidden = true;
  }

  history.forEach((message) => {
    addMessage(message.role, message.content);
  });
}

// Enable or disable chat controls
function setBusy(value) {
  busy = value;

  sendBtn.disabled = value;
  messageInput.disabled = value;

  sendBtn.textContent = value ? "…" : "↑";
}

// Send message to BlueBot
async function sendMessage(text) {
  const content = text.trim();

  if (!content || busy) {
    return;
  }

  // Add user message to history
  history.push({
    role: "user",
    content
  });

  history = history.slice(-40);
  saveHistory();

  addMessage("user", content);

  messageInput.value = "";
  messageInput.style.height = "auto";

  setBusy(true);

  const loadingRow = addMessage(
    "assistant",
    "Thinking…"
  );

  try {
    // Call backend API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        messages: history.slice(-20)
      })
    });

    // Read response as text first
    const responseText = await response.text();

    // Safely parse JSON
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "Server returned non-JSON response:",
        responseText
      );

      throw new Error(
        "Server returned an invalid response. Check your Vercel deployment and API settings."
      );
    }

    // Handle server errors
    if (!response.ok) {
      throw new Error(
        data.error || "Something went wrong."
      );
    }

    // Validate AI reply
    if (
      typeof data.reply !== "string" ||
      !data.reply.trim()
    ) {
      throw new Error(
        data.error || "The server returned an invalid response."
      );
    }

    // Save assistant reply
    history.push({
      role: "assistant",
      content: data.reply
    });

    history = history.slice(-40);
    saveHistory();

    // Replace loading message
    loadingRow.querySelector(".bubble").textContent =
      data.reply;

    scrollToBottom();

  } catch (error) {
    console.error("BlueBot chat error:", error);

    loadingRow.remove();

    const errorMessage =
      error.message ||
      "Could not connect. Please try again.";

    addMessage(
      "assistant",
      errorMessage,
      { error: true }
    );

    showToast("Message failed. Check the error message.");
  } finally {
    setBusy(false);
    messageInput.focus();
  }
}

// Submit chat form
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(messageInput.value);
});

// Automatically resize message input
messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";

  messageInput.style.height =
    Math.min(messageInput.scrollHeight, 150) + "px";
});

// Enter sends message; Shift+Enter adds a new line
messageInput.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

// Suggestion buttons
document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt || "");
  });
});

// Start a new chat
newChatBtn.addEventListener("click", () => {
  if (busy) {
    return;
  }

  history = [];

  saveHistory();
  renderHistory();

  messageInput.value = "";
  messageInput.focus();

  sidebar.classList.remove("open");
});

// Mobile menu
menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

// Close mobile sidebar when clicking outside
document.addEventListener("click", (event) => {
  if (
    window.innerWidth <= 700 &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    !menuBtn.contains(event.target)
  ) {
    sidebar.classList.remove("open");
  }
});

// Display saved messages when page opens
renderHistory();
```