// ==UserScript==
// @name         Easy UI cleaner (v3.16 Facebook block support)
// @namespace    http://tampermonkey.net/
// @version      3.16
// @description  Toggle visibility of UI elements and save preferences with precise full path control and multi-toggle per block
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'hidden_form_elements';
    const DEFAULT_HIDDEN = new Set();

    let hiddenInputs = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

    fetch('https://nexvia-connect.github.io/easy-scripts/cleaner-default.txt')
        .then(res => res.text())
        .then(txt => {
            txt.split('\n').map(x => x.trim()).filter(Boolean).forEach(id => DEFAULT_HIDDEN.add(id));
            if (!localStorage.getItem(STORAGE_KEY)) {
                hiddenInputs = DEFAULT_HIDDEN;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hiddenInputs)));
                applyHiddenStates();
            }
        });

    let editMode = false;
    let mutationLock = false;

    function getFullPath(el) {
        const path = [];
        let current = el;
        while (current && current !== document.body) {
            const tag = current.tagName;
            const siblings = Array.from(current.parentNode.children).filter(e => e.tagName === tag);
            const index = siblings.indexOf(current);
            path.unshift(`${tag}:nth-of-type(${index + 1})`);
            current = current.parentNode;
        }
        return path.join(' > ');
    }

    function getElementIdentifier(el) {
        return getFullPath(el);
    }

    function getHideableElements() {
        return Array.from(document.querySelectorAll([
            '.form-group', '.row.mb-3', 'fieldset', 'legend', '.badges', '.fa-plus', '.fa-compass',
            '.fa-star', '.fa-heart', '.leftpanel-item', '.col > .form-group', '.col .form-group button',
            '.fiche-footing .btn-left button', '.fiche-footing .btn-right button', '.mat-tab-label',
            '.card.col-3' // Facebook block
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

            const btn = document.createElement('div');
            btn.className = 'input-hide-button';
            btn.setAttribute('data-id', id);
            btn.textContent = hiddenInputs.has(id) ? '+' : '-';
            if (hiddenInputs.has(id)) btn.classList.add('restore');

            btn.style.position = 'absolute';
            btn.style.zIndex = 10;
            if (el.tagName === 'LEGEND') {
                btn.style.top = '0';
                btn.style.right = '4px';
            } else if (el.tagName === 'FIELDSET') {
                btn.style.top = '0';
                btn.style.right = '28px';
            } else {
                btn.style.top = '4px';
                btn.style.right = '4px';
            }

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

            el.classList.add('edit-overlay');
            el.style.position = 'relative';
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
    ui.className = 'floating-ui-cleaner';
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
    fetch('https://nexvia-connect.github.io/easy-scripts/styles/ui-cleaner-style.css')
        .then(res => res.text())
        .then(css => style.textContent = css)
        .catch(() => console.warn('CSS failed to load'));
    document.head.appendChild(style);

    applyHiddenStates();
})();
