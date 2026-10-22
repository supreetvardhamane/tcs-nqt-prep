/* ============================================
   TCS NQT Prep — localStorage Utility Module
   ============================================ */

const Storage = {
  // ---- Core helpers ----

  /**
   * Get an item from localStorage, parsed from JSON.
   * Returns defaultVal if key doesn't exist or parsing fails.
   */
  get(key, defaultVal = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultVal;
      return JSON.parse(raw);
    } catch {
      return defaultVal;
    }
  },

  /**
   * Set an item in localStorage, serialized to JSON.
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage.set failed:', e);
    }
  },

  // ---- Mistakes ----

  /**
   * Add a mistake record.
   * @param {Object} mistake - { questionId, questionText, yourAnswer, correctAnswer, category, section, date }
   */
  addMistake(mistake) {
    const mistakes = this.get('mistakes', []);
    // Avoid duplicates by questionId
    const idx = mistakes.findIndex(m => m.questionId === mistake.questionId);
    if (idx !== -1) {
      mistakes[idx] = { ...mistakes[idx], ...mistake, date: mistake.date || new Date().toISOString() };
    } else {
      mistakes.push({ ...mistake, date: mistake.date || new Date().toISOString() });
    }
    this.set('mistakes', mistakes);
  },

  /**
   * Get all mistakes, optionally filtered by category.
   * @param {string|null} category
   * @returns {Array}
   */
  getMistakes(category = null) {
    const mistakes = this.get('mistakes', []);
    if (!category) return mistakes;
    return mistakes.filter(m => m.category === category);
  },

  /**
   * Remove a specific mistake by questionId.
   * @param {string|number} questionId
   */
  removeMistake(questionId) {
    const mistakes = this.get('mistakes', []);
    this.set('mistakes', mistakes.filter(m => m.questionId !== questionId));
  },

  /**
   * Clear all mistakes.
   */
  clearMistakes() {
    this.set('mistakes', []);
  },

  /**
   * Mark a mistake as "learned": remove from active mistakes, add to learned list.
   * @param {string|number} questionId
   */
  markAsLearned(questionId) {
    const mistakes = this.get('mistakes', []);
    const learned = this.get('learned', []);
    const target = mistakes.find(m => m.questionId === questionId);
    if (target) {
      if (!learned.some(item => item.questionId === questionId)) learned.push({ ...target, learnedDate: new Date().toISOString() });
      this.set('learned', learned);
      this.set('mistakes', mistakes.filter(m => m.questionId !== questionId));
    }
  },

  /**
   * Get all learned items.
   * @returns {Array}
   */
  getLearned() {
    return this.get('learned', []);
  },

  getPlan() {
    return this.get('studyPlan', null);
  },

  savePlan(plan) {
    this.set('studyPlan', plan);
    return plan;
  },

  completeActivity(activityId) {
    const plan = this.getPlan() || { completedActivities: [] };
    const completed = new Set(plan.completedActivities || []);
    completed.add(activityId);
    plan.completedActivities = Array.from(completed);
    plan.updatedAt = new Date().toISOString();
    this.savePlan(plan);
    return plan;
  },

  // ---- Test Results ----

  /**
   * Add a test result.
   * @param {Object} result - { paperId, paperName, score, total, percentage, timeTaken, date, details: [{qId, correct, yourAnswer, correctAnswer}] }
   */
  addTestResult(result) {
    const history = this.get('testHistory', []);
    history.push({
      ...result,
      id: result.paperId + '_' + Date.now(),
      date: result.date || new Date().toISOString(),
    });
    this.set('testHistory', history);
  },

  /**
   * Get test history, newest first.
   * @returns {Array}
   */
  getTestHistory() {
    const history = this.get('testHistory', []);
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // ---- Category Progress ----

  /**
   * Update progress for a category (cumulative).
   * @param {string} categoryId
   * @param {number} attempted - number attempted in this session
   * @param {number} correct - number correct in this session
   */
  updateProgress(categoryId, attempted, correct) {
    const progress = this.get('progress', {});
    if (!progress[categoryId]) {
      progress[categoryId] = { attempted: 0, correct: 0 };
    }
    progress[categoryId].attempted += attempted;
    progress[categoryId].correct += correct;
    this.set('progress', progress);
  },

  /**
   * Get all progress data.
   * @returns {Object} - keyed by categoryId, value { attempted, correct }
   */
  getProgress() {
    return this.get('progress', {});
  },

  // ---- Timer State ----

  /**
   * Save timer state for a test (for pause/resume).
   * @param {string} paperId
   * @param {number} remainingSeconds
   */
  saveTimerState(paperId, remainingSeconds) {
    const timers = this.get('timerStates', {});
    timers[paperId] = {
      remaining: remainingSeconds,
      savedAt: Date.now(),
    };
    this.set('timerStates', timers);
  },

  /**
   * Get saved timer state for a test.
   * @param {string} paperId
   * @returns {{ remaining: number, savedAt: number } | null}
   */
  getTimerState(paperId) {
    const timers = this.get('timerStates', {});
    return timers[paperId] || null;
  },

  /**
   * Clear timer state for a test.
   * @param {string} paperId
   */
  clearTimerState(paperId) {
    const timers = this.get('timerStates', {});
    delete timers[paperId];
    this.set('timerStates', timers);
  },

  // ---- Overall Stats ----

  /**
   * Get computed overall stats.
   * @returns {Object} - { totalAttempted, totalCorrect, accuracy, streakDays, lastActiveDate, categoryBreakdown }
   */
  getStats() {
    const progress = this.getProgress();
    const streak = this.get('streak', { count: 0, lastDate: null });

    let totalAttempted = 0;
    let totalCorrect = 0;
    const categoryBreakdown = {};

    for (const [catId, data] of Object.entries(progress)) {
      totalAttempted += data.attempted;
      totalCorrect += data.correct;
      categoryBreakdown[catId] = {
        attempted: data.attempted,
        correct: data.correct,
        accuracy: data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0,
      };
    }

    return {
      totalAttempted,
      totalCorrect,
      accuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
      streakDays: streak.count,
      lastActiveDate: streak.lastDate,
      categoryBreakdown,
    };
  },

  // ---- Streak ----

  /**
   * Update the daily streak. Call this once per session / page load.
   * If last active was yesterday, increment streak. If today, do nothing.
   * Otherwise, reset to 1.
   */
  updateStreak() {
    const streak = this.get('streak', { count: 0, lastDate: null });
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');

    if (streak.lastDate === today) {
      // Already active today
      return streak.count;
    }

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterday = [yesterdayDate.getFullYear(), String(yesterdayDate.getMonth() + 1).padStart(2, '0'), String(yesterdayDate.getDate()).padStart(2, '0')].join('-');

    if (streak.lastDate === yesterday) {
      streak.count += 1;
    } else {
      streak.count = 1;
    }

    streak.lastDate = today;
    this.set('streak', streak);
    return streak.count;
  },
};
