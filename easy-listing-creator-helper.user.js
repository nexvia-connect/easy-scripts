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
    let isProcessingDropdowns = false;

    let filledFields = new Set();
    let filledDropdowns = new Set();

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

    // REMOVED: The document click listener that was closing the UI on copy clicks

    wrapper.addEventListener('click', (e) => {
        if (e.target.closest('.elch-collapsed-circle')) {
            return;
        }
        recalculateHeight();
    });

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    function startDrag(e) {
        if (!wrapper.classList.contains('expanded')) return;

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

    wrapper.addEventListener('mousedown', startDrag);

    function extractMarkdownLink(str) {
        const match = str.match(/\[([^\]]+)]\(([^)]+)\)/);
        return match ? { label: match[1], url: match[2] } : null;
    }

    // NEW: Function to show icon feedback (white flash, then back to blue)
    function showIconFeedback(iconElement) {
        // Change to white
        iconElement.style.color = 'white';

        // Change back to blue after 2 seconds
        setTimeout(() => {
            iconElement.style.color = '#2196F3'; // Blue color
        }, 2000);
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
            // NEW: Apply 9px font size for values >30 characters
            const fontSize = val.length > 40 ? '8px' : val.length > 20 ? '10px' : '14px';
            html += `<span style="font-size:${fontSize};">${val}</span> <span class="copy material-icons" style="font-size:14px;vertical-align:middle;">content_copy</span>`;
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
                // NEW: Show icon feedback
                showIconFeedback(copyBtn);
            });
        }

        const fetchBtn = row.querySelector('.fetch-txt');
        if (fetchBtn) {
            fetchBtn.onclick = async () => {
                try {
                    const res = await fetch(val);
                    const text = await res.text();
                    copyToClipboard(text);
                    // NEW: Show icon feedback
                    showIconFeedback(fetchBtn);
                } catch {
                    alert('Failed to fetch or copy .txt file.');
                }
            };
        }

        return row;
    }

    function parseAddress(address) {
        if (!address) return null;

        const regex = /^(\d+[A-Za-z]*)\s+(.+?)\s+(L-\d{4})\s+(.+)$/;
        const match = address.match(regex);

        if (match) {
            return {
                propertyNumber: match[1],
                streetName: match[2],
                postCode: match[3],
                city: match[4]
            };
        }
        return null;
    }

    function fillAngularField(field, value, fieldName) {
        if (filledFields.has(fieldName)) {
            if (field.value === value || field.value === value.toString()) {
                console.log(`Field ${fieldName} already filled with correct value, skipping`);
                return false;
            } else {
                console.log(`Field ${fieldName} value changed, refilling`);
                filledFields.delete(fieldName);
            }
        }

        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));

        if (field._ngModel) {
            field._ngModel.setValue(value);
        }

        const angularElement = field.closest('[ng-version]') || field.closest('[ng-model]') || field;
        if (angularElement && angularElement.ngModel) {
            angularElement.ngModel.$setViewValue(value);
        }

        field.focus();
        field.blur();

        setTimeout(() => {
            if (field.value === value || field.value === value.toString()) {
                filledFields.add(fieldName);
                console.log(`Field ${fieldName} successfully filled with value: ${value}`);
            } else {
                console.log(`Field ${fieldName} fill verification failed, will retry`);
            }
        }, 100);

        return true;
    }

    async function processDropdownsSequentially() {
        if (isProcessingDropdowns) return;

        isProcessingDropdowns = true;
        console.log('Starting sequential dropdown processing...');

        try {
            const overlays = document.querySelectorAll('.cdk-overlay-pane');

            overlays.forEach(overlay => {
                const tptIdField = overlay.querySelector('mat-select[formcontrolname="tpt_id"]');
                const rolesIdCommercialField = overlay.querySelector('mat-select[formcontrolname="roles_id_commercial"]');

                if (tptIdField && jsonData['2. Informations Générales'] && jsonData['2. Informations Générales']['Etat']) {
                    if (jsonData['2. Informations Générales']['Etat'] === 'En vente') {
                        console.log('Processing transaction type dropdown...');
                        selectDropdownOptionSequentially(tptIdField, 'En vente', 'tpt_id');
                    }
                }

                if (rolesIdCommercialField && jsonData['2. Informations Générales'] && jsonData['2. Informations Générales']['Commercial']) {
                    const commercialName = jsonData['2. Informations Générales']['Commercial'];
                    console.log(`Processing commercial dropdown for: ${commercialName}`);

                    setTimeout(() => {
                        selectDropdownOptionSequentially(rolesIdCommercialField, commercialName, 'roles_id_commercial');
                    }, 1000);
                }
            });
        } catch (error) {
            console.error('Error in sequential dropdown processing:', error);
        } finally {
            setTimeout(() => {
                isProcessingDropdowns = false;
                console.log('Dropdown processing completed');
            }, 3000);
        }
    }

    function selectDropdownOptionSequentially(dropdownField, targetText, dropdownName) {
        if (!dropdownField) return false;

        console.log(`Sequentially selecting dropdown option: ${targetText} for ${dropdownName}`);

        const normalizedTargetText = targetText.toLowerCase().trim();

        try {
            const angularComponent = dropdownField.closest('[ng-version]') || dropdownField;

            if (angularComponent._ngModel) {
                angularComponent._ngModel.setValue(targetText);
                console.log(`Set value via _ngModel for ${dropdownName}`);
                filledDropdowns.add(dropdownName);
                return true;
            }

            if (angularComponent.ngModel) {
                angularComponent.ngModel.$setViewValue(targetText);
                console.log(`Set value via ngModel for ${dropdownName}`);
                filledDropdowns.add(dropdownName);
                return true;
            }

            const formControl = angularComponent.getAttribute('formcontrolname');
            if (formControl) {
                const formComponent = angularComponent.closest('form') || angularComponent.closest('[formgroup]');
                if (formComponent && formComponent.componentInstance) {
                    const control = formComponent.componentInstance.form?.get(formControl);
                    if (control) {
                        control.setValue(targetText);
                        console.log(`Set value via form control for ${dropdownName}`);
                        filledDropdowns.add(dropdownName);
                        return true;
                    }
                }
            }
        } catch (error) {
            console.log(`Direct value setting failed for ${dropdownName}:`, error);
        }

        try {
            dropdownField.click();

            setTimeout(() => {
                const dropdownOverlays = document.querySelectorAll('.cdk-overlay-pane');

                dropdownOverlays.forEach(overlay => {
                    const options = overlay.querySelectorAll('mat-option');

                    if (options.length > 0) {
                        console.log(`Found ${options.length} dropdown options for ${targetText}`);

                        let found = false;

                        options.forEach(option => {
                            const optionText = option.querySelector('.mat-option-text')?.textContent?.trim();
                            const normalizedOptionText = optionText?.toLowerCase();

                            console.log(`Checking option: "${optionText}" (normalized: "${normalizedOptionText}") against "${targetText}" (normalized: "${normalizedTargetText}")`);

                            if (normalizedOptionText === normalizedTargetText) {
                                console.log(`Found case-insensitive match: ${optionText} matches ${targetText}`);

                                option.click();
                                option.dispatchEvent(new Event('click', { bubbles: true }));

                                if (option._ngModel) {
                                    option._ngModel.setValue(optionText);
                                }

                                found = true;
                                console.log(`Selected dropdown option: ${optionText} for ${dropdownName}`);

                                filledDropdowns.add(dropdownName);
                            }
                        });

                        if (!found && normalizedTargetText !== '- sélectionnez -') {
                            options.forEach(option => {
                                const optionText = option.querySelector('.mat-option-text')?.textContent?.trim();
                                const normalizedOptionText = optionText?.toLowerCase();

                                if (normalizedOptionText === '- sélectionnez -') {
                                    option.click();
                                    option.dispatchEvent(new Event('click', { bubbles: true }));
                                    console.log(`Selected fallback option: - Sélectionnez - for ${dropdownName}`);

                                    filledDropdowns.add(dropdownName);
                                }
                            });
                        }
                    }
                });
            }, 300);
        } catch (error) {
            console.log(`Dropdown interaction failed for ${dropdownName}:`, error);
        }

        return true;
    }

    function fillAllFormFields() {
        if (!jsonData) return;

        console.log('Filling all form fields (excluding dropdowns)...');

        const overlays = document.querySelectorAll('.cdk-overlay-pane');

        overlays.forEach(overlay => {
            const streetNumberField = overlay.querySelector('input[formcontrolname="street_number"]');
            const routeField = overlay.querySelector('input[formcontrolname="route"]');
            const postalCodeField = overlay.querySelector('input[formcontrolname="postal_code"]');
            const localityField = overlay.querySelector('input[formcontrolname="locality"]');

            const surfaceField = overlay.querySelector('input[formcontrolname="surface"]');
            const etageField = overlay.querySelector('input[formcontrolname="etage"]');
            const budgetField = overlay.querySelector('input[formcontrolname="budget"]');
            const nbChambresField = overlay.querySelector('input[formcontrolname="nb_chambres"]');
            const nbSdbField = overlay.querySelector('input[formcontrolname="nb_sdb"]');
            const nbEtagesField = overlay.querySelector('input[formcontrolname="nb_etages"]');

            if (jsonData['3. Coordonnées'] && jsonData['3. Coordonnées']['Adresse']) {
                const addressData = parseAddress(jsonData['3. Coordonnées']['Adresse']);
                if (addressData) {
                    if (streetNumberField) fillAngularField(streetNumberField, addressData.propertyNumber, 'street_number');
                    if (routeField) fillAngularField(routeField, addressData.streetName, 'route');
                    if (postalCodeField) fillAngularField(postalCodeField, addressData.postCode, 'postal_code');
                    if (localityField) fillAngularField(localityField, addressData.city, 'locality');
                }
            }

            if (surfaceField && jsonData['2. Informations Générales'] && jsonData['2. Informations Générales']['Surface au sol']) {
                const surfaceValue = jsonData['2. Informations Générales']['Surface au sol'].replace(' sqm', '');
                fillAngularField(surfaceField, surfaceValue, 'surface');
            }

            if (etageField && jsonData['2. Informations Générales'] && jsonData['2. Informations Générales']['Etage']) {
                fillAngularField(etageField, jsonData['2. Informations Générales']['Etage'], 'etage');
            }

            if (budgetField && jsonData['2. Informations Générales'] && jsonData['2. Informations Générales']['Prix de Vente']) {
                fillAngularField(budgetField, jsonData['2. Informations Générales']['Prix de Vente'], 'budget');
            }

            if (nbChambresField && jsonData['2. Informations Générales'] && jsonData['2. Informations Générales']['Chambres']) {
                fillAngularField(nbChambresField, jsonData['2. Informations Générales']['Chambres'], 'nb_chambres');
            }

            if (nbSdbField && jsonData['2. Informations Générales'] && jsonData['2. Informations Générales']['Salles de bain']) {
                fillAngularField(nbSdbField, jsonData['2. Informations Générales']['Salles de bain'], 'nb_sdb');
            }

            if (nbEtagesField && jsonData['2. Informations Générales'] && jsonData['2. Informations Générales']['Nb étages']) {
                fillAngularField(nbEtagesField, jsonData['2. Informations Générales']['Nb étages'], 'nb_etages');
            }
        });

        setTimeout(() => {
            processDropdownsSequentially();
        }, 500);
    }

    let fillFormFieldsTimeout = null;
    let lastFillAttempt = 0;

    function fillFormFields() {
        if (fillFormFieldsTimeout) {
            clearTimeout(fillFormFieldsTimeout);
        }

        const now = Date.now();
        if (now - lastFillAttempt < 1500) {
            return;
        }

        fillFormFieldsTimeout = setTimeout(() => {
            fillAllFormFields();
            lastFillAttempt = now;
        }, 300);
    }

    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;

        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList && node.classList.contains('cdk-overlay-pane')) {
                            shouldCheck = true;
                        }

                        if (node.querySelector && node.querySelector('input[formcontrolname]')) {
                            shouldCheck = true;
                        }
                    }
                });
            }
        });

        if (shouldCheck) {
            setTimeout(() => {
                fillFormFields();
            }, 200);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    let periodicCheckInterval = null;

    function startPeriodicCheck() {
        if (periodicCheckInterval) return;

        periodicCheckInterval = setInterval(() => {
            if (document.querySelector('.cdk-overlay-pane')) {
                fillFormFields();
            }
        }, 3000);
    }

    function stopPeriodicCheck() {
        if (periodicCheckInterval) {
            clearInterval(periodicCheckInterval);
            periodicCheckInterval = null;
        }
    }

    startPeriodicCheck();

    function showSections() {
        sectionBox.innerHTML = '';

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

        let pipedriveUrl = null;
        for (const section in jsonData) {
            if (jsonData[section] && typeof jsonData[section] === 'object') {
                if (jsonData[section]['URL du deal Pipedrive']) {
                    pipedriveUrl = jsonData[section]['URL du deal Pipedrive'];
                    break;
                }
            }
        }

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

                filledFields.clear();
                filledDropdowns.clear();

                showSections();
            } catch {
                alert('Invalid JSON');
            }
        };

        document.getElementById('elch-inline-reset').onclick = () => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LAST_USED_KEY);
            jsonData = {};

            filledFields.clear();
            filledDropdowns.clear();

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

                recalculateHeight();
            });

            sectionBox.appendChild(details);
        }

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
