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
    let isProcessingDropdowns = false; // NEW: Flag to prevent multiple dropdown processing
    
    // NEW: Track filled fields to avoid refilling - but only mark as filled when actually successful
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
            }, 100);
        }
    }

    function expandUI() {
        wrapper.classList.add('expanded');
        collapsedCircle.style.display = 'none';
        wrapper.style.cursor = 'move';
        recalculateHeight();
    }

    function collapseUI() {
        wrapper.classList.remove('expanded');
        collapsedCircle.style.display = 'flex';
        wrapper.style.cursor = 'default';
    }

    collapsedCircle.addEventListener('click', () => {
        wrapper.classList.contains('expanded') ? collapseUI() : expandUI();
    });

    // NEW: Only close when clicking the X button
    document.addEventListener('click', (e) => {
        const target = e.target;
        const isControl = target.closest('.copy') ||
                       target.closest('.open-link') ||
                       target.closest('.elch-close');
        
        if (isControl) {
            if (target.closest('.elch-close')) {
                collapseUI();
            }
            return;
        }
        
        // Only recalculate height on clicks inside the UI
        if (target.closest('.elch-wrapper')) {
            recalculateHeight();
        }
    });

    // NEW: Add visual feedback for icon clicks
    function showIconFeedback(iconElement) {
        // Change to white
        iconElement.style.color = 'white';
        
        // Change back to blue after 2 seconds
        setTimeout(() => {
            iconElement.style.color = '#2196F3'; // Blue color
        }, 2000);
    }

    // NEW: Address parsing function
    function parseAddress(addressString) {
        if (!addressString) return null;
        
        // Pattern: "4 Rue De Keispelt L-8291 Kehlen"
        const match = addressString.match(/^(\d+[A-Za-z]*)\s+(.+?)\s+(L-\d{4})\s+(.+)$/);
        
        if (match) {
            return {
                propertyNumber: match[1],      // "4" or "4A"
                streetName: match[2],          // "Rue De Keispelt"
                postCode: match[3],            // "L-8291"
                city: match[4]                 // "Kehlen"
            };
        }
        
        return null;
    }

    // NEW: Enhanced form filling function
    function fillFormFields() {
        if (!jsonData || Object.keys(jsonData).length === 0) return;
        
        // Parse address if available
        const addressInfo = parseAddress(jsonData['3. Coordonnées']?.['Adresse']);
        
        // Find and fill form fields
        const fieldMappings = [
            // Address fields
            { selector: 'input[formcontrolname="street_number"]', value: addressInfo?.propertyNumber, fieldType: 'input' },
            { selector: 'input[formcontrolname="route"]', value: addressInfo?.streetName, fieldType: 'input' },
            { selector: 'input[formcontrolname="postal_code"]', value: addressInfo?.postCode, fieldType: 'input' },
            { selector: 'input[formcontrolname="locality"]', value: addressInfo?.city, fieldType: 'input' },
            
            // Property details
            { selector: 'input[formcontrolname="surface"]', value: jsonData['2. Informations Générales']?.['Surface au sol'], fieldType: 'input' },
            { selector: 'input[formcontrolname="etage"]', value: jsonData['2. Informations Générales']?.['Etage'], fieldType: 'input' },
            { selector: 'input[formcontrolname="budget"]', value: jsonData['2. Informations Générales']?.['Prix de Vente'], fieldType: 'input' },
            { selector: 'input[formcontrolname="nb_chambres"]', value: jsonData['2. Informations Générales']?.['Chambres'], fieldType: 'input' },
            { selector: 'input[formcontrolname="nb_sdb"]', value: jsonData['2. Informations Générales']?.['Salles de bain'], fieldType: 'input' },
            { selector: 'input[formcontrolname="nb_etages"]', value: jsonData['2. Informations Générales']?.['Nb étages'], fieldType: 'input' },
            
            // Dropdown fields
            { selector: 'mat-select[formcontrolname="tpt_id"]', value: 'En vente', fieldType: 'dropdown' },
            { selector: 'mat-select[formcontrolname="roles_id_commercial"]', value: jsonData['2. Informations Générales']?.['Commercial'], fieldType: 'dropdown' }
        ];

        fieldMappings.forEach(mapping => {
            if (!mapping.value) return;
            
            const field = document.querySelector(mapping.selector);
            if (!field) return;
            
            const fieldId = mapping.selector;
            
            if (mapping.fieldType === 'input') {
                if (!filledFields.has(fieldId)) {
                    // Fill input field
                    field.value = mapping.value;
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                    filledFields.add(fieldId);
                    
                    // Show feedback
                    showIconFeedback(field);
                }
            } else if (mapping.fieldType === 'dropdown') {
                if (!filledDropdowns.has(fieldId)) {
                    // Handle dropdown selection
                    selectDropdownOption(field, mapping.value);
                }
            }
        });
    }

    // NEW: Dropdown selection function
    function selectDropdownOption(dropdown, targetText) {
        if (isProcessingDropdowns) return;
        isProcessingDropdowns = true;
        
        try {
            // Click to open dropdown
            dropdown.click();
            
            // Wait for dropdown to open
            setTimeout(() => {
                const options = document.querySelectorAll('.mat-option .mat-option-text');
                let foundOption = null;
                
                for (const option of options) {
                    const optionText = option.textContent.trim();
                    if (optionText.toLowerCase() === targetText.toLowerCase()) {
                        foundOption = option;
                        break;
                    }
                }
                
                if (foundOption) {
                    // Show feedback on the dropdown icon
                    const dropdownIcon = dropdown.querySelector('.mat-select-arrow');
                    if (dropdownIcon) {
                        showIconFeedback(dropdownIcon);
                    }
                    
                    foundOption.click();
                    filledDropdowns.add(dropdown.getAttribute('formcontrolname'));
                }
                
                isProcessingDropdowns = false;
            }, 500);
        } catch (error) {
            isProcessingDropdowns = false;
        }
    }

    // NEW: Monitor for form fields and fill them
    function startFormMonitoring() {
        // Initial fill attempt
        fillFormFields();
        
        // Monitor for new form fields every 2 seconds
        setInterval(() => {
            fillFormFields();
        }, 2000);
        
        // Also monitor for CDK overlays (popups)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if it's a CDK overlay (popup)
                            if (node.classList && node.classList.contains('cdk-overlay-pane')) {
                                // Wait a bit for the form to fully load, then fill
                                setTimeout(() => {
                                    fillFormFields();
                                }, 1000);
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Start monitoring when the page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startFormMonitoring);
    } else {
        startFormMonitoring();
    }

    // Load data from localStorage
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            jsonData = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load stored data:', e);
    }

    // Create title section
    const titleSection = document.createElement('div');
    titleSection.className = 'elch-title';
    titleSection.style.position = 'relative';
    titleSection.style.display = 'flex';
    titleSection.style.justifyContent = 'space-between';
    titleSection.style.alignItems = 'center';
    
    const titleContent = document.createElement('div');
    titleContent.style.display = 'flex';
    titleContent.style.alignItems = 'center';
    titleContent.style.gap = '8px';
    
    const titleText = document.createElement('span');
    titleText.textContent = jsonData.title || 'Easy creator';
    titleContent.appendChild(titleText);
    
    // Add Pipedrive icon if URL exists
    if (jsonData['1. Informations complémentaires']?.['URL du deal Pipedrive']) {
        const pipedriveLink = document.createElement('a');
        pipedriveLink.href = jsonData['1. Informations complémentaires']['URL du deal Pipedrive'];
        pipedriveLink.target = '_blank';
        
        const pipedriveIcon = document.createElement('img');
        pipedriveIcon.src = 'https://nexvia-connect.github.io/easy-scripts/media/pipedrive-favicon.png';
        pipedriveIcon.className = 'elch-pipedrive-icon';
        pipedriveIcon.style.width = '16px';
        pipedriveIcon.style.height = '16px';
        
        pipedriveLink.appendChild(pipedriveIcon);
        titleContent.appendChild(pipedriveLink);
    }
    
    titleSection.appendChild(titleContent);
    
    const closeButton = document.createElement('span');
    closeButton.className = 'material-icons elch-close';
    closeButton.title = 'Close';
    closeButton.style.cursor = 'pointer';
    closeButton.style.position = 'absolute';
    closeButton.style.right = '0';
    closeButton.style.top = '50%';
    closeButton.style.transform = 'translateY(-50%)';
    closeButton.textContent = 'close';
    titleSection.appendChild(closeButton);
    
    sectionBox.appendChild(titleSection);

    // Create sections for each data category
    if (jsonData && Object.keys(jsonData).length > 0) {
        Object.entries(jsonData).forEach(([key, value]) => {
            if (key === 'title') return;
            
            const section = document.createElement('details');
            section.className = 'elch-section';
            
            const summary = document.createElement('summary');
            summary.textContent = key;
            section.appendChild(summary);
            
            if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    const entry = document.createElement('div');
                    entry.className = 'elch-entry';
                    entry.style.flexDirection = 'column';
                    
                    const label = document.createElement('div');
                    label.className = 'elch-label';
                    label.textContent = subKey;
                    entry.appendChild(label);
                    
                    if (typeof subValue === 'string' && subValue.startsWith('http')) {
                        // URL field
                        const urlContainer = document.createElement('div');
                        urlContainer.style.display = 'flex';
                        urlContainer.style.gap = '8px';
                        urlContainer.style.alignItems = 'center';
                        
                        const urlInput = document.createElement('input');
                        urlInput.type = 'text';
                        urlInput.value = subValue;
                        urlInput.readOnly = true;
                        urlInput.style.flex = '1';
                        urlContainer.appendChild(urlInput);
                        
                        const copyButton = document.createElement('button');
                        copyButton.className = 'copy';
                        copyButton.textContent = 'Copy';
                        copyButton.addEventListener('click', () => {
                            GM_setClipboard(subValue);
                            copyButton.textContent = 'Copied!';
                            setTimeout(() => {
                                copyButton.textContent = 'Copy';
                            }, 2000);
                        });
                        urlContainer.appendChild(copyButton);
                        
                        const openButton = document.createElement('button');
                        openButton.className = 'open-link';
                        openButton.textContent = 'Open';
                        openButton.addEventListener('click', () => {
                            window.open(subValue, '_blank');
                        });
                        urlContainer.appendChild(openButton);
                        
                        entry.appendChild(urlContainer);
                    } else if (subKey === 'Download description' && typeof subValue === 'string' && subValue.startsWith('http')) {
                        // Special handling for description download
                        const descContainer = document.createElement('div');
                        descContainer.style.display = 'flex';
                        descContainer.style.gap = '8px';
                        descContainer.style.alignItems = 'center';
                        
                        const descInput = document.createElement('input');
                        descInput.type = 'text';
                        descInput.value = subValue;
                        descInput.readOnly = true;
                        descInput.style.flex = '1';
                        descContainer.appendChild(descInput);
                        
                        const copyButton = document.createElement('button');
                        copyButton.className = 'copy';
                        copyButton.textContent = 'Copy';
                        copyButton.addEventListener('click', () => {
                            GM_setClipboard(subValue);
                            copyButton.textContent = 'Copied!';
                            setTimeout(() => {
                                copyButton.textContent = 'Copy';
                            }, 2000);
                        });
                        descContainer.appendChild(copyButton);
                        
                        const fetchButton = document.createElement('button');
                        fetchButton.textContent = 'Fetch Text';
                        fetchButton.addEventListener('click', async () => {
                            try {
                                const response = await fetch(subValue);
                                const text = await response.text();
                                GM_setClipboard(text);
                                fetchButton.textContent = 'Copied!';
                                setTimeout(() => {
                                    fetchButton.textContent = 'Fetch Text';
                                }, 2000);
                            } catch (error) {
                                fetchButton.textContent = 'Error';
                                setTimeout(() => {
                                    fetchButton.textContent = 'Fetch Text';
                                }, 2000);
                            }
                        });
                        descContainer.appendChild(fetchButton);
                        
                        entry.appendChild(descContainer);
                    } else {
                        // Regular text field
                        const textContainer = document.createElement('div');
                        textContainer.style.display = 'flex';
                        textContainer.style.gap = '8px';
                        textContainer.style.alignItems = 'center';
                        
                        const textInput = document.createElement('input');
                        textInput.type = 'text';
                        textInput.value = subValue;
                        textInput.readOnly = true;
                        textInput.style.flex = '1';
                        textContainer.appendChild(textInput);
                        
                        const copyButton = document.createElement('button');
                        copyButton.className = 'copy';
                        copyButton.textContent = 'Copy';
                        copyButton.addEventListener('click', () => {
                            GM_setClipboard(subValue);
                            copyButton.textContent = 'Copied!';
                            setTimeout(() => {
                                copyButton.textContent = 'Copy';
                            }, 2000);
                        });
                        textContainer.appendChild(copyButton);
                        
                        entry.appendChild(textContainer);
                    }
                    
                    section.appendChild(entry);
                });
            }
            
            sectionBox.appendChild(section);
        });
    } else {
        // Create default import section when no data
        const importSection = document.createElement('details');
        importSection.className = 'elch-section';
        importSection.open = true;
        
        const summary = document.createElement('summary');
        summary.textContent = '0. Import code';
        importSection.appendChild(summary);
        
        const entry = document.createElement('div');
        entry.className = 'elch-entry';
        entry.style.flexDirection = 'column';
        
        const textarea = document.createElement('textarea');
        textarea.id = 'elch-inline-input';
        textarea.placeholder = 'Paste your JSON data here...';
        textarea.style.width = '100%';
        textarea.style.minHeight = '100px';
        textarea.style.resize = 'vertical';
        textarea.style.fontFamily = 'monospace';
        textarea.style.fontSize = '12px';
        textarea.style.padding = '8px';
        textarea.style.border = '1px solid #ccc';
        textarea.style.borderRadius = '4px';
        
        textarea.addEventListener('input', () => {
            try {
                const parsed = JSON.parse(textarea.value);
                jsonData = parsed;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                localStorage.setItem(LAST_USED_KEY, Date.now());
                
                // Reload the UI with new data
                location.reload();
            } catch (e) {
                // Invalid JSON, ignore
            }
        });
        
        entry.appendChild(textarea);
        importSection.appendChild(entry);
        sectionBox.appendChild(importSection);
    }

    // Drag functionality
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    wrapper.addEventListener('mousedown', (e) => {
        if (e.target.closest('.copy') || e.target.closest('.open-link') || e.target.closest('.elch-close') || e.target.closest('textarea')) {
            return;
        }
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(wrapper.style.left) || 0;
        startTop = parseInt(wrapper.style.top) || 0;
        
        wrapper.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        wrapper.style.left = (startLeft + deltaX) + 'px';
        wrapper.style.top = (startTop + deltaY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            wrapper.style.cursor = 'move';
        }
    });

    // Initialize position
    wrapper.style.left = '50px';
    wrapper.style.top = '50px';
})();
