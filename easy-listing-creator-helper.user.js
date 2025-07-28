// ==UserScript==
// @name         Easy Listing Creator Helper
// @namespace    http://tampermonkey.net/
// @version      4.6
// @description  Floating JSON UI with import/export via URL (#/route?data=base64) and redirect after preload
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

    // Check and parse preload from hash, then redirect
    if (location.hash.includes('data=')) {
        try {
            const params = new URLSearchParams(location.hash.split('?')[1]);
            const encoded = params.get('data');
            if (encoded) {
                const decoded = decodeURIComponent(atob(encoded));
                const parsed = JSON.parse(decoded);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                localStorage.setItem(LAST_USED_KEY, Date.now());
                location.href = 'https://nexvia1832.easy-serveur53.com/#/';
                return;
            }
        } catch {
            alert('Invalid preload data');
        }
    }

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

    wrapper.addEventListener('mouseenter', () => clearTimeout(collapseTimeout));
    wrapper.addEventListener('mouseleave', () => {
        collapseTimeout = setTimeout(collapseUI, 1000);
    });

    collapsedCircle.addEventListener('click', () => {
        wrapper.classList.contains('expanded') ? collapseUI() : expandUI();
    });

    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!wrapper.contains(target)) collapseUI();
        else if (!['elch-inline-save', 'elch-inline-reset'].includes(target.id)) clearTimeout(collapseTimeout);
    });

    function showSections() {
        sectionBox.innerHTML = '';

        if (jsonData.title) {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'elch-title';
            const titleText = document.createElement('span');
            titleText.textContent = jsonData.title;

            titleDiv.appendChild(titleText);
            sectionBox.appendChild(titleDiv);
        }

        const importSection = document.createElement('details');
        importSection.className = 'elch-section';
        importSection.innerHTML = `
            <summary>0. Import code</summary>
            <div class="elch-entry" style="flex-direction: column;">
                <textarea id="elch-inline-input" style="width:100%;height:100px;font-family:monospace;font-size:12px;background:#111;color:#eee;border:1px solid #444;">${Object.keys(jsonData).length > 0 ? JSON.stringify(jsonData, null, 2) : ''}</textarea><br>
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
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    const lastUsed = parseInt(localStorage.getItem(LAST_USED_KEY), 10);
    const now = Date.now();
    if (saved && (!lastUsed || now - lastUsed <= 3600000)) {
        try {
            jsonData = JSON.parse(saved);
            localStorage.setItem(LAST_USED_KEY, now);
        } catch {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LAST_USED_KEY);
        }
    }

    showSections();
})();
