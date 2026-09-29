/**
 * ABOUT PAGE CONTROLLER — Saurabh Kumar Portfolio
 * Coordinates:
 * - Juan Mora Romero signature entrance animations
 * - Contact drawer interactions (Business / Message mode, validation, submit)
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. CONTACT DRAWER
     ========================================================================== */
  function initContactDrawer() {
    const contactScrim = document.getElementById('contactScrim');
    const contactDrawer = document.getElementById('contactDrawer');
    const contactForm = document.getElementById('contactForm');
    const closeBtn = document.getElementById('contactDrawerCloseBtn');
    const navBtnDesktop = document.getElementById('contactNavBtnDesktop');
    const navBtnMobile = document.getElementById('contactNavBtnMobile');
    const extraTriggers = document.querySelectorAll('.contact-trigger-btn');

    if (!contactDrawer || !contactScrim) return;

    let currentMode = 'business';
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
        if (labelMessage) labelMessage.textContent = 'Tell me about your project';
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
        if (labelMessage) labelMessage.textContent = 'What do you want to say?';
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

    if (modeBtnBusiness) modeBtnBusiness.addEventListener('click', () => setMode('business'));
    if (modeBtnMessage) modeBtnMessage.addEventListener('click', () => setMode('message'));

    // Project type pills
    const typeButtons = contactDrawer.querySelectorAll('#projectTypesGroup [data-type]');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-type');
        if (selectedTypes.has(val)) {
          selectedTypes.delete(val);
          btn.classList.remove('is-active');
          btn.setAttribute('aria-checked', 'false');
        } else {
          selectedTypes.add(val);
          btn.classList.add('is-active');
          btn.setAttribute('aria-checked', 'true');
        }
        if (errorTypes) errorTypes.classList.add('hidden');
      });
    });

    // Budget radio pills
    const budgetButtons = contactDrawer.querySelectorAll('#budgetGroup [data-budget]');
    budgetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-budget');
        budgetButtons.forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-checked', 'false');
        });
        selectedBudget = val;
        btn.classList.add('is-active');
        btn.setAttribute('aria-checked', 'true');
        if (errorBudget) errorBudget.classList.add('hidden');
      });
    });

    // Auto-resize textarea
    if (inputMessage) {
      inputMessage.addEventListener('input', () => {
        inputMessage.style.height = 'auto';
        inputMessage.style.height = `${inputMessage.scrollHeight}px`;
      });
    }

    // Submit handler
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (honeypot && honeypot.value.trim().length > 0) {
          closeDrawer();
          return;
        }

        clearErrors();
        let hasError = false;

        if (currentMode === 'business') {
          if (selectedTypes.size === 0) {
            if (errorTypes) errorTypes.classList.remove('hidden');
            hasError = true;
          }
          if (!selectedBudget) {
            if (errorBudget) errorBudget.classList.remove('hidden');
            hasError = true;
          }
        }

        const nameVal = inputName ? inputName.value.trim() : '';
        if (!nameVal) {
          if (errorName) errorName.classList.remove('hidden');
          if (inputName) inputName.classList.add('has-error');
          hasError = true;
        }

        const emailVal = inputEmail ? inputEmail.value.trim() : '';
        if (!emailVal || !emailRegex.test(emailVal)) {
          if (errorEmail) errorEmail.classList.remove('hidden');
          if (inputEmail) inputEmail.classList.add('has-error');
          hasError = true;
        }

        const msgVal = inputMessage ? inputMessage.value.trim() : '';
        if (!msgVal) {
          if (errorMessage) errorMessage.classList.remove('hidden');
          if (inputMessage) inputMessage.classList.add('has-error');
          hasError = true;
        }

        if (hasError) return;

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

        const payload = {
          name: nameVal,
          email: emailVal,
          mode: currentMode === 'business' ? 'Business Inquiry' : 'Direct Message',
          project_types: projectTypesStr,
          budget: budgetStr,
          message: msgVal,
          _subject: `New Portfolio Inquiry from ${nameVal}`
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

    if (navBtnDesktop) navBtnDesktop.addEventListener('click', () => openDrawer('business'));
    if (navBtnMobile) navBtnMobile.addEventListener('click', () => openDrawer('business'));
    extraTriggers.forEach(btn => btn.addEventListener('click', () => openDrawer('business')));

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (contactScrim) contactScrim.addEventListener('click', closeDrawer);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && contactDrawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });
  }

  /* ==========================================================================
     2. ENTRANCE ANIMATION (Juan Mora Romero Reveal)
     ========================================================================== */
  function initEntranceAnimation() {
    if (typeof gsap === 'undefined') {
      document.documentElement.classList.remove('js-ready');
      return;
    }

    let revealEase = 'power3.out';
    if (typeof CustomEase !== 'undefined') {
      try {
        gsap.registerPlugin(CustomEase);
        CustomEase.create('juanReveal', '0.165, 0.84, 0.44, 1');
        revealEase = 'juanReveal';
      } catch (e) {
        revealEase = 'power3.out';
      }
    }

    const tl = gsap.timeline({
      defaults: {
        ease: revealEase,
        duration: 1.0
      },
      onComplete: () => {
        document.documentElement.classList.remove('js-ready');
      }
    });

    // 1. Navigation items
    tl.to('[data-reveal="brand"]', { y: '0%' }, 0.05);
    tl.to('[data-reveal="brandMobile"]', { y: '0%' }, 0.05);
    tl.to('[data-reveal="navWork"]', { y: '0%' }, 0.10);
    tl.to('[data-reveal="navWorkMobile"]', { y: '0%' }, 0.10);
    tl.to('[data-reveal="navAbout"]', { y: '0%' }, 0.14);
    tl.to('[data-reveal="navAboutMobile"]', { y: '0%' }, 0.14);
    tl.to('[data-reveal="navContact"]', { y: '0%' }, 0.18);
    tl.to('[data-reveal="navContactMobile"]', { y: '0%' }, 0.18);

    // 2. Portrait & Dot
    tl.to('#portraitImg', { opacity: 1, scale: 1, duration: 1.1 }, 0.20);
    tl.to('#portraitDot', { scale: 1, duration: 0.6, ease: 'back.out(2)' }, 0.24);

    // 3. Aside meta items
    tl.to('[data-reveal="services"]', { y: '0%' }, 0.26);
    tl.to('[data-reveal="servicesValue"]', { y: '0%' }, 0.30);
    tl.to('[data-reveal="instagram"]', { y: '0%' }, 0.32);
    tl.to('[data-reveal="linkedin"]', { y: '0%' }, 0.36);

    // 4. Hero Content reveals
    tl.to('[data-reveal="aboutKicker"]', { y: '0%' }, 0.22);
    tl.to('.hero-reveal-line', {
      y: '0%',
      stagger: 0.07,
      duration: 1.0
    }, 0.28);

    // 5. How I Work & Philosophy
    tl.to('[data-reveal="howKicker"]', { y: '0%' }, 0.45);
    tl.to('.how-reveal-p', {
      opacity: 1,
      y: 0,
      stagger: 0.08,
      duration: 0.9
    }, 0.50);

    // 6. Experience Rows
    tl.to('[data-reveal="expKicker"]', { y: '0%' }, 0.60);
    const expRows = document.querySelectorAll('.about-exp-row');
    if (expRows.length > 0) {
      tl.to(expRows, {
        opacity: 1,
        y: 0,
        stagger: 0.06,
        duration: 0.85
      }, 0.65);
    }

    // 7. Footer CTA
    tl.to('#aboutFooterBlock', {
      opacity: 1,
      y: 0,
      duration: 0.8
    }, 0.85);
  }

  /* ==========================================================================
     3. INITIALIZATION
     ========================================================================== */
  function init() {
    initContactDrawer();
    initEntranceAnimation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
