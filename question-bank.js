/* TCS NQT Prep — reliable chunked question-bank loader */
(function loadQuestionBank() {
  try {
    const encoded = (window.__TCS_BANK_PARTS || []).join('');
    if (!encoded) throw new Error('Question bank chunks are missing');
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const bank = JSON.parse(new TextDecoder().decode(bytes));
    window.QUESTION_BANK = bank;
    document.dispatchEvent(new CustomEvent('question-bank-ready'));
  } catch (error) {
    console.error('Question bank failed to load:', error);
    document.dispatchEvent(new CustomEvent('question-bank-error', { detail: error }));
  }
})();
