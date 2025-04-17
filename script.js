import API_CONFIG from './config.js';

let correctAnswers = [];
let startTime;
let questionTimes = {};
let currentQuestion = 1;
let subject = '';
let questionOrder = [];
let testMode = 'manual';
let gradeLevel = '9';
let aiGeneratedQuestions = [];
let aiGeneratedAnswers = [];

// DOMContentLoaded events to set up the form and event listeners
document.addEventListener('DOMContentLoaded', function () {
  toggleOpenEndedInput();

  document.getElementById('testMode').addEventListener('change', function () {
    const isAutomatic = this.value === 'automatic';
    document.getElementById('gradeLevelContainer').style.display = isAutomatic ? 'block' : 'none';
    document.getElementById('gradeLevel').required = isAutomatic;
  });

  document.getElementById('subject').addEventListener('change', toggleOpenEndedInput);

  document.getElementById('startTestBtn').addEventListener('click', async function () {
    const numQuestions = parseInt(document.getElementById('numQuestions').value);
    const numOpenEnded = parseInt(document.getElementById('numOpenEnded').value);
    subject = document.getElementById('subject').value;
    testMode = document.getElementById('testMode').value;
    gradeLevel = document.getElementById('gradeLevel').value;

    if (!numQuestions || !subject) {
      showValidationBanner('Please fill in all required fields.');
      return;
    }

    if (testMode === 'automatic' && !gradeLevel) {
      showValidationBanner('Please select a grade level for automatic mode.');
      return;
    }

    document.querySelector('.setup').style.display = 'none';
    if (testMode === 'automatic') {
      document.querySelector('.loading').style.display = 'flex';
      const success = await generateQuestionsFromAI();
      document.querySelector('.loading').style.display = 'none';
      if (!success) return;
      showReorderPopup(
        aiGeneratedQuestions.filter(q => q.type === 'mc').length,
        aiGeneratedQuestions.filter(q => q.type === 'open').length,
        subject
      );
    } else {
      showReorderPopup(numQuestions, numOpenEnded, subject);
    }
  });

  toggleOpenEndedInput();
});

function toggleOpenEndedInput() {
  subject = document.getElementById('subject').value;
  const openEndedContainer = document.getElementById('openEndedContainer');
  const gradeLevelContainer = document.getElementById('gradeLevelContainer');

  // Show open-ended input only for Math
  if (subject === 'math') {
    openEndedContainer.style.display = 'block';
  } else {
    openEndedContainer.style.display = 'none';
    document.getElementById('numOpenEnded').value = 0;
  }

  // Ensure grade level selection is visible for automatic mode
  const testMode = document.getElementById('testMode').value;
  gradeLevelContainer.style.display = testMode === 'automatic' ? 'block' : 'none';
}

