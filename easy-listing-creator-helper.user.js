// ==UserScript==
// @name         Easy Listing Creator Helper
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Floating JSON UI for structured listing data
// @match        https://nexvia1832.easy-serveur53.com/*
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

    const collapsedCircle = document.createElement('div');
    collapsedCircle.className = 'elch-collapsed-circle';
    collapsedCircle.innerHTML = '<span class="material-icons">add</span>';
    wrapper.appendChild(collapsedCircle);

    const sectionBox = document.createElement('div');
    sectionBox.className = 'elch-sections';
    wrapper.appendChild(sectionBox);

    function expandUI() {
        wrapper.classList.add('expanded');
        collapsedCircle.style.display = 'none';
    }

    function collapseUI() {
        wrapper.classList.remove('expanded');
        collapsedCircle.style.display = 'flex';
    }

    wrapper.addEventListener('mouseenter', () => {
        clearTimeout(collapseTimeout);
    });

    wrapper.addEventListener('mouseleave', () => {
        collapseTimeout = setTimeout(() => {
            collapseUI();
        }, 1000);
    });

    collapsedCircle.addEventListener('click', () => {
        if (wrapper.classList.contains('expanded')) {
            collapseUI();
        } else {
            expandUI();
        }
    });

    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!wrapper.contains(target)) {
            collapseUI();
            clearTimeout(collapseTimeout);
        } else if (
            target.id === 'elch-inline-save' ||
            target.id === 'elch-inline-reset'
        ) {
            // allow interaction
        } else {
            clearTimeout(collapseTimeout);
        }
    });

    function extractMarkdownLink(str) {
        const match = str.match(/\[([^\]]+)]\(([^)]+)\)/);
        return match ? { label: match[1], url: match[2] } : null;
    }

    function collapseImmediately() {
        collapseUI();
        clearTimeout(collapseTimeout);
    }

    function showSections() {
        sectionBox.innerHTML = '';

        if (jsonData.title) {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'elch-title';
            const titleText = document.createElement('span');
            titleText.textContent = jsonData.title;

            const pipeLink = document.createElement('a');
            pipeLink.href = jsonData['1. Informations complémentaires']?.['URL du deal Pipedrive'] || '#';
            pipeLink.target = '_blank';
            pipeLink.innerHTML = `<img src="https://nexvia-connect.github.io/easy-scripts/media/pipedrive-favicon.png" class="elch-pipedrive-icon" />`;

            titleDiv.appendChild(titleText);
            titleDiv.appendChild(pipeLink);
            sectionBox.appendChild(titleDiv);
        }

        const importSection = document.createElement('details');
        importSection.className = 'elch-section';
        const importSummary = document.createElement('summary');
        importSummary.textContent = '0. Import code';
        importSection.appendChild(importSummary);
        const importBox = document.createElement('div');
        importBox.className = 'elch-entry';
        importBox.style.flexDirection = 'column';

        const currentJsonString = Object.keys(jsonData).length > 0 ? JSON.stringify(jsonData, null, 2) : '';
        importBox.innerHTML = `
            <textarea id="elch-inline-input" style="width:100%;height:100px;font-family:monospace;font-size:12px;background:#111;color:#eee;border:1px solid #444;">${currentJsonString}</textarea><br>
            <button id="elch-inline-save">Load</button>
            <button id="elch-inline-reset">Reset</button>
        `;
        importSection.appendChild(importBox);
        sectionBox.appendChild(importSection);

        const allSections = [importSection];

        document.getElementById('elch-inline-save').onclick = () => {
            try {
                const txt = document.getElementById('elch-inline-input').value;
                jsonData = JSON.parse(txt);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(jsonData));
                localStorage.setItem(LAST_USED_KEY, Date.now());
                showSections();
            } catch (e) {
                alert('Invalid JSON');
            }
        };

        document.getElementById('elch-inline-reset').onclick = () => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LAST_USED_KEY);
            jsonData = {};
            showSections();
        };

        if (!jsonData || Object.keys(jsonData).length === 0) return;

        for (const section in jsonData) {
            if (section === 'title') continue;
            const details = document.createElement('details');
            details.className = 'elch-section';
            const summary = document.createElement('summary');
            summary.textContent = section;
            details.appendChild(summary);

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
                    copyBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        GM_setClipboard(val);
                        setTimeout(collapseImmediately, 0);
                    });
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

        const detailNodes = sectionBox.querySelectorAll('details');
        detailNodes.forEach((detailsEl) => {
            const summary = detailsEl.querySelector('summary');
            summary?.addEventListener('click', () => {
                detailNodes.forEach((other) => {
                    if (other !== detailsEl) other.removeAttribute('open');
                });
            });
        });
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    const lastUsed = parseInt(localStorage.getItem(LAST_USED_KEY), 10);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (saved && (!lastUsed || now - lastUsed <= oneHour)) {
        try {
            jsonData = JSON.parse(saved);
            localStorage.setItem(LAST_USED_KEY, now);
        } catch (e) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LAST_USED_KEY);
        }
    }
    showSections();
})();
