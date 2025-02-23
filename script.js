let correctAnswers = [];
let startTime;
let questionTimes = {};
let currentQuestion = 1;
let subject = '';
let questionOrder = [];

document.addEventListener('DOMContentLoaded', function() {
    toggleOpenEndedInput(); // Ensure open-ended input is shown if Math is preselected
});

document.addEventListener('keydown', function(e) {
    if (document.querySelector('.answer-sheet').style.display === 'block') {
        const key = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D', '1', '2', '3', '4'].includes(key)) {
            const questionInputs = document.querySelectorAll(`input[name="question${currentQuestion}"]`);
            const index = ['1', '2', '3', '4'].includes(key) ? parseInt(key) - 1 : key.charCodeAt(0) - 65;
            questionInputs[index].checked = true;
        }
    }
});

function toggleOpenEndedInput() {
    subject = document.getElementById('subject').value;
    const openEndedContainer = document.getElementById('openEndedContainer');
    if (subject === 'math') {
        openEndedContainer.style.display = 'block';
    } else {
        openEndedContainer.style.display = 'none';
        document.getElementById('numOpenEnded').value = 0;
    }
}

function startTest() {
    const numQuestions = parseInt(document.getElementById('numQuestions').value);
    const numOpenEnded = parseInt(document.getElementById('numOpenEnded').value);
    subject = document.getElementById('subject').value;
    if (numQuestions && subject) {
        document.querySelector('.setup').style.display = 'none';
        // Removed loading animation; show reorder popup immediately
        showReorderPopup(numQuestions, numOpenEnded, subject);
    }
}

function showReorderPopup(numMC, numOpen, subject) {
    questionOrder = [];
    for (let i = 1; i <= numMC; i++) {
        questionOrder.push({ type: 'mc', label: `Multiple Choice Q${i}` });
    }
    for (let i = 1; i <= numOpen; i++) {
        questionOrder.push({ type: 'open', label: `Open-Ended Q${i}` });
    }
    
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
    // Update container styling to match provided theme
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
        // Update item style to follow CSS theme
        item.style.padding = '12px';
        item.style.border = '1px solid #ccc';
        item.style.background = '#f8f9fa';
        item.style.borderRadius = '8px';
        item.style.cursor = 'move';
        item.style.fontFamily = "'Poppins', sans-serif";
        item.style.transition = 'background 0.3s ease';
        item.textContent = q.label;
        
        // Updated drag events for intuitive moving:
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
            e.dataTransfer.effectAllowed = "move";
        });
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
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
            // Remove dragged item and insert based on pointer position
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
    // Update save button style to match provided theme
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
        generateAnswerSheet(numMC, numOpen, subject);
        addNavigationPanel(numMC + numOpen);
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
            item.textContent = q.label;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                e.dataTransfer.effectAllowed = "move";
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
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
                if(e.clientY - rect.top > rect.height / 2) {
                    dropPosition = targetIndex + 1;
                }
                questionOrder.splice(dropPosition, 0, draggedItem);
                refreshDraggableList();
            });
            list.appendChild(item);
        });
    }
}

function addNavigationPanel(numQuestions) {
    const nav = document.querySelector('.navigation-panel .question-jumper');
    nav.innerHTML = Array.from({length: numQuestions}, (_, i) => 
        `<button onclick="jumpToQuestion(${i + 1})" class="jump-btn" id="jump-${i + 1}">${i + 1}</button>`
    ).join('');
}

function toggleNavigation() {
    const nav = document.querySelector('.navigation-panel');
    const toggleBtn = document.querySelector('.navigation-toggle');
    nav.classList.toggle('open');
    toggleBtn.classList.toggle('active');
}

document.addEventListener('click', function(e) {
    const nav = document.querySelector('.navigation-panel');
    const toggleBtn = document.querySelector('.navigation-toggle');
    if (nav.classList.contains('open') && 
        !nav.contains(e.target) && 
        !toggleBtn.contains(e.target)) {
        toggleNavigation();
    }
});

function generateAnswerSheet(numMC, numOpen, subject) {
    const form = document.getElementById('answerForm');
    form.innerHTML = '';
    let overallQuestionNumber = 1;
    
    questionOrder.forEach((q) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-container';
        if (q.type === 'open') {
            questionDiv.classList.add('open-ended');
        }
        
        const label = document.createElement('label');
        label.textContent = 
            q.type === 'mc' 
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
    
    const saveNextBtn = document.createElement('button');
    saveNextBtn.type = 'button';
    saveNextBtn.className = 'save-next-btn';
    saveNextBtn.textContent = 'Save & Next';
    saveNextBtn.onclick = nextQuestion;
    document.body.appendChild(saveNextBtn);

    form.addEventListener('change', updateSaveNextButton);
}

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

    const numQuestions = document.querySelectorAll('.question-container').length;
    if (currentQuestion < numQuestions) {
        jumpToQuestion(currentQuestion + 1);
    }

    if (currentQuestion === numQuestions) {
        updateSaveNextButton();
    }
}

