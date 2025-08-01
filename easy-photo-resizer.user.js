// ==UserScript==
// @name         Easy photo resizer with ratio warning badge
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Resize photo cards and mark non-3:2 images with a custom tooltip, ignoring plans
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  let currentPercent = 10;
  const TOLERANCE = 0.03;

  const applyStyles = () => {
    const container = document.getElementById('photo-list');
    if (!container) return false;

    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.gap = '6px';

    const photoCards = container.querySelectorAll('.col-12, .col-2, .col');

    photoCards.forEach(card => {
      card.classList.remove('col-12', 'col-2', 'col');
      card.classList.add('col');
      card.style.padding = '4px';

      const newWidth = `${currentPercent}%`;
      const newFlex = `0 0 ${newWidth}`;
      card.style.maxWidth = newWidth;
      card.style.flex = newFlex;
      card.style.transition = '';

      const ellipsis = card.querySelector('.fa-ellipsis-h');
      if (ellipsis) ellipsis.style.fontSize = '10px';

      const icon = card.querySelector('.header-photo-icon');
      if (icon) icon.style.display = 'none';

      const cardBody = card.querySelector('.card-body');
      if (cardBody) {
        cardBody.style.padding = '0';
        cardBody.style.height = 'unset';
        cardBody.style.minHeight = 'unset';
        cardBody.style.maxHeight = 'unset';
      }

      const cardDiv = card.querySelector('.card');
      if (cardDiv) {
        cardDiv.style.height = 'auto';
        cardDiv.style.minHeight = 'unset';
        cardDiv.style.maxHeight = 'unset';
        cardDiv.style.overflow = 'visible';
        cardDiv.style.display = 'flex';
        cardDiv.style.flexDirection = 'column';
        cardDiv.style.marginBottom = '0px';
        cardDiv.style.transition = '';
        cardDiv.style.position = 'relative';
      }

      const header = card.querySelector('.card-header');
      if (header) {
        header.style.height = 'unset';
        header.style.minHeight = 'unset';
        header.style.maxHeight = 'unset';
        header.style.overflow = 'hidden';
        header.style.fontSize = '10px';
        header.style.padding = '4px';
      }

      const title = card.querySelector('.title-photo');
      if (title) title.style.fontSize = '10px';

      const img = card.querySelector('.card-img-top');
      if (img) {
        img.style.aspectRatio = '3 / 2';
        img.style.height = 'auto';
        img.style.width = '100%';
        img.style.objectFit = 'cover';
        img.style.transition = '';

        img.onload = () => {
          const titleText = (card.querySelector('.title-photo')?.textContent || '').toLowerCase();
          if (titleText.includes('plan')) return;

          const ratio = img.naturalWidth / img.naturalHeight;
          const isClose = Math.abs(ratio - 1.5) <= TOLERANCE;

          const existingBadge = cardDiv.querySelector('.ratio-badge');
          if (existingBadge) existingBadge.remove();

          const existingTooltip = cardDiv.querySelector('.ratio-tooltip');
          if (existingTooltip) existingTooltip.remove();

          if (!isClose) {
            const roundedRatio = ratio.toFixed(2);

            const badge = document.createElement('div');
            badge.className = 'ratio-badge';
            badge.innerText = 'priority_high';

            Object.assign(badge.style, {
              position: 'absolute',
              top: '6px',
              left: '6px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#FC3366',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'default',
              zIndex: '9999',
              fontFamily: 'Material Icons'
            });

            const tooltip = document.createElement('div');
            tooltip.className = 'ratio-tooltip';
            tooltip.innerText = `Image is ${roundedRatio}:1 ratio instead of 3:2`;

            Object.assign(tooltip.style, {
              position: 'absolute',
              top: '32px',
              left: '6px',
              background: '#FC3366',
              color: 'white',
              padding: '4px 8px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              borderRadius: '4px',
              zIndex: '9999',
              display: 'none',
              pointerEvents: 'none'
            });

            badge.addEventListener('mouseenter', () => {
              tooltip.style.display = 'block';
            });
            badge.addEventListener('mouseleave', () => {
              tooltip.style.display = 'none';
            });

            cardDiv.appendChild(badge);
            cardDiv.appendChild(tooltip);
          }
        };
      }
    });

    const folderAction = document.querySelector('.folder-action');
    if (folderAction) {
      folderAction.style.display = 'flex';
      folderAction.style.flexWrap = 'wrap';
      folderAction.style.alignItems = 'center';
      folderAction.style.gap = '8px';

      const secondWrapper = folderAction.querySelector('.mt-3');
      if (secondWrapper) {
        secondWrapper.classList.remove('mt-3');
        secondWrapper.style.marginTop = '0';
      }

      if (!document.getElementById('card-resizer')) {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 6;
        slider.max = 25;
        slider.step = 0.1;
        slider.value = currentPercent;
        slider.id = 'card-resizer';
        slider.style.marginTop = '0px';
        slider.style.width = '200px';

        slider.addEventListener('input', () => {
          currentPercent = parseFloat(slider.value);
          applyStyles();
        });

        const label = document.createElement('label');
        label.innerText = 'Photo size: ';
        label.style.fontSize = '12px';
        label.style.marginLeft = '16px';
        label.style.marginRight = '4px';
        label.htmlFor = 'card-resizer';

        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginTop = '8px';
        container.appendChild(label);
        container.appendChild(slider);

        folderAction.style.marginBottom = '0';
        folderAction.parentNode.insertBefore(container, folderAction.nextSibling);
      }
    }

    return true;
  };

  const observer = new MutationObserver(() => {
    applyStyles();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    applyStyles();
  }, 1000);
})();
