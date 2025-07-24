// ==UserScript==
// @name         Easy UI cleaner (v3.8 hosted CSS)
// @namespace    http://tampermonkey.net/
// @version      3.8
// @description  Toggle visibility of UI elements and save preferences
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'hidden_form_elements';
    const DEFAULT_HIDDEN = new Set([]); // to be filled manually later

    const TAG_MAP = {
        APPROOT: 'AR', MAIN: 'M', APPNEWHEADER: 'ANH', DIV: 'D', APPINFRASTRUCTURE: 'AI', APPLOTDETAIL: 'ALD',
        FORM: 'F', FIELDSET: 'FS', APPINFOGENERALES: 'AIG', BUTTON: 'B', SPAN: 'S', LABEL: 'L', INPUT: 'I',
        SECTION: 'SEC', ARTICLE: 'ART', NAV: 'NAV', HEADER: 'H', FOOTER: 'FTR', UL: 'UL', LI: 'LI', A: 'A'
    };

    function compressPath(fullPath) {
        return fullPath.split(' > ').map(segment => {
            const match = segment.match(/^([A-Z\-]+)(?=:nth-of-type\((\d+)\))/i);
            if (!match) return segment;
            const [_, tag, index] = match;
            const norm = tag.replace(/-/g, '').toUpperCase();
            const short = TAG_MAP[norm] || tag[0].toUpperCase();
            return `${short}not${index}`;
        }).join('>');
    }

    function expandPath(compressed) {
        return compressed.split('>').map(short => {
            const match = short.match(/([A-Z]+)not(\d+)/);
            if (!match) return short;
            const [_, code, idx] = match;
            const tag = Object.entries(TAG_MAP).find(([_, val]) => val === code)?.[0] || code;
            return `${tag}:nth-of-type(${idx})`;
        }).join(' > ');
    }

    let hiddenInputs = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    if (!localStorage.getItem(STORAGE_KEY)) {
        hiddenInputs = DEFAULT_HIDDEN;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hiddenInputs)));
    }

    let editMode = false;
    let mutationLock = false;

    function getElementIdentifier(el) {
        if (el.dataset.cleanerId) return el.dataset.cleanerId;
        const path = [];
        let current = el;
        while (current && current !== document.body) {
            let tag = current.tagName;
            let siblings = Array.from(current.parentNode.children).filter(e => e.tagName === tag);
            let index = siblings.indexOf(current);
            path.unshift(`${tag}:nth-of-type(${index + 1})`);
            current = current.parentNode;
        }
        return compressPath(path.join(' > '));
    }

    function getHideableElements() {
        return Array.from(document.querySelectorAll([
            '.form-group', '.row.mb-3', 'fieldset legend', 'fieldset', '.badges', '.fa-plus', '.fa-compass',
            '.fa-star', '.fa-heart', '.leftpanel-item', '.col > .form-group', '.col .form-group button',
            '.fiche-footing .btn-left button', '.fiche-footing .btn-right button', '.mat-tab-label'
        ].join(', '))).filter(Boolean);
    }

    function applyHiddenStates() {
        if (mutationLock) return;
        mutationLock = true;
        requestAnimationFrame(() => {
            getHideableElements().forEach(el => {
                const id = getElementIdentifier(el);
                if (!id) return;
                el.style.display = hiddenInputs.has(id) ? 'none' : '';
                if (editMode) {
                    el.style.display = '';
                    el.classList.toggle('dimmed-input', hiddenInputs.has(id));
                } else {
                    el.classList.remove('dimmed-input');
                }
            });
            mutationLock = false;
        });
    }

    function addEditButtons() {
        getHideableElements().forEach(el => {
            const id = getElementIdentifier(el);
            if (!id) return;
            el.setAttribute('data-cleaner-id', id);
            if (el.querySelector('.input-hide-button')) return;
            el.classList.add('edit-overlay');

            const btn = document.createElement('div');
            btn.className = 'input-hide-button';
            btn.textContent = hiddenInputs.has(id) ? '+' : '-';
            if (hiddenInputs.has(id)) btn.classList.add('restore');

            btn.addEventListener('click', e => {
                e.stopPropagation();
                e.preventDefault();
                if (hiddenInputs.has(id)) {
                    hiddenInputs.delete(id);
                    el.classList.remove('dimmed-input');
                    btn.textContent = '-';
                    btn.classList.remove('restore');
                } else {
                    hiddenInputs.add(id);
                    el.classList.add('dimmed-input');
                    btn.textContent = '+';
                    btn.classList.add('restore');
                }
            });

            btn.addEventListener('mouseenter', () => el.classList.add('hovered'));
            btn.addEventListener('mouseleave', () => el.classList.remove('hovered'));

            el.appendChild(btn);
        });
    }

    function removeEditButtons() {
        document.querySelectorAll('.input-hide-button').forEach(btn => btn.remove());
        document.querySelectorAll('.edit-overlay').forEach(el => {
            el.classList.remove('edit-overlay');
            el.classList.remove('hovered');
        });
    }

    function confirmEditState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hiddenInputs)));
        editMode = false;
        document.getElementById('toggle-edit').textContent = 'Show/Hide elements';
        document.getElementById('edit-hidden').style.display = 'none';
        removeEditButtons();
        applyHiddenStates();
    }

    function showHiddenEditor() {
        const popup = document.createElement('div');
        popup.className = 'popup-editor';
        popup.innerHTML = `
            <textarea>${Array.from(hiddenInputs).join('\n')}</textarea>
            <button id="save-editor">Save</button>
            <button id="close-editor">Close</button>
            <button id="reset-default-popup">Set default hidden state</button>
        `;
        document.body.appendChild(popup);

        document.getElementById('close-editor').onclick = () => popup.remove();
        document.getElementById('save-editor').onclick = () => {
            const textarea = popup.querySelector('textarea');
            hiddenInputs = new Set(textarea.value.split('\n').map(x => x.trim()).filter(Boolean));
            confirmEditState();
            popup.remove();
        };
        document.getElementById('reset-default-popup').onclick = () => {
            if (confirm('Reset to default hidden fields? This will overwrite current settings.')) {
                hiddenInputs = new Set(DEFAULT_HIDDEN);
                confirmEditState();
                popup.remove();
            }
        };
    }

    const ui = document.createElement('div');
    ui.className = 'floating-ui';
    ui.innerHTML = `
        <button id="toggle-edit">Show/Hide elements</button>
        <button id="edit-hidden" style="display:none">View hidden code</button>
    `;
    document.body.appendChild(ui);

    document.getElementById('toggle-edit').addEventListener('click', () => {
        editMode = !editMode;
        document.getElementById('toggle-edit').textContent = editMode ? 'Confirm' : 'Show/Hide elements';
        document.getElementById('edit-hidden').style.display = editMode ? 'block' : 'none';
        if (editMode) addEditButtons();
        else confirmEditState();
        applyHiddenStates();
    });

    document.getElementById('edit-hidden').addEventListener('click', showHiddenEditor);

    new MutationObserver(() => {
        if (!editMode) applyHiddenStates();
    }).observe(document.body, { childList: true, subtree: true });

    const style = document.createElement('style');
    fetch('https://nexvia-connect.github.io/ui-cleaner-style/style.css')
        .then(res => res.text())
        .then(css => style.textContent = css)
        .catch(() => console.warn('CSS failed to load'));
    document.head.appendChild(style);

    applyHiddenStates();
})();
