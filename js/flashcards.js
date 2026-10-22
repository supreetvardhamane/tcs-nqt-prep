/** TCS NQT Prep — Flashcard and pattern review engine. */
const FlashcardEngine = {
  deckType: null, cards: [], currentIndex: 0, isFlipped: false,
  ratings: { again: 0, hard: 0, easy: 0 },

  init() {
    Storage.updateStreak();
    const type = new URLSearchParams(window.location.search).get('type');
    if (type && this.loadDeck(type)) this.startDeck(type); else this.showSelection();
    this.bindShortcuts();
  },

  sourceLanguage(code) {
    if (/import\s+java|System\.out|Scanner|public\s+static/.test(code || '')) return 'Java';
    if (/def\s+\w+\s*\(|print\s*\(/.test(code || '')) return 'Python';
    if (/#include|vector<|using namespace std|int\s+main/.test(code || '')) return 'C++';
    return 'Sample input / source data';
  },

  renderSource(code, language) {
    const source = code ? String(code) : '// Solution not yet supplied';
    return `<div class="code-label">${escapeHtml(language || this.sourceLanguage(source))}</div><div class="code-container"><pre><code>${escapeHtml(source)}</code></pre></div>`;
  },

  loadDeck(type) {
    if (!QUESTION_BANK || !QUESTION_BANK.flashcards) return false;
    const sourceCards = QUESTION_BANK.flashcards[type] || [];
    const category = { hr: 'HR Interview', programming_easy: 'DSA Easy', programming_hard: 'DSA Hard', programming_verified: 'Verified PYQ' }[type];
    if (!category) return false;
    this.cards = sourceCards.map((item) => {
      const frontText = item.question || item.title || 'Untitled card';
      let frontExtra = item.problem ? `<div class="flashcard-problem">${escapeHtml(item.problem)}</div>` : '';
      if (item.constraints) frontExtra += `<div class="flashcard-meta"><strong>Constraints:</strong> ${escapeHtml(item.constraints)}</div>`;
      if (item.sample_input) frontExtra += `<div class="flashcard-meta"><strong>Sample input:</strong> <code>${escapeHtml(item.sample_input)}</code></div>`;
      if (item.sample_output) frontExtra += `<div class="flashcard-meta"><strong>Sample output:</strong> <code>${escapeHtml(item.sample_output)}</code></div>`;
      let backHtml = item.answer ? `<p class="flashcard-answer">${escapeHtml(item.answer)}</p>` : '';
      if (item.code || item.cppSolution) backHtml += this.renderSource(item.cppSolution || item.code, item.cppSolution ? 'C++' : this.sourceLanguage(item.code));
      if (item.explanation) backHtml += `<p class="flashcard-explanation"><strong>Explanation:</strong> ${escapeHtml(item.explanation)}</p>`;
      if (item.hint) backHtml += `<p class="flashcard-hint-text"><strong>Hint:</strong> ${escapeHtml(item.hint)}</p>`;
      return { id: item.id, category, frontText, frontExtra, backHtml: backHtml || '<p class="flashcard-muted">No solution has been supplied for this card yet.</p>' };
    });
    return this.cards.length > 0;
  },

  startDeck(type) {
    this.deckType = type; this.currentIndex = 0; this.isFlipped = false;
    this.ratings = { again: 0, hard: 0, easy: 0 };
    this.hideAll(); document.getElementById('screen-flashcard-active').classList.remove('hidden');
    document.getElementById('fc-deck-title').textContent = { hr: 'HR Interview Prep', programming_easy: 'DSA Easy Patterns', programming_hard: 'DSA Hard Patterns', programming_verified: 'Verified Coding PYQs' }[type] || 'Flashcards';
    this.renderCard();
  },

  renderCard() {
    const card = this.cards[this.currentIndex];
    if (!card) return;
    this.isFlipped = false; document.getElementById('card-inner').classList.remove('flipped');
    document.getElementById('fc-counter').textContent = `Card ${this.currentIndex + 1} of ${this.cards.length}`;
    document.getElementById('fc-progress').style.width = `${Math.round(((this.currentIndex + 1) / this.cards.length) * 100)}%`;
    document.getElementById('fc-front-tag').textContent = card.category.toUpperCase();
    document.getElementById('fc-front-text').textContent = card.frontText;
    document.getElementById('fc-front-extra').innerHTML = card.frontExtra;
    document.getElementById('fc-back-content').innerHTML = card.backHtml;
  },

  toggleFlip() { this.isFlipped = !this.isFlipped; document.getElementById('card-inner').classList.toggle('flipped', this.isFlipped); },

  rate(rating) {
    const card = this.cards[this.currentIndex]; this.ratings[rating]++;
    if (rating === 'again') Storage.addMistake({ questionId: card.id, questionText: card.frontText, yourAnswer: 'Marked for review', correctAnswer: 'Review flashcard solution', category: card.category, section: card.category, date: new Date().toISOString() });
    if (rating === 'easy') Storage.markAsLearned(card.id);
    Storage.set(`flashcard_rating_${card.id}`, { rating, date: new Date().toISOString() });
    if (this.currentIndex < this.cards.length - 1) { this.currentIndex++; this.renderCard(); } else this.finishDeck();
  },

  shuffle() { for (let i = this.cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]; } this.currentIndex = 0; this.renderCard(); },
  finishDeck() { this.hideAll(); document.getElementById('screen-deck-finished').classList.remove('hidden'); document.getElementById('count-again').textContent = this.ratings.again; document.getElementById('count-hard').textContent = this.ratings.hard; document.getElementById('count-easy').textContent = this.ratings.easy; document.getElementById('finish-summary-text').textContent = `Finished ${this.cards.length} cards from ${this.deckType.replaceAll('_', ' ').toUpperCase()}.`; },
  restartDeck() { this.startDeck(this.deckType); },
  bindShortcuts() { window.addEventListener('keydown', (event) => { if (document.getElementById('screen-flashcard-active')?.classList.contains('hidden')) return; if (event.code === 'Space') { event.preventDefault(); this.toggleFlip(); } else if (['1', '2', '3'].includes(event.key)) this.rate(['again', 'hard', 'easy'][Number(event.key) - 1]); }); },
  showSelection() { this.hideAll(); document.getElementById('screen-select-type').classList.remove('hidden'); },
  hideAll() { ['screen-select-type', 'screen-flashcard-active', 'screen-deck-finished'].forEach((id) => document.getElementById(id)?.classList.add('hidden')); }
};

function escapeHtml(text) { return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function startFlashcardsWhenReady() {
  if (typeof QUESTION_BANK !== 'undefined' && QUESTION_BANK) {
    FlashcardEngine.init();
  } else {
    document.addEventListener('question-bank-ready', () => {
      if (window.QUESTION_BANK) FlashcardEngine.init();
    }, { once: true });
  }
}

document.addEventListener('DOMContentLoaded', startFlashcardsWhenReady);
