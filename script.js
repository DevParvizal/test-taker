let correctAnswers = [];
        let startTime;
        let questionTimes = {};
        let currentQuestion = 1;
        let subject = '';

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
                document.querySelector('.loading').style.display = 'flex';
                
                setTimeout(() => {
                    document.querySelector('.loading').style.display = 'none';
                    generateAnswerSheet(numQuestions, numOpenEnded, subject);
                    addNavigationPanel(numQuestions + numOpenEnded);
                    // Show navigation toggle after loading is complete
                    document.querySelector('.navigation-toggle').style.display = 'flex';
                    document.querySelector('.answer-sheet').style.display = 'block';
                    jumpToQuestion(1);

                    // Show calculator if subject is Math
                    if (subject === 'math') {
                        document.getElementById('calculator').style.display = 'block';
                    }
                }, 4000);
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

        // Close navigation when clicking outside
        document.addEventListener('click', function(e) {
            const nav = document.querySelector('.navigation-panel');
            const toggleBtn = document.querySelector('.navigation-toggle');
            if (nav.classList.contains('open') && 
                !nav.contains(e.target) && 
                !toggleBtn.contains(e.target)) {
                toggleNavigation();
            }
        });

        function generateAnswerSheet(numQuestions, numOpenEnded, subject) {
            const form = document.getElementById('answerForm');
            form.innerHTML = '';
            let questionNumber = 1;

            for (let i = 1; i <= numQuestions; i++, questionNumber++) {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-container';
                
                const label = document.createElement('label');
                label.textContent = `Question ${questionNumber} (${subject.toUpperCase()}): `;
                
                const options = ['A', 'B', 'C', 'D'];
                const optionsDiv = document.createElement('div');
                optionsDiv.className = 'options-container';
                
                options.forEach(option => {
                    const optionLabel = document.createElement('label');
                    optionLabel.className = 'option-label';
                    
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = `question${questionNumber}`;
                    radio.value = option;
                    radio.required = true;
                    
                    const span = document.createElement('span');
                    span.textContent = option;
                    
                    optionLabel.appendChild(radio);
                    optionLabel.appendChild(span);
                    optionsDiv.appendChild(optionLabel);
                });
                
                questionDiv.appendChild(label);
                questionDiv.appendChild(optionsDiv);
                form.appendChild(questionDiv);
            }

            for (let i = 1; i <= numOpenEnded; i++, questionNumber++) {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-container open-ended';
                
                const label = document.createElement('label');
                label.textContent = `Open-Ended Question ${questionNumber} (${subject.toUpperCase()}): `;
                
                const textarea = document.createElement('textarea');
                textarea.name = `openEnded${questionNumber}`;
                textarea.required = true;
                
                questionDiv.appendChild(label);
                questionDiv.appendChild(textarea);
                form.appendChild(questionDiv);
            }

            // Add save/next button
            const saveNextBtn = document.createElement('button');
            saveNextBtn.type = 'button';
            saveNextBtn.className = 'save-next-btn';
            saveNextBtn.textContent = 'Save & Next';
            saveNextBtn.onclick = nextQuestion;
            document.body.appendChild(saveNextBtn);

            // Add change event listener to update button
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

            // Update button text if on the last question
            if (currentQuestion === numQuestions) {
                updateSaveNextButton();
            }
        }

        function jumpToQuestion(num) {
            document.querySelectorAll('.question-container').forEach(q => q.style.display = 'none');
            document.querySelector(`.question-container:nth-child(${num})`).style.display = 'block';
            currentQuestion = num;
            updateNavigationHighlight();
            updateSaveNextButton(); // Ensure button text is updated when jumping to a question
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

            // Create warning message if not all questions are answered
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
            
            if (!saveNextBtn) return; // Guard clause if button doesn't exist
            
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

            // Hide navigation elements
            document.querySelector('.navigation-toggle').style.display = 'none';
            document.querySelector('.navigation-panel').classList.remove('open');
            
            // Remove buttons that might cause glitches
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

            // Hide answer sheet and directly show correct answers popup
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
                    input.style.width = '100%'; // Match the width of the dropdown
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

            // Show loading results animation
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