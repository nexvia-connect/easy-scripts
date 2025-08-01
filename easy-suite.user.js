// ==UserScript==
// @name         Easy Suite Loader
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Load and control Easy Suite scripts with UI toggle, collapsed mode, persistence, and SPA support
// @match        https://nexvia1832.easy-serveur53.com/*
// @include      https://nexvia1832.easy-serveur53.com/*
// @grant        none
// @connect      raw.githubusercontent.com
// @run-at       document-idle
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
    { key: 'fullWidth', label: 'Full-width description', url: 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-full-width-description.user.js' },
    { key: 'listingHelper', label: 'Listing creator', url: 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-listing-creator-helper.user.js' }
  ];

  const DEFAULTS = SCRIPT_KEYS.reduce((acc, s) => {
    acc[s.key] = true;
    return acc;
  }, {});

  let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  settings = { ...DEFAULTS, ...settings };

  let helperMap = {};
  let suite = null;
  let cleaner = null;

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

  function loadStyle(callback) {
    fetch(STYLE_URL)
      .then(res => res.text())
      .then(css => {
        const style = document.createElement('style');
        style.textContent = css + `
          .easy-suite-body {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.25s ease, opacity 0.25s ease;
            opacity: 0;
          }
          .floating-ui:not(.easy-suite-collapsed) .easy-suite-body {
            max-height: 400px;
            opacity: 1;
          }
        `;
        document.head.appendChild(style);
        callback?.();
      });
  }

  function createPanel() {
    const pos = loadPosition();
    suite = document.createElement('div');
    suite.className = 'floating-ui easy-suite-collapsed';
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
    forceUpdateBtn.textContent = 'Update';
    forceUpdateBtn.addEventListener('click', () => {
      window.open('https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-suite.user.js', '_blank');
    });
    body.appendChild(forceUpdateBtn);

    suite.appendChild(body);
    document.body.appendChild(suite);

    suite.addEventListener('mouseenter', () => {
      suite.classList.remove('easy-suite-collapsed');
      if (cleaner) cleaner.style.display = '';
    });

    document.addEventListener('click', (e) => {
      if (!suite.contains(e.target) && !cleaner?.contains(e.target)) {
        suite.classList.add('easy-suite-collapsed');
        if (cleaner) cleaner.style.display = 'none';
      }
    });

    if (settings['uiCleaner']) {
      const tryAttachCleaner = () => {
        cleaner = document.querySelector('.floating-ui-cleaner');
        if (cleaner) {
          cleaner.style.position = 'fixed';
          cleaner.style.left = suite.style.left;
          cleaner.style.top = `${suite.getBoundingClientRect().top + suite.offsetHeight + 5}px`;
          cleaner.style.zIndex = '9998';
          cleaner.style.display = 'none';
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
    if (document.querySelector('.floating-ui')) return;

    loadStyle(() => {
      const faviconUrl = 'https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/media/logo.png';
      const oldFavicon = document.querySelector('link[rel="icon"]');
      if (oldFavicon) oldFavicon.remove();
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.href = faviconUrl;
      document.head.appendChild(newFavicon);

      fetch(HELPER_URL)
        .then(res => res.json())
        .then(json => {
          helperMap = typeof json === 'object' && json !== null ? json : {};
          createPanel();
        })
        .catch(() => {
          helperMap = {};
          createPanel();
        });

      loadScripts();
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  function onRouteChange() {
    const oldUrl = location.href;
    requestAnimationFrame(() => {
      if (location.href !== oldUrl) {
        init();
      }
    });
  }

  history.pushState = function () {
    originalPushState.apply(this, arguments);
    onRouteChange();
  };

  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    onRouteChange();
  };

  window.addEventListener('popstate', onRouteChange);
})();
