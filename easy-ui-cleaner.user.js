// ==UserScript==
// @name         Easy UI cleaner
// @namespace    http://tampermonkey.net/
// @version      3.5
// @description  Toggle visibility of UI elements and save preferences
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'hidden_form_elements';

    const DEFAULT_HIDDEN = new Set([
        "prix_estimé", "prix_m2", "commission_hors_taxe", "commission", "commission_pourcentage",
        "numero_acte", "surface_totale", "surface_cumulable", "surface_divisible", "titre", "main_url",
        "court_terme", "orientation", "vue", "tpd_id", "nb_pieces", "nb_sdd", "numero", "colocation_acceptee",
        "raison_clause_suspensive", "disponibilite", "duree_min_bail", "origine_entree", "btm_ref",
        "roles_id_commercial_tertiaire", "agence_bureaux_id", "roles_id_commercial_secondaire", "achat_type",
        "Commercial 2", "Bureau", "Commercial 3", "Projet / Résidence", "Commercial 3 - Sélectionnez - Agostini Mattia  Akpinar Süleyman  Aubrée Romain  Bertrandias Xavier",
        "Bureau - Sélectionnez -NEXVIA", "Date entrée", "Origine d'entrée", "Date clause exclusive",
        "Disponibilité", "Raison clause exclusive", "Colocation acceptée", "Durée min. bail", "mois", "N° lot",
        "Salles de douche", "Orientation", "Vue", "Dalle", "Caractéristiques", "En vente", "Titre",
        "URL principale", "Court terme", "Commercial 2 - Sélectionnez - Agostini Mattia  Akpinar Süleyman  Aubrée Romain  Bertrandias Xavier",
        "Prix m²", "Honoraires (TTC %)", "Honoraires (HT)", "Honoraires (TTC)", "Honoraires à la charge de",
        "Honoraires vendeur %", "Numéro acte", "Date signature", "Totale", "m²", "Surface cumulable",
        "Surface divisible", "Complément d'adresse", "Publicité", "Remarques", "Police", "Bourse",
        "Réseaux sociaux", "Parking collectif", "Référence boîtier", "Antenne satellite", "Autre", "Libellé",
        "Description", "Documents", "0", "Avis d'échéances", "Baux", "CRG", "Contrats d'entretiens", "Courriers",
        "Divers", "Etats des l", "Rapprochements", "Propriétaire", "Locataire", "Suivi",
        "Origine d'entrée - Sélectionnez -", "Honoraires à la charge de VendeurAcquéreurAcquéreur & vendeur",
        "Durée min. bail  mois", "Colocation acceptée - Sélectionnez -OuiNon", "Action", "Passation",
        "Impression", "Copier", "Archiver", "Supprimer", "Dépublier", "Finances", "Prix de vente *",
        "Prix estimé", "Charges mensuelles", "Date de fin de validité", "Date du prochain diagnostic",
        "CO2", "A+", "A", "B", "C", "D", "E", "F", "G", "H", "I", "Date du diagnostic", "Desc", "PDL", "PCE",
        "Eau", "Collective", "Individuelle gaz", "Individuelle électrique"
    ]);

    let hiddenInputs = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    if (!localStorage.getItem(STORAGE_KEY)) {
        hiddenInputs = DEFAULT_HIDDEN;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hiddenInputs)));
    }

    let editMode = false;
    let cleanEnabled = true;
    let mutationLock = false;

    const style = document.createElement('style');
    style.textContent = `
    .input-hide-button {
        position: absolute;
        top: 4px;
        right: 4px;
        background: #FC3366;
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 12px;
        text-align: center;
        line-height: 18px;
        cursor: pointer;
        font-family: 'Open Sans', sans-serif;
        border: none;
        z-index: 2;
    }
    .input-hide-button.restore {
        background: #6078BF;
    }
    .edit-overlay {
        position: relative;
    }
    .edit-overlay.hovered::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.1);
        pointer-events: none;
        z-index: 0;
    }
    .dimmed-input {
        opacity: 0.5 !important;
    }
    .floating-ui {
        position: fixed;
        top: 100px;
        right: 20px;
        background: #000;
        padding: 8px;
        border-radius: 8px;
        border: 1px solid #555;
        font-family: 'Open Sans', sans-serif;
        z-index: 9999;
        width: 180px;
    }
    .floating-ui button,
    .popup-editor button {
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
        margin: 3px 0px;
    }
    .floating-ui button:hover,
    .popup-editor button:hover {
        background: #333;
    }
    .floating-ui label {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        color: #fff;
        font-size: 12px;
    }
    .popup-editor {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #000;
        border: 1px solid #555;
        border-radius: 8px;
        z-index: 10000;
        width: 500px;
        padding: 20px;
        font-family: 'Open Sans', sans-serif;
    }
    .popup-editor textarea {
        width: 100%;
        height: 300px;
        font-family: monospace;
        font-size: 12px;
        background: #111;
        color: #eee;
        border: 1px solid #444;
        margin-bottom: 12px;
    }
    `;
    document.head.appendChild(style);

    const ui = document.createElement('div');
    ui.className = 'floating-ui';
    ui.innerHTML = `
        <button id="toggle-edit">Show/Hide elements</button>
        <button id="edit-hidden" style="display:none">View hidden code</button>
        <label><input type="checkbox" id="toggle-clean" checked> Clean Easy</label>
    `;
    document.body.appendChild(ui);

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
        return path.join(' > ');
    }

    function getHideableElements() {
        const selectors = [
            '.form-group',
            '.row.mb-3',
            'fieldset legend',
            'fieldset',
            '.badges',
            '.fa-plus',
            '.fa-compass',
            '.fa-star',
            '.fa-heart',
            '.leftpanel-item',
            '.col > .form-group',
            '.col .form-group button',
            '.fiche-footing .btn-left button',
            '.fiche-footing .btn-right button',
            '.mat-tab-label'
        ];

        const baseElems = Array.from(document.querySelectorAll(selectors.join(', ')));

        document.querySelectorAll('.col .form-group button').forEach(btn => {
            const parent = btn.closest('.col');
            if (parent && parent.innerHTML.includes('data-target="#modalAdminTypeEtat"')) {
                parent.style.display = cleanEnabled ? 'none' : '';
            }
        });

        return Array.from(new Set(baseElems.filter(Boolean)));
    }

    function applyHiddenStates() {
        if (mutationLock) return;
        mutationLock = true;
        requestAnimationFrame(() => {
            getHideableElements().forEach(el => {
                const id = getElementIdentifier(el);
                if (!id) return;

                if (!cleanEnabled) {
                    el.style.display = '';
                    el.classList.remove('dimmed-input');
                    return;
                }

                if (editMode) {
                    el.style.display = '';
                    if (hiddenInputs.has(id)) el.classList.add('dimmed-input');
                    else el.classList.remove('dimmed-input');
                } else {
                    if (hiddenInputs.has(id)) el.style.display = 'none';
                    else el.style.display = '';
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
        document.getElementById('toggle-clean').parentElement.style.display = '';
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
        `;
        document.body.appendChild(popup);

        document.getElementById('close-editor').onclick = () => {
            popup.remove();
        };

        document.getElementById('save-editor').onclick = () => {
            const textarea = popup.querySelector('textarea');
            hiddenInputs = new Set(textarea.value.split('\n').map(x => x.trim()).filter(Boolean));
            confirmEditState();
            popup.remove();
        };
    }

    document.getElementById('toggle-edit').addEventListener('click', () => {
        editMode = !editMode;
        const cleanToggle = document.getElementById('toggle-clean').parentElement;
        const viewButton = document.getElementById('edit-hidden');
        if (editMode) {
            document.getElementById('toggle-edit').textContent = 'Confirm';
            cleanToggle.style.display = 'none';
            viewButton.style.display = 'block';
            addEditButtons();
            applyHiddenStates();
        } else {
            confirmEditState();
        }
    });

    document.getElementById('edit-hidden').addEventListener('click', showHiddenEditor);

    document.getElementById('toggle-clean').addEventListener('change', e => {
        cleanEnabled = e.target.checked;
        applyHiddenStates();
    });

    const observer = new MutationObserver(() => {
        if (!editMode) applyHiddenStates();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    applyHiddenStates();
})();
