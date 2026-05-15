/**
 * STUDIO PORTFOLIO — SCRIPT.JS
 * Handles:
 *   1. Navigation scroll behavior (header state)
 *   2. Smooth scrolling for nav links
 *   3. Dynamic breadcrumb (built as user scrolls)
 *   4. Scroll-triggered fade-in animations
 *   5. Behind the Scenes — back button with preserved scroll position
 *   6. BTS page: inject project name from URL params
 */

/* =====================================================================
   1. UTILITY: Check if reduced motion is preferred
   ===================================================================== */
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

/* =====================================================================
   2. NAVIGATION — header border on scroll
   ===================================================================== */
(function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  function onScroll() {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run on load
})();

/* =====================================================================
   3. SMOOTH SCROLLING — nav links & breadcrumb clicks
   Navigate to a section and optionally update focus for accessibility.
   ===================================================================== */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return; // skip empty hrefs (BTS back button uses JS)

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const navHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-height'),
        10
      ) || 64;

      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });

      // Move focus to target for screen readers
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
})();

/* =====================================================================
   4. DYNAMIC BREADCRUMB
   - Shows after user scrolls past hero
   - Adds each project section breadcrumb as it enters the viewport
   - Clicking a breadcrumb item jumps to that section
   ===================================================================== */
(function initBreadcrumb() {
  const breadcrumbEl = document.getElementById('breadcrumb');
  const breadcrumbList = document.getElementById('breadcrumb-list');
  const backToTopButton = document.getElementById('back-to-top');
  if (!breadcrumbEl || !breadcrumbList) return;

  // Sections to track: projects + process + about
  // We read from data-breadcrumb attributes on section elements
  const trackedSections = Array.from(
    document.querySelectorAll('[data-breadcrumb]')
  );

  // Track which sections have been "discovered" (added to breadcrumb)
  const discovered = new Set();

  // Track the currently active breadcrumb item
  let currentActive = 'hero';

  /**
   * Create a new breadcrumb item and append it.
   */
  function addBreadcrumbItem(sectionId, label) {
    const li = document.createElement('li');
    li.className = 'breadcrumb-item';
    li.dataset.sectionId = sectionId;

    const a = document.createElement('a');
    a.href = '#' + sectionId;
    a.className = 'breadcrumb-link';
    a.textContent = label;
    a.setAttribute('aria-label', 'Jump to section: ' + label);

    a.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.getElementById(sectionId);
      if (!target) return;
      const navHeight = 64;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    li.appendChild(a);
    breadcrumbList.appendChild(li);
  }

  /**
   * Update the "active" state in the breadcrumb list.
   */
  function setActiveBreadcrumb(sectionId) {
    if (currentActive === sectionId) return;
    currentActive = sectionId;

    breadcrumbList.querySelectorAll('.breadcrumb-item').forEach(function (item) {
      const link = item.querySelector('.breadcrumb-link');
      if (!link) return;
      const isActive =
        (link.getAttribute('href') === '#' + sectionId) ||
        (item.dataset.sectionId === sectionId) ||
        (link.getAttribute('data-section') === sectionId);

      item.classList.toggle('active', isActive);
    });
  }

  /**
   * Main scroll handler for breadcrumb logic.
   */
  function onBreadcrumbScroll() {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const heroEl = document.getElementById('hero');
    const heroBottom = heroEl ? heroEl.offsetTop + heroEl.offsetHeight : 0;

    const isMobileOrTablet = window.matchMedia('(max-width: 1024px)').matches;

    // Show/hide breadcrumb bar
    if (!isMobileOrTablet && scrollY > heroBottom * 0.6) {
      breadcrumbEl.classList.add('visible');
    } else {
      breadcrumbEl.classList.remove('visible');
    }

    if (backToTopButton) {
      if (isMobileOrTablet && scrollY > heroBottom * 0.6) {
        backToTopButton.classList.add('visible');
      } else {
        backToTopButton.classList.remove('visible');
      }
    }

    // Determine which section is currently in view
    // (the one whose top is closest to the top of the viewport)
    let closestSection = null;
    let closestDistance = Infinity;

    trackedSections.forEach(function (section) {
      const rect = section.getBoundingClientRect();
      const distanceFromTop = Math.abs(rect.top - 80); // 80px offset for nav

      // Add to breadcrumb when section enters the top half of viewport
      if (rect.top < windowHeight * 0.6 && !discovered.has(section.id)) {
        discovered.add(section.id);
        addBreadcrumbItem(section.id, section.dataset.breadcrumb);
      }

      // Track closest for active state
      if (rect.top <= 100 && distanceFromTop < closestDistance) {
        closestDistance = distanceFromTop;
        closestSection = section;
      }
    });

    // Also handle "Home" (hero) as active when near top
    if (scrollY < heroBottom * 0.5) {
      setActiveBreadcrumb('hero');
    } else if (closestSection) {
      setActiveBreadcrumb(closestSection.id);
    }
  }

  if (backToTopButton) {
    backToTopButton.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  window.addEventListener('scroll', onBreadcrumbScroll, { passive: true });
  onBreadcrumbScroll(); // run on load
})();

/* =====================================================================
   5. SCROLL-TRIGGERED FADE-IN ANIMATIONS
   Adds .fade-in class to key elements and uses IntersectionObserver
   to trigger .visible when they enter the viewport.
   ===================================================================== */
(function initScrollAnimations() {
  if (prefersReducedMotion) return; // skip animations if user prefers reduced motion

  // Elements to animate
  const animatableSelectors = [
    '.project-intro',
    '.project-media',
    '.project-text',
    '.process-step',
    '.about-text',
    '.about-portrait',
    '.bts-hero',
    '.bts-step-text',
    '.bts-step-media',
  ];

  const elements = document.querySelectorAll(animatableSelectors.join(', '));

  elements.forEach(function (el) {
    el.classList.add('fade-in');
  });

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Once visible, stop observing (animation plays once)
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -60px 0px', // trigger slightly before element is fully visible
      threshold: 0.1,
    }
  );

  elements.forEach(function (el) {
    observer.observe(el);
  });
})();

