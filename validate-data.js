/* Read-only question-bank validation. Run with: node validate-data.js */
const fs = require('fs');
const vm = require('vm');

const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/questions.js', 'utf8') + '; this.bank = QUESTION_BANK;', context);
const bank = context.bank;
const errors = [];
const ids = new Set();

function checkQuestion(q, location) {
  if (!q.id) errors.push(`${location}: missing id`);
  if (q.id && ids.has(q.id)) errors.push(`${location}: duplicate id ${q.id}`);
  if (q.id) ids.add(q.id);
  if (!q.text && !q.title && !q.question) errors.push(`${location}: missing prompt`);
  if (q.options) {
    if (!q.options.length) errors.push(`${location}: empty options`);
    if (q.options.length !== new Set(q.options).size) errors.push(`${location}: duplicate options`);
    if (q.correct !== -1 && (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length)) errors.push(`${location}: invalid correct index`);
  }
}

(bank.categories || []).forEach((category) => (category.questions || []).forEach((q, i) => checkQuestion(q, `category:${category.id}:${i + 1}`)));
(bank.papers || []).forEach((paper) => (paper.sections || []).forEach((section) => (section.questions || []).forEach((q, i) => checkQuestion(q, `paper:${paper.id}/${section.name}:${i + 1}`))));
Object.entries(bank.flashcards || {}).forEach(([deck, cards]) => cards.forEach((card, i) => {
  if (!card.id || !card.title && !card.question) errors.push(`flashcard:${deck}:${i + 1}: missing identity`);
  if (card.cppSolution && !/#include|using namespace std|vector</.test(card.cppSolution)) errors.push(`flashcard:${deck}:${i + 1}: cppSolution does not look like C++`);
  if (deck !== 'hr' && card.code && /import java|System\.out|def\s+\w+/.test(card.code)) {
    console.warn(`warning flashcard:${deck}:${i + 1}: legacy source is not C++; renderer will label it accurately`);
  }
}));

if (errors.length) {
  console.error(`${errors.length} validation error(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Validated ${ids.size} unique question and paper records successfully.`);
}
