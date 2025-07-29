// ==UserScript==
// @name         Easy Listing Creator Helper
// @namespace    http://tampermonkey.net/
// @version      4.6
// @description  Floating JSON UI with import/export via URL (#/route?data=base64) and redirect auto-load
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'easy_listing_data';
    const LAST_USED_KEY = 'easy_listing_last_used';
    let jsonData = {};

    function parseBase64Json(data) {
        try {
            const decoded = atob(decodeURIComponent(data));
            return JSON.parse(decoded);
        } catch {
            return null;
        }
    }

    if (location.href.includes('#/listing-helper?data=')) {
        const encoded = new URLSearchParams(location.hash.split('?')[1]).get('data');
        const parsed = parseBase64Json(encoded);
        if (parsed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            localStorage.setItem(LAST_USED_KEY, Date.now());
            location.replace('https://nexvia1832.easy-serveur53.com/#/');
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
    wrapper.className = 'elch-wrapper expanded';
    document.body.appendChild(wrapper);

    const collapsedCircle = document.createElement('div');
    collapsedCircle.className = 'elch-collapsed-circle';
    collapsedCircle.innerHTML = '<span class="material-icons">add</span>';
    wrapper.appendChild(collapsedCircle);

    const sectionBox = document.createElement('div');
    sectionBox.className = 'elch-sections';
    wrapper.appendChild(sectionBox);

    function collapseUI() {
        wrapper.classList.remove('expanded');
        collapsedCircle.style.display = 'flex';
    }

    function expandUI() {
        wrapper.classList.add('expanded');
        collapsedCircle.style.display = 'none';
    }

    wrapper.addEventListener('mouseenter', () => clearTimeout(wrapper._collapseTimeout));
    wrapper.addEventListener('mouseleave', () => {
        wrapper._collapseTimeout = setTimeout(collapseUI, 1000);
    });

    collapsedCircle.addEventListener('click', () => {
        wrapper.classList.contains('expanded') ? collapseUI() : expandUI();
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) collapseUI();
    });

    function copyToClipboard(val) {
        try {
            navigator.clipboard.writeText(val).catch(() => GM_setClipboard(val));
        } catch {
            GM_setClipboard(val);
        }
    }

    function extractMarkdownLink(str) {
        const match = str.match(/\[([^\]]+)]\(([^)]+)\)/);
        return match ? { label: match[1], url: match[2] } : null;
    }

    function determineType(key, val) {
        if (val === 'true' || val === 'false') return 'boolean';
        if (val.startsWith('http') && val.match(/\.(zip|pdf|jpg|png)/i)) return 'downloadLink';
        if (val.startsWith('http')) return 'link';
        return 'text';
    }

    function renderRow(key, val) {
        const type = determineType(key, val);
        const row = document.createElement('div');
        row.className = 'elch-entry';

        const left = document.createElement('div');
        left.textContent = key;
        const right = document.createElement('div');

        if (type === 'downloadLink' || type === 'link') {
            const a = document.createElement('a');
            a.href = val;
            a.target = '_blank';
            a.textContent = 'Open';
            right.appendChild(a);
        } else {
            const span = document.createElement('span');
            span.textContent = val;
            right.appendChild(span);
        }

        const icon = document.createElement('span');
        icon.className = 'copy material-icons';
        icon.style.fontSize = '14px';
        icon.style.verticalAlign = 'middle';
        icon.textContent = 'content_copy';
        icon.onclick = () => copyToClipboard(val);
        right.appendChild(icon);

        row.appendChild(left);
        row.appendChild(right);
        return row;
    }

    function showSections() {
        sectionBox.innerHTML = '';
        if (!jsonData || Object.keys(jsonData).length === 0) return;

        for (const section in jsonData) {
            if (section === 'title') continue;
            const details = document.createElement('details');
            details.className = 'elch-section';
            details.setAttribute('open', '');

            const summary = document.createElement('summary');
            summary.textContent = section;
            details.appendChild(summary);

            const entries = jsonData[section];
            for (const key in entries) {
                const row = renderRow(key, String(entries[key]));
                details.appendChild(row);
            }

            sectionBox.appendChild(details);
        }
    }

    function waitAndPrefillAddress() {
        const interval = setInterval(() => {
            const input = document.querySelector('input[name="adresse_search"]');
            if (input && jsonData['3. Coordonnées']) {
                const addrKey = Object.keys(jsonData['3. Coordonnées']).find(k => k.toLowerCase().includes('adresse'));
                if (addrKey) {
                    input.value = jsonData['3. Coordonnées'][addrKey];
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    clearInterval(interval);
                }
            }
        }, 500);
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            jsonData = JSON.parse(saved);
            showSections();
            waitAndPrefillAddress();
        } catch {
            localStorage.removeItem(STORAGE_KEY);
        }
    }
})();
