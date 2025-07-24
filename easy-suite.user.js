// ==UserScript==
// @name         Easy Suite Loader
// @namespace    https://github.com/yourusername/easy-scripts
// @version      1.0
// @description  Loads all Easy-* scripts from GitHub repo
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const scripts = [
    'https://raw.githubusercontent.com/yourusername/easy-scripts/main/easy-ref-insert.user.js',
    'https://raw.githubusercontent.com/yourusername/easy-scripts/main/easy-ui-cleaner.user.js',
    'https://raw.githubusercontent.com/yourusername/easy-scripts/main/easy-photo-resizer.user.js',
    'https://raw.githubusercontent.com/yourusername/easy-scripts/main/easy-full-width-description.user.js'
  ];

  for (const url of scripts) {
    const script = document.createElement('script');
    script.src = url;
    script.type = 'text/javascript';
    document.head.appendChild(script);
  }
})();
