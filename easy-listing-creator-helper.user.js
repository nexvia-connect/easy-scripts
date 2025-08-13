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
    wrapper.style.position = 'fixed';
    wrapper.style.zIndex = '9999';
    wrapper.style.cursor = 'move';
    wrapper.style.height = 'auto';
    wrapper.style.maxHeight = '80vh';
    wrapper.style.overflowY = 'auto';
    wrapper.style.overflowX = 'hidden';
    document.body.appendChild(wrapper);

    const collapsedCircle = document.createElement('div');
    collapsedCircle.className = 'elch-collapsed-circle';
    collapsedCircle.innerHTML = '<span class="material-icons">add</span>';
    wrapper.appendChild(collapsedCircle);

    const sectionBox = document.createElement('div');
    sectionBox.className = 'elch-sections';
    sectionBox.style.height = 'auto';
    sectionBox.style.overflow = 'visible';
    wrapper.appendChild(sectionBox);

    function recalculateHeight() {
        if (wrapper.classList.contains('expanded')) {
            setTimeout(() => {
                const contentHeight = sectionBox.scrollHeight;
                const maxHeight = Math.min(contentHeight, window.innerHeight * 0.8);
                wrapper.style.height = maxHeight + 'px';
            }, 10);
        }
    }

    function expandUI() {
        wrapper.classList.add('expanded');
        collapsedCircle.style.display = 'none';
        wrapper.style.cursor = 'move';
        wrapper.style.height = 'auto';
        wrapper.style.maxHeight = '80vh';
        wrapper.style.overflowY = 'auto';
        wrapper.style.overflowX = 'hidden';

        // Force height recalculation with a longer delay to ensure content is rendered
        setTimeout(() => {
            recalculateHeight();
        }, 50);
    }

    function collapseUI() {
        wrapper.classList.remove('expanded');
        collapsedCircle.style.display = 'flex';
        wrapper.style.cursor = 'default';
        wrapper.style.height = 'auto';
        wrapper.style.overflowY = 'visible';
        wrapper.style.overflowX = 'visible';
    }

    collapsedCircle.addEventListener('click', () => {
        if (wrapper.classList.contains('expanded')) {
            collapseUI();
        } else {
            expandUI();
        }
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

    // Add click listener to wrapper for height recalculation
    wrapper.addEventListener('click', (e) => {
        // Don't recalculate if clicking on the collapsed circle
        if (e.target.closest('.elch-collapsed-circle')) {
            return;
        }

        // Recalculate height on any click inside the wrapper
        recalculateHeight();
    });

    // Add drag and drop functionality
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    function startDrag(e) {
        if (!wrapper.classList.contains('expanded')) return;

        // Check if clicking on interactive elements - don't start drag
        if (e.target.closest('button') ||
            e.target.closest('textarea') ||
            e.target.closest('input') ||
            e.target.closest('.copy') ||
            e.target.closest('.fetch-txt') ||
            e.target.closest('.elch-download') ||
            e.target.closest('a') ||
            e.target.closest('summary') ||
            e.target.closest('details') ||
            e.target.closest('.elch-entry')) {
            return;
        }

        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        const rect = wrapper.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        wrapper.style.transition = 'none';
        wrapper.style.userSelect = 'none';

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);

        e.preventDefault();
    }

    function onDrag(e) {
        if (!isDragging) return;

        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;

        const newLeft = initialLeft + deltaX;
        const newTop = initialTop + deltaY;

        // Keep the wrapper within viewport bounds
        const maxLeft = window.innerWidth - wrapper.offsetWidth;
        const maxTop = window.innerHeight - wrapper.offsetHeight;

        wrapper.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
        wrapper.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
    }

    function stopDrag() {
        if (!isDragging) return;

        isDragging = false;
        wrapper.style.transition = '';
        wrapper.style.userSelect = '';

        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }

    // Add drag event listeners
    wrapper.addEventListener('mousedown', startDrag);

    // Remove the old drag prevention logic since it's now handled in startDrag
    // wrapper.addEventListener('mousedown', (e) => { ... });

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
            [ "photos", "floorplans", "Visit 'listing errors'", "Visit 'hidden listings'" ].includes(key) &&
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

        // Always show title section, but with different content based on data
        const titleDiv = document.createElement('div');
        titleDiv.className = 'elch-title';
        titleDiv.style.position = 'relative';
        titleDiv.style.display = 'flex';
        titleDiv.style.justifyContent = 'space-between';
        titleDiv.style.alignItems = 'center';

        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        titleContainer.style.gap = '8px';

        const titleText = document.createElement('span');
        titleText.textContent = jsonData.title || 'Easy creator';

        // Look for Pipedrive URL in any section
        let pipedriveUrl = null;
        for (const section in jsonData) {
            if (jsonData[section] && typeof jsonData[section] === 'object') {
                if (jsonData[section]['URL du deal Pipedrive']) {
                    pipedriveUrl = jsonData[section]['URL du deal Pipedrive'];
                    break;
                }
            }
        }

        // Show Pipedrive link if we have a valid URL
        if (pipedriveUrl) {
            const pipeLink = document.createElement('a');
            pipeLink.href = pipedriveUrl;
            pipeLink.target = '_blank';
            pipeLink.innerHTML = `<img src="https://nexvia-connect.github.io/easy-scripts/media/pipedrive-favicon.png" class="elch-pipedrive-icon" />`;
            titleContainer.appendChild(pipeLink);
        }

        const closeButton = document.createElement('span');
        closeButton.className = 'material-icons elch-close';
        closeButton.textContent = 'close';
        closeButton.title = 'Close';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = (e) => {
            e.stopPropagation();
            collapseUI();
        };

        titleContainer.appendChild(titleText);
        titleDiv.appendChild(titleContainer);
        titleDiv.appendChild(closeButton);
        sectionBox.appendChild(titleDiv);

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

                // Force height recalculation after section toggle
                recalculateHeight();
            });

            sectionBox.appendChild(details);
        }

        // Initial height calculation after content is loaded
        recalculateHeight();
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
