// ==UserScript==
// @name         Easy Suite Loader
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Loads all Easy scripts in one with UI controls
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SETTINGS_KEY = 'easy_suite_enabled_scripts';
  const POSITION_KEY = 'easy_suite_ui_position';
  const SCRIPT_KEYS = [
    { key: 'refInsert', label: 'Ref insert' },
    { key: 'uiCleaner', label: 'UI cleaner' },
    { key: 'photoResizer', label: 'Photo resizer' },
    { key: 'fullWidth', label: 'Full-width desc' }
  ];

  const DEFAULTS = SCRIPT_KEYS.reduce((acc, s) => {
    acc[s.key] = true;
    return acc;
  }, {});

  let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  settings = { ...DEFAULTS, ...settings };

  const position = JSON.parse(localStorage.getItem(POSITION_KEY) || '{}');

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    location.reload();
  }

  function createPanel() {
    const style = document.createElement('style');
    style.textContent = `
      .floating-ui {
        position: fixed;
        top: ${position.top || '20px'};
        left: ${position.left || '20px'};
        background: #000;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid #555;
        font-family: 'Open Sans', sans-serif;
        z-index: 9999;
        width: 200px;
        cursor: move;
      }
      .floating-ui h3 {
        margin: 0 0 6px 0;
        color: white;
        font-size: 14px;
        border-bottom: 1px solid #444;
        padding-bottom: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .floating-ui h3 img {
        height: 16px;
        margin-right: 6px;
      }
      .floating-ui label {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        color: #fff;
        font-size: 12px;
      }
      .floating-ui button {
        display: block;
        width: 100%;
        background: #222;
        color: #fff;
        border: 1px solid #555;
        padding: 4px 10px;
        border-radius: 3px;
        font-size: 12px;
        cursor: pointer;
        text-align: center;
        font-family: 'Open Sans', sans-serif;
        margin-top: 8px;
      }
      .floating-ui button:hover {
        background: #333;
      }
      .easy-suite-toggle {
        cursor: pointer;
        color: #ccc;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.className = 'floating-ui';
    document.body.appendChild(panel);

    const title = document.createElement('h3');
    const titleLeft = document.createElement('span');
    const logo = document.createElement('img');
    logo.src = 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-suite.png';
    logo.alt = 'Icon';

    const titleText = document.createTextNode('Easy-Suite');
    titleLeft.appendChild(logo);
    titleLeft.appendChild(titleText);
    title.appendChild(titleLeft);

    const toggle = document.createElement('span');
    toggle.textContent = '▼';
    toggle.className = 'easy-suite-toggle';
    title.appendChild(toggle);
    panel.appendChild(title);

    const optionsContainer = document.createElement('div');

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
      optionsContainer.appendChild(wrapper);
    });

    const forceUpdateBtn = document.createElement('button');
    forceUpdateBtn.textContent = 'Force update';
    forceUpdateBtn.addEventListener('click', () => {
      window.open('https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-suite.user.js', '_blank');
    });
    optionsContainer.appendChild(forceUpdateBtn);
    panel.appendChild(optionsContainer);

    toggle.addEventListener('click', () => {
      const collapsed = optionsContainer.style.display === 'none';
      optionsContainer.style.display = collapsed ? 'block' : 'none';
      toggle.textContent = collapsed ? '▼' : '▲';
    });

    // Drag logic
    let isDragging = false;
    let startX, startY;

    panel.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - panel.offsetLeft;
      startY = e.clientY - panel.offsetTop;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const left = `${e.clientX - startX}px`;
      const top = `${e.clientY - startY}px`;
      panel.style.left = left;
      panel.style.top = top;
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      localStorage.setItem(POSITION_KEY, JSON.stringify({
        top: panel.style.top,
        left: panel.style.left
      }));
    });
  }

  function shouldRun(key) {
    return settings[key];
  }

  if (shouldRun('refInsert')) {
    const s = document.createElement('script');
    s.src = 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-ref-insert.user.js';
    document.body.appendChild(s);
  }

  if (shouldRun('uiCleaner')) {
    const s = document.createElement('script');
    s.src = 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-ui-cleaner.user.js';
    document.body.appendChild(s);
  }

  if (shouldRun('photoResizer')) {
    const s = document.createElement('script');
    s.src = 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-photo-resizer.user.js';
    document.body.appendChild(s);
  }

  if (shouldRun('fullWidth')) {
    const s = document.createElement('script');
    s.src = 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-full-width-description.user.js';
    document.body.appendChild(s);
  }

  createPanel();
})();