function jumpToQuestion(num) {
    document.querySelectorAll('.question-container').forEach(q => q.style.display = 'none');
    document.querySelector(`.question-container:nth-child(${num})`).style.display = 'block';
    currentQuestion = num;
    updateNavigationHighlight();
    updateSaveNextButton();
}

function updateNavigationHighlight() {
    document.querySelectorAll('.jump-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`jump-${currentQuestion}`).classList.add('active');
}

function reviewAnswers() {
    const answers = [];
    const form = document.getElementById('answerForm');
    const formData = new FormData(form);
    const totalQuestions = document.querySelectorAll('.question-container').length;
    const answeredCount = Array.from(formData.entries()).length;

    let warningMessage = '';
    if (answeredCount < totalQuestions) {
        const unanswered = getUnansweredQuestions();
        warningMessage = `
            <div style="background: #fff3cd; color: #856404; padding: 15px; margin-bottom: 20px; border-radius: 5px; text-align: center;">
                Warning: Question(s) ${unanswered.join(', ')} are not answered. You won't be able to submit until all questions are answered.
            </div>
        `;
    }
    
    for (let [key, value] of formData.entries()) {
        answers.push({
            question: key.replace('question', '').replace('openEnded', ''),
            answer: value
        });
    }

    const reviewHtml = `
        <div class="review-overlay" style="display: flex;">
            <div class="review-container">
                <h2>Review Your Answers</h2>
                ${warningMessage}
                <div class="review-grid">
                    ${answers.map(a => `
                        <div class="review-item">
                            <span class="question">Question ${a.question}</span>
                            <span class="answer">Selected: ${a.answer}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="review-actions">
                    ${answeredCount === totalQuestions ? 
                        '<button onclick="submitFromReview()">Submit Test</button>' : 
                        '<button disabled style="opacity: 0.5; cursor: not-allowed;">Submit Test</button>'}
                    <button onclick="closeReview()">Continue Testing</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', reviewHtml);
}

function submitFromReview() {
    if (!checkAllQuestionsAnswered()) {
        showValidationBanner('Please answer all questions before submitting.');
        return;
    }
    document.querySelector('.review-overlay').remove();
    submitAnswers();
}

function closeReview() {
    document.querySelector('.review-overlay').remove();
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

function submitAnswers() {
    if (!checkAllQuestionsAnswered()) {
        showValidationBanner('Please answer all questions before submitting');
        return;
    }

    document.querySelector('.navigation-toggle').style.display = 'none';
    document.querySelector('.navigation-panel').classList.remove('open');
    
    const reviewBtn = document.querySelector('.review-btn');
    const saveNextBtn = document.querySelector('.save-next-btn');
    if (reviewBtn) reviewBtn.remove();
    if (saveNextBtn) saveNextBtn.remove();

    const form = document.getElementById('answerForm');
    const formData = new FormData(form);
    const answers = [];
    for (let [key, value] of formData.entries()) {
        answers.push(value);
    }

    document.querySelector('.answer-sheet').style.display = 'none';
    showCorrectAnswersPopup(answers.length, answers);
}

function showCorrectAnswersPopup(numQuestions, userAnswers) {
    const form = document.getElementById('correctAnswersForm');
    form.innerHTML = '';
    for (let i = 1; i <= numQuestions; i++) {
        const label = document.createElement('label');
        label.textContent = `Correct answer for question ${i}: `;
        const isOpenEnded = document.querySelector(`textarea[name="openEnded${i}"]`) !== null;
        
        if (isOpenEnded) {
            const input = document.createElement('input');
            input.type = 'text';
            input.name = `correctAnswer${i}`;
            input.required = true;
            input.style.width = '100%';
            form.appendChild(label);
            form.appendChild(input);
        } else {
            const select = document.createElement('select');
            select.name = `correctAnswer${i}`;
            select.required = true;
            ['A', 'B', 'C', 'D'].forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue;
                select.appendChild(option);
            });
            form.appendChild(label);
            form.appendChild(select);
        }
        form.appendChild(document.createElement('br'));
    }
    document.querySelector('.overlay').style.display = 'block';
    document.querySelector('.popup').style.display = 'block';
}

function saveCorrectAnswers() {
    const form = document.getElementById('correctAnswersForm');
    const formData = new FormData(form);
    correctAnswers = [];
    for (let [key, value] of formData.entries()) {
        correctAnswers.push(value);
    }
    document.querySelector('.overlay').style.display = 'none';
    document.querySelector('.popup').style.display = 'none';

    document.querySelector('.loading-results').style.display = 'flex';
    
    setTimeout(() => {
        document.querySelector('.loading-results').style.display = 'none';
        displayResults();
    }, 2000);
}

function displayResults() {
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
    document.getElementById('result-header').innerHTML = `Results (${subject.toUpperCase()})`;
    document.querySelector('.results').style.display = 'block';
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

function calcCalculate() {
    const display = document.getElementById('calc-display');
    try {
        display.value = eval(display.value);
    } catch {
        display.value = 'Error';
    }
}
