# TCS NQT Preparation Portal

A lightweight, minimal, multi-page preparation web application built with vanilla HTML, CSS, and JavaScript. Powered by authenticated previous year questions from the [TCS-NQT-PYQ-QUESTIONS](https://github.com/Arjunpolen/TCS-NQT-PYQ-QUESTIONS) repository.

---

## 🚀 Features

- **Multi-page Architecture**: Plain, responsive, dependency-free HTML/CSS/JS that works directly by opening `index.html` in any modern web browser or hosting via any static file server.
- **31 Topical MCQ Categories**: Over 280 categorized aptitude and computer science foundation questions with instant answer evaluation, explanations, and progress metrics.
- **11 Full-Length Timed Mocks (3-Hour Exam Simulation)**:
  - Exact 3:00:00 countdown timer with persistence across browser refreshes.
  - Interactive TCS NQT style Question Palette with color coding (Answered, Marked for Review, Unvisited).
  - Automated evaluation, section-wise accuracy breakdown, and auto-submit on timeout.
- **Anki-Style Flashcard & Pattern Review**:
  - 3D flip card animations for 50 TCS HR Interview questions with model responses.
  - Coding pattern cards for DSA Easy (50), DSA Hard (30), and Verified TCS PYQs (81) with syntax-highlighted solutions, constraints, and hints.
  - Spaced repetition buttons (*Again [1]*, *Hard [2]*, *Easy [3]*).
- **Persistent Mistakes Notebook**:
  - Automatically captures every question answered incorrectly during quizzes and mock exams.
  - Review mode with filter by topic/paper.
  - **Re-Quiz Mode**: Practice only your mistakes until mastered, then mark them as learned.
- **Performance Analytics & Day Streak**:
  - Comprehensive KPI tracking (accuracy, completed tests, streak counter).
  - Topic-wise visual mastery breakdown bars.

---

## 📁 Directory Structure

```text
tcs-prep/
├── index.html          # Dashboard, summary stats, quick navigation
├── quiz.html           # Topic-wise practice MCQ engine
├── test.html           # 3-Hour timed full paper mock test engine
├── flashcards.html     # Anki flashcards for HR & Coding PYQs
├── mistakes.html       # Persistent mistakes notebook & re-quiz engine
├── stats.html          # Analytics, mastery breakdown, test history
├── css/
│   └── style.css       # Clean dark-mode stylesheet & responsive layouts
├── js/
│   ├── storage.js      # LocalStorage helper & persistence engine
│   ├── quiz.js         # Practice quiz engine with keyboard shortcuts
│   ├── test.js         # 3-Hour exam simulation & palette engine
│   └── flashcards.js   # 3D flashcard & spaced repetition handler
└── data/
    └── questions.js    # Pre-parsed bank of 1,150+ questions & solutions
```

---

## 🏃 Quick Start

Open `index.html` in your browser:

```bash
# Option 1: Direct file opening
xdg-open index.html   # On Linux
open index.html       # On macOS

# Option 2: Simple HTTP server (recommended)
python3 -m http.server 8080
# Visit http://localhost:8080
```
