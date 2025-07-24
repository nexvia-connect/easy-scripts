// ==UserScript==
// @name         Easy ref insert (final fix)
// @namespace    https://github.com/yourusername/easy-scripts
// @version      2.0
// @description  Insert ref number into textarea URL only inside sentence starting with trigger
// @match        https://nexvia1832.easy-serveur53.com/*
// @updateURL    https://raw.githubusercontent.com/yourusername/easy-scripts/main/easy-ref-insert.user.js
// @downloadURL  https://raw.githubusercontent.com/yourusername/easy-scripts/main/easy-ref-insert.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const getRefNumber = () => {
    const divs = document.querySelectorAll('div');
    for (const div of divs) {
      const nodes = div.childNodes;
      if (
        nodes.length === 2 &&
        nodes[0].nodeType === Node.TEXT_NODE &&
        nodes[0].textContent.trim() === 'Réf.' &&
        nodes[1].nodeName === 'STRONG'
      ) {
        const ref = nodes[1].textContent.trim().replace(/\D/g, '');
        if (ref) return ref;
      }
    }
    return null;
  };

  const shouldReplaceInSentence = sentence => {
    const trimmed = sentence.trimStart();
    return (
      trimmed.startsWith('Notre annonce complète') ||
      trimmed.startsWith('Our full listing')
    );
  };

  const replaceLinkInSentence = (sentence, ref) => {
    const urls = [
      'https://www.nexvia.lu/fr/buy/detail/',
      'https://www.nexvia.lu/buy/detail/'
    ];
    let replaced = sentence;
    for (const base of urls) {
      const pattern = new RegExp(`${base}(\\d*)`, 'g');
      replaced = replaced.replace(pattern, (match, oldId) =>
        oldId !== ref ? `${base}${ref}` : match
      );
    }
    return replaced;
  };

  const updateTextarea = () => {
    const ref = getRefNumber();
    if (!ref) return;

    const textarea = document.querySelector('textarea.extended-textarea');
    if (!textarea) return;

    const original = textarea.value;
    const scrollPos = textarea.scrollTop;
    const selStart = textarea.selectionStart;
    const selEnd = textarea.selectionEnd;

    let modified = false;
    const lines = original.split(/\n/);
    const updatedLines = lines.map(line => {
      if (shouldReplaceInSentence(line)) {
        const replaced = replaceLinkInSentence(line, ref);
        if (replaced !== line) {
          modified = true;
          return replaced;
        }
      }
      return line;
    });

    if (modified) {
      textarea.value = updatedLines.join('\n');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.scrollTop = scrollPos;
      textarea.setSelectionRange(selStart, selEnd);
    }
  };

  const observer = new MutationObserver(updateTextarea);
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(updateTextarea, 1000);
})();
