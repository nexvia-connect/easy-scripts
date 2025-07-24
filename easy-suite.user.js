// ==UserScript==
// @name         Easy Suite
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Loads all Easy scripts from GitHub
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const scripts = [
    'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-ref-insert.user.js',
    'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-ui-cleaner.user.js',
    'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-photo-resizer.user.js',
    'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-full-width-description.user.js'
  ];

  scripts.forEach(src => {
    const s = document.createElement('script');
    s.src = src + '?v=' + Date.now(); // prevent caching
    s.type = 'text/javascript';
    document.head.appendChild(s);
  });
})();
