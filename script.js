
/**
 * PORTFOLIO CLIENT ENGINE — INFINITE HORIZONTAL GALLERY & INTERACTION (juanmoraromero.com)
 * Features:
 * - Truly infinite horizontal scroll looping seamlessly in both directions.
 * - Repeating identical project cards endlessly without edge limits or dead ends.
 * - Dynamic card enlargement: active/focused project expands to 100% height while others remain at 61.8%.
 * - Real-time continuous synchronization of Counter (01/05..05/05) and Left Column (Client, Role).
 * - Butter-smooth lerp physics with mouse wheel, trackpad gestures, drag/swipe with momentum, and arrow keys.
 * - Native touch swipe infinite loop on mobile devices (< 768px).
 * - Click-to-focus on inactive cards; click or "View Detail" on active card opens full project modal.
 */

(function () {
  'use strict';

  const TOTAL_ORIGINAL_CARDS = (typeof PROJECTS_DATA !== 'undefined') ? PROJECTS_DATA.length : 5;
  const SETS_COUNT = 5; // 5 identical sets ensure an abundant buffer on any display resolution
  const CENTER_SET = 2; // Middle set used as the seamless coordinate anchor

  let activeProjectIndex = 0;
  let activeCardElement = null;
  let singleSetWidth = 0;
  let startOffset = 0;
  let isReady = false;

  const clientDisplay = document.getElementById('clientDisplay');
  const roleDisplay = document.getElementById('roleDisplay');
  const counterDisplay = document.getElementById('counterDisplay');
  const galleryContainer = document.getElementById('galleryContainer');
  const galleryTrack = document.getElementById('galleryTrack');

  let currentX = 0;
  let targetX = 0;
  let snapTimer = null;
  let snapTween = null;
  let scheduleSnap = () => {};
  let openVideoModal = () => {};

  // Drag interaction state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartTargetX = 0;
  let dragLastX = 0;
  let dragVelocity = 0;
  let hasMoved = false;

  /* ==========================================================================
     1. INFINITE TRACK SETUP & CLONING
     ========================================================================== */
  function buildInfiniteTrack() {
    if (!galleryTrack) return;
    if (galleryTrack.querySelector('.gallery-card[data-set]')) return;
    const originalCards = Array.from(galleryTrack.querySelectorAll('.gallery-card'));
    if (originalCards.length === 0) return;

    // Clear track and clone into SETS_COUNT sets
    galleryTrack.innerHTML = '';

    for (let s = 0; s < SETS_COUNT; s++) {
      originalCards.forEach((orig, pIdx) => {
        const clone = orig.cloneNode(true);
        clone.setAttribute('data-index', pIdx);
        clone.setAttribute('data-set', s);
        clone.setAttribute('data-global-index', s * TOTAL_ORIGINAL_CARDS + pIdx);

        // ONLY the center set's project 0 starts active on the left; all duplicates start inactive
        if (s === CENTER_SET && pIdx === 0) {
          clone.classList.add('is-active');
        } else {
          clone.classList.remove('is-active');
        }

        galleryTrack.appendChild(clone);
      });
    }
  }

  /* ==========================================================================
     2. DIMENSION MEASUREMENT & COORDINATE INITIALIZATION
     ========================================================================== */
  function measureDimensions() {
    if (!galleryTrack || !galleryContainer) return;
    const cards = galleryTrack.querySelectorAll('.gallery-card');
    if (cards.length < SETS_COUNT * TOTAL_ORIGINAL_CARDS) return;

    const set2Card0 = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS];       // index 10
    const set3Card0 = cards[(CENTER_SET + 1) * TOTAL_ORIGINAL_CARDS]; // index 15

    // Now that card widths are FIXED (not tied to height via aspect-ratio),
    // the distance between any two corresponding cards in adjacent sets is always constant.
    const measuredSetWidth = set3Card0.offsetLeft - set2Card0.offsetLeft;
    if (measuredSetWidth > 50) {
      singleSetWidth = measuredSetWidth;
    } else {
      // Fallback: 5 cards × (cardWidth + gap), using actual card offsetWidth
      const anyCard = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + 1]; // a non-active card
      const cardW = (anyCard && anyCard.offsetWidth > 0) ? anyCard.offsetWidth : (galleryContainer.clientHeight * 0.618);
      const gap = 12;
      singleSetWidth = TOTAL_ORIGINAL_CARDS * (cardW + gap);
    }

    startOffset = set2Card0.offsetLeft;

    if (!isReady) {
      currentX = startOffset;
      targetX = startOffset;
      if (window.innerWidth < 1024) {
        galleryContainer.scrollLeft = startOffset;
      }
      isReady = true;
    }
    syncHairlineDivider();
  }

  /* ==========================================================================
     2.1 RESPONSIVE METADATA SHIFTING (Mobile < 1024px vs Desktop >= 1024px)
     Shifts the metadata block (Client, Role, Watch Video) below the showreel on
     smartphones and returns it to the left column on desktop.
     ========================================================================== */
  function syncResponsiveLayout() {
    const isDesktop = window.innerWidth >= 1024;
    const leftMetaBlock = document.getElementById('leftMetaBlock');
    const leftBottomBlock = document.getElementById('leftBottomBlock');
    const shapesArea = document.getElementById('shapesArea');
    const mobileMetaSlot = document.getElementById('mobileMetaSlot');

    if (!leftMetaBlock) return;

    if (isDesktop) {
      if (leftBottomBlock && leftMetaBlock.parentElement !== leftBottomBlock) {
        if (shapesArea && shapesArea.parentElement === leftBottomBlock) {
          leftBottomBlock.insertBefore(leftMetaBlock, shapesArea);
        } else {
          leftBottomBlock.appendChild(leftMetaBlock);
        }
      }
    } else {
      if (mobileMetaSlot && leftMetaBlock.parentElement !== mobileMetaSlot) {
        mobileMetaSlot.appendChild(leftMetaBlock);
      }
    }
  }

  /* ==========================================================================
     2.2 RESPONSIVE HAIRLINE DIVIDER SYNC
     Maintains the hairline divider at the exact same height as the top of
     "Available for work", relative to the size of the scroll elements across
     all viewport heights, widths, and responsive screen sizes.
     ========================================================================== */
  function syncHairlineDivider() {
    syncResponsiveLayout();
    const leftBottomBlock = document.getElementById('leftBottomBlock');
    const hairlineDivider = document.getElementById('hairlineDivider');
    const availableForWork = document.getElementById('availableForWork');
    const leftAside = document.getElementById('leftAside');
    const portraitArea = document.getElementById('portraitArea');
    const servicesArea = document.getElementById('servicesArea');

    if (!leftBottomBlock || !availableForWork || !leftAside) return;

    if (window.innerWidth >= 1024) {
      // Desktop side-by-side mode:
      // Measure the exact top position of 'Available for work'
      const availRect = availableForWork.getBoundingClientRect();
      const asideRect = leftAside.getBoundingClientRect();

      // Distance from the bottom of aside up to the top of "Available for work"
      const targetHeight = asideRect.bottom - availRect.top;

      // Ensure divider never overlaps content above on ultra-short screens
      const minTop = servicesArea
        ? servicesArea.getBoundingClientRect().bottom + 12
        : (portraitArea ? portraitArea.getBoundingClientRect().bottom + 16 : 0);
      const maxAllowedHeight = asideRect.bottom - minTop;
      const finalHeight = Math.min(targetHeight, maxAllowedHeight);

      if (finalHeight > 0) {
        leftBottomBlock.style.height = `${finalHeight}px`;
      }
    } else {
      // Mobile & tablet stacked mode (< 1024px): reset to natural document flow
      leftBottomBlock.style.height = 'auto';
    }
  }

  let isInitialCardSet = false;

  /**
   * Signature Juan Mora Romero masked text reveal transition:
   * Smoothly slides out existing text through top of mask and glides new text in from below
   * using the cubic-bezier(0.165, 0.84, 0.44, 1) curve.
   */
  function animateRevealText(element, newText) {
    if (!element) return;
    if (element.textContent === newText) return;

    if (!isInitialCardSet || typeof gsap === 'undefined') {
      element.textContent = newText;
      return;
    }

    gsap.killTweensOf(element);
    const easeName = (typeof CustomEase !== 'undefined' && gsap.parseEase('juanReveal')) ? 'juanReveal' : 'power3.out';

    // Slide current text up out of mask
    gsap.to(element, {
      y: '-110%',
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        element.textContent = newText;
        // Position below mask
        gsap.set(element, { y: '120%', opacity: 0 });
        // Slide smoothly up into view with signature Juan Mora Romero ease
        gsap.to(element, {
          y: '0%',
          opacity: 1,
          duration: 0.65,
          ease: easeName,
          clearProps: 'transform'
        });
      }
    });
  }

  /* ==========================================================================
     3. ACTIVE CARD METADATA & COUNTER SYNC
     ========================================================================== */
  function updateActiveCard(index, targetCard = null) {
    if (index < 0 || index >= TOTAL_ORIGINAL_CARDS) return;

    let cardToActivate = targetCard;
    if (!cardToActivate && galleryTrack) {
      cardToActivate = galleryTrack.querySelector(`.gallery-card[data-set="${CENTER_SET}"][data-index="${index}"]`);
    }

    if (index === activeProjectIndex && activeCardElement === cardToActivate && counterDisplay && counterDisplay.textContent !== '') return;
    activeProjectIndex = index;
    activeCardElement = cardToActivate;

    // Toggle active class: ONLY the single card at the left focus edge gets is-active!
    // Duplicate cards further to the right (at the end of the scroll) remain unscaled at 61.8% height.
    if (galleryTrack) {
      const cards = galleryTrack.querySelectorAll('.gallery-card');
      cards.forEach((card) => {
        if (card === cardToActivate) {
          card.classList.add('is-active');
        } else {
          card.classList.remove('is-active');
        }
      });
    }

    // Counter (e.g. 01/05, 02/05) with masked reveal animation
    if (counterDisplay) {
      const currentFormatted = String(index + 1).padStart(2, '0');
      const totalFormatted = String(TOTAL_ORIGINAL_CARDS).padStart(2, '0');
      animateRevealText(counterDisplay, `${currentFormatted}/${totalFormatted}`);
    }

    // Left Column Client & Role Update with masked reveal animation
    if (typeof PROJECTS_DATA !== 'undefined' && PROJECTS_DATA[index]) {
      const p = PROJECTS_DATA[index];

      if (clientDisplay) {
        animateRevealText(clientDisplay, p.client);
      }

      if (roleDisplay) {
        animateRevealText(roleDisplay, p.role);
      }

      // Update viewDetailBtn label: Watch Video if card has video, View Detail for others
      const vText = document.getElementById('viewDetailText');
      const vBtn = document.getElementById('viewDetailBtn');
      const hasVideo = !!(p && p.video);
      const newLabel = hasVideo ? 'Watch Video' : 'View Detail';
      animateRevealText(vText || vBtn, newLabel);
    }
  }

  /* ==========================================================================
     4. VIEWPORT-FIT INFINITE HORIZONTAL SCROLL ENGINE (Wheel, Drag, Keys)
     ========================================================================== */
  function initHorizontalScrollEngine() {
    if (!galleryTrack || !galleryContainer) return;

    // Chromatic Aberration elements & state (juanmoraromero.com physics)
    const galleryChromaRed = document.getElementById('galleryChromaRed');
    const galleryChromaBlue = document.getElementById('galleryChromaBlue');
    let lastFrameTime = performance.now();
    let lastCurrentX = currentX;
    let chromaScrollX = 0;
    let chromaPointerX = 0;
    let chromaPointerY = 0;
    let isGalleryChromaActive = false;
    let lastGalleryPointerX = 0;
    let lastGalleryPointerY = 0;
    let hasPointerEnteredGallery = false;
    let mobileChromaX = 0;
    let lastMobileScrollLeft = 0;
    let lastMobileScrollTime = performance.now();

    // Track the single card currently hovered by the mouse
    let hoveredCard = null;

    // Juan Mora Romero Hover Pill Cursor Controller
    const hoverPillMask = document.getElementById('galleryHoverPillMask');
    const hoverPill = document.getElementById('galleryHoverPill');
    let isPillActive = false;
    let pillCurrentCard = null;

    function updatePillPosition(clientX, clientY, card) {
      if (!hoverPillMask || !hoverPill || !galleryContainer) return;
      const targetCard = card || pillCurrentCard;
      if (!targetCard) return;

      const containerRect = galleryContainer.getBoundingClientRect();
      const cardRect = targetCard.getBoundingClientRect();

      // Mask is bound to the exact rectangle of the card to clip the pill at card borders
      const planeLeft = cardRect.left - containerRect.left;
      const planeTop = cardRect.top - containerRect.top;
      const planeWidth = cardRect.width;
      const planeHeight = cardRect.height;

      hoverPillMask.style.transform = `translate3d(${planeLeft}px, ${planeTop}px, 0)`;
      hoverPillMask.style.width = `${planeWidth}px`;
      hoverPillMask.style.height = `${planeHeight}px`;

      // Pill follows cursor, centered on pointer
      const cursorInCardX = clientX - cardRect.left;
      const cursorInCardY = clientY - cardRect.top;
      hoverPill.style.transform = `translate3d(${cursorInCardX}px, ${cursorInCardY}px, 0) translate(-50%, -50%)`;
    }

    function showPill(card, clientX, clientY) {
      if (window.innerWidth < 1024 || isDragging) return;
      if (!hoverPillMask || !hoverPill) return;

      pillCurrentCard = card;
      updatePillPosition(clientX, clientY, card);

      if (card) {
        const pIdx = parseInt(card.getAttribute('data-index'), 10);
        const cardProj = (typeof PROJECTS_DATA !== 'undefined' && PROJECTS_DATA[pIdx]) ? PROJECTS_DATA[pIdx] : null;
        const hasVideo = !!(cardProj && cardProj.video);
        const pillItems = hoverPill.querySelectorAll('.gallery-hover-pill-item');
        const text = hasVideo ? 'Watch Video' : 'View Project';
        pillItems.forEach(item => {
          if (item.firstChild && item.firstChild.nodeType === Node.TEXT_NODE) {
            item.firstChild.nodeValue = text;
          } else {
            item.innerHTML = `${text}<span class="gallery-hover-pill-dot"></span>`;
          }
        });
      }

      if (!isPillActive) {
        isPillActive = true;
        hoverPillMask.classList.add('is-active');
        requestAnimationFrame(() => {
          if (isPillActive) {
            hoverPill.classList.add('is-expanded');
          }
        });
      }
    }

    function hidePill() {
      if (!isPillActive && !pillCurrentCard) return;
      isPillActive = false;
      pillCurrentCard = null;
      if (hoverPill) {
        hoverPill.classList.remove('is-expanded');
      }
      setTimeout(() => {
        if (!isPillActive && hoverPillMask) {
          hoverPillMask.classList.remove('is-active');
        }
      }, 220);
    }

    function setHoveredCard(card) {
      if (hoveredCard === card) return;
      if (hoveredCard) {
        hoveredCard.style.filter = '';
      }
      hoveredCard = card;
      if (hoveredCard && isGalleryChromaActive) {
        hoveredCard.style.filter = 'url(#galleryChromaFilter)';
      }
      if (hoveredCard && !isDragging) {
        showPill(hoveredCard, lastGalleryPointerX, lastGalleryPointerY);
      } else if (!hoveredCard) {
        hidePill();
      }
    }

    // Main RAF animation loop
    function animate() {
      const now = performance.now();
      const dt = Math.min(Math.max((now - lastFrameTime) / 1000, 0.001), 0.1);
      lastFrameTime = now;

      if (window.innerWidth >= 1024 && isReady && singleSetWidth > 0) {
        // Frame-rate independent butter-smooth exponential decay lerp (fluid on 60Hz, 120Hz, 144Hz)
        const lerpFactor = 1 - Math.exp(-9.0 * dt);
        const distToTarget = targetX - currentX;
        if (Math.abs(distToTarget) < 0.04) {
          currentX = targetX;
        } else {
          currentX += distToTarget * lerpFactor;
        }

        const cards = galleryTrack.querySelectorAll('.gallery-card');

        // Read live positions of anchor cards in adjacent sets.
        // These change frame-by-frame during CSS height/width transitions (aspect-ratio: 1/1).
        const s2c0 = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS];             // Set 2 Card 0
        const s2last = cards[(CENTER_SET + 1) * TOTAL_ORIGINAL_CARDS - 1]; // Set 2 Card 4 (last)
        const s1c0 = cards[(CENTER_SET - 1) * TOTAL_ORIGINAL_CARDS];       // Set 1 Card 0
        const s3c0 = cards[(CENTER_SET + 1) * TOTAL_ORIGINAL_CARDS];       // Set 3 Card 0

        // WRAP BOUNDARIES: place the seam at the midpoint of the gap between Set 2's
        // last card right edge and Set 3's first card left edge, so ALL 5 Set 2 cards
        // are always inside the window and reachable before any wrap fires.
        const s2lastRight = s2last ? s2last.offsetLeft + s2last.offsetWidth : startOffset + singleSetWidth;
        const s3c0Left = s3c0 ? s3c0.offsetLeft : startOffset + singleSetWidth;
        const maxWrap = (s2lastRight + s3c0Left) / 2;   // midpoint of right seam gap
        const s2c0Left = s2c0 ? s2c0.offsetLeft : startOffset;
        const s1c0Left = s1c0 ? s1c0.offsetLeft : startOffset - singleSetWidth;
        const minWrap = s2c0Left - (s2c0Left - s1c0Left) / 2; // midpoint of left seam gap

        // DIRECTIONAL JUMPS: each jump uses the live distance in that direction.
        // Forward (right scroll): jump by s3c0→s2c0 distance (exactly 1 set rightward).
        // Backward (left scroll): jump by s2c0→s1c0 distance (exactly 1 set leftward).
        const jumpFwd = s3c0 && s2c0 ? s3c0.offsetLeft - s2c0.offsetLeft : singleSetWidth;
        const jumpBck = s2c0 && s1c0 ? s2c0.offsetLeft - s1c0.offsetLeft : singleSetWidth;

        while (targetX >= maxWrap) {
          targetX -= jumpFwd;
          currentX -= jumpFwd;
          if (isDragging) dragStartTargetX -= jumpFwd;
        }
        while (targetX < minWrap) {
          targetX += jumpBck;
          currentX += jumpBck;
          if (isDragging) dragStartTargetX += jumpBck;
        }

        // Apply hardware-accelerated transform
        galleryTrack.style.transform = `translate3d(-${currentX}px, 0, 0)`;

        // Identify the exact card under the mouse cursor in real-time
        if (isHoveringBottomGallery && lastGalleryPointerX > 0 && lastGalleryPointerY > 0) {
          const underPt = document.elementFromPoint(lastGalleryPointerX, lastGalleryPointerY);
          const underCard = underPt ? underPt.closest('.gallery-card') : null;
          setHoveredCard(underCard);
          if (underCard && !isDragging) {
            updatePillPosition(lastGalleryPointerX, lastGalleryPointerY, underCard);
          }
        }

        // Chromatic aberration from scroll velocity & pointer movement (juanmoraromero.com)
        const scrollVelocity = (currentX - lastCurrentX) / dt;
        lastCurrentX = currentX;

        const excess = Math.max(Math.abs(scrollVelocity) - 15, 0);
        // Reduced highest magnitude by 20%: max 11.2 (down from 14), gain 0.0096 (down from 0.012)
        const targetShift = Math.sign(scrollVelocity) * Math.min(excess * 0.0096, 11.2);

        // Exponential decay lerp: 1 - 0.72^(60 * dt)
        chromaScrollX += (targetShift - chromaScrollX) * (1 - Math.pow(0.72, 60 * dt));

        // Exponential pointer decay: 0.86^(60 * dt)
        chromaPointerX *= Math.pow(0.86, 60 * dt);
        chromaPointerY *= Math.pow(0.86, 60 * dt);

        if (Math.abs(chromaScrollX) < 0.02) chromaScrollX = 0;
        if (Math.abs(chromaPointerX) < 0.02) chromaPointerX = 0;
        if (Math.abs(chromaPointerY) < 0.02) chromaPointerY = 0;

        const totalDx = chromaScrollX + chromaPointerX;
        const totalDy = chromaPointerY;
        const chromaMag = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

        // Apply chromatic aberration ONLY to the hovered card
        if (chromaMag > 0.08 && hoveredCard) {
          if (!isGalleryChromaActive || hoveredCard.style.filter !== 'url(#galleryChromaFilter)') {
            hoveredCard.style.filter = 'url(#galleryChromaFilter)';
            isGalleryChromaActive = true;
          }
          if (galleryChromaRed && galleryChromaBlue) {
            galleryChromaRed.setAttribute('dx', totalDx.toFixed(2));
            galleryChromaRed.setAttribute('dy', totalDy.toFixed(2));
            galleryChromaBlue.setAttribute('dx', (-totalDx).toFixed(2));
            galleryChromaBlue.setAttribute('dy', (-totalDy).toFixed(2));
          }
        } else {
          if (hoveredCard && hoveredCard.style.filter) {
            hoveredCard.style.filter = '';
          }
          if (isGalleryChromaActive) {
            if (galleryChromaRed && galleryChromaBlue) {
              galleryChromaRed.setAttribute('dx', '0');
              galleryChromaRed.setAttribute('dy', '0');
              galleryChromaBlue.setAttribute('dx', '0');
              galleryChromaBlue.setAttribute('dy', '0');
            }
            isGalleryChromaActive = false;
          }
        }

        // Identify which card is closest to the left focus edge
        // Only evaluate cards in CENTER_SET so clones at the end/right NEVER receive .is-active or scale!
        let bestIdx = activeProjectIndex;
        let bestCard = activeCardElement;
        let minDiff = Infinity;
        let currentActiveDiff = Infinity;

        for (let p = 0; p < TOTAL_ORIGINAL_CARDS; p++) {
          const card = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + p];
          if (!card) continue;
          const diff = Math.abs(card.offsetLeft - currentX);

          if (card === activeCardElement || p === activeProjectIndex) {
            currentActiveDiff = diff;
          }

          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = p;
            bestCard = card;
          }
        }

        // Hysteresis threshold (35px): To prevent layout shift flickering when cards resize,
        // only switch if candidate card is at least 35px closer than currently active card.
        if (bestIdx !== activeProjectIndex && (minDiff < currentActiveDiff - 35 || currentActiveDiff === Infinity)) {
          updateActiveCard(bestIdx, bestCard);
        } else if (bestCard && activeCardElement !== bestCard && bestIdx === activeProjectIndex) {
          updateActiveCard(bestIdx, bestCard);
        }
      } else if (window.innerWidth < 1024) {
        // Mobile chromatic aberration decay & filter application to hovered/active card
        mobileChromaX *= Math.pow(0.86, 60 * dt);
        if (Math.abs(mobileChromaX) < 0.02) mobileChromaX = 0;

        if (Math.abs(mobileChromaX) > 0.08 && hoveredCard) {
          if (!isGalleryChromaActive || hoveredCard.style.filter !== 'url(#galleryChromaFilter)') {
            hoveredCard.style.filter = 'url(#galleryChromaFilter)';
            isGalleryChromaActive = true;
          }
          if (galleryChromaRed && galleryChromaBlue) {
            galleryChromaRed.setAttribute('dx', mobileChromaX.toFixed(2));
            galleryChromaRed.setAttribute('dy', '0');
            galleryChromaBlue.setAttribute('dx', (-mobileChromaX).toFixed(2));
            galleryChromaBlue.setAttribute('dy', '0');
          }
        } else {
          if (hoveredCard && hoveredCard.style.filter) {
            hoveredCard.style.filter = '';
          }
          if (isGalleryChromaActive) {
            if (galleryChromaRed && galleryChromaBlue) {
              galleryChromaRed.setAttribute('dx', '0');
              galleryChromaRed.setAttribute('dy', '0');
              galleryChromaBlue.setAttribute('dx', '0');
              galleryChromaBlue.setAttribute('dy', '0');
            }
            isGalleryChromaActive = false;
          }
        }
      }

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // ---- SMOOTH SNAP SCROLLING ----
    // Gently settles into the closest card using GSAP power3.out easing without abrupt jumping
    scheduleSnap = function(delay = 240) {
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        if (isDragging || window.innerWidth < 1024 || !isReady || singleSetWidth <= 0) return;

        const cards = galleryTrack.querySelectorAll('.gallery-card');
        let bestSnapX = targetX;
        let bestScore = Infinity;

        for (let p = 0; p < TOTAL_ORIGINAL_CARDS; p++) {
          const card = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + p];
          if (!card) continue;
          const cardLeft = card.offsetLeft;
          const cardWidth = card.offsetWidth;

          // How far past this card's left edge have we scrolled?
          const scrolledPast = targetX - cardLeft;

          // If we've scrolled past 85% of this card, prefer snapping to NEXT card
          if (scrolledPast >= 0 && scrolledPast < cardWidth) {
            const fraction = scrolledPast / cardWidth;
            if (fraction >= 0.85) {
              const nextCard = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + p + 1];
              if (nextCard) {
                bestSnapX = nextCard.offsetLeft;
                bestScore = -1;
                break;
              }
            } else {
              bestSnapX = cardLeft;
              bestScore = -1;
              break;
            }
          }

          // Fallback: pick closest card
          const diff = Math.abs(cardLeft - targetX);
          if (diff < bestScore) {
            bestScore = diff;
            bestSnapX = cardLeft;
          }
        }

        // Smooth GSAP easing into snap position using Juan Mora Romero cubic-bezier
        if (Math.abs(bestSnapX - targetX) > 0.5) {
          if (typeof gsap !== 'undefined') {
            if (snapTween) snapTween.kill();
            const proxy = { x: targetX };
            const easeName = (typeof CustomEase !== 'undefined' && gsap.parseEase('juanReveal')) ? 'juanReveal' : 'power3.out';
            snapTween = gsap.to(proxy, {
              x: bestSnapX,
              duration: 0.75,
              ease: easeName,
              onUpdate: () => {
                targetX = proxy.x;
              },
              onComplete: () => {
                targetX = bestSnapX;
                snapTween = null;
              }
            });
          } else {
            targetX = bestSnapX;
          }
        }
      }, delay);
    }

    let isHoveringBottomGallery = false;

    galleryContainer.addEventListener('mouseenter', (e) => {
      isHoveringBottomGallery = true;
      hasPointerEnteredGallery = true;
      lastGalleryPointerX = e.clientX;
      lastGalleryPointerY = e.clientY;
      const targetCard = e.target.closest ? e.target.closest('.gallery-card') : document.elementFromPoint(e.clientX, e.clientY)?.closest('.gallery-card');
      setHoveredCard(targetCard);
      if (targetCard && !isDragging) {
        showPill(targetCard, e.clientX, e.clientY);
      }
    });

    galleryContainer.addEventListener('mousemove', (e) => {
      if (window.innerWidth < 1024) return;
      const pX = e.clientX;
      const pY = e.clientY;

      const targetCard = e.target.closest ? e.target.closest('.gallery-card') : document.elementFromPoint(pX, pY)?.closest('.gallery-card');
      if (targetCard && !isDragging) {
        setHoveredCard(targetCard);
        updatePillPosition(pX, pY, targetCard);
      } else if (!targetCard) {
        setHoveredCard(null);
        hidePill();
      }

      if (!hasPointerEnteredGallery) {
        hasPointerEnteredGallery = true;
        lastGalleryPointerX = pX;
        lastGalleryPointerY = pY;
        return;
      }
      const pDx = pX - lastGalleryPointerX;
      const pDy = pY - lastGalleryPointerY;
      lastGalleryPointerX = pX;
      lastGalleryPointerY = pY;

      // Reduced magnitude by 20%: max 6.4 (down from 8), gain 0.144 (down from 0.18)
      chromaPointerX = Math.max(-6.4, Math.min(6.4, chromaPointerX + pDx * 0.144));
      chromaPointerY = Math.max(-6.4, Math.min(6.4, chromaPointerY + pDy * 0.144));
    });

    galleryContainer.addEventListener('mouseleave', () => {
      isHoveringBottomGallery = false;
      hasPointerEnteredGallery = false;
      setHoveredCard(null);
      hidePill();
    });

    // Smooth Mouse Wheel / Trackpad Scroll on Desktop (Global on page when modals are closed)
    window.addEventListener('wheel', (e) => {
      if (window.innerWidth >= 1024) {
        // If modals or drawers are open, allow them to handle their own vertical scrolling
        const modal = document.getElementById('projectModal');
        const contactDrawer = document.getElementById('contactDrawer');
        const videoModal = document.getElementById('videoModal');

        if (modal && !modal.classList.contains('pointer-events-none') && !modal.classList.contains('hidden')) return;
        if (contactDrawer && contactDrawer.classList.contains('is-open')) return;
        if (videoModal && !videoModal.classList.contains('hidden')) return;

        // Cancel any active auto-snapping tween so user input takes immediate priority
        if (snapTween) {
          snapTween.kill();
          snapTween = null;
        }

        // Normalize delta across line, page, and pixel modes
        let dX = e.deltaX;
        let dY = e.deltaY;
        if (e.deltaMode === 1) { // LINE mode (notched mouse wheel)
          dX *= 28;
          dY *= 28;
        } else if (e.deltaMode === 2) { // PAGE mode
          dX *= 400;
          dY *= 400;
        }

        const rawDelta = Math.abs(dY) >= Math.abs(dX) ? dY : dX;
        if (Math.abs(rawDelta) < 0.2) return; // Filter out micro-jitter

        e.preventDefault();

        // Smooth virtual scroll accumulator
        targetX += rawDelta * 0.95;

        // Debounce smooth settling snap after user finishes scrolling gesture
        scheduleSnap(240);
      }
    }, { passive: false });

    // Drag Interaction: Mouse
    galleryContainer.addEventListener('mousedown', (e) => {
      if (window.innerWidth < 1024) return;
      isDragging = true;
      if (snapTween) {
        snapTween.kill();
        snapTween = null;
      }
      hidePill();
      hasMoved = false;
      dragStartX = e.clientX;
      dragLastX = e.clientX;
      dragStartTargetX = targetX;
      dragVelocity = 0;
      galleryContainer.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging || window.innerWidth < 1024) return;
      const totalDiff = e.clientX - dragStartX;
      if (Math.abs(totalDiff) > 5) {
        hasMoved = true;
      }
      dragVelocity = e.clientX - dragLastX;
      dragLastX = e.clientX;
      targetX = dragStartTargetX - totalDiff;
    });

    window.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      galleryContainer.classList.remove('is-dragging');

      // Add flick momentum
      if (hasMoved && Math.abs(dragVelocity) > 2) {
        targetX -= dragVelocity * 6;
      }

      scheduleSnap();

      // Reset hasMoved shortly after so click handler can distinguish clicks from drags
      setTimeout(() => {
        hasMoved = false;
        if (isHoveringBottomGallery && lastGalleryPointerX > 0 && lastGalleryPointerY > 0) {
          const under = document.elementFromPoint(lastGalleryPointerX, lastGalleryPointerY)?.closest('.gallery-card');
          if (under && !isDragging) {
            setHoveredCard(under);
            showPill(under, lastGalleryPointerX, lastGalleryPointerY);
          }
        }
      }, 60);
    });

    // Drag Interaction: Touch (Large Displays >= 1024px)
    galleryContainer.addEventListener('touchstart', (e) => {
      if (window.innerWidth < 1024 || e.touches.length !== 1) return;
      isDragging = true;
      hasMoved = false;
      dragStartX = e.touches[0].clientX;
      dragLastX = e.touches[0].clientX;
      dragStartTargetX = targetX;
      dragVelocity = 0;
      const card = e.target.closest ? e.target.closest('.gallery-card') : null;
      if (card) setHoveredCard(card);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || window.innerWidth < 1024 || e.touches.length !== 1) return;
      const totalDiff = e.touches[0].clientX - dragStartX;
      if (Math.abs(totalDiff) > 5) {
        hasMoved = true;
      }
      dragVelocity = e.touches[0].clientX - dragLastX;
      dragLastX = e.touches[0].clientX;
      targetX = dragStartTargetX - totalDiff;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (!isDragging || window.innerWidth < 1024) return;
      isDragging = false;
      if (hasMoved && Math.abs(dragVelocity) > 2) {
        targetX -= dragVelocity * 6;
      }
      scheduleSnap();
      setTimeout(() => {
        hasMoved = false;
        if (!isDragging && !isHoveringBottomGallery) setHoveredCard(null);
      }, 400);
    });

    // Keyboard Arrow Keys (Left / Right navigate infinitely)
    window.addEventListener('keydown', (e) => {
      const modal = document.getElementById('projectModal');
      if (modal && !modal.classList.contains('pointer-events-none')) {
        if (e.key === 'Escape') closeModal();
        return;
      }

      if (window.innerWidth >= 1024) {
        if (snapTween) {
          snapTween.kill();
          snapTween = null;
        }
        const cards = galleryTrack.querySelectorAll('.gallery-card');
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const currentCard = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + activeProjectIndex];
          const nextCard = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + activeProjectIndex + 1];
          if (nextCard && currentCard) {
            targetX += (nextCard.offsetLeft - currentCard.offsetLeft);
          } else {
            targetX += 220;
          }
          scheduleSnap(180);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const currentCard = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + activeProjectIndex];
          const prevCard = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + activeProjectIndex - 1];
          if (prevCard && currentCard) {
            targetX -= (currentCard.offsetLeft - prevCard.offsetLeft);
          } else {
            targetX -= 220;
          }
          scheduleSnap(180);
        }
      }
    });

    // Mobile & Tablet Infinite Native Horizontal Scroll (< 1024px)
    let mobileWrapping = false; // Guard: prevents wrap from re-triggering the scroll listener
    galleryContainer.addEventListener('scroll', () => {
      if (window.innerWidth >= 1024 || singleSetWidth <= 0 || mobileWrapping) return;
      const scrollLeft = galleryContainer.scrollLeft;

      // Chromatic aberration from touch scroll velocity (juanmoraromero.com)
      const mNow = performance.now();
      const mDt = Math.max((mNow - lastMobileScrollTime) / 1000, 0.016);
      lastMobileScrollTime = mNow;
      const mDelta = scrollLeft - lastMobileScrollLeft;
      lastMobileScrollLeft = scrollLeft;

      const mV = mDelta / mDt;
      const mExcess = Math.max(Math.abs(mV) - 20, 0);
      // Reduced highest magnitude by 20%: max 11.2 (down from 14), gain 0.0096 (down from 0.012)
      const mTarget = Math.sign(mV) * Math.min(mExcess * 0.0096, 11.2);
      mobileChromaX += (mTarget - mobileChromaX) * (1 - Math.pow(0.72, 60 * mDt));

      // Seamless infinite wrap: when we cross a set boundary, jump by exactly one set width
      // The flag prevents the programmatic scrollLeft change from re-triggering this handler
      if (scrollLeft >= startOffset + singleSetWidth) {
        mobileWrapping = true;
        galleryContainer.scrollLeft = scrollLeft - singleSetWidth;
        requestAnimationFrame(() => { mobileWrapping = false; });
        return;
      } else if (scrollLeft < startOffset) {
        mobileWrapping = true;
        galleryContainer.scrollLeft = scrollLeft + singleSetWidth;
        requestAnimationFrame(() => { mobileWrapping = false; });
        return;
      }

      // Find which CENTER_SET card is closest to the left edge of the viewport
      // (consistent with desktop behavior — we highlight the leftmost card)
      const cards = galleryTrack.querySelectorAll('.gallery-card');
      let bestDist = Infinity;
      let bestIdx = activeProjectIndex;
      let bestCard = activeCardElement;
      const viewLeft = galleryContainer.scrollLeft;

      for (let p = 0; p < TOTAL_ORIGINAL_CARDS; p++) {
        const c = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + p];
        if (!c) continue;
        const dist = Math.abs(c.offsetLeft - viewLeft);

        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = p;
          bestCard = c;
        }
      }

      if (bestIdx !== activeProjectIndex || (bestCard && activeCardElement !== bestCard)) {
        updateActiveCard(bestIdx, bestCard);
      }
    }, { passive: true });

    // Window Resize Handler
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (window.innerWidth < 1024) hidePill();
      // Instant synchronization of hairline divider during window dragging / resize
      syncHairlineDivider();

      // Debounce track re-anchoring to avoid rapid layout thrash
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Reset isReady so measureDimensions re-syncs scroll position
        isReady = false;
        mobileWrapping = false;
        measureDimensions();

        if (window.innerWidth >= 1024) {
          // Desktop: re-anchor transform to active card
          const cards = galleryTrack.querySelectorAll('.gallery-card');
          const activeCard = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + activeProjectIndex];
          if (activeCard) {
            targetX = activeCard.offsetLeft;
            currentX = targetX;
          }
        } else {
          // Mobile/tablet: re-anchor native scrollLeft to active card
          const cards = galleryTrack.querySelectorAll('.gallery-card');
          const activeCard = cards[CENTER_SET * TOTAL_ORIGINAL_CARDS + activeProjectIndex];
          if (activeCard) {
            mobileWrapping = true;
            galleryContainer.scrollLeft = activeCard.offsetLeft;
            requestAnimationFrame(() => { mobileWrapping = false; });
          }
        }
        syncHairlineDivider();
      }, 120);
    });

    // ResizeObserver: tracks changes in scroll elements (galleryContainer), status bar, or main hero
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        syncHairlineDivider();
      });
      const galleryContainer = document.getElementById('galleryContainer');
      const statusBar = document.getElementById('statusBar');
      const heroMain = document.getElementById('hero');
      if (galleryContainer) ro.observe(galleryContainer);
      if (statusBar) ro.observe(statusBar);
      if (heroMain) ro.observe(heroMain);
    }
  }

  /* ==========================================================================
     5. PROJECT DETAIL MODAL
     ========================================================================== */
  function openModal(idx) {
    const modal = document.getElementById('projectModal');
    if (!modal || typeof PROJECTS_DATA === 'undefined') return;

    const p = PROJECTS_DATA[idx] || PROJECTS_DATA[0];

    document.getElementById('modalTitle').textContent = p.title;
    document.getElementById('modalTagline').textContent = p.tagline;
    document.getElementById('modalCategory').textContent = p.category;
    document.getElementById('modalClient').textContent = p.client;
    document.getElementById('modalRole').textContent = p.role;
    document.getElementById('modalYear').textContent = p.year;

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
  }

  function closeModal() {
    const modal = document.getElementById('projectModal');
    if (!modal) return;
    modal.classList.remove('opacity-100', 'pointer-events-auto');
    modal.classList.add('opacity-0', 'pointer-events-none');
  }

  function initProjectModal() {
    const modal = document.getElementById('projectModal');
    const viewDetailBtn = document.getElementById('viewDetailBtn');
    const closeBtn = document.getElementById('closeModalBtn');

    if (!modal) return;

    if (viewDetailBtn) {
      viewDetailBtn.addEventListener('click', () => {
        const p = (typeof PROJECTS_DATA !== 'undefined' && PROJECTS_DATA[activeProjectIndex]) ? PROJECTS_DATA[activeProjectIndex] : null;
        if (p && p.video) {
          openVideoModal(p.video, p.videoTitle || p.title);
        } else {
          openModal(activeProjectIndex);
        }
      });
    }

    // Card Click: Delegate to galleryContainer
    galleryContainer.addEventListener('click', (e) => {
      // If user was dragging, do not interpret as card click
      if (hasMoved) return;

      const card = e.target.closest('.gallery-card');
      if (!card) return;

      const pIdx = parseInt(card.getAttribute('data-index'), 10);
      const cardProj = (typeof PROJECTS_DATA !== 'undefined' && PROJECTS_DATA[pIdx]) ? PROJECTS_DATA[pIdx] : null;

      if (cardProj && cardProj.video) {
        // Activate card in focus if on desktop and not active
        if (window.innerWidth >= 1024) {
          if (!card.classList.contains('is-active')) {
            const targetCard = galleryTrack.querySelector(`.gallery-card[data-set="${CENTER_SET}"][data-index="${pIdx}"]`);
            if (targetCard) {
              targetX = targetCard.offsetLeft;
              currentX = targetX;
            }
            updateActiveCard(pIdx, targetCard || card);
          }
        }
        // Open the video player with project's video
        openVideoModal(cardProj.video, cardProj.videoTitle || cardProj.title);
        return;
      }

      if (window.innerWidth >= 1024) {
        if (card.classList.contains('is-active')) {
          // If clicking active card, open modal
          openModal(pIdx);
        } else {
          // If clicking inactive card, smoothly glide it to focus in CENTER_SET
          if (snapTween) {
            snapTween.kill();
            snapTween = null;
          }
          const targetCard = galleryTrack.querySelector(`.gallery-card[data-set="${CENTER_SET}"][data-index="${pIdx}"]`);
          const destX = targetCard ? targetCard.offsetLeft : card.offsetLeft;
          if (typeof gsap !== 'undefined') {
            const proxy = { x: targetX };
            const easeName = (typeof CustomEase !== 'undefined' && gsap.parseEase('juanReveal')) ? 'juanReveal' : 'power3.out';
            snapTween = gsap.to(proxy, {
              x: destX,
              duration: 0.75,
              ease: easeName,
              onUpdate: () => {
                targetX = proxy.x;
              },
              onComplete: () => {
                targetX = destX;
                snapTween = null;
              }
            });
          } else {
            targetX = destX;
            scheduleSnap(180);
          }
        }
      } else {
        if (card.classList.contains('is-active')) {
          openModal(pIdx);
        } else {
          // On mobile & tablet, smoothly scroll the tapped card to center
          const targetScroll = card.offsetLeft - (galleryContainer.clientWidth - card.offsetWidth) / 2;
          galleryContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
        }
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('pointer-events-none')) {
        closeModal();
      }
    });
  }  /* ==========================================================================
     6. SHOWREEL VIDEO ENGINE (macOS QuickTime Player Modal)
     ========================================================================== */
  function initShowreelVideo() {
    const section = document.getElementById('showreelSection');
    const inlineVideo = document.getElementById('showreelVideo');
    const canvas = document.getElementById('showreelCanvas');

    // Video Player Window Elements
    const videoModal = document.getElementById('videoModal');
    const videoModalCard = document.getElementById('videoModalCard');
    const videoModalCloseBtn = document.getElementById('videoModalCloseBtn');
    const modalVideo = document.getElementById('modalVideo');
    const quicktimeHud = document.getElementById('quicktimeHud');

    // QuickTime HUD Controls
    const videoPlayPauseBtn = document.getElementById('videoPlayPauseBtn');
    const playIconSvg = document.getElementById('playIconSvg');
    const pauseIconSvg = document.getElementById('pauseIconSvg');
    const videoRewindBtn = document.getElementById('videoRewindBtn');
    const videoForwardBtn = document.getElementById('videoForwardBtn');
    const videoCurrentTime = document.getElementById('videoCurrentTime');
    const videoDuration = document.getElementById('videoDuration');
    const videoScrubberTrack = document.getElementById('videoScrubberTrack');
    const videoProgressBar = document.getElementById('videoProgressBar');
    const videoScrubberThumb = document.getElementById('videoScrubberThumb');

    // Volume Slider Elements
    const videoMuteBtn = document.getElementById('videoMuteBtn');
    const volumeHighSvg = document.getElementById('volumeHighSvg');
    const volumeMutedSvg = document.getElementById('volumeMutedSvg');
    const volumeTrack = document.getElementById('volumeTrack');
    const volumeFill = document.getElementById('volumeFill');
    const volumeThumb = document.getElementById('volumeThumb');

    if (!section || !inlineVideo) return;

    let videoLoaded = false;
    let modalOpen = false;
    let hudTimer = null;

    // -- Procedural fallback canvas while inline video loads --
    if (canvas) {
      const ctx = canvas.getContext('2d');
      let w = canvas.width = section.clientWidth || 600;
      let h = canvas.height = section.clientHeight || 160;

      function resizeCanvas() {
        w = canvas.width = section.clientWidth || 600;
        h = canvas.height = section.clientHeight || 160;
      }
      window.addEventListener('resize', resizeCanvas);

      let frame = 0;
      function renderFallback() {
        if (videoLoaded) return;
        frame += 0.015;
        ctx.fillStyle = '#121214';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        const gridStep = 40;
        for (let x = 0; x < w; x += gridStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }

        const cx = w / 2;
        const cy = h / 2;
        ctx.beginPath();
        for (let i = 0; i < w; i += 4) {
          const y = cy + Math.sin(frame * 2 + i * 0.012) * (h * 0.22) * Math.cos(frame + i * 0.005);
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.strokeStyle = 'rgba(255, 166, 201, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();

        requestAnimationFrame(renderFallback);
      }
      renderFallback();
    }

    // -- Inline video autoplay (muted, loops forever) --
    function ensureInlinePlayback() {
      inlineVideo.muted = true;
      const p = inlineVideo.play();
      if (p !== undefined) {
        p.then(() => {
          if (canvas) {
            canvas.style.opacity = '0';
            setTimeout(() => { videoLoaded = true; }, 500);
          }
        }).catch(() => { });
      }
    }

    inlineVideo.addEventListener('loadeddata', ensureInlinePlayback);
    inlineVideo.addEventListener('canplay', ensureInlinePlayback);
    inlineVideo.addEventListener('ended', () => {
      inlineVideo.currentTime = 0;
      inlineVideo.play().catch(() => { });
    });
    ensureInlinePlayback();

    // -- QuickTime HUD auto-hide when playing --
    function resetHudTimer() {
      if (!quicktimeHud || currentVideoType === 'youtube') return;
      quicktimeHud.classList.remove('is-hidden');
      clearTimeout(hudTimer);
      if (modalOpen && modalVideo && !modalVideo.paused) {
        hudTimer = setTimeout(() => {
          if (modalOpen && modalVideo && !modalVideo.paused) {
            quicktimeHud.classList.add('is-hidden');
          }
        }, 3200);
      }
    }

    if (videoModalCard) {
      videoModalCard.addEventListener('mousemove', resetHudTimer);
      videoModalCard.addEventListener('mouseenter', resetHudTimer);
    }

    let currentVideoType = 'showreel';

    // Helper: Extract YouTube video ID from watch URLs, shortlinks (youtu.be), or Shorts
    function extractYouTubeId(url) {
      if (!url || typeof url !== 'string') return null;
      const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
      const match = url.match(regExp);
      return match ? match[1] : null;
    }

    // Set player aspect ratio while maintaining identical player height
    function setPlayerAspectRatio(ratioStr) {
      if (!videoModalCard || !videoModalMedia) return;
      const ratio = ratioStr || '16 / 9';
      videoModalCard.style.setProperty('--player-aspect', ratio);
      videoModalMedia.style.setProperty('--player-aspect', ratio);
    }

    // -- Video Modal: Open (Supports Showreel, YouTube Embeds, and Custom Project Videos) --
    openVideoModal = function(customSrc, title) {
      if (!videoModal || modalOpen) return;
      modalOpen = true;

      const titleBadge = document.getElementById('videoModalTitleBadge');
      const titleText = document.getElementById('videoModalTitleText');
      const modalYoutubeIframe = document.getElementById('modalYoutubeIframe');

      const isCustom = typeof customSrc === 'string' && customSrc.trim().length > 0;
      const ytId = isCustom ? extractYouTubeId(customSrc) : null;

      if (ytId) {
        // === YOUTUBE EMBED INSIDE THE MINIMAL QUICKTIME/MODAL PLAYER ===
        currentVideoType = 'youtube';

        // 1. Determine Aspect Ratio from project metadata or vertical Shorts format
        const p = (typeof PROJECTS_DATA !== 'undefined')
          ? PROJECTS_DATA.find(item => item.video === customSrc || item.videoTitle === title || (item.video && extractYouTubeId(item.video) === ytId))
          : null;

        if (p && p.aspectRatio) {
          setPlayerAspectRatio(p.aspectRatio);
        } else if (customSrc.includes('/shorts/')) {
          setPlayerAspectRatio('9 / 16');
        } else {
          setPlayerAspectRatio('16 / 9');
        }

        // 2. Hide native video and QuickTime HUD (YouTube has its own player UI)
        if (modalVideo) {
          modalVideo.pause();
          modalVideo.classList.add('hidden');
        }
        if (quicktimeHud) {
          quicktimeHud.classList.add('hidden');
        }

        // 3. Load YouTube Iframe with autoplay and no-cookie domain
        if (modalYoutubeIframe) {
          modalYoutubeIframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`;
          modalYoutubeIframe.classList.remove('hidden');
        }

        // 4. Update Title Badge
        if (titleBadge && titleText) {
          titleText.textContent = (p && (p.videoTitle || p.title)) || title || 'Project Video';
          titleBadge.classList.remove('hidden');
        }

      } else if (isCustom) {
        // === LOCAL / CUSTOM MP4 VIDEO ===
        currentVideoType = 'custom';

        if (modalYoutubeIframe) {
          modalYoutubeIframe.src = '';
          modalYoutubeIframe.classList.add('hidden');
        }
        if (quicktimeHud) {
          quicktimeHud.classList.remove('hidden');
        }
        if (modalVideo) {
          modalVideo.classList.remove('hidden');
          modalVideo.pause();
          const cleanSrc = encodeURI(customSrc);
          if (modalVideo.getAttribute('data-src') !== cleanSrc) {
            modalVideo.setAttribute('data-src', cleanSrc);
            modalVideo.src = cleanSrc;
            modalVideo.load();
          }
          modalVideo.currentTime = 0;
        }

        const p = (typeof PROJECTS_DATA !== 'undefined') ? PROJECTS_DATA.find(item => item.video === customSrc || item.videoTitle === title) : null;
        if (p && p.aspectRatio) {
          setPlayerAspectRatio(p.aspectRatio);
        } else if (customSrc.includes('Google Partnership')) {
          setPlayerAspectRatio('4 / 5');
        } else if (customSrc.includes('Landing Lottie')) {
          setPlayerAspectRatio('4 / 3');
        } else {
          setPlayerAspectRatio('16 / 9');
        }

        if (titleBadge && titleText) {
          titleText.textContent = title || 'Project Video';
          titleBadge.classList.remove('hidden');
        }

        function syncVideoRatio() {
          if (modalVideo && modalVideo.videoWidth > 0 && modalVideo.videoHeight > 0) {
            setPlayerAspectRatio(`${modalVideo.videoWidth} / ${modalVideo.videoHeight}`);
          }
        }
        if (modalVideo && modalVideo.readyState >= 1 && modalVideo.videoWidth > 0) {
          syncVideoRatio();
        } else if (modalVideo) {
          modalVideo.addEventListener('loadedmetadata', syncVideoRatio, { once: true });
        }

        if (modalVideo) {
          modalVideo.muted = false;
          modalVideo.volume = 1.0;
          updateVolumeUI(1.0, false);
          const playPromise = modalVideo.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              updatePlayPauseUI(true);
              resetHudTimer();
            }).catch(() => {
              modalVideo.muted = true;
              updateVolumeUI(0, true);
              modalVideo.play().then(() => {
                updatePlayPauseUI(true);
                resetHudTimer();
              }).catch(() => {
                updatePlayPauseUI(false);
              });
            });
          }
          requestAnimationFrame(updateProgress);
        }

      } else {
        // === SHOWREEL (HTML5 NATIVE WITH QUICKTIME HUD) ===
        currentVideoType = 'showreel';

        if (modalYoutubeIframe) {
          modalYoutubeIframe.src = '';
          modalYoutubeIframe.classList.add('hidden');
        }
        if (quicktimeHud) {
          quicktimeHud.classList.remove('hidden');
        }
        if (modalVideo) {
          modalVideo.classList.remove('hidden');
        }

        setPlayerAspectRatio('16 / 9');

        const showreelSrc = 'showreel.mp4';
        if (modalVideo) {
          if (modalVideo.getAttribute('data-src') !== showreelSrc) {
            modalVideo.setAttribute('data-src', showreelSrc);
            modalVideo.src = showreelSrc;
            modalVideo.load();
          }
        }

        if (titleBadge && titleText) {
          titleText.textContent = 'Showreel';
          titleBadge.classList.remove('hidden');
        }

        // Sync playback position from inline preview safely
        if (inlineVideo && !isNaN(inlineVideo.currentTime) && inlineVideo.currentTime > 0) {
          const syncTime = inlineVideo.currentTime;
          if (modalVideo && modalVideo.readyState >= 1) {
            try { modalVideo.currentTime = syncTime; } catch (_) {}
          } else if (modalVideo) {
            modalVideo.addEventListener('loadedmetadata', function onMeta() {
              try { modalVideo.currentTime = syncTime; } catch (_) {}
            }, { once: true });
          }
        }

        if (modalVideo) {
          modalVideo.muted = false;
          modalVideo.volume = 1.0;
          updateVolumeUI(1.0, false);
          const playPromise = modalVideo.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              updatePlayPauseUI(true);
              resetHudTimer();
            }).catch(() => {
              modalVideo.muted = true;
              updateVolumeUI(0, true);
              modalVideo.play().then(() => {
                updatePlayPauseUI(true);
                resetHudTimer();
              }).catch(() => {
                updatePlayPauseUI(false);
              });
            });
          }
          requestAnimationFrame(updateProgress);
        }
      }

      // Show backdrop
      videoModal.classList.remove('hidden');
      void videoModal.offsetWidth; // Trigger reflow for smooth transition
      videoModal.classList.add('is-open');

      // Smooth exponential scale in with opacity animation
      if (typeof gsap !== 'undefined' && videoModalCard) {
        gsap.killTweensOf(videoModalCard);
        gsap.fromTo(videoModalCard,
          { scale: 0.92, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.52, ease: 'expo.out' }
        );
      }
    };

    // -- Video Modal: Close --
    function closeVideoModal() {
      if (!videoModal || !modalOpen) return;
      modalOpen = false;
      clearTimeout(hudTimer);

      videoModal.classList.remove('is-open');

      // Immediately terminate YouTube playback & audio
      const modalYoutubeIframe = document.getElementById('modalYoutubeIframe');
      if (modalYoutubeIframe) {
        modalYoutubeIframe.src = '';
        modalYoutubeIframe.classList.add('hidden');
      }

      if (modalVideo) {
        modalVideo.pause();
      }
      updatePlayPauseUI(false);

      if (typeof gsap !== 'undefined' && videoModalCard) {
        gsap.killTweensOf(videoModalCard);
        gsap.to(videoModalCard, {
          scale: 0.94,
          opacity: 0,
          duration: 0.22,
          ease: 'power2.in',
          onComplete: () => {
            if (!modalOpen) {
              videoModal.classList.add('hidden');
              videoModal.classList.remove('is-open');
              if (modalVideo) {
                modalVideo.setAttribute('data-src', 'showreel.mp4');
                modalVideo.src = 'showreel.mp4';
                modalVideo.load();
                modalVideo.classList.remove('hidden');
              }
              if (quicktimeHud) {
                quicktimeHud.classList.remove('hidden');
              }
              currentVideoType = 'showreel';
              setPlayerAspectRatio('16 / 9');
            }
          }
        });
      } else {
        setTimeout(() => {
          if (!modalOpen) {
            videoModal.classList.add('hidden');
            if (modalVideo) {
              modalVideo.setAttribute('data-src', 'showreel.mp4');
              modalVideo.src = 'showreel.mp4';
              modalVideo.load();
              modalVideo.classList.remove('hidden');
            }
            if (quicktimeHud) {
              quicktimeHud.classList.remove('hidden');
            }
            currentVideoType = 'showreel';
            setPlayerAspectRatio('16 / 9');
          }
        }, 300);
      }

      // Resume inline playback
      ensureInlinePlayback();
    }

    modalVideo.addEventListener('loadedmetadata', () => {
      if (modalVideo.videoWidth && modalVideo.videoHeight) {
        setPlayerAspectRatio(`${modalVideo.videoWidth} / ${modalVideo.videoHeight}`);
      }
      if (videoDuration && modalVideo.duration) {
        videoDuration.textContent = formatTime(modalVideo.duration);
      }
      if (videoCurrentTime) {
        videoCurrentTime.textContent = formatTime(modalVideo.currentTime);
      }
    });

    // -- Working Pause / Play Toggle --
    function togglePlayPause(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (!modalVideo) return;

      if (modalVideo.paused || modalVideo.ended) {
        modalVideo.play().then(() => {
          updatePlayPauseUI(true);
          resetHudTimer();
        }).catch(() => { });
      } else {
        modalVideo.pause();
        updatePlayPauseUI(false);
        resetHudTimer();
      }
    }

    // Update UI state for play/pause
    function updatePlayPauseUI(isPlaying) {
      if (isPlaying) {
        if (playIconSvg) playIconSvg.classList.add('hidden');
        if (pauseIconSvg) pauseIconSvg.classList.remove('hidden');
      } else {
        if (playIconSvg) playIconSvg.classList.remove('hidden');
        if (pauseIconSvg) pauseIconSvg.classList.add('hidden');
      }
    }

    modalVideo.addEventListener('play', () => {
      updatePlayPauseUI(true);
      resetHudTimer();
    });
    modalVideo.addEventListener('pause', () => {
      updatePlayPauseUI(false);
      resetHudTimer();
    });
    modalVideo.addEventListener('ended', () => {
      updatePlayPauseUI(false);
      modalVideo.currentTime = 0;
      resetHudTimer();
    });

    // -- 10s Rewind and Fast Forward --
    if (videoRewindBtn) {
      videoRewindBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (modalVideo) {
          modalVideo.currentTime = Math.max(0, modalVideo.currentTime - 10);
          resetHudTimer();
        }
      });
    }

    if (videoForwardBtn) {
      videoForwardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (modalVideo) {
          modalVideo.currentTime = Math.min(modalVideo.duration || 0, modalVideo.currentTime + 10);
          resetHudTimer();
        }
      });
    }

    // -- Volume & Mute Controls --
    function setVolume(pct) {
      pct = Math.max(0, Math.min(1, pct));
      if (!modalVideo) return;
      modalVideo.volume = pct;
      modalVideo.muted = (pct === 0);
      updateVolumeUI(pct, modalVideo.muted);
      resetHudTimer();
    }

    function updateVolumeUI(vol, isMuted) {
      const pct = isMuted ? 0 : vol;
      if (volumeFill) volumeFill.style.width = (pct * 100) + '%';
      if (volumeThumb) volumeThumb.style.left = (pct * 100) + '%';
      if (volumeHighSvg && volumeMutedSvg) {
        if (pct === 0 || isMuted) {
          volumeHighSvg.classList.add('hidden');
          volumeMutedSvg.classList.remove('hidden');
        } else {
          volumeHighSvg.classList.remove('hidden');
          volumeMutedSvg.classList.add('hidden');
        }
      }
    }

    if (videoMuteBtn) {
      videoMuteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!modalVideo) return;
        modalVideo.muted = !modalVideo.muted;
        updateVolumeUI(modalVideo.volume, modalVideo.muted);
        resetHudTimer();
      });
    }

    if (volumeTrack) {
      let vDragging = false;
      function onVolMove(e) {
        const rect = volumeTrack.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        setVolume(pct);
      }
      volumeTrack.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        vDragging = true;
        if (quicktimeHud) quicktimeHud.classList.add('is-active-hover');
        onVolMove(e);
      });
      window.addEventListener('mousemove', (e) => {
        if (vDragging) onVolMove(e);
      });
      window.addEventListener('mouseup', () => {
        if (vDragging && quicktimeHud) quicktimeHud.classList.remove('is-active-hover');
        vDragging = false;
      });
    }

    // -- Time Formatting (e.g. 00:02 / 00:08 matching reference) --
    function formatTime(sec) {
      if (isNaN(sec) || sec < 0) return '00:00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    // -- Scrubber / Progress Bar with Playhead Tick Line --
    function updateProgress() {
      if (!modalOpen || !modalVideo) return;
      if (modalVideo.duration > 0) {
        const pct = (modalVideo.currentTime / modalVideo.duration) * 100;
        if (videoProgressBar) videoProgressBar.style.width = pct + '%';
        if (videoScrubberThumb) videoScrubberThumb.style.left = pct + '%';
        if (videoCurrentTime) videoCurrentTime.textContent = formatTime(modalVideo.currentTime);
        if (videoDuration) videoDuration.textContent = formatTime(modalVideo.duration);
      }
      if (modalOpen) {
        requestAnimationFrame(updateProgress);
      }
    }

    if (videoScrubberTrack) {
      let sDragging = false;
      function onScrubMove(e) {
        if (!modalVideo || !modalVideo.duration) return;
        const rect = videoScrubberTrack.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        modalVideo.currentTime = pct * modalVideo.duration;
        resetHudTimer();
      }
      videoScrubberTrack.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        sDragging = true;
        if (quicktimeHud) quicktimeHud.classList.add('is-active-hover');
        onScrubMove(e);
      });
      window.addEventListener('mousemove', (e) => {
        if (sDragging) onScrubMove(e);
      });
      window.addEventListener('mouseup', () => {
        if (sDragging && quicktimeHud) quicktimeHud.classList.remove('is-active-hover');
        sDragging = false;
      });
    }

    // -- Top Right Close Button Action --
    if (videoModalCloseBtn) {
      videoModalCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeVideoModal();
      });
    }

    // -- Showreel Hover Pill (Watch Video cursor) --
    const showreelHoverPillMask = document.getElementById('showreelHoverPillMask');
    const showreelHoverPill = document.getElementById('showreelHoverPill');
    let isShowreelPillActive = false;

    function updateShowreelPillPosition(e) {
      if (!showreelHoverPill || !showreelHoverPillMask || window.innerWidth < 1024) return;
      const rect = section.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      showreelHoverPill.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }

    section.addEventListener('mouseenter', (e) => {
      if (window.innerWidth < 1024 || !showreelHoverPillMask || !showreelHoverPill) return;
      isShowreelPillActive = true;
      updateShowreelPillPosition(e);
      showreelHoverPillMask.classList.add('is-active');
      requestAnimationFrame(() => {
        if (isShowreelPillActive) {
          showreelHoverPill.classList.add('is-expanded');
        }
      });
    });

    section.addEventListener('mousemove', (e) => {
      if (window.innerWidth < 1024) return;
      if (!isShowreelPillActive && showreelHoverPillMask && showreelHoverPill) {
        isShowreelPillActive = true;
        showreelHoverPillMask.classList.add('is-active');
        showreelHoverPill.classList.add('is-expanded');
      }
      updateShowreelPillPosition(e);
    });

    section.addEventListener('mouseleave', () => {
      isShowreelPillActive = false;
      if (showreelHoverPill) showreelHoverPill.classList.remove('is-expanded');
      setTimeout(() => {
        if (!isShowreelPillActive && showreelHoverPillMask) {
          showreelHoverPillMask.classList.remove('is-active');
        }
      }, 220);
    });

    // -- Wire Showreel Trigger on Main Page --
    section.addEventListener('click', (e) => {
      e.stopPropagation();
      isShowreelPillActive = false;
      if (showreelHoverPill) showreelHoverPill.classList.remove('is-expanded');
      if (showreelHoverPillMask) showreelHoverPillMask.classList.remove('is-active');
      openVideoModal();
    });

    if (videoPlayPauseBtn) videoPlayPauseBtn.addEventListener('click', togglePlayPause);

    // Clicking video area directly toggles play/pause (native video only)
    const videoModalMedia = document.getElementById('videoModalMedia');
    if (videoModalMedia) {
      videoModalMedia.addEventListener('click', (e) => {
        if (currentVideoType === 'youtube') return;
        if (!e.target.closest('#quicktimeHud') && !e.target.closest('#videoModalCloseBtn')) {
          togglePlayPause(e);
        }
      });
    }

    // Backdrop click outside card to close
    if (videoModal) {
      videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) {
          closeVideoModal();
        }
      });
    }

    // Keyboard shortcuts (Escape closes, Space toggles play/pause, Left/Right arrows skip 10s)
    window.addEventListener('keydown', (e) => {
      if (!modalOpen) return;
      if (e.key === 'Escape') {
        closeVideoModal();
      } else if (e.key === ' ' || e.code === 'Space') {
        if (currentVideoType !== 'youtube') {
          e.preventDefault();
          togglePlayPause();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentVideoType !== 'youtube') {
          e.preventDefault();
          if (modalVideo) modalVideo.currentTime = Math.max(0, modalVideo.currentTime - 10);
          resetHudTimer();
        }
      } else if (e.key === 'ArrowRight') {
        if (currentVideoType !== 'youtube') {
          e.preventDefault();
          if (modalVideo) modalVideo.currentTime = Math.min(modalVideo.duration || 0, modalVideo.currentTime + 10);
          resetHudTimer();
        }
      }
    });
  }

  /* ==========================================================================
     6.1 INTERACTIVE CHROMATIC ABERRATION (Portrait, Showreel Video & Media)
     Recreates the authentic RGB channel displacement shader from juanmoraromero.com.
     Decays smoothly on RAF using Math.pow(0.86, 60 * dt) and resets cleanly when stationary.
     ========================================================================== */
  function initInteractiveChromaticAberration() {
    function setupElementAberration(container, targetEl, filterId, redOffsetId, blueOffsetId) {
      if (!container || !targetEl) return;
      const redEl = document.getElementById(redOffsetId);
      const blueEl = document.getElementById(blueOffsetId);
      if (!redEl || !blueEl) return;

      let aberrX = 0;
      let aberrY = 0;
      let lastX = 0;
      let lastY = 0;
      let isHovered = false;
      let isActive = false;
      let animId = null;
      let lastTime = performance.now();

      function step() {
        const now = performance.now();
        const dt = Math.min(Math.max((now - lastTime) / 1000, 0.001), 0.1);
        lastTime = now;

        // Juan Mora Romero's decay formula: Math.pow(0.86, 60 * dt)
        aberrX *= Math.pow(0.86, 60 * dt);
        aberrY *= Math.pow(0.86, 60 * dt);

        if (Math.abs(aberrX) < 0.02) aberrX = 0;
        if (Math.abs(aberrY) < 0.02) aberrY = 0;

        const mag = Math.sqrt(aberrX * aberrX + aberrY * aberrY);

        if (mag > 0.06) {
          if (!isActive) {
            targetEl.style.filter = `url(#${filterId})`;
            isActive = true;
          }
          redEl.setAttribute('dx', aberrX.toFixed(2));
          redEl.setAttribute('dy', aberrY.toFixed(2));
          blueEl.setAttribute('dx', (-aberrX).toFixed(2));
          blueEl.setAttribute('dy', (-aberrY).toFixed(2));
          animId = requestAnimationFrame(step);
        } else {
          if (isActive) {
            targetEl.style.filter = '';
            redEl.setAttribute('dx', '0');
            redEl.setAttribute('dy', '0');
            blueEl.setAttribute('dx', '0');
            blueEl.setAttribute('dy', '0');
            isActive = false;
          }
          if (isHovered) {
            animId = requestAnimationFrame(step);
          } else {
            animId = null;
          }
        }
      }

      container.addEventListener('mouseenter', (e) => {
        isHovered = true;
        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = performance.now();
        if (!animId) animId = requestAnimationFrame(step);
      });

      container.addEventListener('mousemove', (e) => {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        // Add impulse from cursor displacement (highest magnitude reduced by 20%)
        aberrX = Math.max(-9.6, Math.min(9.6, aberrX + dx * 0.224));
        aberrY = Math.max(-9.6, Math.min(9.6, aberrY + dy * 0.224));

        if (!animId) {
          lastTime = performance.now();
          animId = requestAnimationFrame(step);
        }
      });

      container.addEventListener('mouseleave', () => {
        isHovered = false;
      });
    }

    // 1. Portrait image in top-left
    const portraitArea = document.getElementById('portraitArea');
    const portraitImg = portraitArea ? portraitArea.querySelector('img') : null;
    if (portraitArea && portraitImg) {
      setupElementAberration(portraitArea, portraitImg, 'portraitChromaFilter', 'portraitChromaRed', 'portraitChromaBlue');
    }

    // 2. Showreel Video in top right
    const showreelSection = document.getElementById('showreelSection');
    const showreelVideo = document.getElementById('showreelVideo');
    if (showreelSection && showreelVideo) {
      setupElementAberration(showreelSection, showreelVideo, 'videoChromaFilter', 'videoChromaRed', 'videoChromaBlue');
    }

    // 3. QuickTime Modal Video player
    const videoModalMedia = document.getElementById('videoModalMedia');
    const modalVideo = document.getElementById('modalVideo');
    if (videoModalMedia && modalVideo) {
      setupElementAberration(videoModalMedia, modalVideo, 'videoChromaFilter', 'videoChromaRed', 'videoChromaBlue');
    }
  }

  /* ==========================================================================
     8. JUAN MORA ROMERO CONTACT DRAWER
     Features:
     - Open/close transitions with cubic-bezier(0.8, 0, 0.17, 1) and backdrop scrim
     - Mode switcher: "Business" vs "Message"
     - Interactive multi-select project type checkboxes
     - Interactive single-select budget radio pills
     - Auto-expanding message textarea
     - Strict field validation matching reference with error alerts
     - Animated kinetic roll submit button
     - Success feedback confirmation
     - ESC key & scrim click handlers
     ========================================================================== */
  function initContactDrawer() {
    const contactScrim = document.getElementById('contactScrim');
    const contactDrawer = document.getElementById('contactDrawer');
    const contactForm = document.getElementById('contactForm');
    const closeBtn = document.getElementById('contactDrawerCloseBtn');
    const navBtnDesktop = document.getElementById('contactNavBtnDesktop');
    const navBtnMobile = document.getElementById('contactNavBtnMobile');

    if (!contactDrawer || !contactScrim) return;

    let currentMode = 'business'; // 'business' or 'message'
    const selectedTypes = new Set();
    let selectedBudget = null;
    let isSubmitting = false;

    // Mode Buttons
    const modeBtnBusiness = document.getElementById('modeBtnBusiness');
    const modeBtnMessage = document.getElementById('modeBtnMessage');
    const sectionTypes = document.getElementById('contactSectionTypes');
    const sectionBudget = document.getElementById('contactSectionBudget');
    const labelMessage = document.getElementById('contactLabelMessage');

    // Inputs
    const inputName = document.getElementById('contactInputName');
    const inputEmail = document.getElementById('contactInputEmail');
    const inputMessage = document.getElementById('contactInputMessage');
    const honeypot = document.getElementById('contactHoneypot');

    // Error elements
    const errorTypes = document.getElementById('errorTypes');
    const errorBudget = document.getElementById('errorBudget');
    const errorName = document.getElementById('errorName');
    const errorEmail = document.getElementById('errorEmail');
    const errorMessage = document.getElementById('errorMessage');
    const submitError = document.getElementById('contactSubmitError');

    // Submit & Status
    const submitBlock = document.getElementById('contactSubmitBlock');
    const submitBtn = document.getElementById('contactSubmitBtn');
    const verbLead = submitBtn ? submitBtn.querySelector('.send-verb-lead') : null;
    const verbTwin = submitBtn ? submitBtn.querySelector('.send-verb-twin') : null;
    const statusSent = document.getElementById('contactStatusSent');

    const emailRegex = /^\S+@\S+\.\S+$/;

    function openDrawer(mode = 'business') {
      setMode(mode);
      clearErrors();
      if (statusSent) statusSent.classList.add('hidden');
      if (submitBlock) submitBlock.classList.remove('hidden');
      contactScrim.classList.add('is-open');
      contactDrawer.classList.add('is-open');
      document.documentElement.style.overflow = 'hidden';

      // Animate drawer text elements with Juan Mora Romero cubic-bezier stagger
      if (typeof gsap !== 'undefined') {
        const easeName = (typeof CustomEase !== 'undefined' && gsap.parseEase('juanReveal')) ? 'juanReveal' : 'power3.out';
        const drawerTexts = contactDrawer.querySelectorAll('#contactDrawerTitle, #projectTypesGroup, #budgetGroup, #contactFormFields > div, #contactSubmitBlock');
        gsap.fromTo(drawerTexts,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, delay: 0.12, ease: easeName }
        );
      }

      if (inputName) {
        setTimeout(() => inputName.focus(), 300);
      }
    }

    function closeDrawer() {
      contactScrim.classList.remove('is-open');
      contactDrawer.classList.remove('is-open');
      document.documentElement.style.overflow = '';
    }

    function setMode(mode) {
      currentMode = mode;
      clearErrors();
      const easeName = (typeof CustomEase !== 'undefined' && gsap.parseEase('juanReveal')) ? 'juanReveal' : 'power3.out';
      if (mode === 'business') {
        if (modeBtnBusiness) {
          modeBtnBusiness.classList.add('is-active');
          modeBtnBusiness.setAttribute('aria-checked', 'true');
        }
        if (modeBtnMessage) {
          modeBtnMessage.classList.remove('is-active');
          modeBtnMessage.setAttribute('aria-checked', 'false');
        }
        if (sectionTypes) {
          sectionTypes.classList.remove('is-hidden');
          if (typeof gsap !== 'undefined') gsap.fromTo(sectionTypes, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: easeName });
        }
        if (sectionBudget) {
          sectionBudget.classList.remove('is-hidden');
          if (typeof gsap !== 'undefined') gsap.fromTo(sectionBudget, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.04, ease: easeName });
        }
        if (labelMessage) animateRevealText(labelMessage, 'Tell me about your project');
      } else {
        if (modeBtnMessage) {
          modeBtnMessage.classList.add('is-active');
          modeBtnMessage.setAttribute('aria-checked', 'true');
        }
        if (modeBtnBusiness) {
          modeBtnBusiness.classList.remove('is-active');
          modeBtnBusiness.setAttribute('aria-checked', 'false');
        }
        if (sectionTypes) sectionTypes.classList.add('is-hidden');
        if (sectionBudget) sectionBudget.classList.add('is-hidden');
        if (labelMessage) animateRevealText(labelMessage, 'What do you want to say?');
      }
    }

    function clearErrors() {
      [errorTypes, errorBudget, errorName, errorEmail, errorMessage, submitError].forEach(el => {
        if (el) el.classList.add('hidden');
      });
      [inputName, inputEmail, inputMessage].forEach(inp => {
        if (inp) inp.classList.remove('has-error');
      });
    }

    // Mode button click events
    if (modeBtnBusiness) {
      modeBtnBusiness.addEventListener('click', () => setMode('business'));
    }
    if (modeBtnMessage) {
      modeBtnMessage.addEventListener('click', () => setMode('message'));
    }

    // Project types selection (multi-select)
    const typeButtons = document.querySelectorAll('#projectTypesGroup button[data-type]');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const typeVal = btn.getAttribute('data-type');
        if (selectedTypes.has(typeVal)) {
          selectedTypes.delete(typeVal);
          btn.classList.remove('is-active');
          btn.setAttribute('aria-checked', 'false');
        } else {
          selectedTypes.add(typeVal);
          btn.classList.add('is-active');
          btn.setAttribute('aria-checked', 'true');
        }
        if (selectedTypes.size > 0 && errorTypes) {
          errorTypes.classList.add('hidden');
        }
      });
    });

    // Budget choices (single-select radio)
    const budgetButtons = document.querySelectorAll('#budgetGroup button[data-budget]');
    budgetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const budgetVal = btn.getAttribute('data-budget');
        selectedBudget = budgetVal;
        budgetButtons.forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-checked', 'true');
        if (errorBudget) errorBudget.classList.add('hidden');
      });
    });

    // Auto-grow textarea
    if (inputMessage) {
      inputMessage.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim() && errorMessage) {
          errorMessage.classList.add('hidden');
          this.classList.remove('has-error');
        }
      });
    }

    // Input error clears
    if (inputName) {
      inputName.addEventListener('input', function () {
        if (this.value.trim() && errorName) {
          errorName.classList.add('hidden');
          this.classList.remove('has-error');
        }
      });
    }
    if (inputEmail) {
      inputEmail.addEventListener('input', function () {
        if (emailRegex.test(this.value.trim()) && errorEmail) {
          errorEmail.classList.add('hidden');
          this.classList.remove('has-error');
        }
      });
    }

    // Form Submission
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (isSubmitting) return;

        // Honeypot check
        if (honeypot && honeypot.value) return;

        let hasError = false;
        let firstInvalidField = null;

        if (currentMode === 'business') {
          if (selectedTypes.size === 0) {
            hasError = true;
            if (errorTypes) errorTypes.classList.remove('hidden');
            if (!firstInvalidField) firstInvalidField = typeButtons[0];
          } else if (errorTypes) {
            errorTypes.classList.add('hidden');
          }

          if (!selectedBudget) {
            hasError = true;
            if (errorBudget) errorBudget.classList.remove('hidden');
            if (!firstInvalidField) firstInvalidField = budgetButtons[0];
          } else if (errorBudget) {
            errorBudget.classList.add('hidden');
          }
        }

        // Validate Name
        if (!inputName || !inputName.value.trim()) {
          hasError = true;
          if (errorName) {
            errorName.textContent = 'We need your name';
            errorName.classList.remove('hidden');
          }
          if (inputName) inputName.classList.add('has-error');
          if (!firstInvalidField) firstInvalidField = inputName;
        }

        // Validate Email
        const emailVal = inputEmail ? inputEmail.value.trim() : '';
        if (!emailVal) {
          hasError = true;
          if (errorEmail) {
            errorEmail.textContent = 'We need your email';
            errorEmail.classList.remove('hidden');
          }
          if (inputEmail) inputEmail.classList.add('has-error');
          if (!firstInvalidField) firstInvalidField = inputEmail;
        } else if (!emailRegex.test(emailVal)) {
          hasError = true;
          if (errorEmail) {
            errorEmail.textContent = "That email doesn't look right";
            errorEmail.classList.remove('hidden');
          }
          if (inputEmail) inputEmail.classList.add('has-error');
          if (!firstInvalidField) firstInvalidField = inputEmail;
        }

        // Validate Message in Message mode
        if (currentMode === 'message') {
          if (!inputMessage || !inputMessage.value.trim()) {
            hasError = true;
            if (errorMessage) {
              errorMessage.textContent = 'We need a message';
              errorMessage.classList.remove('hidden');
            }
            if (inputMessage) inputMessage.classList.add('has-error');
            if (!firstInvalidField) firstInvalidField = inputMessage;
          }
        }

        if (hasError) {
          if (firstInvalidField && typeof firstInvalidField.focus === 'function') {
            firstInvalidField.focus();
          }
          return;
        }

        // Valid Submission: Show "Sending…" animation
        isSubmitting = true;
        if (verbLead) verbLead.textContent = 'Sending…';
        if (verbTwin) verbTwin.textContent = 'Sending…';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.65';
          submitBtn.style.cursor = 'default';
        }

        const projectTypesStr = currentMode === 'business'
          ? (Array.from(selectedTypes).join(', ') || 'None specified')
          : 'N/A (Message Mode)';
        const budgetStr = currentMode === 'business'
          ? (selectedBudget || 'Not specified')
          : 'N/A (Message Mode)';
        const messageVal = inputMessage ? inputMessage.value.trim() : '';

        const payload = {
          name: inputName.value.trim(),
          email: emailVal,
          mode: currentMode === 'business' ? 'Business Inquiry' : 'Direct Message',
          project_types: projectTypesStr,
          budget: budgetStr,
          message: messageVal,
          _subject: `New Portfolio Inquiry from ${inputName.value.trim()}`
        };

        fetch('https://formspree.io/f/xrpbjyey', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        .then(response => {
          if (!response.ok) throw new Error('Submission failed with status: ' + response.status);
          return response.json();
        })
        .then(data => {
          if (data && data.ok === false) {
            throw new Error(data.message || 'Submission error');
          }
          isSubmitting = false;
          if (submitError) submitError.classList.add('hidden');
          if (submitBlock) submitBlock.classList.add('hidden');
          if (statusSent) statusSent.classList.remove('hidden');

          // Reset Form values
          selectedTypes.clear();
          typeButtons.forEach(b => {
            b.classList.remove('is-active');
            b.setAttribute('aria-checked', 'false');
          });
          selectedBudget = null;
          budgetButtons.forEach(b => {
            b.classList.remove('is-active');
            b.setAttribute('aria-checked', 'false');
          });
          if (inputName) inputName.value = '';
          if (inputEmail) inputEmail.value = '';
          if (inputMessage) {
            inputMessage.value = '';
            inputMessage.style.height = '';
          }
          clearErrors();

          setTimeout(() => {
            closeDrawer();
          }, 2000);

          setTimeout(() => {
            if (verbLead) verbLead.textContent = 'Send';
            if (verbTwin) verbTwin.textContent = 'Send';
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.style.opacity = '';
              submitBtn.style.cursor = 'pointer';
            }
          }, 2500);
        })
        .catch(err => {
          console.error('Contact form submission error:', err);
          isSubmitting = false;
          if (submitError) submitError.classList.remove('hidden');
          if (verbLead) verbLead.textContent = 'Send';
          if (verbTwin) verbTwin.textContent = 'Send';
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '';
            submitBtn.style.cursor = 'pointer';
          }
        });
      });
    }

    // Open button listeners
    if (navBtnDesktop) navBtnDesktop.addEventListener('click', () => openDrawer('business'));
    if (navBtnMobile) navBtnMobile.addEventListener('click', () => openDrawer('business'));

    // Close button & Scrim listeners
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (contactScrim) contactScrim.addEventListener('click', closeDrawer);

    // Escape Key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && contactDrawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });
  }

  /* ==========================================================================
     8. JUAN MORA ROMERO SIGNATURE ENTRANCE ANIMATION
     Exact recreation of initial page-load choreographed entrance reveals from
     juanmoraromero.com:
     - Primary curve: cubic-bezier(0.165, 0.84, 0.44, 1)
     - Reveal duration: 1.0s
     - Line & item staggers: 0.08s / 0.04s
     - Masked line-by-line slide ups: translateY(120%) -> 0%
     ========================================================================== */
  function initEntranceAnimation() {
    if (typeof gsap === 'undefined') {
      document.documentElement.classList.remove('js-ready');
      return;
    }

    let revealEase = 'power3.out';
    let sCurveEase = 'power2.inOut';
    if (typeof CustomEase !== 'undefined') {
      try {
        gsap.registerPlugin(CustomEase);
        CustomEase.create('juanReveal', '0.165, 0.84, 0.44, 1');
        CustomEase.create('sCurve', '0.65, 0, 0.35, 1');
        revealEase = 'juanReveal';
        sCurveEase = 'sCurve';
      } catch (e) {
        revealEase = 'power3.out';
        sCurveEase = 'power2.inOut';
      }
    }

    // Set SVG shape groups initial offset safely via GSAP
    gsap.set(['#shapeCircleGroup', '#shapeTriangleGroup'], { y: 220 });

    const tl = gsap.timeline({
      defaults: {
        ease: revealEase,
        duration: 1.0
      },
      onComplete: () => {
        // Clear all transform/opacity styles to ensure interactive physics,
        // dragging, and resize calculations operate on pristine CSS
        document.documentElement.classList.remove('js-ready');
        gsap.set(document.querySelectorAll('.reveal-child'), { clearProps: 'all' });
        gsap.set(['#portraitDot', '#hairlineDivider', '#mobileMetaDivider', '#showreelSection', '#showreelLivePill', '#portraitImg'], { clearProps: 'all' });
        gsap.set(document.querySelectorAll('.gallery-card'), { clearProps: 'all' });
        gsap.set(['#shapeCircleGroup', '#shapeTriangleGroup'], { clearProps: 'transform' });
        isInitialCardSet = true;
        measureDimensions();
        syncHairlineDivider();
      }
    });

    // 1. Navigation & Brand (Desktop & Mobile)
    tl.to('[data-reveal="brand"], [data-reveal="brandMobile"]', { y: '0%' }, 0.00);
    tl.to('[data-reveal="navWork"], [data-reveal="navWorkMobile"]', { y: '0%' }, 0.04);
    tl.to('[data-reveal="navAbout"], [data-reveal="navAboutMobile"]', { y: '0%' }, 0.08);
    tl.to('[data-reveal="navContact"], [data-reveal="navContactMobile"]', { y: '0%' }, 0.12);

    // 2. Portrait Area
    tl.to('#portraitImg', { opacity: 1, scale: 1, duration: 1.0 }, 0.00);
    tl.to('#portraitDot', { scale: 1, duration: 1.0 }, 0.00);

    // 3. Services & Social Links
    tl.to('[data-reveal="services"]', { y: '0%' }, 0.00);
    tl.to('[data-reveal="servicesValue"]', { y: '0%' }, 0.04);
    tl.to('[data-reveal="instagram"]', { y: '0%' }, 0.08);
    tl.to('[data-reveal="linkedin"]', { y: '0%' }, 0.12);

    // 4. Showreel Video Hero Card & Live Status Pill
    tl.to('#showreelSection', { opacity: 1, scale: 1, y: 0, duration: 1.0 }, 0.16);
    tl.to('#showreelLivePill', { opacity: 1, scale: 1, duration: 0.8 }, 0.28);

    // 5. Status Bar (Availability & Scroll)
    tl.to('[data-reveal="availability"]', { y: '0%' }, 0.20);
    tl.to('[data-reveal="availabilityDate"]', { y: '0%' }, 0.24);
    tl.to('[data-reveal="scroll"]', { y: '0%' }, 0.28);

    // 6. Hairline Divider Line (Desktop & Mobile)
    tl.to(['#hairlineDivider', '#mobileMetaDivider'], { scaleX: 1, duration: 1.0 }, 0.36);

    // 7. Bottom Geometric Shapes (Circle & Triangle)
    tl.to('#shapeCircleGroup', { y: 0, duration: 1.0 }, 0.44);
    tl.to('#shapeTriangleGroup', { y: 0, duration: 1.0 }, 0.52);

    // 8. Metadata (Client, Role, Watch Video Button)
    tl.to('[data-reveal="client"]', { y: '0%' }, 0.48);
    tl.to('[data-reveal="clientValue"]', { y: '0%' }, 0.52);
    tl.to('[data-reveal="role"]', { y: '0%' }, 0.56);
    tl.to('[data-reveal="roleValue"]', { y: '0%' }, 0.60);
    tl.to('[data-reveal="viewDetail"]', { y: '0%' }, 0.64);

    // 9. Gallery Counter
    tl.to('[data-reveal="counter"]', { y: '0%' }, 0.68);

    // 10. Horizontal Gallery Track Cards (Staggered Entrance)
    if (galleryTrack && galleryContainer) {
      const allCards = Array.from(galleryTrack.querySelectorAll('.gallery-card'));
      const containerRect = galleryContainer.getBoundingClientRect();
      const visibleCards = [];

      allCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        // Animate cards that are within or adjacent to the viewport
        if (rect.right >= containerRect.left - 50 && rect.left <= containerRect.right + 300) {
          visibleCards.push(card);
        } else {
          // Off-screen buffer cards are ready immediately
          card.style.opacity = '1';
          card.style.transform = 'none';
        }
      });

      if (visibleCards.length > 0) {
        tl.fromTo(visibleCards,
          {
            opacity: 0,
            y: 120
          },
          {
            opacity: 1,
            y: 0,
            duration: 1.0,
            stagger: {
              each: 2 / 60, // Linear offset of 2 frames (approx 33.3ms at 60fps)
              ease: 'none'
            },
            ease: sCurveEase
          },
          0.45
        );
      }
    }
  }

  /* ==========================================================================
     7. INITIALIZATION
     ========================================================================== */
  function init() {
    buildInfiniteTrack();
    initShowreelVideo();
    initInteractiveChromaticAberration();

    // Allow DOM to compute initial layout before measuring
    requestAnimationFrame(() => {
      measureDimensions();
      syncHairlineDivider();
      updateActiveCard(0);
      initHorizontalScrollEngine();
      initProjectModal();
      initContactDrawer();
      initEntranceAnimation();
      setTimeout(() => { isInitialCardSet = true; }, 1200);
    });
    window.addEventListener('load', () => {
      measureDimensions();
      syncHairlineDivider();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
