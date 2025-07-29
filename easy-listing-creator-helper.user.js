// ==UserScript==
// @name         Easy Listing Creator Helper
// @namespace    http://tampermonkey.net/
// @version      4.19
// @description  Floating JSON UI with import/export via URL (#/route?data=base64) and auto-popup trigger
// @match        https://nexvia1832.easy-serveur53.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'easy_listing_data';
    const LAST_USED_KEY = 'easy_listing_last_used';
    let jsonData = {};
    let collapseTimeout = null;

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

    // ... [code unchanged above showSections()] ...

    if (redirectedViaHash) {
        const tryClick = () => {
            const btn = document.querySelector('a.btn-saisie.btn-lot.btn');
            if (btn) {
                btn.click();
                setTimeout(() => {
                    const addr = jsonData['3. Coordonnées']?.['Adresse'] || '';
                    const [_, streetNumber, streetName, postalCode, ...communeParts] = addr.match(/^(\S+?)\s+(.*?)\s+L-(\d{4})\s+(.*)$/) || [];
                    let communeName = communeParts?.join(' ') || '';

                    const setVal = (name, val) => {
                        const el = document.querySelector(`input[name="${name}"]`);
                        if (el && val) el.value = val;
                    };

                    setVal('adresse_search', addr);
                    setVal('street_number', streetNumber);
                    setVal('route', streetName);
                    setVal('postal_code', postalCode);

                    if (communeName.startsWith('Luxembourg-')) {
                        setVal('locality', 'Luxembourg');
                        const zoneName = communeName.trim();
                        const zoneSelect = document.querySelector('mat-select[name="zones"]');
                        if (zoneSelect) {
                            zoneSelect.click();
                            setTimeout(() => {
                                const options = document.querySelectorAll('mat-option');
                                for (const opt of options) {
                                    if (opt.textContent.trim() === zoneName) {
                                        opt.click();
                                        setTimeout(() => {
                                            zoneSelect.click();
                                        }, 200);
                                        break;
                                    }
                                }
                            }, 300);
                        }
                    } else {
                        setVal('locality', communeName);
                    }

                    const countrySelect = document.querySelector('mat-select[name="pay_id"]');
                    if (countrySelect) {
                        countrySelect.click();
                        setTimeout(() => {
                            const options = document.querySelectorAll('mat-option');
                            for (const opt of options) {
                                if (opt.textContent.trim() === 'Luxembourg') {
                                    opt.click();
                                    setTimeout(() => {
                                        countrySelect.click();
                                    }, 200);
                                    break;
                                }
                            }
                        }, 300);
                    }
                }, 1000);
            } else {
                setTimeout(tryClick, 500);
            }
        };
        setTimeout(tryClick, 1500);
    }
})();
