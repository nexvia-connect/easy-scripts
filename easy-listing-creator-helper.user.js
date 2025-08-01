// ==UserScript==
// @name         Easy Listing Creator Helper
// @namespace    http://tampermonkey.net/
// @version      4.25
// @description  Floating JSON UI with import/export via URL (#/route?data=base64), collapses only on control clicks, and supports left/right screen alignment with smooth animation
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'easy_listing_data';
    const LAST_USED_KEY = 'easy_listing_last_used';
    let jsonData = {};
    let redirectedViaHash = false;

    if (location.hash.includes('data=')) {
        try {
            const params = new URLSearchParams(location.hash.split('?')[1]);
            const encoded = params.get('data');
            if (encoded) {
                const decoded = decodeURIComponent(escape(atob(encoded)));
                const parsed = JSON.parse(decoded);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                localStorage.setItem(LAST_USED_KEY, Date.now());
                redirectedViaHash = true;
                history.replaceState(null, '', location.origin + location.pathname + '#/');
            }
        } catch {
            alert('Failed to load shared listing data from URL.');
        }
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://nexvia-connect.github.io/easy-scripts/styles/creator-helper-styles.css';
    document.head.appendChild(link);

    const iconLink = document.createElement('link');
    iconLink.rel = 'stylesheet';
    iconLink.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(iconLink);

    const wrapper = document.createElement('div');
    wrapper.className = 'elch-wrapper right';
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

    collapsedCircle.addEventListener('click', () => {
        wrapper.classList.contains('expanded') ? collapseUI() : expandUI();
    });

    document.addEventListener('click', (e) => {
        const target = e.target;
        const isControl = target.closest('.copy') ||
                          target.closest('.fetch-txt') ||
                          target.closest('.elch-download') ||
                          target.closest('#elch-inline-save') ||
                          target.closest('#elch-inline-reset');

        if (isControl) {
            collapseUI();
        }
    });

    function extractMarkdownLink(str) {
        const match = str.match(/\[([^\]]+)]\(([^)]+)\)/);
        return match ? { label: match[1], url: match[2] } : null;
    }

    function copyToClipboard(val) {
        try {
            navigator.clipboard.writeText(val).catch(() => GM_setClipboard(val));
        } catch {
            GM_setClipboard(val);
        }
    }

    function determineType(key, val) {
        const lowerKey = key.toLowerCase();
    
        if (val === 'true' || val === 'false') return 'boolean';
    
        if (key === 'Download file' || key === 'Download description') return 'fetchText';
    
        if (extractMarkdownLink(val)) return 'markdown';
    
        if (
            typeof key === 'string' &&
            [ "Visit 'photos'", "Visit 'floorplans'", "Visit 'listing errors'", "Visit 'hidden listings'" ].includes(key) &&
            val.startsWith('http')
        ) return 'externalOpen';
    
        if (val.startsWith('http') && /\.(zip|pdf|docx?|xlsx?|jpg|png|jpeg|gif)/i.test(val)) return 'downloadLink';
    
        if (val.startsWith('http')) return 'copyText';
    
        return 'text';
    }
    
    function renderRow(key, val) {
        const type = determineType(key, val);
        const row = document.createElement('div');
        row.className = 'elch-entry';

        let html = `<div>${key}</div><div>`;

        if (type === 'fetchText') {
            html += `<span class="copy fetch-txt material-icons" style="font-size:14px;vertical-align:middle;" data-url="${val}">content_copy</span>`;
        } else if (type === 'copyText' || type === 'text') {
            html += `<span>${val}</span> <span class="copy material-icons" style="font-size:14px;vertical-align:middle;">content_copy</span>`;
        } else if (type === 'markdown') {
            const md = extractMarkdownLink(val);
            html = `<div>${md.label}</div><div><a href="${md.url}" target="_blank"><button class="elch-download">Open</button></a>`;
        } else if (type === 'externalOpen' || type === 'downloadLink') {
            html = `<div>${key}</div><div><a href="${val}" target="_blank"><button class="elch-download">Open</button></a>`;
        } else if (type === 'boolean') {
            html += `<span>${val}</span>`;
        }

        html += '</div>';
        row.innerHTML = html;

        const copyBtn = row.querySelector('.copy');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                copyToClipboard(val);
            });
        }

        const fetchBtn = row.querySelector('.fetch-txt');
        if (fetchBtn) {
            fetchBtn.onclick = async () => {
                try {
                    const res = await fetch(val);
                    const text = await res.text();
                    copyToClipboard(text);
                } catch {
                    alert('Failed to fetch or copy .txt file.');
                }
            };
        }

        return row;
    }

    function showSections() {
        sectionBox.innerHTML = '';

        if (jsonData.title) {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'elch-title';
            titleDiv.style.position = 'relative';

            const titleText = document.createElement('span');
            titleText.textContent = jsonData.title;

            const pipeLink = document.createElement('a');
            pipeLink.href = jsonData['3. Coordonnées']?.['URL du deal Pipedrive'] || '#';
            pipeLink.target = '_blank';
            pipeLink.innerHTML = `<img src="https://nexvia-connect.github.io/easy-scripts/media/pipedrive-favicon.png" class="elch-pipedrive-icon" />`;

            const iconLeft = document.createElement('span');
            iconLeft.className = 'material-icons elch-title-controls elch-title-left';
            iconLeft.textContent = 'keyboard_arrow_left';
            iconLeft.title = 'Align left';
            iconLeft.onclick = (e) => {
                e.stopPropagation();
                if (wrapper.classList.contains('right')) {
                    wrapper.classList.remove('right');
                    requestAnimationFrame(() => {
                        wrapper.classList.add('left');
                    });
                }
                wrapper.classList.add('expanded');
                collapsedCircle.style.display = 'none';
            };

            const iconRight = document.createElement('span');
            iconRight.className = 'material-icons elch-title-controls elch-title-right';
            iconRight.textContent = 'keyboard_arrow_right';
            iconRight.title = 'Align right';
            iconRight.onclick = (e) => {
                e.stopPropagation();
                if (wrapper.classList.contains('left')) {
                    wrapper.classList.remove('left');
                    requestAnimationFrame(() => {
                        wrapper.classList.add('right');
                    });
                }
                wrapper.classList.add('expanded');
                collapsedCircle.style.display = 'none';
            };

            titleDiv.appendChild(iconLeft);
            titleDiv.appendChild(titleText);
            titleDiv.appendChild(pipeLink);
            titleDiv.appendChild(iconRight);
            titleDiv.addEventListener('click', (e) => {
                if (!e.target.classList.contains('material-icons')) {
                    collapseUI();
                }
            });
            sectionBox.appendChild(titleDiv);
        }

        const importSection = document.createElement('details');
        importSection.className = 'elch-section';
        importSection.setAttribute('open', '');
        importSection.innerHTML = `
            <summary>0. Import code</summary>
            <div class="elch-entry" style="flex-direction: column;">
                <textarea id="elch-inline-input">${Object.keys(jsonData).length > 0 ? JSON.stringify(jsonData, null, 2) : ''}</textarea><br>
                <button id="elch-inline-save">Load</button>
                <button id="elch-inline-reset">Reset</button>
            </div>`;
        sectionBox.appendChild(importSection);

        document.getElementById('elch-inline-save').onclick = () => {
            try {
                const txt = document.getElementById('elch-inline-input').value;
                jsonData = JSON.parse(txt);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(jsonData));
                localStorage.setItem(LAST_USED_KEY, Date.now());
                showSections();
            } catch {
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
                const row = renderRow(key, String(entries[key]));
                details.appendChild(row);
            }

            const summaryEl = details.querySelector('summary');
            summaryEl.addEventListener('click', () => {
                document.querySelectorAll('.elch-section').forEach(other => {
                    if (other !== details) other.removeAttribute('open');
                });
            });

            sectionBox.appendChild(details);
        }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    const lastUsed = parseInt(localStorage.getItem(LAST_USED_KEY), 10);
    const now = Date.now();
    if (!jsonData || Object.keys(jsonData).length === 0) {
        if (saved && (!lastUsed || now - lastUsed <= 3600000)) {
            try {
                jsonData = JSON.parse(saved);
                localStorage.setItem(LAST_USED_KEY, now);
            } catch {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(LAST_USED_KEY);
            }
        }
    }

    showSections();
})();