// Updated generateQuestions function to enforce separate counts for MC and open-ended questions
async function generateQuestions(subject, gradeLevel, numMC, numOpenEnded) {
    const totalQuestions = numMC + numOpenEnded;
    // Updated prompt to request challenging questions.
    const prompt = `Generate exactly ${totalQuestions} challenging ${subject} questions for ${gradeLevel} grade, including ${numMC} multiple-choice questions and ${numOpenEnded} open-ended questions. All questions should be appropriate and challenging for the grade level. Use the following JSON format:
{
  "questions": [
    {
      "question": "Question text here",
      "type": "mc" or "open",
      "options": ["Option A", "Option B", "Option C", "Option D"] (only for "mc"),
      "answer": "Correct answer here"
    }
  ],
  "correctAnswers": ["Correct answer for each question"]
}
Ensure the response is valid JSON and strictly adheres to the format. Do not include any additional text.`;

    try {
        const response = await puter.ai.chat(prompt, {
            model: 'deepseek-chat'
        });

        console.log('Raw AI Response:', response.message?.content); // Log raw response

        if (!response.message?.content) {
            throw new Error('Invalid response from Puter.js');
        }

        // Clean response: remove BOM and extract the JSON object.
        let content = response.message.content.trim();
        content = content.replace(/^\uFEFF/, '');
        // Remove unwanted escapes for characters like ( and )
        content = content.replace(/\\\(/g, '(').replace(/\\\)/g, ')');
        const jsonMatch = content.match(/{[\s\S]*}/);
        if (!jsonMatch) {
            throw new Error('Unable to extract JSON object from response');
        }
        const jsonString = jsonMatch[0];
        const data = JSON.parse(jsonString);

        // Validate the structure of the response
        if (!Array.isArray(data.questions) || !Array.isArray(data.correctAnswers)) {
            throw new Error('Response JSON does not have the required structure');
        }

        const openEndedCount = data.questions.filter(q => q.type === 'open').length;
        const mcCount = data.questions.filter(q => q.type === 'mc').length;
        if (openEndedCount !== numOpenEnded || mcCount !== numMC) {
            throw new Error(`Response does not meet the required question distribution: ${numMC} multiple-choice and ${numOpenEnded} open-ended questions.`);
        }

        // Ensure all MC questions have exactly 4 options
        const invalidMCQuestions = data.questions.filter(q => q.type === 'mc' && (!q.options || q.options.length !== 4));
        if (invalidMCQuestions.length > 0) {
            throw new Error('Some multiple-choice questions are missing options or do not have exactly 4 options.');
        }
        return data;
    } catch (error) {
        console.error('Error generating questions:', error);
        throw error;
    }
}

// Updated generateQuestionsFromAI function to pass separate counts for MC and open-ended questions
async function generateQuestionsFromAI() {
    try {
        const subject = document.getElementById('subject').value;
        gradeLevel = document.getElementById('gradeLevel').value;
        const numMC = parseInt(document.getElementById('numQuestions').value);
        const numOpenEnded = parseInt(document.getElementById('numOpenEnded').value);
        console.log(`Generating ${numMC} multiple-choice and ${numOpenEnded} open-ended ${subject} questions for grade ${gradeLevel} using Puter.js`);
        const data = await generateQuestions(subject, gradeLevel, numMC, numOpenEnded);
        if (!data.questions || !data.correctAnswers) {
            throw new Error('Generated content is missing questions or answers');
        }
        aiGeneratedQuestions = data.questions;
        aiGeneratedAnswers = data.correctAnswers;
        return true;
    } catch (error) {
        console.error('AI Generation Error:', error);
        showValidationBanner(`Failed to generate questions: ${error.message}`);
        return false;
    }
}

// NEW: Function to check an open-ended answer by sending the question and answer back to the AI.
async function checkOpenEndedAnswer(question, studentAnswer) {
  const prompt = `Is the following answer to the question correct?
Question: ${question}
Student Answer: ${studentAnswer}
Respond with a JSON object exactly like:
{"isCorrect": true} 
or 
{"isCorrect": false}`;
  try {
    const response = await puter.ai.chat(prompt, { model: 'deepseek-chat', temperature: 0.3 });
    let content = response.message.content.trim();
    const jsonMatch = content.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error('Invalid answer check response');
    }
    const data = JSON.parse(jsonMatch[0]);
    return data.isCorrect;
  } catch (error) {
    console.error('Error checking open ended answer:', error);
    return false;
  }
}

// Updated gradeAnswers function to validate student answers
async function gradeAnswers(answers, subject, gradeLevel) {
    const prompt = `For each of the following questions and answers, determine if the student's answer is correct. Provide the results in JSON format:
{
  "results": [
    {
      "question": "Question text here",
      "studentAnswer": "Student's answer here",
      "correctAnswer": "Correct answer here",
      "isCorrect": true or false
    }
  ]
}
Questions and answers: ${JSON.stringify(answers)}`;
    try {
        const response = await puter.ai.chat(prompt, {
            model: 'deepseek-chat' // Use DeepSeek Chat model
        });

        console.log('Raw AI Response for Grading:', response.message?.content); // Log raw response for debugging

        if (!response.message?.content) {
            throw new Error('Invalid response from Puter.js');
        }

        // Validate and parse the response
        const content = response.message.content.trim();
        if (!content.startsWith('{') || !content.endsWith('}')) {
            throw new Error('Response is not in valid JSON format');
        }

        const data = JSON.parse(content);
        return data;
    } catch (error) {
        console.error('Error grading answers:', error);
        throw error;
    }
}

