/**
 * TCS NQT Prep — Practice Quiz Engine (js/quiz.js)
 */

const Quiz = {
  category: null,
  questions: [],
  currentIndex: 0,
  selectedOption: null,
  hasAnswered: false,
  results: [], // { question, selected, correct, isCorrect, skipped }
  mistakesInSession: [],
  currentOptions: [], // shuffled option objects: { text, originalIndex }
  currentCorrectIndex: -1,
  correctPositionMap: [],

  init() {
    Storage.updateStreak();
    const params = new URLSearchParams(window.location.search);
    const catId = params.get('category');

    if (catId) {
      const found = QUESTION_BANK.categories.find(c => c.id === catId);
      if (found && found.questions && found.questions.length > 0) {
        this.startQuiz(found);
      } else {
        this.showCategorySelection();
      }
    } else {
      this.showCategorySelection();
    }

    this.bindKeyboard();
  },

  showCategorySelection() {
    this.hideAllScreens();
    const screen = document.getElementById('screen-categories');
    if (screen) screen.classList.remove('hidden');

    const grid = document.getElementById('category-grid');
    if (!grid) return;

    const progress = Storage.getProgress();
    grid.innerHTML = QUESTION_BANK.categories.map(cat => {
      const qCount = cat.questions ? cat.questions.length : 0;
      const catProg = progress[cat.id] || { attempted: 0, correct: 0 };
      const acc = catProg.attempted > 0 ? Math.round((catProg.correct / catProg.attempted) * 100) : 0;

      return `
        <a href="quiz.html?category=${cat.id}" class="card category-card" style="text-decoration:none; display:block;">
          <div style="font-weight:600; color:var(--text); font-size:1.05rem; margin-bottom:.5rem;">${cat.name}</div>
          <div style="color:var(--text-dim); font-size:.85rem; margin-bottom:.75rem;">${qCount} Questions</div>
          ${catProg.attempted > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size:.8rem; color:var(--text-dim); margin-bottom:.35rem;">
              <span>Attempted: ${catProg.attempted}</span>
              <span style="color:var(--accent);">${acc}% accuracy</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(100, Math.round((catProg.attempted / qCount) * 100))}%;"></div>
            </div>
          ` : `
            <span class="badge" style="background:var(--surface-2); color:var(--text-dim);">Not started</span>
          `}
        </a>
      `;
    }).join('');
  },

  startQuiz(category) {
    this.category = category;
    this.questions = [...category.questions];
    this.currentIndex = 0;
    this.results = [];
    this.mistakesInSession = [];
    this.correctPositionMap = this.buildBalancedAnswerPositions(this.questions);

    this.hideAllScreens();
    document.getElementById('screen-quiz').classList.remove('hidden');
    document.getElementById('quiz-cat-name').textContent = category.name;

    this.renderQuestion();
  },

  buildBalancedAnswerPositions(questions) {
    const positions = questions.map((q, index) => ({ index, size: (q.options || []).length })).filter(item => item.size > 0);
    const bySize = new Map();
    positions.forEach(item => { if (!bySize.has(item.size)) bySize.set(item.size, []); bySize.get(item.size).push(item.index); });
    const result = Array(questions.length).fill(-1);
    bySize.forEach((indexes, size) => {
      const pool = indexes.map((_, i) => i % size);
      this.shuffleArray(pool);
      indexes.forEach((questionIndex, i) => { result[questionIndex] = pool[i]; });
    });
    return result;
  },

  shuffleArray(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const random = window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random();
      const j = Math.floor(random * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  },

  renderQuestion() {
    this.hasAnswered = false;
    this.selectedOption = null;

    const q = this.questions[this.currentIndex];
    const total = this.questions.length;

    document.getElementById('quiz-q-counter').textContent = `Question ${this.currentIndex + 1} of ${total}`;
    const pct = Math.round(((this.currentIndex) / total) * 100);
    document.getElementById('quiz-progress').style.width = `${pct}%`;

    document.getElementById('quiz-question-text').textContent = q.text || `Question ${this.currentIndex + 1}`;

    const unverified = document.getElementById('quiz-unverified-badge');
    if (q.correct === -1) {
      unverified.classList.remove('hidden');
    } else {
      unverified.classList.add('hidden');
    }

    const solBox = document.getElementById('quiz-solution');
    solBox.classList.add('hidden');
    solBox.innerHTML = '';

    document.getElementById('btn-next-wrapper').classList.add('hidden');
    document.getElementById('btn-skip').classList.remove('hidden');

    const optionsContainer = document.getElementById('quiz-options');
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const correctOption = q.options?.[q.correct];
    const distractors = (q.options || []).map((text, originalIndex) => ({ text, originalIndex })).filter(option => option.originalIndex !== q.correct);
    this.shuffleArray(distractors);
    this.currentOptions = [];
    const correctPosition = this.correctPositionMap[this.currentIndex] >= 0 ? this.correctPositionMap[this.currentIndex] : 0;
    for (let i = 0; i < (q.options || []).length; i++) {
      this.currentOptions.push(i === correctPosition && q.correct >= 0 ? { text: correctOption, originalIndex: q.correct } : distractors.shift());
    }
    this.currentCorrectIndex = this.currentOptions.findIndex(option => option.originalIndex === q.correct);

    optionsContainer.innerHTML = this.currentOptions.map((option, idx) => {
      const letter = letters[idx] || (idx + 1);
      return `
        <button class="quiz-option" data-index="${idx}" onclick="Quiz.selectOption(${idx})">
          <span class="opt-letter">${letter}</span>
          <span class="opt-text">${escapeHtml(option.text)}</span>
          <span class="opt-status"></span>
        </button>
      `;
    }).join('');
  },

  selectOption(index) {
    if (this.hasAnswered) return;
    this.hasAnswered = true;
    this.selectedOption = index;

    const q = this.questions[this.currentIndex];
    const optionBtns = document.querySelectorAll('.quiz-option');
    const selectedOriginalIndex = this.currentOptions[index]?.originalIndex ?? -1;
    const isCorrect = (q.correct >= 0 && selectedOriginalIndex === q.correct);

    optionBtns.forEach((btn, idx) => {
      btn.disabled = true;
      const statusSpan = btn.querySelector('.opt-status');

      if (idx === this.currentCorrectIndex) {
        btn.classList.add('correct');
        if (statusSpan) statusSpan.textContent = '✓';
      } else if (idx === index) {
        if (!isCorrect) {
          btn.classList.add('wrong');
          if (statusSpan) statusSpan.textContent = '✗';
        }
      } else {
        btn.classList.add('dimmed');
      }
    });

    // Record result
    const resultItem = {
      qId: q.id,
      text: q.text,
      options: q.options,
      selected: selectedOriginalIndex,
      correct: q.correct,
      isCorrect: isCorrect,
      solution: q.solution || '',
      skipped: false
    };
    this.results.push(resultItem);

    if (!isCorrect && q.correct !== -1) {
      const mistake = {
        questionId: q.id,
        questionText: q.text,
        yourAnswer: q.options && q.options[selectedOriginalIndex] ? q.options[selectedOriginalIndex] : `Option ${index + 1}`,
        correctAnswer: q.options && q.options[q.correct] ? q.options[q.correct] : `Option ${q.correct + 1}`,
        category: this.category.name,
        section: this.category.name,
        date: new Date().toISOString()
      };
      this.mistakesInSession.push(mistake);
      Storage.addMistake(mistake);
    }

    // Show solution if available
    if (q.solution) {
      const solBox = document.getElementById('quiz-solution');
      solBox.innerHTML = `<strong>Solution / Explanation:</strong><p style="margin-top:.35rem;">${escapeHtml(q.solution)}</p>`;
      solBox.classList.remove('hidden');
    }

    document.getElementById('btn-skip').classList.add('hidden');
    document.getElementById('btn-next-wrapper').classList.remove('hidden');
  },

  skip() {
    if (this.hasAnswered) return;
    this.hasAnswered = true;

    const q = this.questions[this.currentIndex];
    this.results.push({
      qId: q.id,
      text: q.text,
      options: q.options,
      selected: -1,
      correct: q.correct,
      isCorrect: false,
      solution: q.solution || '',
      skipped: true
    });

    this.next();
  },

  next() {
    if (this.currentIndex + 1 < this.questions.length) {
      this.currentIndex++;
      this.renderQuestion();
    } else {
      this.finishQuiz();
    }
  },

  finishQuiz() {
    const total = this.results.length;
    const correctCount = this.results.filter(r => r.isCorrect).length;
    const wrongCount = this.results.filter(r => !r.isCorrect && !r.skipped).length;
    const skippedCount = this.results.filter(r => r.skipped).length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    Storage.updateProgress(this.category.id, total, correctCount);
    Storage.addTestResult({
      paperId: this.category.id,
      paperName: this.category.name,
      score: correctCount,
      total: total,
      percentage: pct,
      timeTaken: 'Practice Quiz',
      date: new Date().toISOString(),
      details: this.results
    });

    this.showScore();
  },

  showScore() {
    this.hideAllScreens();
    const screen = document.getElementById('screen-score');
    screen.classList.remove('hidden');

    const total = this.results.length;
    const correctCount = this.results.filter(r => r.isCorrect).length;
    const wrongCount = this.results.filter(r => !r.isCorrect && !r.skipped).length;
    const skippedCount = this.results.filter(r => r.skipped).length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let scoreColor = 'var(--red)';
    if (pct >= 80) scoreColor = 'var(--green)';
    else if (pct >= 60) scoreColor = 'var(--yellow)';

    const container = document.getElementById('score-content');
    container.innerHTML = `
      <div style="text-align:center;">
        <h2 style="font-size:1.6rem; margin-bottom:.5rem;">Quiz Complete!</h2>
        <p style="color:var(--text-dim); margin-bottom:1.5rem;">${this.category.name}</p>

        <div style="display:inline-flex; flex-direction:column; align-items:center; justify-content:center; width:140px; height:140px; border-radius:50%; border:6px solid ${scoreColor}; margin-bottom:1.5rem; background:var(--surface-2);">
          <span style="font-size:2.2rem; font-weight:700; color:${scoreColor};">${pct}%</span>
          <span style="font-size:.85rem; color:var(--text-dim);">${correctCount} / ${total}</span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; margin-bottom:2rem; max-width:400px; margin-left:auto; margin-right:auto;">
          <div style="background:var(--surface-2); padding:.75rem; border-radius:var(--radius); border:1px solid var(--border);">
            <div style="color:var(--green); font-size:1.4rem; font-weight:700;">${correctCount}</div>
            <div style="font-size:.8rem; color:var(--text-dim);">Correct</div>
          </div>
          <div style="background:var(--surface-2); padding:.75rem; border-radius:var(--radius); border:1px solid var(--border);">
            <div style="color:var(--red); font-size:1.4rem; font-weight:700;">${wrongCount}</div>
            <div style="font-size:.8rem; color:var(--text-dim);">Wrong</div>
          </div>
          <div style="background:var(--surface-2); padding:.75rem; border-radius:var(--radius); border:1px solid var(--border);">
            <div style="color:var(--yellow); font-size:1.4rem; font-weight:700;">${skippedCount}</div>
            <div style="font-size:.8rem; color:var(--text-dim);">Skipped</div>
          </div>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:.75rem; justify-content:center;">
          ${wrongCount > 0 ? `
            <button class="btn btn-secondary" onclick="Quiz.showReview()">🔍 Review Mistakes (${wrongCount})</button>
          ` : ''}
          <button class="btn btn-primary" onclick="Quiz.startQuiz(Quiz.category)">↺ Retry Quiz</button>
          <a href="quiz.html" class="btn btn-secondary">All Categories</a>
          <a href="index.html" class="btn btn-secondary">Dashboard</a>
        </div>
      </div>
    `;
  },

  showReview() {
    this.hideAllScreens();
    const screen = document.getElementById('screen-review');
    screen.classList.remove('hidden');

    const wrongItems = this.results.filter(r => !r.isCorrect && !r.skipped);
    document.getElementById('review-subtitle').textContent = `${wrongItems.length} incorrect answers in this session`;

    const list = document.getElementById('review-list');
    list.innerHTML = wrongItems.map((item, idx) => {
      const yourAns = item.options && item.options[item.selected] ? item.options[item.selected] : 'Not answered';
      const correctAns = item.options && item.options[item.correct] ? item.options[item.correct] : 'Verified answer';

      return `
        <div class="card" style="margin-bottom:1rem; text-align:left;">
          <div style="font-weight:600; margin-bottom:.5rem; color:var(--text);">#${idx + 1}. ${escapeHtml(item.text)}</div>
          <div style="font-size:.9rem; margin-bottom:.35rem;">
            <span style="color:var(--red); font-weight:600;">✗ Your answer:</span> 
            <span style="color:var(--text-dim);">${escapeHtml(yourAns)}</span>
          </div>
          <div style="font-size:.9rem; margin-bottom:.5rem;">
            <span style="color:var(--green); font-weight:600;">✓ Correct answer:</span> 
            <span style="color:var(--text);">${escapeHtml(correctAns)}</span>
          </div>
          ${item.solution ? `
            <div style="background:var(--surface-2); padding:.6rem .8rem; border-radius:var(--radius-sm); font-size:.85rem; color:var(--text-dim); border-left:3px solid var(--accent);">
              <strong>Explanation:</strong> ${escapeHtml(item.solution)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  hideAllScreens() {
    ['screen-categories', 'screen-quiz', 'screen-score', 'screen-review'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  },

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Only handle if quiz screen is active
      const quizScreen = document.getElementById('screen-quiz');
      if (!quizScreen || quizScreen.classList.contains('hidden')) return;

      if (!this.hasAnswered) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key) - 1;
          this.selectOption(idx);
        } else if (['a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
          const idx = ['a', 'b', 'c', 'd'].indexOf(e.key.toLowerCase());
          this.selectOption(idx);
        }
      } else {
        if (e.key === 'Enter') {
          this.next();
        }
      }
    });
  }
};

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function startQuizWhenReady() {
  if (typeof QUESTION_BANK !== 'undefined' && QUESTION_BANK) {
    Quiz.init();
  } else {
    document.addEventListener('question-bank-ready', () => {
      if (window.QUESTION_BANK) Quiz.init();
    }, { once: true });
  }
}

document.addEventListener('DOMContentLoaded', startQuizWhenReady);
