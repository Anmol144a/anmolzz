/* anmol.js - OpenRouter Chat Connector for Anmol Portfolio
   - For production: Proxy API calls server-side to hide keys.
   - Demo: Uses client-side fetch; paste key in UI for use.
*/
const OPENROUTER_ENDPOINT = "https://api.openrouter.ai/v1/chat/completions";
const OPENROUTER_MODEL = "mistralai/mixtral-8x7b-instruct:free"; // Free tier model
// Selectors
const chatWin = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const apiKeyInput = document.getElementById('apiKey');
let pending = false;
let conversation = [
  { role: 'system', content: "You are Anmolz AI — a friendly, concise assistant focused on Anmol's projects, code, and tech. Keep responses helpful and under 200 words." }
];
// Helpers
function el(msg, who = 'bot') {
  const d = document.createElement('div');
  d.className = `msg ${who === 'user' ? 'user' : 'bot'}`;
  d.textContent = msg;
  return d;
}
function scrollToBottom() { chatWin.scrollTop = chatWin.scrollHeight; }
function appendMessage(text, who = 'bot') {
  const node = el(text, who);
  chatWin.appendChild(node);
  scrollToBottom();
  return node;
}
function showTyping() {
  const t = document.createElement('div');
  t.className = 'msg bot typing';
  t.textContent = 'Anmolz AI is typing...';
  chatWin.appendChild(t);
  scrollToBottom();
  return t;
}
function setPending(v) {
  pending = v;
  userInput.disabled = v;
  sendBtn.disabled = v;
  sendBtn.textContent = v ? 'Sending…' : 'Send';
}
// Event Listeners
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
async function sendMessage() {
  if (pending) return;
  const text = userInput.value.trim();
  if (!text) return;
  userInput.value = '';
  appendMessage(text, 'user');
  conversation.push({ role: 'user', content: text });
  const typingNode = showTyping();
  setPending(true);
  try {
    const model = modelSelect.value;
    let reply = '';
    if (model === 'local') {
      reply = await localLLMQuery(text); // Placeholder for Ollama
    } else if (model === 'openrouter') {
      reply = await callOpenRouter(text);
    } else if (model === 'hf') {
      reply = await callHuggingFace(text);
    }
    typingNode.remove();
    appendMessage(reply || 'Sorry, no response. Check console.');
    conversation.push({ role: 'assistant', content: reply });
  } catch (err) {
    console.error('Chat error', err);
    typingNode.remove();
    appendMessage('Error: ' + (err.message || err), 'bot');
  } finally {
    setPending(false);
  }
}
async function callOpenRouter(prompt) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) throw new Error('OpenRouter API key required. Paste it in the field.');
  const body = {
    model: OPENROUTER_MODEL,
    messages: conversation,
    max_tokens: 512,
    temperature: 0.2,
    top_p: 0.9
  };
  const res = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
      'HTTP-Referer': window.location.origin, // Required for free tier
      'X-Title': 'Anmol Portfolio'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('OpenRouter: ' + res.status + ' — ' + txt);
  }
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? JSON.stringify(j);
}
async function callHuggingFace(prompt) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) throw new Error('HuggingFace API key required.');
  const modelId = 'microsoft/DialoGPT-medium'; // Example; change as needed
  const endpoint = `https://api-inference.huggingface.co/models/${modelId}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt })
  });
  if (!res.ok) { const t = await res.text(); throw new Error('HF: ' + t); }
  const j = await res.json();
  return Array.isArray(j) && j[0]?.generated_text ? j[0].generated_text : JSON.stringify(j);
}
async function localLLMQuery(prompt) {
  // Ollama local: Assumes running at http://localhost:11434
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3', prompt, stream: false })
    });
    if (!res.ok) throw new Error('Ollama not running?');
    const j = await res.json();
    return j.response;
  } catch {
    return 'Local mode: Run `ollama run llama3` and try again. Or use OpenRouter.';
  }
}
// Onboarding
appendMessage('Welcome! Ask me about these projects, or say "summarize project p1" for a quick AI take.', 'bot');
// Expose for modals
window.generateProjectSummary = async function(project) {
  const prompt = `Give a friendly, 3-sentence summary of this project for a portfolio:
Title: ${project.title}
Desc: ${project.blurb}
Tags: ${project.tags?.join(', ') || ''}
Link: ${project.link || 'n/a'}
GitHub: ${project.github || 'n/a'}`;
  const tmpConv = [...conversation, { role: 'user', content: prompt }];
  try {
    const model = modelSelect.value;
    if (model === 'openrouter') {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) return 'Add OpenRouter key to generate summaries.';
      const res = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Anmol Portfolio'
        },
        body: JSON.stringify({ model: OPENROUTER_MODEL, messages: tmpConv, max_tokens: 200 })
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      return j?.choices?.[0]?.message?.content ?? 'Summary unavailable.';
    }
    return 'Use OpenRouter mode for project summaries.';
  } catch (e) {
    console.error(e);
    return 'Failed to generate: ' + e.message;
  }
};
