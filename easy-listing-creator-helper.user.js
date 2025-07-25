// ==UserScript==
// @name         Easy Listing Creator Helper
// @namespace    http://tampermonkey.net/
// @version      2.9
// @description  Floating JSON UI for structured listing data
// @match        *://*/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'easy_listing_data';
    const LAST_USED_KEY = 'easy_listing_last_used';
    let jsonData = {};
    let collapseTimeout = null;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://nexvia-connect.github.io/easy-scripts/styles/creator-helper-styles.css';
    document.head.appendChild(link);

    const iconLink = document.createElement('link');
    iconLink.rel = 'stylesheet';
    iconLink.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(iconLink);

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
        if (!wrapper.classList.contains('expanded') && sectionBox.innerHTML.trim() === '') {
            sectionBox.innerHTML = '<div style="color:#999; font-family:sans-serif; font-size:12px; padding:6px 10px;">Add code to helper using the + icon on the right.</div>';
        }
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
            <button id="elch-reset">Reset</button>
        `;
        document.body.appendChild(popup);

        requestAnimationFrame(() => popup.classList.add('show'));

        document.getElementById('elch-save').onclick = () => {
            try {
                const txt = document.getElementById('elch-json-input').value;
                jsonData = JSON.parse(txt);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(jsonData));
                localStorage.setItem(LAST_USED_KEY, Date.now());
                showSections();
                popup.classList.remove('show');
                setTimeout(() => {
                    popup.remove();
                    popup = null;
                }, 300);
            } catch (e) {
                alert('Invalid JSON');
            }
        };

        document.getElementById('elch-close').onclick = () => {
            popup.classList.remove('show');
            setTimeout(() => {
                popup.remove();
                popup = null;
            }, 300);
        };

        document.getElementById('elch-reset').onclick = () => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LAST_USED_KEY);
            jsonData = {};
            sectionBox.innerHTML = '<div style="color:#999; font-family:sans-serif; font-size:12px; padding:6px 10px;">Add code to helper</div>';
            popup.classList.remove('show');
            setTimeout(() => {
                popup.remove();
                popup = null;
            }, 300);
        };
    }

    function extractMarkdownLink(str) {
        const match = str.match(/\[([^\]]+)]\(([^)]+)\)/);
        return match ? { label: match[1], url: match[2] } : null;
    }

    function collapseImmediately() {
        wrapper.classList.remove('expanded');
        updateArrowState();
        clearTimeout(collapseTimeout);
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
                row.style.alignItems = 'center';
                const rawVal = entries[key];
                const val = String(rawVal);
                let content = '';

                const isCopyOnly = (key === 'Visite virtuelle' || key === 'URL du deal Pipedrive');
                const isTxtCopyOnly = key === 'Download file';
                const markdown = extractMarkdownLink(val);

                if (val === 'true' || val === 'false') {
                    content = `<div>${key}</div><div><span>${val}</span></div>`;
                } else if (isTxtCopyOnly) {
                    content = `<div>${key}</div><div><span class="copy fetch-txt material-icons" style="font-size: 14px; vertical-align: middle;" data-url="${val}">content_copy</span></div>`;
                } else if (markdown) {
                    content = `<div>${markdown.label}</div><div><a href="${markdown.url}" target="_blank"><button class="elch-download">Download</button></a></div>`;
                } else if (val.startsWith('http') && !isCopyOnly && /\.(zip|pdf|docx?|xlsx?|jpg|png|jpeg|gif)/i.test(val)) {
                    content = `<div>${key}</div><div><a href="${val}" target="_blank"><button class="elch-download">Download</button></a></div>`;
                } else {
                    content = `<div>${key}</div><div><span>${val}</span> <span class="copy material-icons" style="font-size: 14px; vertical-align: middle;">content_copy</span></div>`;
                }

                row.innerHTML = content;

                const copyBtn = row.querySelector('.copy');
                if (copyBtn && !copyBtn.classList.contains('fetch-txt')) {
                    copyBtn.onclick = () => {
                        GM_setClipboard(val);
                        collapseImmediately();
                    };
                }

                const fetchIcon = row.querySelector('.fetch-txt');
                if (fetchIcon) {
                    fetchIcon.onclick = async () => {
                        try {
                            const res = await fetch(val);
                            const text = await res.text();
                            GM_setClipboard(text);
                            collapseImmediately();
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
    mainBtn.innerHTML = '<span class="material-icons">add</span>';
    document.body.appendChild(mainBtn);

    mainBtn.onclick = () => {
        mainBtn.classList.toggle('spin');
        createPopup();
    };

    const saved = localStorage.getItem(STORAGE_KEY);
    const lastUsed = parseInt(localStorage.getItem(LAST_USED_KEY), 10);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (saved && (!lastUsed || now - lastUsed <= oneHour)) {
        try {
            jsonData = JSON.parse(saved);
            localStorage.setItem(LAST_USED_KEY, now);
            showSections();
        } catch (e) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LAST_USED_KEY);
        }
    } else {
        sectionBox.innerHTML = '<div style="color:#999; font-family:sans-serif; font-size:12px; padding:6px 10px;">Add code to helper</div>';
    }
})();
