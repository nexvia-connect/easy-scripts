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
        width: 200px;
      }
      .floating-ui h3 {
        margin: 0 0 6px 0;
        color: white;
        font-size: 14px;
        border-bottom: 1px solid #444;
        padding-bottom: 4px;
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

    const title = document.createElement('h3');
    title.textContent = 'Easy-Suite';
    panel.appendChild(title);

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
      panel.appendChild(wrapper);
    });

    const forceUpdateBtn = document.createElement('button');
    forceUpdateBtn.textContent = 'Force update';
    forceUpdateBtn.addEventListener('click', () => {
      window.open('https://raw.githubusercontent.com/nexvia-connect/easy-scripts/main/easy-suite.user.js', '_blank');
    });
    panel.appendChild(forceUpdateBtn);

    document.body.appendChild(panel);
  }

  function shouldRun(key) {
    return settings[key];
  }

  // Load selected scripts dynamically
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