function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j == 1 && k != 11) return 'st';
  if (j == 2 && k != 12) return 'nd';
  if (j == 3 && k != 13) return 'rd';
  return 'th';
}

function showReorderPopup(numMC, numOpen, subject) {
  // Build questionOrder based on given counts
  questionOrder = [];
  for (let i = 1; i <= numMC; i++) {
    questionOrder.push({ type: 'mc', label: `Multiple Choice Q${i}` });
  }
  for (let i = 1; i <= numOpen; i++) {
    questionOrder.push({ type: 'open', label: `Open-Ended Q${i}` });
  }

  // Create a popup for reordering questions
  const popup = document.createElement('div');
  popup.id = 'reorderPopup';
  popup.style.position = 'fixed';
  popup.style.top = '0';
  popup.style.left = '0';
  popup.style.width = '100%';
  popup.style.height = '100%';
  popup.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  popup.style.display = 'flex';
  popup.style.justifyContent = 'center';
  popup.style.alignItems = 'center';
  popup.style.zIndex = '1000';

  const container = document.createElement('div');
  container.style.width = '90%';
  container.style.maxWidth = '400px';
  container.style.background = '#ffffff';
  container.style.padding = '30px';
  container.style.borderRadius = '10px';
  container.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.1)';
  container.style.textAlign = 'center';
  container.style.fontFamily = "'Poppins', sans-serif";

  container.innerHTML = '<h3 style="margin-top:0;">Reorder Questions</h3><p>Drag and drop to arrange the order.</p>';

  const list = document.createElement('div');
  list.id = 'draggableList';
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '8px';
  list.style.margin = '20px 0';
  list.style.maxHeight = '260px';
  list.style.overflowY = 'auto';

  questionOrder.forEach((q, index) => {
    const item = document.createElement('div');
    item.className = 'draggableItem';
    item.draggable = true;
    item.dataset.index = index;
    item.style.padding = '12px';
    item.style.border = '1px solid #ccc';
    item.style.background = '#f8f9fa';
    item.style.borderRadius = '8px';
    item.style.cursor = 'move';
    item.style.fontFamily = "'Poppins', sans-serif";
    item.style.transition = 'background 0.3s ease';
    item.textContent = `Question ${index + 1} - ${q.type === 'mc' ? 'Multiple Choice' : 'Open Ended'}`;

    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      item.style.background = '#e9ecef';
    });
    item.addEventListener('dragleave', () => {
      item.style.background = '#f8f9fa';
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const targetIndex = parseInt(item.dataset.index, 10);
      if (draggedIndex === targetIndex) return;
      const draggedItem = questionOrder.splice(draggedIndex, 1)[0];
      const rect = item.getBoundingClientRect();
      let dropPosition = targetIndex;
      if (e.clientY - rect.top > rect.height / 2) {
        dropPosition = targetIndex + 1;
      }
      questionOrder.splice(dropPosition, 0, draggedItem);
      refreshDraggableList();
    });
    list.appendChild(item);
  });

  container.appendChild(list);
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save Order';
  saveBtn.style.background = '#007bff';
  saveBtn.style.color = '#fff';
  saveBtn.style.border = 'none';
  saveBtn.style.padding = '12px';
  saveBtn.style.borderRadius = '5px';
  saveBtn.style.cursor = 'pointer';
  saveBtn.style.fontFamily = "'Poppins', sans-serif";
  saveBtn.style.fontSize = '16px';
  saveBtn.onclick = () => {
    document.body.removeChild(popup);
    generateAnswerSheet(
      questionOrder.filter(q => q.type === 'mc').length,
      questionOrder.filter(q => q.type === 'open').length,
      subject
    );
    addNavigationPanel(questionOrder.length);
    document.querySelector('.navigation-toggle').style.display = 'flex';
    document.querySelector('.answer-sheet').style.display = 'block';
    jumpToQuestion(1);
    if (subject === 'math') {
      document.getElementById('calculator').style.display = 'block';
    }
  };
  container.appendChild(saveBtn);
  popup.appendChild(container);
  document.body.appendChild(popup);

  function refreshDraggableList() {
    list.innerHTML = '';
    questionOrder.forEach((q, index) => {
      const item = document.createElement('div');
      item.className = 'draggableItem';
      item.draggable = true;
      item.dataset.index = index;
      item.style.padding = '12px';
      item.style.border = '1px solid #ccc';
      item.style.background = '#f8f9fa';
      item.style.borderRadius = '8px';
      item.style.cursor = 'move';
      item.style.fontFamily = "'Poppins', sans-serif";
      item.style.transition = 'background 0.3s ease';
      item.textContent = `Question ${index + 1} - ${q.type === 'mc' ? 'Multiple Choice' : 'Open Ended'}`;

      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', index);
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.style.background = '#e9ecef';
      });
      item.addEventListener('dragleave', () => {
        item.style.background = '#f8f9fa';
      });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const targetIndex = parseInt(item.dataset.index, 10);
        if (draggedIndex === targetIndex) return;
        const draggedItem = questionOrder.splice(draggedIndex, 1)[0];
        const rect = item.getBoundingClientRect();
        let dropPosition = targetIndex;
        if (e.clientY - rect.top > rect.height / 2) {
          dropPosition = targetIndex + 1;
        }
        questionOrder.splice(dropPosition, 0, draggedItem);
        refreshDraggableList();
      });
      list.appendChild(item);
    });
  }
}

