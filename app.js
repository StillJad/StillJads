const topicForm = document.getElementById('topic-form');
const studyList = document.getElementById('study-list');
const quizForm = document.getElementById('quiz-form');
const quizOutput = document.getElementById('quiz-output');
const chatForm = document.getElementById('chat-form');
const chatLog = document.getElementById('chat-log');
const assistantSettingsForm = document.getElementById('assistant-settings');
const assistantModeSelect = document.getElementById('assistant-mode');
const apiKeyInput = document.getElementById('api-key');
const assistantModelInput = document.getElementById('assistant-model');

const savedTopics = JSON.parse(localStorage.getItem('studylift-topics') || '[]');
const rawAssistantSettings = JSON.parse(localStorage.getItem('studylift-assistant-settings') || '{}');
const assistantSettings = {
  mode: rawAssistantSettings.mode || 'offline',
  apiKey: rawAssistantSettings.apiKey || '',
  model: rawAssistantSettings.model || ''
};

function renderTopics() {
  studyList.innerHTML = '';
  savedTopics.forEach((item, i) => {
    const li = document.createElement('li');
    li.textContent = `${item.subject}: ${item.topic}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.marginLeft = '0.65rem';
    removeBtn.style.background = '#e34f4f';
    removeBtn.addEventListener('click', () => {
      savedTopics.splice(i, 1);
      localStorage.setItem('studylift-topics', JSON.stringify(savedTopics));
      renderTopics();
    });

    li.appendChild(removeBtn);
    studyList.appendChild(li);
  });
}

topicForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const subject = document.getElementById('subject').value.trim();
  const topic = document.getElementById('topic').value.trim();
  savedTopics.push({ subject, topic });
  localStorage.setItem('studylift-topics', JSON.stringify(savedTopics));
  topicForm.reset();
  renderTopics();
});

quizForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const topic = document.getElementById('quiz-topic').value.trim();
  const questions = [
    `1) Define ${topic} in your own words.`,
    `2) List 3 key facts about ${topic}.`,
    `3) Give one real-world example related to ${topic}.`,
    `4) What mistakes do students make in ${topic}?`,
    `5) Write a 5-mark exam answer on ${topic}.`
  ];

  quizOutput.innerHTML = `<strong>Practice Questions</strong><br>${questions.join('<br>')}`;
});

function assistantReply(input) {
  const normalized = input.toLowerCase();

  if (normalized.includes('plan')) {
    return [
      'Here is a 45-minute revision plan:',
      '- 5 min: Set goals + formula recall',
      '- 20 min: Learn one core concept deeply',
      '- 10 min: Do past-paper questions',
      '- 10 min: Mark mistakes and write corrections'
    ].join('\n');
  }

  if (normalized.includes('memor') || normalized.includes('remember')) {
    return [
      'Memory method: Active Recall + Spaced Repetition',
      '1) Read one subtopic.',
      '2) Close notes and recite from memory.',
      '3) Check mistakes.',
      '4) Revisit after 1 day, 3 days, and 7 days.'
    ].join('\n');
  }

  if (normalized.includes('physics') || normalized.includes('math') || normalized.includes('biology') || normalized.includes('chemistry')) {
    return 'Great subject choice. I can help with concept summaries, exam-style questions, and a revision timetable. Ask: "make me a weekly plan for chemistry".';
  }

  return 'I can help with: study plans, memory tips, exam-answer structure, and quick quiz prompts. Try asking: "make me a plan for tomorrow".';
}

async function getGeminiReply(prompt) {
  const apiKey = assistantSettings.apiKey;
  if (!apiKey) {
    return 'Please add your Gemini API key in Assistant Settings first, or switch back to Offline mode.';
  }

  const model = assistantSettings.model || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        parts: [
          {
            text: `You are a helpful O-level tutor. Keep explanations clear and exam-focused.\n\nStudent question: ${prompt}`
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return 'Gemini API request failed. You can keep using Offline mode for free.';
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || 'I did not get a response from Gemini. Try again or switch to Offline mode.';
  } catch (_error) {
    return 'Could not reach Gemini API from this browser right now. Offline mode still works.';
  }
}

async function getArkLabsReply(prompt) {
  const apiKey = assistantSettings.apiKey;
  if (!apiKey) {
    return 'Please add your Ark Labs API key in Assistant Settings first, or switch back to Offline mode.';
  }

  const model = assistantSettings.model || 'gpt-4o';
  const endpoint = 'https://api.ark-labs.cloud/api/v1/chat/completions';
  const body = {
    model,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful O-level tutor. Keep explanations concise, exam-focused, and practical.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return 'Ark Labs API request failed. Check your key/model, then try again.';
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return text || 'No text response returned by Ark Labs. Try a different model or prompt.';
  } catch (_error) {
    return 'Could not reach Ark Labs API from this browser right now. Offline mode still works.';
  }
}

function addMessage(text, role) {
  const message = document.createElement('div');
  message.className = `message ${role}`;
  message.textContent = text;
  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = document.getElementById('chat-input');
  const prompt = input.value.trim();
  if (!prompt) return;

  addMessage(prompt, 'user');
  addMessage('Thinking...', 'assistant');

  let reply = '';
  if (assistantSettings.mode === 'gemini') {
    reply = await getGeminiReply(prompt);
  } else if (assistantSettings.mode === 'arklabs') {
    reply = await getArkLabsReply(prompt);
  } else {
    reply = assistantReply(prompt);
  }

  chatLog.lastChild.remove();
  addMessage(reply, 'assistant');
  input.value = '';
});

assistantSettingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  assistantSettings.mode = assistantModeSelect.value;
  assistantSettings.apiKey = apiKeyInput.value.trim();
  assistantSettings.model = assistantModelInput.value.trim();
  localStorage.setItem('studylift-assistant-settings', JSON.stringify(assistantSettings));
  addMessage(`Settings saved. Assistant mode: ${assistantSettings.mode}, model: ${assistantSettings.model || 'default'}.`, 'assistant');
});

function hydrateAssistantSettings() {
  assistantModeSelect.value = assistantSettings.mode || 'offline';
  apiKeyInput.value = assistantSettings.apiKey || '';
  if (assistantSettings.model) {
    assistantModelInput.value = assistantSettings.model;
  } else if (assistantSettings.mode === 'gemini') {
    assistantModelInput.value = 'gemini-2.0-flash';
  } else if (assistantSettings.mode === 'arklabs') {
    assistantModelInput.value = 'gpt-4o';
  } else {
    assistantModelInput.value = '';
  }
}

assistantModeSelect.addEventListener('change', () => {
  if (assistantModeSelect.value === 'gemini' && !assistantModelInput.value) {
    assistantModelInput.value = 'gemini-2.0-flash';
  } else if (assistantModeSelect.value === 'arklabs' && !assistantModelInput.value) {
    assistantModelInput.value = 'gpt-4o';
  } else if (assistantModeSelect.value === 'offline') {
    assistantModelInput.value = '';
  }
});

addMessage('Hi! I am your study assistant. Use Offline mode for no-cost tutoring, Gemini free tier, or Ark Labs with your own key.', 'assistant');
hydrateAssistantSettings();
renderTopics();
