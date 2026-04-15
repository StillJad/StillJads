const topicForm = document.getElementById('topic-form');
const studyList = document.getElementById('study-list');
const quizForm = document.getElementById('quiz-form');
const quizOutput = document.getElementById('quiz-output');
const chatForm = document.getElementById('chat-form');
const chatLog = document.getElementById('chat-log');

const savedTopics = JSON.parse(localStorage.getItem('studylift-topics') || '[]');

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

function addMessage(text, role) {
  const message = document.createElement('div');
  message.className = `message ${role}`;
  message.textContent = text;
  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('chat-input');
  const prompt = input.value.trim();
  if (!prompt) return;

  addMessage(prompt, 'user');
  const reply = assistantReply(prompt);
  setTimeout(() => addMessage(reply, 'assistant'), 250);
  input.value = '';
});

addMessage('Hi! I am your free study assistant. Ask me for revision plans or memory tips.', 'assistant');
renderTopics();