// New helper to get question title for sidebar tooltips
function getQuestionTitle(index) {
    if (testMode === 'automatic' && aiGeneratedQuestions && aiGeneratedQuestions[index]) {
        return aiGeneratedQuestions[index].question;
    }
    return "Question " + (index + 1);
}

// Updated addNavigationPanel to include tooltips with question text
function addNavigationPanel(numQuestions) {
    const nav = document.querySelector('.navigation-panel .question-jumper');
    nav.innerHTML = Array.from({ length: numQuestions }, (_, i) =>
        `<button onclick="jumpToQuestion(${i + 1})" class="jump-btn" id="jump-${i + 1}" title="${getQuestionTitle(i)}">${i + 1}</button>`
    ).join('');
}

// FIXED jumpToQuestion to correctly display the corresponding question container
function jumpToQuestion(num) {
    const containers = document.querySelectorAll('.question-container');
    containers.forEach((q, index) => {
        q.style.display = (index === num - 1) ? 'block' : 'none';
    });
    currentQuestion = num;
    updateNavigationHighlight();
    updateSaveNextButton();
}

// FIXED prevQuestion and nextQuestion to correctly navigate between questions
function prevQuestion() {
  if (currentQuestion > 1) {
    jumpToQuestion(currentQuestion - 1);
  }
}

function nextQuestion() {
  const currentInput = document.querySelector(`input[name="question${currentQuestion}"]:checked`);
  const currentTextarea = document.querySelector(`textarea[name="openEnded${currentQuestion}"]`);
  if (!currentInput && (!currentTextarea || currentTextarea.value.trim() === '')) {
    showValidationBanner();
    return;
  }
  const totalQuestions = document.querySelectorAll('.question-container').length;
  if (currentQuestion < totalQuestions) {
    jumpToQuestion(currentQuestion + 1);
  }
  if (currentQuestion === totalQuestions) {
    updateSaveNextButton();
  }
}

