/**
 * TCS NQT Prep — Full Paper Mock Test Engine (js/test.js)
 * 3-Hour Countdown Timer, Question Palette, Persistent State, Review & Mistakes Recording
 */

const TOTAL_TIME_SECONDS = 3 * 60 * 60; // 180 minutes = 10800 seconds

const TestEngine = {
  currentPaper: null,
  allQuestions: [], // flattened questions with section info
  currentIndex: 0,
  userResponses: {}, // { [questionIndex]: optionIndex }
  markedForReview: new Set(),
  remainingSeconds: TOTAL_TIME_SECONDS,
  timerInterval: null,
  startTime: null,

  init() {
    Storage.updateStreak();
    const params = new URLSearchParams(window.location.search);
    const paperId = params.get('paper');

    if (paperId) {
      const found = QUESTION_BANK.papers.find(p => p.id === paperId);
      if (found) {
        this.selectPaper(found);
      } else {
        this.renderPapersList();
      }
    } else {
      this.renderPapersList();
    }
  },

  renderPapersList() {
    this.hideAll();
    document.getElementById('screen-select-paper').classList.remove('hidden');

    const container = document.getElementById('papers-list-grid');
    if (!container) return;

    const history = Storage.getTestHistory();

    container.innerHTML = QUESTION_BANK.papers.map(p => {
      let qCount = 0;
      const sectionNames = [];
      if (p.sections) {
        p.sections.forEach(s => {
          qCount += (s.questions ? s.questions.length : 0);
          sectionNames.push(`${s.name} (${s.questions?.length || 0})`);
        });
      }

      const pastAttempts = history.filter(h => h.paperId === p.id);
      const best = pastAttempts.length > 0 ? Math.max(...pastAttempts.map(h => h.percentage)) : null;
      const savedTimer = Storage.getTimerState(p.id);

      return `
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
              <h3 style="font-size:1.15rem; color:var(--text);">${escapeHtml(p.name)}</h3>
              <span class="badge badge-info">${qCount} Qs</span>
            </div>
            
            <div style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:1rem;">
              <strong>Sections:</strong> ${sectionNames.join(', ')}
            </div>

            ${best !== null ? `
              <div style="margin-bottom:1rem; font-size:0.85rem;">
                <span style="color:var(--text-secondary);">Best Attempt:</span> 
                <span class="badge ${best >= 70 ? 'badge-success' : 'badge-warning'}">${best}%</span>
              </div>
            ` : ''}
          </div>

          <div style="display:flex; gap:0.75rem; margin-top:1rem;">
            ${savedTimer && savedTimer.remaining > 0 ? `
              <button class="btn btn-warning" style="flex:1;" onclick="TestEngine.resumePaper('${p.id}')">
                Resume (${Math.floor(savedTimer.remaining / 60)}m left)
              </button>
            ` : ''}
            <a href="test.html?paper=${p.id}" class="btn btn-primary" style="flex:1; text-align:center;">
              ${savedTimer ? 'Restart' : 'Start Mock Exam'}
            </a>
          </div>
        </div>
      `;
    }).join('');
  },

  selectPaper(paper) {
    this.currentPaper = paper;
    this.flattenQuestions(paper);

    // Check if there's a saved timer
    const saved = Storage.getTimerState(paper.id);
    if (saved && saved.remaining > 0) {
      this.remainingSeconds = Math.max(0, saved.remaining - Math.floor((Date.now() - saved.savedAt) / 1000));
    } else {
      this.remainingSeconds = TOTAL_TIME_SECONDS;
    }

    this.hideAll();
    const confirmScreen = document.getElementById('screen-start-confirm');
    confirmScreen.classList.remove('hidden');

    document.getElementById('confirm-paper-name').textContent = paper.name;
    document.getElementById('confirm-q-count').textContent = this.allQuestions.length;
  },

  resumePaper(paperId) {
    const found = QUESTION_BANK.papers.find(p => p.id === paperId);
    if (found) {
      this.currentPaper = found;
      this.flattenQuestions(found);
      const saved = Storage.getTimerState(paperId);
      if (saved) {
        this.remainingSeconds = Math.max(0, saved.remaining - Math.floor((Date.now() - saved.savedAt) / 1000));
      }
      this.startActualTest();
    }
  },

  flattenQuestions(paper) {
    this.allQuestions = [];
    if (paper.sections) {
      paper.sections.forEach(s => {
        (s.questions || []).forEach(q => {
          this.allQuestions.push({
            ...q,
            sectionName: s.name
          });
        });
      });
    }
  },

  backToPapers() {
    window.location.href = 'test.html';
  },

  startActualTest() {
    this.hideAll();
    document.getElementById('screen-test-active').classList.remove('hidden');

    document.getElementById('test-title-active').textContent = this.currentPaper.name;
    this.currentIndex = 0;
    this.userResponses = Storage.get(`test_responses_${this.currentPaper.id}`, {});
    this.markedForReview = new Set(Storage.get(`test_marked_${this.currentPaper.id}`, []));
    this.startTime = Date.now();

    this.startTimer();
    this.renderPalette();
    this.renderCurrentQuestion();
  },

  startTimer() {
    this.updateTimerDisplay();
    clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      this.updateTimerDisplay();

      // Auto save state every 10 seconds
      if (this.remainingSeconds % 10 === 0) {
        Storage.saveTimerState(this.currentPaper.id, this.remainingSeconds);
        Storage.set(`test_responses_${this.currentPaper.id}`, this.userResponses);
        Storage.set(`test_marked_${this.currentPaper.id}`, Array.from(this.markedForReview));
      }

      if (this.remainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        alert('Time is up! Submitting your test automatically.');
        this.submitTest();
      }
    }, 1000);
  },

  updateTimerDisplay() {
    const hours = Math.floor(this.remainingSeconds / 3600);
    const mins = Math.floor((this.remainingSeconds % 3600) / 60);
    const secs = this.remainingSeconds % 60;

    const formatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const timerEl = document.getElementById('test-timer');
    if (!timerEl) return;

    timerEl.textContent = `⏱️ ${formatted}`;

    if (this.remainingSeconds <= 600) { // < 10 mins
      timerEl.className = 'test-timer-badge danger';
    } else if (this.remainingSeconds <= 1800) { // < 30 mins
      timerEl.className = 'test-timer-badge warning';
    } else {
      timerEl.className = 'test-timer-badge';
    }
  },

  renderPalette() {
    const container = document.getElementById('test-palette-buttons');
    if (!container) return;

    container.innerHTML = this.allQuestions.map((q, idx) => {
      let statusClass = '';
      const isAnswered = this.userResponses[idx] !== undefined && this.userResponses[idx] !== null;
      const isMarked = this.markedForReview.has(idx);

      if (isAnswered && isMarked) statusClass = 'marked-answered';
      else if (isAnswered) statusClass = 'answered';
      else if (isMarked) statusClass = 'marked';

      if (idx === this.currentIndex) statusClass += ' current';

      return `
        <button class="palette-btn ${statusClass}" onclick="TestEngine.jumpToQuestion(${idx})">
          ${idx + 1}
        </button>
      `;
    }).join('');
  },

  renderCurrentQuestion() {
    const q = this.allQuestions[this.currentIndex];
    if (!q) return;

    document.getElementById('test-section-active').textContent = q.sectionName;
    document.getElementById('test-question-num').textContent = `Question ${this.currentIndex + 1} of ${this.allQuestions.length}`;
    document.getElementById('test-question-text').textContent = q.text || `Question ${this.currentIndex + 1}`;

    // Mark for review button state
    const markBtn = document.getElementById('btn-mark-review');
    if (this.markedForReview.has(this.currentIndex)) {
      markBtn.textContent = '★ Marked for Review';
      markBtn.classList.add('btn-warning');
    } else {
      markBtn.textContent = '🔖 Mark for Review';
      markBtn.classList.remove('btn-warning');
    }

    // Previous button state
    document.getElementById('btn-prev-q').disabled = (this.currentIndex === 0);
    document.getElementById('btn-next-q').textContent = (this.currentIndex === this.allQuestions.length - 1) ? 'Finish & Review' : 'Next →';

    // Render options
    const optionsContainer = document.getElementById('test-options-list');
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const currentAnswer = this.userResponses[this.currentIndex];

    optionsContainer.innerHTML = (q.options || []).map((opt, optIdx) => {
      const isSelected = currentAnswer === optIdx;
      return `
        <button class="quiz-option ${isSelected ? 'selected' : ''}" onclick="TestEngine.chooseOption(${optIdx})" style="text-align:left;">
          <span class="opt-letter">${letters[optIdx] || optIdx + 1}</span>
          <span class="opt-text">${escapeHtml(opt)}</span>
        </button>
      `;
    }).join('');

    this.renderPalette();
  },

  chooseOption(optIdx) {
    this.userResponses[this.currentIndex] = optIdx;
    this.renderCurrentQuestion();
  },

  clearCurrentResponse() {
    delete this.userResponses[this.currentIndex];
    this.renderCurrentQuestion();
  },

  toggleMarkReview() {
    if (this.markedForReview.has(this.currentIndex)) {
      this.markedForReview.delete(this.currentIndex);
    } else {
      this.markedForReview.add(this.currentIndex);
    }
    this.renderCurrentQuestion();
  },

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderCurrentQuestion();
    }
  },

  nextQuestion() {
    if (this.currentIndex < this.allQuestions.length - 1) {
      this.currentIndex++;
      this.renderCurrentQuestion();
    } else {
      this.confirmSubmit();
    }
  },

  jumpToQuestion(idx) {
    if (idx >= 0 && idx < this.allQuestions.length) {
      this.currentIndex = idx;
      this.renderCurrentQuestion();
    }
  },

  confirmSubmit() {
    const total = this.allQuestions.length;
    const answered = Object.keys(this.userResponses).length;
    const unanswered = total - answered;
    const marked = this.markedForReview.size;

    const message = `Are you sure you want to submit?\n\n` +
      `• Total Questions: ${total}\n` +
      `• Answered: ${answered}\n` +
      `• Unanswered: ${unanswered}\n` +
      `• Marked for Review: ${marked}`;

    if (confirm(message)) {
      this.submitTest();
    }
  },

  submitTest() {
    clearInterval(this.timerInterval);
    Storage.clearTimerState(this.currentPaper.id);
    localStorage.removeItem(`test_responses_${this.currentPaper.id}`);
    localStorage.removeItem(`test_marked_${this.currentPaper.id}`);

    const elapsedSeconds = TOTAL_TIME_SECONDS - this.remainingSeconds;
    const timeTakenFormatted = formatTime(elapsedSeconds);

    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    const sectionStats = {};
    const detailedResults = [];

    this.allQuestions.forEach((q, idx) => {
      const selected = this.userResponses[idx];
      const hasSelected = selected !== undefined && selected !== null;
      const isCorrect = hasSelected && (q.correct >= 0 && selected === q.correct);

      if (!sectionStats[q.sectionName]) {
        sectionStats[q.sectionName] = { total: 0, correct: 0, wrong: 0, skipped: 0 };
      }
      sectionStats[q.sectionName].total++;

      if (isCorrect) {
        correctCount++;
        sectionStats[q.sectionName].correct++;
      } else if (hasSelected) {
        wrongCount++;
        sectionStats[q.sectionName].wrong++;

        // Save to Mistakes
        if (q.correct !== -1) {
          Storage.addMistake({
            questionId: `${this.currentPaper.id}:${q.id || `q${idx + 1}`}`,
            questionText: q.text,
            yourAnswer: q.options && q.options[selected] ? q.options[selected] : `Option ${selected + 1}`,
            correctAnswer: q.options && q.options[q.correct] ? q.options[q.correct] : `Option ${q.correct + 1}`,
            category: this.currentPaper.name,
            section: q.sectionName,
            date: new Date().toISOString()
          });
        }
      } else {
        unattemptedCount++;
        sectionStats[q.sectionName].skipped++;
      }

      detailedResults.push({
        q,
        selected,
        isCorrect,
        hasSelected
      });
    });

    const total = this.allQuestions.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // Save test result
    Storage.addTestResult({
      paperId: this.currentPaper.id,
      paperName: this.currentPaper.name,
      score: correctCount,
      total: total,
      percentage: percentage,
      timeTaken: timeTakenFormatted,
      date: new Date().toISOString()
    });

    this.renderResults({
      paperName: this.currentPaper.name,
      score: correctCount,
      total: total,
      percentage: percentage,
      timeTaken: timeTakenFormatted,
      sectionStats,
      detailedResults
    });
  },

  renderResults(res) {
    this.hideAll();
    document.getElementById('screen-test-results').classList.remove('hidden');

    document.getElementById('result-paper-title').textContent = res.paperName;
    document.getElementById('result-score').textContent = `${res.score} / ${res.total}`;
    document.getElementById('result-accuracy').textContent = `${res.percentage}%`;
    document.getElementById('result-time-taken').textContent = res.timeTaken;

    // Section table
    const table = document.getElementById('result-section-table');
    table.innerHTML = `
      <thead>
        <tr style="border-bottom:1px solid var(--border); text-align:left; color:var(--text-secondary);">
          <th style="padding:0.6rem;">Section</th>
          <th style="padding:0.6rem;">Questions</th>
          <th style="padding:0.6rem;">Correct</th>
          <th style="padding:0.6rem;">Wrong</th>
          <th style="padding:0.6rem;">Skipped</th>
          <th style="padding:0.6rem;">Accuracy</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(res.sectionStats).map(([sec, stats]) => {
          const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
          return `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:0.6rem; font-weight:600;">${sec}</td>
              <td style="padding:0.6rem;">${stats.total}</td>
              <td style="padding:0.6rem; color:var(--accent);">${stats.correct}</td>
              <td style="padding:0.6rem; color:var(--error);">${stats.wrong}</td>
              <td style="padding:0.6rem; color:var(--text-secondary);">${stats.skipped}</td>
              <td style="padding:0.6rem;"><strong>${acc}%</strong></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    `;

    // Detailed question review list
    const detailList = document.getElementById('result-questions-list');
    detailList.innerHTML = res.detailedResults.map((r, i) => {
      const q = r.q;
      const letters = ['A', 'B', 'C', 'D'];
      let badge = '<span class="badge badge-secondary">Skipped</span>';
      if (r.hasSelected) {
        badge = r.isCorrect ? '<span class="badge badge-success">✓ Correct</span>' : '<span class="badge badge-danger">✗ Wrong</span>';
      }

      const yourAns = r.hasSelected && q.options && q.options[r.selected] ? q.options[r.selected] : 'Not Answered';
      const correctAns = (q.correct >= 0 && q.options && q.options[q.correct]) ? q.options[q.correct] : 'Official Key';

      return `
        <div class="card" style="margin-bottom:1rem; border-left: 4px solid ${r.isCorrect ? 'var(--accent)' : (r.hasSelected ? 'var(--error)' : 'var(--text-secondary)')};">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
            <span style="font-weight:600; color:var(--text);">Q${i + 1} (${q.sectionName})</span>
            ${badge}
          </div>
          <div style="margin-bottom:0.75rem; color:var(--text); line-height:1.5;">${escapeHtml(q.text)}</div>
          
          <div style="font-size:0.85rem; margin-bottom:0.35rem;">
            <span style="color:var(--text-secondary);">Your Response:</span> 
            <strong style="color:${r.isCorrect ? 'var(--accent)' : (r.hasSelected ? 'var(--error)' : 'var(--text-secondary)')};">${escapeHtml(yourAns)}</strong>
          </div>
          <div style="font-size:0.85rem; margin-bottom:0.5rem;">
            <span style="color:var(--text-secondary);">Correct Answer:</span> 
            <strong style="color:var(--accent);">${escapeHtml(correctAns)}</strong>
          </div>

          ${q.solution ? `
            <div style="background:var(--surface-hover); padding:0.6rem; border-radius:var(--radius-sm); font-size:0.85rem; color:var(--text-secondary);">
              <strong>Solution:</strong> ${escapeHtml(q.solution)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  toggleDetailedReview() {
    const el = document.getElementById('result-detailed-review');
    el.classList.toggle('hidden');
    if (!el.classList.contains('hidden')) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  },

  hideAll() {
    ['screen-select-paper', 'screen-start-confirm', 'screen-test-active', 'screen-test-results'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }
};

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function startTestWhenReady() {
  if (typeof QUESTION_BANK !== 'undefined' && QUESTION_BANK) {
    TestEngine.init();
  } else {
    document.addEventListener('question-bank-ready', () => {
      if (window.QUESTION_BANK) TestEngine.init();
    }, { once: true });
  }
}

document.addEventListener('DOMContentLoaded', startTestWhenReady);
