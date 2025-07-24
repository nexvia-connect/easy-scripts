// ==UserScript==
// @name         Easy Suite Loader
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Load and control Easy Suite scripts with UI toggle and persistence
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        none
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function () {
  'use strict';

  const SETTINGS_KEY = 'easy_suite_enabled_scripts';
  const POSITION_KEY = 'easy_suite_ui_position';
  const STYLE_URL = 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/styles/easy-suite-style.css';

  const SCRIPT_KEYS = [
    { key: 'refInsert', label: 'Ref insert', url: 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-ref-insert.user.js' },
    { key: 'uiCleaner', label: 'UI cleaner', url: 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-ui-cleaner.user.js' },
    { key: 'photoResizer', label: 'Photo resizer', url: 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-photo-resizer.user.js' },
    { key: 'fullWidth', label: 'Full-width desc', url: 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-full-width-description.user.js' }
  ];

  const DEFAULTS = SCRIPT_KEYS.reduce((acc, s) => {
    acc[s.key] = true;
    return acc;
  }, {});

  let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  settings = { ...DEFAULTS, ...settings };

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    location.reload();
  }

  function savePosition(left, top) {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ left, top }));
  }

  function loadPosition() {
    const pos = localStorage.getItem(POSITION_KEY);
    if (pos) return JSON.parse(pos);
    return { left: 20, top: 20 };
  }

  function loadStyle() {
    fetch(STYLE_URL)
      .then(res => res.text())
      .then(css => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
      });
  }

  function createPanel() {
    const pos = loadPosition();
    const panel = document.createElement('div');
    panel.className = 'floating-ui';
    panel.style.left = `${pos.left}px`;
    panel.style.top = `${pos.top}px`;

    const header = document.createElement('h3');
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Easy-Suite';
    const icon = document.createElement('img');
    icon.src = 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/media/easy-suite.png';
    icon.style.height = '16px';
    icon.style.marginLeft = '8px';
    icon.style.verticalAlign = 'middle';
    header.appendChild(titleSpan);
    header.appendChild(icon);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'easy-suite-body';

    SCRIPT_KEYS.forEach(({ key, label }) => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = settings[key];
      checkbox.addEventListener('change', () => {
        settings[key] = checkbox.checked;
        saveSettings();
      });
      const wrapper = document.createElement('label');
      wrapper.appendChild(checkbox);
      wrapper.appendChild(document.createTextNode(label));
      body.appendChild(wrapper);
    });

    const forceUpdateBtn = document.createElement('button');
    forceUpdateBtn.textContent = 'Force update';
    forceUpdateBtn.addEventListener('click', () => {
      window.open('https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-suite.user.js', '_blank');
    });
    body.appendChild(forceUpdateBtn);

    panel.appendChild(body);

    let collapsed = false;
    header.addEventListener('dblclick', () => {
      collapsed = !collapsed;
      panel.classList.toggle('easy-suite-collapsed', collapsed);
    });

    document.body.appendChild(panel);

    // Dragging
    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - panel.getBoundingClientRect().left;
      offsetY = e.clientY - panel.getBoundingClientRect().top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      panel.style.left = `${newX}px`;
      panel.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        savePosition(parseInt(panel.style.left), parseInt(panel.style.top));
        isDragging = false;
      }
    });
  }

  function loadScripts() {
    SCRIPT_KEYS.forEach(({ key, url }) => {
      if (!settings[key]) return;
      fetch(url)
        .then(r => r.text())
        .then(code => eval(code))
        .catch(e => console.error(`Failed to load ${url}`, e));
    });
  }

  function init() {
    loadStyle();
    createPanel();
    loadScripts();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