// FIXED reviewAnswers to include consistent styling and a "Submit" button
function reviewAnswers() {
  const overlay = document.createElement('div');
  overlay.className = 'review-overlay';
  overlay.style.display = 'flex';

  const reviewContainer = document.createElement('div');
  reviewContainer.className = 'review-container';
  reviewContainer.innerHTML = '<h2>Review Your Answers</h2>';

  const form = document.getElementById('answerForm');
  const questions = form.querySelectorAll('.question-container');
  questions.forEach((q, idx) => {
    const questionText = q.querySelector('label').textContent;
    const answerInput = q.querySelector('input:checked, textarea');
    const studentAnswer = answerInput ? answerInput.value : 'Not answered';

    const div = document.createElement('div');
    div.className = 'review-item';
    div.innerHTML = `
      <strong>${idx + 1}. ${questionText}</strong>
      <p>Your Answer: <span>${studentAnswer}</span></p>
    `;
    reviewContainer.appendChild(div);
  });

  // Add "Submit" and "Close" buttons
  const actions = document.createElement('div');
  actions.className = 'review-actions';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close Review';
  closeButton.onclick = () => overlay.remove();

  const submitButton = document.createElement('button');
  submitButton.textContent = 'Submit Test';
  submitButton.onclick = () => {
    overlay.remove();
    submitAnswers();
  };

  actions.appendChild(closeButton);
  actions.appendChild(submitButton);
  reviewContainer.appendChild(actions);

  overlay.appendChild(reviewContainer);
  document.body.appendChild(overlay);
}

function generateAnswerSheet(numMC, numOpen, subject) {
  const form = document.getElementById('answerForm');
  form.innerHTML = '';
  let overallQuestionNumber = 1;

  if (testMode === 'automatic') {
    aiGeneratedQuestions.forEach((q, index) => {
      const questionDiv = document.createElement('div');
      questionDiv.className = 'question-container';
      if (q.type === 'open') questionDiv.classList.add('open-ended');

      const label = document.createElement('label');
      label.textContent = q.question;
      questionDiv.appendChild(label);

      if (q.type === 'mc') {
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options-container';
        q.options.forEach((option, optIndex) => {
          const optionLabel = document.createElement('label');
          optionLabel.className = 'option-label';

          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = `question${index + 1}`;
          radio.value = String.fromCharCode(65 + optIndex);
          radio.required = true;

          const span = document.createElement('span');
          span.textContent = option;

          optionLabel.appendChild(radio);
          optionLabel.appendChild(span);
          optionsDiv.appendChild(optionLabel);
        });
        questionDiv.appendChild(optionsDiv);
      } else {
        const textarea = document.createElement('textarea');
        textarea.name = `openEnded${index + 1}`;
        textarea.required = true;
        questionDiv.appendChild(textarea);
      }
      form.appendChild(questionDiv);
    });
  } else {
    questionOrder.forEach((q) => {
      const questionDiv = document.createElement('div');
      questionDiv.className = 'question-container';
      if (q.type === 'open') {
        questionDiv.classList.add('open-ended');
      }

      const label = document.createElement('label');
      label.textContent = q.type === 'mc'
        ? `Question ${overallQuestionNumber} (${subject.toUpperCase()}): `
        : `Open-Ended Question ${overallQuestionNumber} (${subject.toUpperCase()}): `;
      questionDiv.appendChild(label);

      if (q.type === 'mc') {
        const options = ['A', 'B', 'C', 'D'];
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options-container';
        options.forEach(option => {
          const optionLabel = document.createElement('label');
          optionLabel.className = 'option-label';

          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = `question${overallQuestionNumber}`;
          radio.value = option;
          radio.required = true;

          const span = document.createElement('span');
          span.textContent = option;

          optionLabel.appendChild(radio);
          optionLabel.appendChild(span);
          optionsDiv.appendChild(optionLabel);
        });
        questionDiv.appendChild(optionsDiv);
      } else if (q.type === 'open') {
        const textarea = document.createElement('textarea');
        textarea.name = `openEnded${overallQuestionNumber}`;
        textarea.required = true;
        questionDiv.appendChild(textarea);
      }

      form.appendChild(questionDiv);
      overallQuestionNumber++;
    });
  }

  const saveNextBtn = document.createElement('button');
  saveNextBtn.type = 'button';
  saveNextBtn.className = 'save-next-btn';
  saveNextBtn.textContent = 'Save & Next';
  saveNextBtn.onclick = nextQuestion;
  document.body.appendChild(saveNextBtn);

  form.addEventListener('change', updateSaveNextButton);
}

