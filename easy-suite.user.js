// ==UserScript==
// @name         Easy Suite Loader
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Loads all Easy scripts in one, with UI toggle control
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-ref-insert.user.js
// @require      https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-ui-cleaner.user.js
// @require      https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-photo-resizer.user.js
// @require      https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-full-width-description.user.js
// ==/UserScript==

(function () {
  'use strict';

  const SETTINGS_KEY = 'easy_suite_enabled_scripts';
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

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    location.reload();
  }

  function createPanel() {
    const style = document.createElement('style');
    style.textContent = `
      .floating-ui {
        position: fixed;
        top: 20px;
        left: 20px;
        background: #000;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid #555;
        font-family: 'Open Sans', sans-serif;
        z-index: 9999;
        width: 220px;
      }
      .floating-ui h3 {
        margin: 0 0 6px 0;
        color: white;
        font-size: 14px;
        border-bottom: 1px solid #444;
        padding-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }
      .floating-ui h3 img {
        height: 10px;
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
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.className = 'floating-ui';
    panel.setAttribute('draggable', 'true');

    const title = document.createElement('h3');
    const icon = document.createElement('img');
    icon.src = 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-suite.png';
    icon.alt = 'Logo';
    title.appendChild(icon);
    title.appendChild(document.createTextNode('Easy-Suite'));
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
    panel.appendChild(optionsContainer);

    const forceUpdateBtn = document.createElement('button');
    forceUpdateBtn.textContent = 'Force update';
    forceUpdateBtn.addEventListener('click', () => {
      window.open('https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-suite.user.js', '_blank');
    });
    panel.appendChild(forceUpdateBtn);

    // Collapse/expand
    title.addEventListener('click', () => {
      optionsContainer.style.display = optionsContainer.style.display === 'none' ? 'block' : 'none';
    });

    // Dragging logic
    let offsetX = 0, offsetY = 0;
    panel.addEventListener('dragstart', e => {
      offsetX = e.offsetX;
      offsetY = e.offsetY;
    });
    panel.addEventListener('dragend', e => {
      panel.style.left = (e.pageX - offsetX) + 'px';
      panel.style.top = (e.pageY - offsetY) + 'px';
      localStorage.setItem('easy_suite_ui_position', JSON.stringify({ x: e.pageX - offsetX, y: e.pageY - offsetY }));
    });

    // Restore position
    const savedPos = JSON.parse(localStorage.getItem('easy_suite_ui_position') || '{}');
    if (savedPos.x && savedPos.y) {
      panel.style.left = savedPos.x + 'px';
      panel.style.top = savedPos.y + 'px';
    }

    document.body.appendChild(panel);
  }

  createPanel();
})();
