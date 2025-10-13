(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Analytics = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  
  // ============ USER ID GENERATOR ============
  class UserIdGenerator {
    constructor(appKey) {
      // ✅ MULTI-TENANCY: Include app_key in storage key for isolation
      // This ensures that multiple apps on the same domain have separate user IDs
      this.appKey = appKey;
      this.STORAGE_KEY = 'analytics_user_id_' + appKey;
      this.userId = null;
    }

    init() {
      this.userId = this.getOrCreateUserId();
      return this.userId;
    }

    getOrCreateUserId() {
      // Try to get existing user ID from storage
      let userId = this.getFromStorage();
      
      if (!userId) {
        // Generate new 8-10 digit integer ID
        userId = this.generateUserId();
        this.saveToStorage(userId);
      }
      
      return userId;
    }

    generateUserId() {
      // Generate a random 8-10 digit integer
      const min = 10000000;   // 8 digits minimum
      const max = 9999999999;  // 10 digits maximum
      
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        // Use crypto for better randomness
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        
        // Scale the random value to our range
        const randomNum = min + (array[0] % (max - min + 1));
        return Math.abs(randomNum).toString();
      }
      
      // Fallback for older browsers
      const randomNum = min + Math.floor(Math.random() * (max - min + 1));
      return randomNum.toString();
    }

    getFromStorage() {
      // Try multiple storage methods for resilience
      try {
        // Try localStorage first (most persistent)
        const localStorageId = localStorage.getItem(this.STORAGE_KEY);
        if (localStorageId) return localStorageId;
      } catch (e) {
        console.debug('localStorage not available');
      }
      
      try {
        // Try cookies
        const cookieMatch = document.cookie.match(new RegExp('(^| )' + this.STORAGE_KEY + '=([^;]+)'));
        if (cookieMatch) return cookieMatch[2];
      } catch (e) {
        console.debug('Cookies not available');
      }
      
      try {
        // Fallback to sessionStorage (least persistent)
        return sessionStorage.getItem(this.STORAGE_KEY);
      } catch (e) {
        return null;
      }
    }

    saveToStorage(userId) {
      // Save to multiple storage locations for resilience
      try {
        localStorage.setItem(this.STORAGE_KEY, userId);
        localStorage.setItem(this.STORAGE_KEY + '_created', new Date().toISOString());
      } catch (e) {
        console.debug('localStorage write failed');
      }
      
      try {
        // Set cookie with 1 year expiration
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = this.STORAGE_KEY + '=' + userId + '; expires=' + expires.toUTCString() + '; path=/; SameSite=Lax';
      } catch (e) {
        console.debug('Cookie write failed');
      }
      
      try {
        sessionStorage.setItem(this.STORAGE_KEY, userId);
      } catch (e) {
        console.debug('sessionStorage write failed');
      }
    }
  }
  
  // ============ MAIN ANALYTICS TRACKER ============
  class AnalyticsTracker {
    constructor() {
      // 🎯 ANALYTICS ENDPOINT
      // This tracker connects to the analytics service.
      // Each app is identified by its unique app_key.
      this.config = {
        appKey: 'demo-test-apps-2025-10-13-a0q3a0z830j',
        endpoint: 'https://analytics-service-production-0f0c.up.railway.app/ingest/analytics',
        batchSize: 10,
        flushInterval: 30000
      };
      
      this.eventQueue = [];
      this.sessionId = this.getOrCreateSession();
      this.userIdGenerator = new UserIdGenerator(this.config.appKey);
      this.userId = this.userIdGenerator.init();
      this.pageLoadTime = Date.now();
      this.maxScrollDepth = 0;
      this.hasViewedPage = false;
      this.scrollDirection = 'down';
      this.lastScrollY = 0;
      this.reachedMilestones = new Set();
      this.formTracking = new WeakMap();
      this.clickedElements = new WeakSet();
      this.visibleElements = new WeakMap();
      this.pageContext = {};
      
      // AI-discovered component patterns
      this.componentDetectors = [
      ];
      
      if (typeof window !== 'undefined') {
        this.setupListeners();
        this.startFlushTimer();
        this.initAutoTracking();
      }
    }

    getOrCreateSession() {
      try {
        let sessionId = sessionStorage.getItem('analytics_session_id');
        if (!sessionId) {
          sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          sessionStorage.setItem('analytics_session_id', sessionId);
        }
        return sessionId;
      } catch {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }
    }

    setupListeners() {
      window.addEventListener('beforeunload', () => this.flush());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush();
      });
    }

    startFlushTimer() {
      setInterval(() => {
        if (this.eventQueue.length > 0) this.flush();
      }, this.config.flushInterval);
    }

    // ============ AI-ENHANCED AUTO-TRACKING ============
    initAutoTracking() {
      console.log('[demo-test-apps-2025-10-13-a0q3a0z830j] 🤖 AI-Enhanced Analytics initialized');
      console.log('[demo-test-apps-2025-10-13-a0q3a0z830j] 📊 Tracking 0 discovered components');
      console.log('[demo-test-apps-2025-10-13-a0q3a0z830j] 🔑 User ID:', this.userId);
      console.log('[demo-test-apps-2025-10-13-a0q3a0z830j] 📍 Session ID:', this.sessionId);
      
      this.trackPageView();
      this.trackAllClicks();
      this.trackFormInteractions();
      this.trackScrollDepth();
      this.trackRouteChanges();
      this.trackElementVisibility();
    }

    // Detect component using AI-discovered patterns
    detectComponent(element) {
      for (const detector of this.componentDetectors) {
        for (const selector of detector.selectors) {
          try {
            if (element.matches(selector) || element.closest(selector)) {
              return detector;
            }
          } catch (e) {
            // Invalid selector, skip
          }
        }
      }
      return null;
    }

    // ============ ENHANCED CONTEXT EXTRACTION SYSTEM ============
    extractContext(element, componentInfo) {
      if (!componentInfo?.context_collection) return {};
      
      const context = {};
      const scope = this.findContextScope(element, componentInfo.context_collection.scope_selector);
      if (!scope) return {};
      
      // Extract configured fields
      for (const fieldConfig of componentInfo.context_collection.fields) {
        try {
          const value = this.extractFieldValue(scope, fieldConfig);
          if (value !== null && value !== undefined) {
            context[fieldConfig.field_name] = value;
            
            // Track previous value if configured
            if (componentInfo.context_collection.state_tracking?.track_previous_value) {
              const prevValue = this.getPreviousValue(scope, fieldConfig);
              if (prevValue !== null) {
                context[fieldConfig.field_name + '_previous'] = prevValue;
              }
            }
          }
        } catch (error) {
          console.debug(`[demo-test-apps-2025-10-13-a0q3a0z830j] Context extraction failed for ${fieldConfig.field_name}`, error);
        }
      }
      
      // Add timing if configured
      if (componentInfo.context_collection.state_tracking?.track_timing) {
        context._interaction_timestamp = Date.now();
      }
      
      return context;
    }

    findContextScope(element, scopeSelector) {
      if (!scopeSelector) return element;
      
      // Try exact scope first
      let scope = element.closest(scopeSelector);
      if (scope) return scope;
      
      // Fallback to common patterns
      return element.closest('form') ||
             element.closest('[role="dialog"]') ||
             element.closest('[data-form]') ||
             element.closest('[data-component]') ||
             element.closest('[data-item-id]') ||
             element.closest('tr') ||
             element.closest('li') ||
             element.closest('section') ||
             element;
    }

    extractFieldValue(scope, fieldConfig) {
      let targetElement;
      
      // Handle special 'count' extraction
      if (fieldConfig.extraction_method === 'count') {
        const elements = scope.querySelectorAll(fieldConfig.selector);
        return elements.length;
      }
      
      targetElement = scope.querySelector(fieldConfig.selector);
      if (!targetElement) return null;
      
      switch (fieldConfig.extraction_method) {
        case 'value':
          return this.coerceType(targetElement.value, fieldConfig.data_type);
        
        case 'checked':
          if (fieldConfig.data_type === 'array') {
            // Multiple checkboxes - collect all checked values
            const checked = scope.querySelectorAll(fieldConfig.selector + ':checked');
            const values = Array.from(checked).map(el => {
              return fieldConfig.attribute_name ? 
                el.getAttribute(fieldConfig.attribute_name) : 
                el.value;
            });
            return values;
          }
          return targetElement.checked;
        
        case 'textContent':
          return targetElement.textContent.trim();
        
        case 'data-attribute':
          const attrName = fieldConfig.attribute_name || 'data-value';
          return this.coerceType(
            targetElement.getAttribute(attrName), 
            fieldConfig.data_type
          );
        
        case 'aria-attribute':
          const ariaAttr = 'aria-' + (fieldConfig.attribute_name || 'value');
          return targetElement.getAttribute(ariaAttr);
        
        case 'class-state':
          // Extract state from class names
          const classes = Array.from(targetElement.classList);
          if (fieldConfig.attribute_name) {
            // Look for specific class pattern
            const pattern = new RegExp(fieldConfig.attribute_name);
            const match = classes.find(c => pattern.test(c));
            return match || null;
          }
          return classes.join(' ');
        
        case 'computed-style':
          const style = window.getComputedStyle(targetElement);
          return style[fieldConfig.attribute_name || 'display'];
        
        default:
          return targetElement.value || targetElement.textContent;
      }
    }

    getPreviousValue(scope, fieldConfig) {
      const el = scope.querySelector(fieldConfig.selector);
      if (!el) return null;
      
      // Check for data-previous-value attribute
      const prevAttr = el.getAttribute('data-previous-value');
      if (prevAttr) return this.coerceType(prevAttr, fieldConfig.data_type);
      
      // Check for aria-valuenow vs aria-valuemin (state change)
      const ariaNow = el.getAttribute('aria-valuenow');
      if (ariaNow) return this.coerceType(ariaNow, fieldConfig.data_type);
      
      return null;
    }

    coerceType(value, dataType) {
      if (value === null || value === undefined) return value;
      if (!dataType) return value;
      
      switch (dataType) {
        case 'number':
          const num = Number(value);
          return isNaN(num) ? null : num;
        case 'boolean':
          return value === 'true' || value === true || value === '1';
        case 'array':
          return Array.isArray(value) ? value : [value];
        case 'object':
          try {
            return typeof value === 'string' ? JSON.parse(value) : value;
          } catch {
            return value;
          }
        default:
          return String(value);
      }
    }

    // Enhanced click tracking with new BUTTON_CLICK event
    trackAllClicks() {
      document.addEventListener('click', (e) => {
        const target = e.target;
        
        if (this.clickedElements.has(target)) return;
        this.clickedElements.add(target);
        setTimeout(() => this.clickedElements.delete(target), 100);
        
        // Try AI component detection first
        const componentInfo = this.detectComponent(target);
        
        // Find clickable element
        const clickable = target.closest(`
          button, [role="button"], [onclick], input[type="submit"], input[type="button"],
          [class*="button"], [class*="btn"], svg, [class*="icon"], [data-clickable],
          [style*="cursor: pointer"], a
        `);
        
        if (clickable || componentInfo) {
          const element = clickable || target;
          
          // Extract rich context using pattern-based extraction
          const contextData = componentInfo ? this.extractContext(element, componentInfo) : {};
          
          this.trackEvent('BUTTON_CLICK', {
            element_text: this.getElementText(element).slice(0, 100),
            element_id: element.id || null,
            element_type: this.getButtonType(element),
            surface: this.getSurface(element),
            page_path: window.location.pathname,
            is_primary_cta: this.isPrimaryCTA(element),
            cta_category: this.getCTACategory(element, componentInfo),
            pattern_type: componentInfo?.pattern_type || null,
            context: contextData
          });
        }
      }, true);
    }

    trackFormInteractions() {
      document.addEventListener('focusin', (e) => {
        const field = e.target;
        const form = field.closest('form');
        
        if (form && !this.formTracking.has(form)) {
          this.formTracking.set(form, {
            started: true,
            startTime: Date.now(),
            fieldsInteracted: new Set()
          });
          
          this.trackEvent('FORM_INTERACTION', {
            action: 'started',
            form_name: this.getFormName(form),
            form_id: form.id || null,
            form_type: this.getFormType(form),
            surface: this.getSurface(form),
            page_path: window.location.pathname,
            fields_total: form.elements ? form.elements.length : 0,
            fields_completed: 0
          });
        }
        
        if (form && this.formTracking.has(form)) {
          const tracking = this.formTracking.get(form);
          tracking.fieldsInteracted.add(field.name || field.id || field.type);
        }
      });

      document.addEventListener('submit', (e) => {
        const form = e.target;
        const tracking = this.formTracking.get(form);
        
        this.trackEvent('FORM_INTERACTION', {
          action: 'submitted',
          form_name: this.getFormName(form),
          form_id: form.id || null,
          form_type: this.getFormType(form),
          surface: this.getSurface(form),
          page_path: window.location.pathname,
          fields_total: form.elements ? form.elements.length : 0,
          fields_completed: tracking ? tracking.fieldsInteracted.size : 0
        });
        
        // If form is inside a modal, also track MODAL_INTERACTION with submitted action
        const modal = form.closest('[role="dialog"]') || 
                      form.closest('.modal') || 
                      form.closest('[data-modal]') ||
                      form.closest('[class*="modal"]');
        
        if (modal) {
          const componentInfo = this.detectComponent(modal);
          const context = componentInfo ? this.extractContext(modal, componentInfo) : {};
          
          this.trackEvent('MODAL_INTERACTION', {
            action: 'submitted',
            modal_name: this.getElementName(modal),
            modal_id: modal.id || null,
            trigger_source: 'button_click',
            page_path: window.location.pathname,
            context: context
          });
        }
        
        this.formTracking.delete(form);
      });

      // Track form abandonment
      window.addEventListener('beforeunload', () => {
        this.formTracking.forEach((tracking, form) => {
          if (tracking.started && Date.now() - tracking.startTime > 1000) {
            this.trackEvent('FORM_INTERACTION', {
              action: 'abandoned',
              form_name: this.getFormName(form),
              form_id: form.id || null,
              form_type: this.getFormType(form),
              surface: this.getSurface(form),
              page_path: window.location.pathname,
              fields_total: form.elements ? form.elements.length : 0,
              fields_completed: tracking.fieldsInteracted.size
            });
          }
        });
      });
    }

    trackElementVisibility() {
      // Track modal/popup/dialog visibility
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'class' || 
               mutation.attributeName === 'style' || 
               mutation.attributeName === 'aria-hidden')) {
            
            const element = mutation.target;
            const isOverlay = this.isOverlayElement(element);
            
            if (isOverlay) {
              const isVisible = this.isElementVisible(element);
              const wasVisible = this.visibleElements.get(element);
              const overlayType = this.getOverlayType(element);
              const isModal = overlayType === 'modal' || element.getAttribute('role') === 'dialog';
              
              if (isVisible && !wasVisible) {
                this.visibleElements.set(element, true);
                
                // Use MODAL_INTERACTION for modals, ELEMENT_VISIBILITY for others
                if (isModal) {
                  const componentInfo = this.detectComponent(element);
                  const context = componentInfo ? this.extractContext(element, componentInfo) : {};
                  
                  this.trackEvent('MODAL_INTERACTION', {
                    action: 'opened',
                    modal_name: this.getElementName(element),
                    modal_id: element.id || null,
                    trigger_source: 'button_click',
                    page_path: window.location.pathname,
                    context: context
                  });
                } else {
                  this.trackEvent('ELEMENT_VISIBILITY', {
                    action: 'shown',
                    element_type: overlayType,
                    element_name: this.getElementName(element),
                    element_id: element.id || null,
                    trigger_source: 'auto_trigger',
                    page_path: window.location.pathname,
                    has_cta: this.hasCallToAction(element)
                  });
                }
              } else if (!isVisible && wasVisible) {
                this.visibleElements.set(element, false);
                
                // Use MODAL_INTERACTION for modals, ELEMENT_VISIBILITY for others
                if (isModal) {
                  const componentInfo = this.detectComponent(element);
                  const context = componentInfo ? this.extractContext(element, componentInfo) : {};
                  
                  this.trackEvent('MODAL_INTERACTION', {
                    action: 'closed',
                    modal_name: this.getElementName(element),
                    modal_id: element.id || null,
                    trigger_source: 'button_click',
                    page_path: window.location.pathname,
                    context: context
                  });
                } else {
                  this.trackEvent('ELEMENT_VISIBILITY', {
                    action: 'hidden',
                    element_type: overlayType,
                    element_name: this.getElementName(element),
                    element_id: element.id || null,
                    trigger_source: 'button_click',
                    page_path: window.location.pathname,
                    has_cta: this.hasCallToAction(element)
                  });
                }
              }
            }
          }
        });
      });

      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class', 'style', 'aria-hidden']
      });
    }

    trackScrollDepth() {
      let scrollTimer;
      
      const checkScrollDepth = () => {
        const currentY = window.scrollY;
        this.scrollDirection = currentY > this.lastScrollY ? 'down' : 'up';
        this.lastScrollY = currentY;
        
        const scrollPercent = Math.round(
          (window.scrollY + window.innerHeight) / document.body.scrollHeight * 100
        );
        
        const milestones = [25, 50, 75, 90, 100];
        const milestone = milestones.find(m => 
          m <= scrollPercent && !this.reachedMilestones.has(m)
        );
        
        if (milestone) {
          this.reachedMilestones.add(milestone);
          this.trackEvent('SCROLL_INTERACTION', {
            action: 'depth_reached',
            depth_percentage: milestone,
            milestone: milestone + '%',
            page_path: window.location.pathname,
            direction: this.scrollDirection
          });
        }
      };
      
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(checkScrollDepth, 500);
      });
    }

    trackRouteChanges() {
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = (...args) => {
        originalPushState.apply(history, args);
        setTimeout(() => {
          this.pageContext = {};
          this.reachedMilestones.clear();
          this.trackPageView();
        }, 0);
      };
      
      history.replaceState = (...args) => {
        originalReplaceState.apply(history, args);
        setTimeout(() => {
          this.pageContext = {};
          this.reachedMilestones.clear();
          this.trackPageView();
        }, 0);
      };
      
      window.addEventListener('popstate', () => {
        this.pageContext = {};
        this.reachedMilestones.clear();
        this.trackPageView();
      });
    }

    // ============ HELPER METHODS ============
    getElementText(element) {
      return element.innerText || 
             element.textContent ||
             element.value ||
             element.getAttribute('aria-label') ||
             element.getAttribute('title') ||
             'Unknown';
    }

    getElementName(element) {
      return element.getAttribute('aria-label') ||
             element.getAttribute('title') ||
             element.dataset.name ||
             element.id ||
             'unnamed';
    }

    getFormName(form) {
      return form.getAttribute('name') || 
             form.getAttribute('aria-label') ||
             form.id ||
             'form';
    }

    getEntryType() {
      if (typeof performance !== 'undefined' && performance.getEntriesByType) {
        const navType = performance.getEntriesByType('navigation')[0];
        if (navType && navType.type) {
          switch(navType.type) {
            case 'reload': return 'reload';
            case 'back_forward': return 'back_forward';
            default: return 'navigation';
          }
        }
      }
      return 'navigation';
    }

    getSurface(element) {
      const section = element.closest('header, nav, main, footer, aside, section[data-component], [data-surface]');
      if (section) {
        return section.dataset.surface || 
               section.dataset.component ||
               section.tagName.toLowerCase();
      }
      return 'unknown';
    }

    getButtonType(element) {
      if (element.tagName === 'A') return 'link';
      if (element.querySelector('svg') || (element.className && element.className.toString().includes('icon'))) return 'icon';
      if (element.getAttribute('role') === 'tab') return 'tab';
      return 'button';
    }

    isPrimaryCTA(element) {
      const classes = (element.className || '').toString().toLowerCase();
      return classes.includes('primary') || 
             classes.includes('cta') ||
             classes.includes('hero') ||
             element.dataset.primary === 'true';
    }

    getCTACategory(element, componentInfo) {
      const text = this.getElementText(element).toLowerCase();
      const purpose = componentInfo?.purpose || '';
      
      if (text.match(/buy|purchase|checkout|cart|order/)) return 'conversion';
      if (text.match(/learn|view|browse|explore|next|previous/)) return 'navigation';
      return 'engagement';
    }

    getFormType(form) {
      const formId = (form.id || '').toLowerCase();
      const formName = (form.name || '').toLowerCase();
      const inputs = form.elements ? Array.from(form.elements) : [];
      
      if (formId.includes('checkout') || formName.includes('checkout')) return 'checkout';
      if (formId.includes('login') || formName.includes('login')) return 'login';
      if (formId.includes('signup') || formName.includes('signup')) return 'signup';
      if (formId.includes('newsletter') || inputs.length === 1) return 'newsletter';
      if (formId.includes('contact') || formName.includes('contact')) return 'contact';
      
      return 'other';
    }

    getOverlayType(element) {
      const role = element.getAttribute('role');
      const classes = (element.className || '').toString().toLowerCase();
      
      if (role === 'dialog' || classes.includes('modal')) return 'modal';
      if (classes.includes('popup')) return 'popup';
      if (classes.includes('drawer')) return 'drawer';
      if (classes.includes('tooltip')) return 'tooltip';
      if (classes.includes('dropdown')) return 'dropdown';
      if (classes.includes('toast')) return 'toast';
      
      return 'unknown';
    }

    isOverlayElement(element) {
      const role = element.getAttribute('role');
      const classes = (element.className || '').toString().toLowerCase();
      
      return role === 'dialog' ||
             classes.includes('modal') ||
             classes.includes('popup') ||
             classes.includes('drawer') ||
             classes.includes('overlay') ||
             classes.includes('tooltip') ||
             classes.includes('dropdown') ||
             classes.includes('toast');
    }

    isElementVisible(element) {
      const style = window.getComputedStyle(element);
      const ariaHidden = element.getAttribute('aria-hidden');
      
      return style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             style.opacity !== '0' &&
             ariaHidden !== 'true' &&
             element.offsetParent !== null;
    }

    hasCallToAction(element) {
      return element.querySelector('button, a[href], [role="button"]') !== null;
    }

    // ============ CORE METHODS WITH NEW SCHEMA ============
    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    trackEvent(eventType, data = {}) {
      // All 6 base fields are REQUIRED and NEVER null
      const event = {
        id: this.generateUUID(),                  // Always generated, never null
        ts: Math.floor(Date.now() / 1000),       // Unix timestamp, never null
        app_key: this.config.appKey,             // From config, never null
        session_id: this.sessionId,              // Generated on init, never null
        user_id: this.userId,                    // Generated/retrieved on init, never null
        event_type: eventType,                   // Passed parameter, never null
        data: data                               // Event-specific data object
      };
      
      this.eventQueue.push(event);
      
      if (this.eventQueue.length >= this.config.batchSize) {
        this.flush();
      }
    }

    trackPageView(page) {
      this.maxScrollDepth = 0;
      this.pageLoadTime = Date.now();
      
      this.trackEvent('PAGE_VIEW', {
        url: page?.url || window.location.href,
        path: window.location.pathname,
        title: page?.title || document.title,
        referrer: document.referrer || null,
        is_first_view: !this.hasViewedPage,
        entry_type: this.getEntryType()
      });
      
      this.hasViewedPage = true;
    }

    identify(userId, traits = {}) {
      // Update the user ID if explicitly identified
      if (userId) {
        this.userId = userId;
        this.userIdGenerator.saveToStorage(userId);
      }
      // Note: identify events are not part of the new schema, 
      // but keeping for backwards compatibility
    }

    flush() {
      if (this.eventQueue.length === 0) return;
      
      const batch = [...this.eventQueue];
      this.eventQueue = [];
      
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_key: this.config.appKey,
          events: batch
        }),
        keepalive: true
      }).catch(err => {
        console.error('[demo-test-apps-2025-10-13-a0q3a0z830j] Analytics flush error:', err);
        this.eventQueue.unshift(...batch);
      });
    }
  }

  // Auto-initialize
  if (typeof window !== 'undefined' && !window.analytics) {
    window.analytics = new AnalyticsTracker();
    console.log('[demo-test-apps-2025-10-13-a0q3a0z830j] ✅ AI-Enhanced Analytics tracker with new event schema initialized');
  }

  return AnalyticsTracker;
}));