function updateSaveNextButton() {
  const form = document.getElementById('answerForm');
  const formData = new FormData(form);
  const answers = Array.from(formData.entries());
  const totalQuestions = document.querySelectorAll('.question-container').length;
  const saveNextBtn = document.querySelector('.save-next-btn');
  if (!saveNextBtn) return;
  const answeredQuestions = new Set();
  answers.forEach(([key, value]) => {
    if (value.trim() !== '') {
      answeredQuestions.add(parseInt(key.replace('question', '').replace('openEnded', '')));
    }
  });
  if (answeredQuestions.size === totalQuestions) {
    saveNextBtn.textContent = 'Review Answers';
    saveNextBtn.classList.add('review');
    saveNextBtn.onclick = reviewAnswers;
  } else {
    saveNextBtn.textContent = 'Save & Next';
    saveNextBtn.classList.remove('review');
    saveNextBtn.onclick = nextQuestion;
  }
}

// NEW: Generate correct answers form (separate page) based on questionOrder.
function generateCorrectAnswersForm() {
  const container = document.getElementById('correctAnswersContainer');
  const form = document.getElementById('correctAnswersForm');
  form.innerHTML = ""; // Clear previous content
  // Hide the review answers button if present
  const reviewBtn = document.querySelector('.review-btn');
  if (reviewBtn) reviewBtn.style.display = 'none';
  // Also hide it from the DOM so it cannot be tabbed to or shown again
  if (reviewBtn && reviewBtn.parentNode) reviewBtn.parentNode.removeChild(reviewBtn);
  questionOrder.forEach((q, i) => {
    const div = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = `Correct Answer for Question ${i + 1}:`;
    div.appendChild(label);
    if(q.type === 'mc'){
      // For MC, use a dropdown (<select>) with options A-D.
      const select = document.createElement('select');
      select.name = `correctAnswer${i+1}`;
      select.required = true;
      ['A', 'B', 'C', 'D'].forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
      });
      div.appendChild(select);
    } else {
      // For open-ended, generate a text input.
      const input = document.createElement('input');
      input.type = 'text';
      input.required = true;
      input.name = `correctAnswer${i+1}`;
      div.appendChild(input);
    }
    form.appendChild(div);
  });
}

// Modify submitAnswers for manual mode to show the separate correct-answers page.
async function submitAnswers() {
  if (!checkAllQuestionsAnswered()) {
    showValidationBanner('Please answer all questions before submitting');
    return;
  }
  const form = document.getElementById('answerForm');
  const formData = new FormData(form);
  const answersArr = [];
  for (let [key, value] of formData.entries()) {
    answersArr.push(value);
  }

  if (testMode === 'automatic') {
    const answers = Array.from(formData.entries()).map(([key, value]) => ({
      questionIndex: parseInt(key.replace(/\D/g, '')) - 1,
      answer: value,
      isOpenEnded: key.startsWith('openEnded'),
      question: aiGeneratedQuestions[parseInt(key.replace(/\D/g, '')) - 1].question
    }));

    // For MC: match answer to choice letter (A/B/C/D) by comparing to options
    const mcResults = answers.filter(a => !a.isOpenEnded).map(a => {
      const q = aiGeneratedQuestions[a.questionIndex];
      let correctLetter = '';
      if (q && q.options && q.answer) {
        const idx = q.options.findIndex(opt => opt.trim() === q.answer.trim());
        if (idx !== -1) correctLetter = String.fromCharCode(65 + idx);
      }
      return {
        ...a,
        correct: a.answer === correctLetter,
        correctLetter
      };
    });

    const openEndedAnswers = answers.filter(a => a.isOpenEnded);
    let openEndedCorrects = [];
    if (openEndedAnswers.length > 0) {
      for (const ans of openEndedAnswers) {
        const isCorrect = await checkOpenEndedAnswer(ans.question, ans.answer);
        openEndedCorrects.push(isCorrect ? ans.answer : aiGeneratedAnswers[ans.questionIndex]);
      }
    }
    correctAnswers = [
      ...mcResults.map(r => r.correct ? r.answer : r.correctLetter),
      ...openEndedCorrects
    ];
    displayResults();
  } else {
    // MANUAL mode: hide the test taker page and also hide nav elements
    generateCorrectAnswersForm();
    document.querySelector('.answer-sheet').style.display = 'none';
    // Hide sidebar toggle and panel
    document.querySelector('.navigation-toggle').style.display = 'none';
    document.querySelector('.navigation-panel').style.display = 'none';
    document.getElementById('correctAnswersContainer').style.display = 'block';
    window.manualAnswersArr = answersArr;
  }
}

