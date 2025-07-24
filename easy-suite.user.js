// ==UserScript==
// @name         Easy Suite Loader
// @namespace    http://tampermonkey.net/
// @version      2.6
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
  const HELPER_URL = 'https://nexvia-connect.github.io/easy-scripts/helper.json';

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

  let helperMap = {};

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

    const suite = document.createElement('div');
    suite.className = 'floating-ui';
    suite.style.left = `${pos.left}px`;
    suite.style.top = `${pos.top}px`;
    suite.style.position = 'fixed';

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
    suite.appendChild(header);

    const body = document.createElement('div');
    body.className = 'easy-suite-body';

    SCRIPT_KEYS.forEach(({ key, label }) => {
      const wrapper = document.createElement('label');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '8px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = settings[key];
      checkbox.addEventListener('change', () => {
        settings[key] = checkbox.checked;
        saveSettings();
      });

      const textNode = document.createTextNode(label);
      wrapper.appendChild(checkbox);
      wrapper.appendChild(textNode);

      if (helperMap[key]) {
        const helper = document.createElement('div');
        helper.className = 'input-help-icon';
        helper.textContent = 'i';
        helper.setAttribute('data-help', helperMap[key]);
        wrapper.appendChild(helper);
      }

      body.appendChild(wrapper);
    });

    const forceUpdateBtn = document.createElement('button');
    forceUpdateBtn.textContent = 'Force update';
    forceUpdateBtn.addEventListener('click', () => {
      window.open('https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-suite.user.js', '_blank');
    });
    body.appendChild(forceUpdateBtn);

    suite.appendChild(body);
    document.body.appendChild(suite);

    let cleaner = null;
    if (settings['uiCleaner']) {
      const tryAttachCleaner = () => {
        cleaner = document.querySelector('.floating-ui-cleaner');
        if (cleaner) {
          cleaner.style.position = 'fixed';
          cleaner.style.left = suite.style.left;
          cleaner.style.top = `${suite.getBoundingClientRect().top + suite.offsetHeight + 5}px`;
          cleaner.style.zIndex = '9998';
        } else {
          setTimeout(tryAttachCleaner, 200);
        }
      };
      tryAttachCleaner();
    }

    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - suite.getBoundingClientRect().left;
      offsetY = e.clientY - suite.getBoundingClientRect().top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      suite.style.left = `${newX}px`;
      suite.style.top = `${newY}px`;
      if (cleaner) {
        cleaner.style.left = `${newX}px`;
        cleaner.style.top = `${newY + suite.offsetHeight + 5}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        savePosition(parseInt(suite.style.left), parseInt(suite.style.top));
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
    fetch(HELPER_URL)
      .then(res => res.json())
      .then(json => {
        helperMap = json;
        createPanel();
      });
    loadScripts();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
