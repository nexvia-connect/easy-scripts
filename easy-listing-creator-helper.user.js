// ==UserScript==
// @name         Easy Listing Creator Helper
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Floating JSON UI for structured listing data
// @match        *://*/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'easy_listing_data';
    let jsonData = {};
    let collapseTimeout = null;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://nexvia-connect.github.io/easy-scripts/styles/creator-helper-styles.css';
    document.head.appendChild(link);

    const wrapper = document.createElement('div');
    wrapper.className = 'elch-wrapper';
    document.body.appendChild(wrapper);

    const collapsedBar = document.createElement('div');
    collapsedBar.className = 'elch-collapsed-bar';
    collapsedBar.innerHTML = 'Helper ▲';
    wrapper.appendChild(collapsedBar);

    const sectionBox = document.createElement('div');
    sectionBox.className = 'elch-sections';
    wrapper.appendChild(sectionBox);

    function updateArrowState() {
        collapsedBar.innerHTML = wrapper.classList.contains('expanded') ? 'Helper ▼' : 'Helper ▲';
    }

    wrapper.addEventListener('mouseenter', () => {
        clearTimeout(collapseTimeout);
        wrapper.classList.add('expanded');
        updateArrowState();
    });

    wrapper.addEventListener('mouseleave', () => {
        collapseTimeout = setTimeout(() => {
            wrapper.classList.remove('expanded');
            updateArrowState();
        }, 1000);
    });

    collapsedBar.addEventListener('click', () => {
        wrapper.classList.remove('expanded');
        updateArrowState();
        clearTimeout(collapseTimeout);
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('expanded');
            updateArrowState();
            clearTimeout(collapseTimeout);
        }
    });

    let popup = null;

    function createPopup() {
        if (popup) return;
        popup = document.createElement('div');
        popup.className = 'elch-popup';
        popup.innerHTML = `
            <textarea id="elch-json-input"></textarea><br>
            <button id="elch-save">Save</button>
            <button id="elch-close">Close</button>
        `;
        document.body.appendChild(popup);

        document.getElementById('elch-save').onclick = () => {
            try {
                const txt = document.getElementById('elch-json-input').value;
                jsonData = JSON.parse(txt);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(jsonData));
                showSections();
                popup.remove();
                popup = null;
            } catch (e) {
                alert('Invalid JSON');
            }
        };

        document.getElementById('elch-close').onclick = () => {
            popup.remove();
            popup = null;
        };
    }

    function extractMarkdownLink(str) {
        const match = str.match(/\[([^\]]+)\]\(([^)]+)\)/);
        return match ? { label: match[1], url: match[2] } : null;
    }

    function showSections() {
        sectionBox.innerHTML = '';
        const allSections = [];

        for (const section in jsonData) {
            const details = document.createElement('details');
            details.className = 'elch-section';
            const summary = document.createElement('summary');
            summary.textContent = section;
            details.appendChild(summary);

            summary.addEventListener('click', () => {
                allSections.forEach(sec => {
                    if (sec !== details) sec.removeAttribute('open');
                });
            });

            const entries = jsonData[section];
            for (const key in entries) {
                const row = document.createElement('div');
                row.className = 'elch-entry';
                const rawVal = entries[key];
                const val = String(rawVal);
                let content = '';

                const isCopyOnly = (key === 'Visite virtuelle' || key === 'URL du deal Pipedrive');
                const isTxtCopyOnly = key === 'Download file';
                const markdown = extractMarkdownLink(val);

                if (val === 'true' || val === 'false') {
                    content = `<div>${key}</div><div><span>${val}</span></div>`;
                } else if (isTxtCopyOnly) {
                    content = `<div>${key}</div><div><span class="copy fetch-txt" data-url="${val}">📋</span></div>`;
                } else if (markdown) {
                    content = `<div>${markdown.label}</div><div><a href="${markdown.url}" target="_blank"><button class="elch-download">Download</button></a></div>`;
                } else if (val.startsWith('http') && !isCopyOnly && /\.(zip|pdf|docx?|xlsx?|jpg|png|jpeg|gif)/i.test(val)) {
                    content = `<div>${key}</div><div><a href="${val}" target="_blank"><button class="elch-download">Download</button></a></div>`;
                } else {
                    content = `<div>${key}</div><div><span>${val}</span> <span class="copy">📋</span></div>`;
                }

                row.innerHTML = content;

                const copyBtn = row.querySelector('.copy');
                if (copyBtn && !copyBtn.classList.contains('fetch-txt')) {
                    copyBtn.onclick = () => {
                        GM_setClipboard(val);
                        wrapper.classList.remove('expanded');
                        updateArrowState();
                        clearTimeout(collapseTimeout);
                    };
                }

                const fetchIcon = row.querySelector('.fetch-txt');
                if (fetchIcon) {
                    fetchIcon.onclick = async () => {
                        try {
                            const res = await fetch(val);
                            const text = await res.text();
                            GM_setClipboard(text);
                            wrapper.classList.remove('expanded');
                            updateArrowState();
                            clearTimeout(collapseTimeout);
                        } catch (err) {
                            alert('Failed to fetch or copy .txt file.');
                        }
                    };
                }

                details.appendChild(row);
            }

            allSections.push(details);
            sectionBox.appendChild(details);
        }
    }

    const mainBtn = document.createElement('div');
    mainBtn.className = 'elch-floating-button';
    mainBtn.textContent = '+';
    document.body.appendChild(mainBtn);

    mainBtn.onclick = () => {
        createPopup();
    };

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            jsonData = JSON.parse(saved);
            showSections();
        } catch (e) {
            localStorage.removeItem(STORAGE_KEY);
        }
    }
})();