// NEW: Read correct answers from the separate correct answers page then display analytics.
function saveCorrectAnswers() {
  const form = document.getElementById('correctAnswersForm');
  const inputs = new FormData(form);
  const manualCorrects = [];
  // Use questionOrder length to ensure order.
  for (let i = 1; i <= questionOrder.length; i++) {
    manualCorrects.push(inputs.get(`correctAnswer${i}`));
  }
  correctAnswers = manualCorrects;
  // Restore review answers button for next test session
  const reviewBtn = document.querySelector('.review-btn');
  if (reviewBtn) reviewBtn.style.display = '';
  // Hide the correct answers page and display analytics page.
  document.getElementById('correctAnswersContainer').style.display = 'none';
  displayResults();
}

async function generateAutomaticAnswers() {
  const form = document.getElementById('answerForm');
  const formData = new FormData(form);
  const answers = Array.from(formData.values());
  try {
    document.querySelector('.loading-results').style.display = 'flex';
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.check}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.key}`
      },
      body: JSON.stringify({
        answers,
        subject,
        gradeLevel
      })
    });
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    correctAnswers = data.correctAnswers;
    document.querySelector('.loading-results').style.display = 'none';
    displayResults();
  } catch (error) {
    console.error('Failed to generate automatic answers:', error);
    showValidationBanner('Failed to generate answers. Please try again.');
  }
}

function showValidationBanner(message = 'Please answer the question before proceeding.') {
  const banner = document.getElementById('validationBanner');
  banner.textContent = message;
  banner.style.display = 'block';
  setTimeout(() => {
    banner.style.display = 'none';
  }, 5000);
}

function checkAllQuestionsAnswered() {
  const totalQuestions = document.querySelectorAll('.question-container').length;
  const answeredQuestions = new Set();
  new FormData(document.getElementById('answerForm')).forEach((value, key) => {
    if (value.trim() !== '') {
      answeredQuestions.add(parseInt(key.replace('question', '').replace('openEnded', '')));
    }
  });
  return totalQuestions === answeredQuestions.size;
}

function getUnansweredQuestions() {
  const totalQuestions = document.querySelectorAll('.question-container').length;
  const answered = new Set();
  new FormData(document.getElementById('answerForm')).forEach((value, key) => {
    if (value.trim() !== '') {
      answered.add(parseInt(key.replace('question', '').replace('openEnded', '')));
    }
  });
  const unanswered = [];
  for (let i = 1; i <= totalQuestions; i++) {
    if (!answered.has(i)) {
      unanswered.push(i);
    }
  }
  return unanswered;
}

// Updated calcCalculate: use eval() instead of math.evaluate to compute the expression.
function calcCalculate() {
    const display = document.getElementById('calc-display');
    try {
        display.value = eval(display.value);
    } catch {
        display.value = 'Error';
    }
}

function calcInput(value) {
    const display = document.getElementById('calc-display');
    display.value += value;
}

function calcClear() {
    const display = document.getElementById('calc-display');
    display.value = '';
}

function calcBackspace() {
    const display = document.getElementById('calc-display');
    display.value = display.value.slice(0, -1);
}

function displayResults() {
  // Implement displayResults to update the DOM with the test results.
  const form = document.getElementById('answerForm');
  const formData = new FormData(form);
  const answers = [];
  for (let [key, value] of formData.entries()) {
    answers.push(value);
  }
  let score = 0;
  let details = '';
  let statistics = {
    correct: 0,
    incorrect: 0,
    byOption: { A: 0, B: 0, C: 0, D: 0 }
  };

  answers.forEach((answer, index) => {
    if (answer === correctAnswers[index]) {
      score++;
      statistics.correct++;
      if (['A', 'B', 'C', 'D'].includes(answer)) {
        statistics.byOption[answer]++;
      }
    } else {
      statistics.incorrect++;
      if (['A', 'B', 'C', 'D'].includes(answer)) {
        statistics.byOption[answer]++;
      }
      details += `
        <div class="wrong-answer">
            <span class="question-number">Question ${index + 1}:</span>
            <span class="correct">Correct: ${correctAnswers[index]}</span>
            <span class="your-answer">Your answer: ${answer}</span>
        </div>
      `;
    }
  });

  const percentage = (score / answers.length) * 100;
  document.getElementById('score').innerHTML = `
    <h2>Your Score: ${score}/${answers.length} (${percentage.toFixed(1)}%)</h2>
    <div class="progress-bar">
      <div class="progress" style="width: ${percentage}%"></div>
    </div>
  `;
  const statisticsHtml = `
    <div class="statistics-container">
      <h3>Statistics</h3>
      <p>Correct Answers: ${statistics.correct}</p>
      <p>Incorrect Answers: ${statistics.incorrect}</p>
      <h4>Answer Distribution:</h4>
      <p>A: ${statistics.byOption.A} times</p>
      <p>B: ${statistics.byOption.B} times</p>
      <p>C: ${statistics.byOption.C} times</p>
      <p>D: ${statistics.byOption.D} times</p>
    </div>
  `;
  document.getElementById('details').innerHTML = details + statisticsHtml;
  document.getElementById('result-header').innerText = `Results (${subject.toUpperCase()})`;

  // Add overlay behind results popup to block background
  let overlay = document.querySelector('.results-active-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'results-active-overlay';
    document.body.appendChild(overlay);
  } else {
    overlay.style.display = 'block';
  }

  document.querySelector('.results').style.display = 'block';
  // Hide sidebar toggle and panel when analytics are shown.
  const navToggle = document.querySelector('.navigation-toggle');
  const navPanel = document.querySelector('.navigation-panel');
  if (navToggle) navToggle.style.display = 'none';
  if (navPanel) navPanel.style.display = 'none';
}

// Add missing helper functions:
function updateNavigationHighlight() {
    document.querySelectorAll('.jump-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`jump-${currentQuestion}`);
    if (activeBtn) activeBtn.classList.add('active');
}

function showCorrectAnswersPopup(totalQuestions, answersArr) {
    const overlay = document.createElement('div');
    overlay.className = 'review-overlay';
    overlay.style.display = 'flex';
    const reviewContainer = document.createElement('div');
    reviewContainer.className = 'review-container';
    reviewContainer.innerHTML = '<h2>Correct Answers</h2>';
    for (let i = 0; i < totalQuestions; i++) {
        const div = document.createElement('div');
        div.className = 'review-item';
        div.innerHTML = `
          <strong>Question ${i + 1}:</strong>
          <p>Your Answer: <span>${answersArr[i]}</span></p>
          <p>Correct Answer: <span>${correctAnswers[i]}</span></p>
        `;
        reviewContainer.appendChild(div);
    }
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.onclick = () => overlay.remove();
    reviewContainer.appendChild(closeButton);
    overlay.appendChild(reviewContainer);
    document.body.appendChild(overlay);
}

// Expose functions that are referenced in the HTML so they are available globally.
window.toggleOpenEndedInput = toggleOpenEndedInput;
window.toggleNavigation = function() {
  const nav = document.querySelector('.navigation-panel');
  const toggleBtn = document.querySelector('.navigation-toggle');
  nav.classList.toggle('open');
  toggleBtn.classList.toggle('active');
};
window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.reviewAnswers = reviewAnswers;
window.submitAnswers = submitAnswers;
window.calcInput = calcInput;
window.calcClear = calcClear;
window.calcBackspace = calcBackspace;
window.calcCalculate = calcCalculate;
window.jumpToQuestion = jumpToQuestion;
window.saveCorrectAnswers = saveCorrectAnswers;