/* =====================================================================
   6. BEHIND THE SCENES — Back Button with Preserved Scroll Position
   On the main page: save scroll position before navigating to BTS page.
   On the BTS page:  restore scroll position when going back.
   ===================================================================== */
(function initBtsNavigation() {

  // ── A. ON THE MAIN PAGE ──────────────────────────────────────────────
  // Intercept all "Behind the Scenes" links to save scroll position
  const btsLinks = document.querySelectorAll('.btn-bts[href]');
  btsLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      // Save current scroll position in sessionStorage
      sessionStorage.setItem('portfolio-scroll', window.scrollY.toString());
    });
  });

  // ── B. ON THE BTS PAGE ───────────────────────────────────────────────
  // If we're on the BTS page, set up the back button to restore scroll
  const backButtons = document.querySelectorAll('#back-btn, #back-btn-bottom');
  if (backButtons.length > 0) {
    backButtons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        // Navigate back — history.back() preserves scroll if available,
        // otherwise we go to index.html and let the load handler restore it
        if (document.referrer && document.referrer.includes(window.location.hostname)) {
          history.back();
        } else {
          window.location.href = 'index.html';
        }
      });
    });
  }

  // ── C. ON PAGE LOAD — restore scroll position if coming back ─────────
  // This fires on index.html after the user returns from a BTS page
  const savedScroll = sessionStorage.getItem('portfolio-scroll');
  if (savedScroll && !document.body.classList.contains('bts-page')) {
    const scrollTarget = parseInt(savedScroll, 10);
    // Use requestAnimationFrame to ensure layout is complete before scrolling
    requestAnimationFrame(function () {
      window.scrollTo({ top: scrollTarget, behavior: 'instant' });
      // Clean up so subsequent visits start at top
      sessionStorage.removeItem('portfolio-scroll');
    });
  }

})();

/* =====================================================================
   7. BTS PAGE — Inject project name from URL parameters
   URL format: behind-the-scenes.html?project=1&name=Project+Name
   ===================================================================== */
(function initBtsPage() {
  if (!document.body.classList.contains('bts-page')) return;

  const params = new URLSearchParams(window.location.search);
  const projectName = params.get('name');
  const projectNum  = params.get('project');

  // Update page title
  if (projectName) {
    const titleEl = document.getElementById('bts-title');
    if (titleEl) titleEl.textContent = decodeURIComponent(projectName);

    // Update <title> tag
    document.title = decodeURIComponent(projectName) + ' — Behind the Scenes — Studio';

    // Update breadcrumb label in header
    const labelEl = document.getElementById('bts-project-name');
    if (labelEl) labelEl.textContent = decodeURIComponent(projectName);
  }

  // Update meta description
  if (projectName && projectNum) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Behind the scenes: how we created the ' + decodeURIComponent(projectName) + ' project.'
      );
    }
  }
})();

/* =====================================================================
   8. KEYBOARD NAVIGATION ENHANCEMENT
   Trap focus sensibly; ensure skip-to-main-content works.
   ===================================================================== */
(function initKeyboardNav() {
  // Ensure first focusable element in nav is accessible
  const nav = document.querySelector('.nav');
  if (!nav) return;

  // Add a "skip to content" link dynamically for screen reader / keyboard users
  const skip = document.createElement('a');
  skip.href = '#main-content';
  skip.className = 'skip-link';
  skip.textContent = 'Skip to main content';
  skip.style.cssText = [
    'position: fixed',
    'top: -999px',
    'left: 1rem',
    'z-index: 9999',
    'background: #1a1a1a',
    'color: #fff',
    'padding: 0.5rem 1rem',
    'font-size: 0.875rem',
    'text-decoration: none',
    'border-radius: 0 0 4px 4px',
    'transition: top 0.2s',
  ].join('; ');

  skip.addEventListener('focus', function () {
    skip.style.top = '0';
  });

  skip.addEventListener('blur', function () {
    skip.style.top = '-999px';
  });

  document.body.insertBefore(skip, document.body.firstChild);
})();
