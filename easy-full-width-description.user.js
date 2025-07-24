// ==UserScript==
// @name         Easy full-width description
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Make first mat-card in col-xxl-4 take full width
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const applyFullWidthFix = () => {
    const cols = document.querySelectorAll('.col-xxl-4');
    if (!cols.length) return;

    cols.forEach(col => {
      const card = col.querySelector('mat-card');
      if (card) {
        col.style.width = '100%';
        col.style.maxWidth = '100%';
        col.style.flex = '1 1 100%';
        col.style.padding = '0';

        card.style.width = '100%';
        card.style.maxWidth = '100%';
        card.style.flex = '1 1 100%';
        card.style.boxShadow = 'none';
        card.style.background = 'transparent';
        card.style.padding = '0px';
      }
    });
  };

  // Initial run
  applyFullWidthFix();

  // Observe DOM mutations
  const observer = new MutationObserver(applyFullWidthFix);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();

