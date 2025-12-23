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
        appKey: 'demo-test-apps-2025-12-23-0w13urvcrtsl',
        endpoint: 'https://analytics-service-production-0f0c.up.railway.app/ingest/analytics',
        batchSize: 10,
        flushInterval: 10000  // Reduced to 10 seconds for faster event delivery
      };
      
      // Privacy controls
      this.disabled = false;
      
      // Check Do Not Track
      if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
        console.log('📵 Analytics disabled: Do Not Track enabled');
        this.disabled = true;
        return;
      }
      
      // Check consent
      try {
        this.hasConsent = localStorage.getItem('analytics_consent_' + this.config.appKey) === 'true';
        
        // Auto-accept for test app (remove in production or prompt user)
        if (!this.hasConsent) {
          localStorage.setItem('analytics_consent_' + this.config.appKey, 'true');
          this.hasConsent = true;
          console.log('✅ Analytics consent: auto-accepted for test');
        }
      } catch (e) {
        this.hasConsent = false;
      }
      
      if (!this.hasConsent) {
        console.log('🚫 Analytics disabled: No consent');
        this.disabled = true;
        return;
      }
      
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
      this.previousPage = null;  // Track previous page for SPA navigation/journey analysis
      
      // Performance optimization: cache selector matches
      this.selectorCache = new WeakMap();
      
      // AI-discovered component patterns with pre-computed metadata
      this.componentDetectors = [
        {
            name: 'CheckoutPlanSelector',
            type: 'link',
            pattern_type: 'navigation',
            selectors: ["a[href*='/checkout?plan=']","a[href*='cycle=']"],
            purpose: 'Navigate to checkout with plan',
            contextNeeded: ["plan","cycle","source_page"],
            context_collection: {"strategy":"global_context","scope_selector":"body","fields":[{"field_name":"plan","selector":"a[href*='plan=']","extraction_method":"data-attribute","data_type":"string","attribute_name":"href","required":true,"description":"Selected plan type","field_purpose":"preference"},{"field_name":"billing_cycle","selector":"a[href*='cycle=']","extraction_method":"data-attribute","data_type":"string","attribute_name":"href","required":true,"description":"Monthly or annual billing","field_purpose":"preference"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":["searchParams"]},
            relationships: {"triggers":["pricing_page_view"],"affects":["checkout_flow"],"depends_on":["plan_selection"]}
        },

        {
            name: 'CheckoutStepContinue',
            type: 'button',
            pattern_type: 'multi_step_flow',
            selectors: ["button[type='button']"],
            purpose: 'Continue to payment step',
            contextNeeded: ["step","plan","cycle","total"],
            context_collection: {"strategy":"component_props","scope_selector":"form","fields":[{"field_name":"current_step","selector":"body","extraction_method":"data-attribute","data_type":"number","required":true,"description":"Current checkout step","field_purpose":"metadata"},{"field_name":"plan","selector":"body","extraction_method":"data-attribute","data_type":"string","required":true,"description":"Selected plan","field_purpose":"preference"},{"field_name":"billing_cycle","selector":"body","extraction_method":"data-attribute","data_type":"string","required":true,"description":"Billing frequency","field_purpose":"preference"}],"state_tracking":{"track_previous_value":true,"track_change_delta":false,"track_timing":true},"fallback_sources":["searchParams"]},
            relationships: {"triggers":["step_1_complete"],"affects":["step_2_display"],"depends_on":["plan_selection"]}
        },

        {
            name: 'CheckoutPaymentForm',
            type: 'form',
            pattern_type: 'form_submission',
            selectors: ["form"],
            purpose: 'Submit payment details',
            contextNeeded: ["plan","cycle","amount","payment_fields_completed"],
            context_collection: {"strategy":"form_state","scope_selector":"form","fields":[{"field_name":"card_number_completed","selector":"input[name='cardNumber']","extraction_method":"value","data_type":"boolean","required":true,"description":"Card number field filled","field_purpose":"pci_protected","anonymize":true},{"field_name":"expiry_completed","selector":"input[name='expiry']","extraction_method":"value","data_type":"boolean","required":true,"description":"Expiry date filled","field_purpose":"pci_protected","anonymize":true},{"field_name":"cvv_completed","selector":"input[name='cvv']","extraction_method":"value","data_type":"boolean","required":true,"description":"CVV filled","field_purpose":"pci_protected","anonymize":true},{"field_name":"cardholder_name","selector":"input[name='cardholderName']","extraction_method":"value","data_type":"string","required":true,"description":"Name on card","field_purpose":"pii","anonymize":true},{"field_name":"billing_address","selector":"input[name='billingAddress']","extraction_method":"value","data_type":"string","required":true,"description":"Billing address","field_purpose":"pii","anonymize":true},{"field_name":"plan","selector":"body","extraction_method":"data-attribute","data_type":"string","required":true,"description":"Selected plan","field_purpose":"metadata"},{"field_name":"total_amount","selector":"body","extraction_method":"data-attribute","data_type":"number","required":true,"description":"Total payment amount","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":true},"fallback_sources":["component_state"]},
            relationships: {"triggers":["payment_submit"],"affects":["subscription_created"],"depends_on":["payment_validation"]}
        },

        {
            name: 'CheckoutSuccessViewDashboard',
            type: 'button',
            pattern_type: 'navigation',
            selectors: ["a[href='/dashboard']","button"],
            purpose: 'Navigate to dashboard after purchase',
            contextNeeded: ["plan","purchase_completed"],
            context_collection: {"strategy":"global_context","scope_selector":"body","fields":[{"field_name":"conversion_completed","selector":"body","extraction_method":"data-attribute","data_type":"boolean","required":true,"description":"Purchase successful","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":[]},
            relationships: {"triggers":["purchase_complete"],"affects":["dashboard_entry"],"depends_on":["payment_success"]}
        },

        {
            name: 'DashboardUpgradeButton',
            type: 'button',
            pattern_type: 'navigation',
            selectors: ["a[href='/pricing']","button.border-purple-200"],
            purpose: 'Navigate to pricing page',
            contextNeeded: ["current_plan","source_location"],
            context_collection: {"strategy":"global_context","scope_selector":"body","fields":[{"field_name":"source_page","selector":"body","extraction_method":"data-attribute","data_type":"string","required":true,"description":"Page where upgrade clicked","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":["window.location"]},
            relationships: {"triggers":["dashboard_view"],"affects":["pricing_page_view"],"depends_on":["free_plan"]}
        },

        {
            name: 'NewProjectButton',
            type: 'button',
            pattern_type: 'navigation',
            selectors: ["a[href='/dashboard/projects/new']","button"],
            purpose: 'Navigate to create project',
            contextNeeded: ["current_project_count","plan"],
            context_collection: {"strategy":"global_context","scope_selector":"body","fields":[{"field_name":"project_count","selector":"body","extraction_method":"data-attribute","data_type":"number","required":false,"description":"Current project count","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":[]},
            relationships: {"triggers":["dashboard_action"],"affects":["project_form_view"],"depends_on":["workspace_access"]}
        },

        {
            name: 'ProjectForm',
            type: 'form',
            pattern_type: 'form_submission',
            selectors: ["form"],
            purpose: 'Create new project',
            contextNeeded: ["name","description","workspace_id"],
            context_collection: {"strategy":"form_state","scope_selector":"form","fields":[{"field_name":"project_name","selector":"input[name='name']","extraction_method":"value","data_type":"string","required":true,"description":"Project name","field_purpose":"metadata"},{"field_name":"project_description","selector":"textarea[name='description']","extraction_method":"value","data_type":"string","required":false,"description":"Project description","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":true},"fallback_sources":[]},
            relationships: {"triggers":["form_submit"],"affects":["project_created"],"depends_on":["workspace_membership"]}
        },

        {
            name: 'PaywallModal',
            type: 'modal_trigger',
            pattern_type: 'modal_lifecycle',
            selectors: ["[role='dialog']"],
            purpose: 'Show upgrade prompt at limit',
            contextNeeded: ["limit_type","current_usage","plan"],
            context_collection: {"strategy":"modal_scope","scope_selector":"[role='dialog']","fields":[{"field_name":"limit_context","selector":"[role='dialog']","extraction_method":"data-attribute","data_type":"string","required":true,"description":"What limit was hit","field_purpose":"metadata"},{"field_name":"current_usage","selector":"[role='dialog']","extraction_method":"data-attribute","data_type":"number","required":true,"description":"Current usage count","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":true},"fallback_sources":[]},
            relationships: {"triggers":["limit_reached"],"affects":["upgrade_consideration"],"depends_on":["free_plan"]}
        },

        {
            name: 'CreateTaskButton',
            type: 'button',
            pattern_type: 'modal_lifecycle',
            selectors: ["button"],
            purpose: 'Open create task modal',
            contextNeeded: ["project_id"],
            context_collection: {"strategy":"parent_data","scope_selector":"body","fields":[{"field_name":"project_id","selector":"body","extraction_method":"data-attribute","data_type":"string","required":true,"description":"Parent project ID","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":["url_params"]},
            relationships: {"triggers":["project_view"],"affects":["task_form_open"],"depends_on":["project_access"]}
        },

        {
            name: 'TaskForm',
            type: 'form',
            pattern_type: 'form_submission',
            selectors: ["form"],
            purpose: 'Create or update task',
            contextNeeded: ["title","description","priority","assigned_to","due_date"],
            context_collection: {"strategy":"form_state","scope_selector":"form","fields":[{"field_name":"task_title","selector":"input[name='title']","extraction_method":"value","data_type":"string","required":true,"description":"Task title","field_purpose":"metadata"},{"field_name":"task_description","selector":"textarea[name='description']","extraction_method":"value","data_type":"string","required":false,"description":"Task description","field_purpose":"metadata"},{"field_name":"priority","selector":"select[name='priority']","extraction_method":"value","data_type":"string","required":true,"description":"Task priority level","field_purpose":"preference"},{"field_name":"assigned_to","selector":"select[name='assignedTo']","extraction_method":"value","data_type":"string","required":false,"description":"Assigned user ID","field_purpose":"metadata"},{"field_name":"due_date","selector":"input[name='dueDate']","extraction_method":"value","data_type":"string","required":false,"description":"Task due date","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":true},"fallback_sources":[]},
            relationships: {"triggers":["task_form_submit"],"affects":["task_created"],"depends_on":["project_context"]}
        },

        {
            name: 'TaskStatusDropdown',
            type: 'select_dropdown',
            pattern_type: 'toggle_state',
            selectors: ["select","[role='combobox']"],
            purpose: 'Change task status',
            contextNeeded: ["task_id","previous_status","new_status"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-task-id]","fields":[{"field_name":"task_id","selector":"[data-task-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-task-id","required":true,"description":"Task identifier","field_purpose":"metadata"},{"field_name":"previous_status","selector":"select","extraction_method":"value","data_type":"string","required":true,"description":"Status before change","field_purpose":"metadata"},{"field_name":"new_status","selector":"select","extraction_method":"value","data_type":"string","required":true,"description":"Status after change","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":true,"track_change_delta":true,"track_timing":false},"fallback_sources":[]},
            relationships: {"triggers":["status_change"],"affects":["task_updated"],"depends_on":["task_context"]}
        },

        {
            name: 'TaskActionMenu',
            type: 'button',
            pattern_type: 'item_selection',
            selectors: ["button[aria-label*='menu']","[role='menubutton']"],
            purpose: 'Open task actions menu',
            contextNeeded: ["task_id"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-task-id]","fields":[{"field_name":"task_id","selector":"[data-task-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-task-id","required":true,"description":"Task identifier","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":[]},
            relationships: {"triggers":["task_interaction"],"affects":["menu_display"],"depends_on":["task_context"]}
        },

        {
            name: 'DeleteTaskAction',
            type: 'button',
            pattern_type: 'item_selection',
            selectors: ["button","[role='menuitem']"],
            purpose: 'Delete task',
            contextNeeded: ["task_id","project_id"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-task-id]","fields":[{"field_name":"task_id","selector":"[data-task-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-task-id","required":true,"description":"Task to delete","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":[]},
            relationships: {"triggers":["menu_action"],"affects":["task_deleted"],"depends_on":["task_context"]}
        },

        {
            name: 'InviteTeamMemberButton',
            type: 'button',
            pattern_type: 'modal_lifecycle',
            selectors: ["button"],
            purpose: 'Open invite member modal',
            contextNeeded: ["workspace_id","current_member_count"],
            context_collection: {"strategy":"global_context","scope_selector":"body","fields":[{"field_name":"member_count","selector":"body","extraction_method":"data-attribute","data_type":"number","required":false,"description":"Current team size","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":[]},
            relationships: {"triggers":["team_page_view"],"affects":["invite_modal_open"],"depends_on":["workspace_access"]}
        },

        {
            name: 'InviteMemberForm',
            type: 'form',
            pattern_type: 'form_submission',
            selectors: ["form"],
            purpose: 'Send team invitation',
            contextNeeded: ["email","workspace_id"],
            context_collection: {"strategy":"form_state","scope_selector":"form","fields":[{"field_name":"invite_email","selector":"input[type='email']","extraction_method":"value","data_type":"string","required":true,"description":"Invitee email address","field_purpose":"pii","anonymize":true}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":true},"fallback_sources":[]},
            relationships: {"triggers":["invite_submit"],"affects":["invitation_sent"],"depends_on":["workspace_membership"]}
        },

        {
            name: 'SettingsProfileForm',
            type: 'form',
            pattern_type: 'form_submission',
            selectors: ["form"],
            purpose: 'Update user profile',
            contextNeeded: ["full_name","email"],
            context_collection: {"strategy":"form_state","scope_selector":"form","fields":[{"field_name":"full_name","selector":"input[name='fullName']","extraction_method":"value","data_type":"string","required":true,"description":"User full name","field_purpose":"pii","anonymize":true},{"field_name":"email","selector":"input[type='email']","extraction_method":"value","data_type":"string","required":true,"description":"User email","field_purpose":"pii","anonymize":true}],"state_tracking":{"track_previous_value":true,"track_change_delta":true,"track_timing":false},"fallback_sources":[]},
            relationships: {"triggers":["settings_save"],"affects":["profile_updated"],"depends_on":["user_authentication"]}
        },

        {
            name: 'NotificationToggle',
            type: 'toggle_switch',
            pattern_type: 'toggle_state',
            selectors: ["button[role='switch']","input[type='checkbox']"],
            purpose: 'Toggle notification preferences',
            contextNeeded: ["notification_type","previous_state","new_state"],
            context_collection: {"strategy":"component_props","scope_selector":"label","fields":[{"field_name":"notification_type","selector":"label","extraction_method":"textContent","data_type":"string","required":true,"description":"Type of notification","field_purpose":"preference"},{"field_name":"enabled","selector":"input[type='checkbox']","extraction_method":"checked","data_type":"boolean","required":true,"description":"Toggle state","field_purpose":"preference"}],"state_tracking":{"track_previous_value":true,"track_change_delta":true,"track_timing":false},"fallback_sources":["aria-checked"]},
            relationships: {"triggers":["toggle_click"],"affects":["preference_updated"],"depends_on":["user_settings"]}
        },

        {
            name: 'SettingsTabs',
            type: 'tab',
            pattern_type: 'tab_switch',
            selectors: ["button[role='tab']"],
            purpose: 'Switch settings section',
            contextNeeded: ["previous_tab","new_tab"],
            context_collection: {"strategy":"sibling_state","scope_selector":"[role='tablist']","fields":[{"field_name":"previous_tab","selector":"button[aria-selected='true']","extraction_method":"data-attribute","data_type":"string","required":true,"description":"Previously active tab","field_purpose":"metadata"},{"field_name":"new_tab","selector":"button[role='tab']","extraction_method":"textContent","data_type":"string","required":true,"description":"Newly selected tab","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":true,"track_change_delta":false,"track_timing":false},"fallback_sources":["aria-selected"]},
            relationships: {"triggers":["tab_click"],"affects":["tab_content_display"],"depends_on":["settings_access"]}
        },

        {
            name: 'BillingManageSubscription',
            type: 'button',
            pattern_type: 'navigation',
            selectors: ["button","a[href*='billing']"],
            purpose: 'Manage subscription',
            contextNeeded: ["current_plan","billing_cycle"],
            context_collection: {"strategy":"global_context","scope_selector":"body","fields":[{"field_name":"current_plan","selector":"body","extraction_method":"data-attribute","data_type":"string","required":true,"description":"Active subscription plan","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":[]},
            relationships: {"triggers":["billing_page_view"],"affects":["subscription_management"],"depends_on":["active_subscription"]}
        },

        {
            name: 'ProjectCard',
            type: 'link',
            pattern_type: 'item_selection',
            selectors: ["a[href*='/dashboard/projects/']"],
            purpose: 'Navigate to project detail',
            contextNeeded: ["project_id","project_name"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-project-id]","fields":[{"field_name":"project_id","selector":"a","extraction_method":"data-attribute","data_type":"string","attribute_name":"href","required":true,"description":"Project identifier","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":["href"]},
            relationships: {"triggers":["project_list_view"],"affects":["project_detail_view"],"depends_on":["project_access"]}
        },

        {
            name: 'ActivityFeedItem',
            type: 'custom',
            pattern_type: 'item_selection',
            selectors: ["[data-activity-id]"],
            purpose: 'View activity detail',
            contextNeeded: ["activity_id","activity_type"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-activity-id]","fields":[{"field_name":"activity_id","selector":"[data-activity-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-activity-id","required":true,"description":"Activity identifier","field_purpose":"metadata"},{"field_name":"activity_type","selector":"[data-activity-type]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-activity-type","required":true,"description":"Type of activity","field_purpose":"metadata"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false},"fallback_sources":[]},
            relationships: {"triggers":["activity_feed_view"],"affects":["activity_detail"],"depends_on":["workspace_access"]}
        }
      ];
      
      // Build component lookup map for fast access
      this.componentMap = this.buildComponentMap();
      
      // Load persisted events from previous session
      this.loadQueueFromStorage();
      
      if (typeof window !== 'undefined') {
        this.setupListeners();
        this.startFlushTimer();
        this.initAutoTracking();
        
        // Save queue on page unload
        window.addEventListener('beforeunload', () => this.saveQueueToStorage());
      }
    }
    
    // Privacy: Opt out of tracking
    optOut() {
      try {
        localStorage.removeItem('analytics_user_id_' + this.config.appKey);
        localStorage.removeItem('analytics_consent_' + this.config.appKey);
        this.disabled = true;
        this.eventQueue = [];
        console.log('📵 Analytics: Opted out');
      } catch (e) {
        console.error('Failed to opt out:', e);
      }
    }
    
    // Offline persistence: Save queue to localStorage
    saveQueueToStorage() {
      if (this.eventQueue.length === 0) return;
      
      try {
        const queueKey = 'analytics_queue_' + this.config.appKey;
        localStorage.setItem(queueKey, JSON.stringify(this.eventQueue));
      } catch (e) {
        // Silent fail
      }
    }
    
    // Offline persistence: Load queue from localStorage
    loadQueueFromStorage() {
      try {
        const queueKey = 'analytics_queue_' + this.config.appKey;
        const saved = localStorage.getItem(queueKey);
        if (saved) {
          const parsedQueue = JSON.parse(saved);
          this.eventQueue = parsedQueue;
          localStorage.removeItem(queueKey);
          console.log('📦 Restored', parsedQueue.length, 'events from storage');
          
          // Flush restored events immediately
          if (this.eventQueue.length > 0) {
            setTimeout(() => this.flush(), 1000);
          }
        }
      } catch (e) {
        // Silent fail
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
      console.log('[demo-test-apps-2025-12-23-0w13urvcrtsl] 🤖 AI-Enhanced Analytics initialized');
      console.log('[demo-test-apps-2025-12-23-0w13urvcrtsl] 📊 Tracking 21 discovered components');
      console.log('[demo-test-apps-2025-12-23-0w13urvcrtsl] 🔑 User ID:', this.userId);
      console.log('[demo-test-apps-2025-12-23-0w13urvcrtsl] 📍 Session ID:', this.sessionId);
      
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
      const context = {};
      
      // If no AI pattern matched, use smart fallbacks
      if (!componentInfo || !componentInfo.context_collection) {
        // Fallback 1: Extract from nearest form
        const form = element.closest('form');
        if (form) {
          context.form_action = this.inferFormAction(form);
          const formData = this.getFormFieldValues(form);
          Object.assign(context, formData);
        }
        
        // Fallback 2: Extract from URL parameters
        const urlParams = this.getURLParams();
        if (Object.keys(urlParams).length > 0) {
          Object.assign(context, urlParams);
        }
        
        // Fallback 3: Extract from page-level data attributes
        if (document.body.dataset.pageType) {
          context.page_type = document.body.dataset.pageType;
        } else {
          context.page_type = this.inferPageType();
        }
        
        // Fallback 4: Extract from nearest container with data attributes
        const container = element.closest('[data-item-id], [data-task-id], [data-project-id], [data-id]');
        if (container) {
          for (const attr of container.attributes) {
            if (attr.name.startsWith('data-')) {
              const key = attr.name.replace('data-', '');
              context[key] = attr.value;
            }
          }
        }
        
        return context;
      }
      
      // Use AI-discovered pattern for extraction
      const scope = this.findContextScope(element, componentInfo.context_collection.scope_selector);
      if (!scope) return context;
      
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
          // Silent fail - fallbacks will handle it
        }
      }
      
      // Add timing if configured
      if (componentInfo.context_collection.state_tracking?.track_timing) {
        context._interaction_timestamp = Date.now();
      }
      
      // Always add page type and URL params as supplementary context
      context.page_type = context.page_type || this.inferPageType();
      const urlParams = this.getURLParams();
      if (Object.keys(urlParams).length > 0) {
        context.url_params = urlParams;
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
      
      // If selector failed, try flexible alternatives for form fields
      if (!targetElement && fieldConfig.extraction_method === 'value') {
        const fieldName = fieldConfig.field_name;
        // Try: input[name], input[id], input[id*=contains], input[placeholder*=contains]
        const flexibleSelector = `input[name='${fieldName}'], input[id='${fieldName}'], input[id*='${fieldName}'], input[placeholder*='${fieldName}'], textarea[name='${fieldName}'], textarea[id='${fieldName}'], select[name='${fieldName}'], select[id='${fieldName}']`;
        targetElement = scope.querySelector(flexibleSelector);
      }
      
      // Quick Win: Extract IDs from URLs if element still not found
      if (!targetElement && fieldConfig.field_name.includes('_id')) {
        const href = scope.getAttribute?.('href') || window.location.pathname;
        const match = href.match(/\/(projects|tasks|team|activity)\/([a-f0-9-]+)/i);
        if (match) return match[2];  // Return the UUID
      }
      
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

    // ============ SMART CONTEXT FALLBACK HELPERS ============
    
    inferPageType() {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/pricing')) return 'pricing';
      if (path.includes('/checkout')) return 'checkout';
      if (path.includes('/dashboard')) return 'dashboard';
      if (path.includes('/settings')) return 'settings';
      if (path.includes('/team')) return 'team';
      if (path.includes('/projects')) return 'projects';
      if (path.includes('/tasks')) return 'tasks';
      if (path.includes('/activity')) return 'activity';
      if (path.includes('/billing')) return 'billing';
      if (path === '/' || path === '') return 'home';
      return 'other';
    }
    
    getURLParams() {
      const params = {};
      try {
        const urlParams = new URLSearchParams(window.location.search);
        for (const [key, value] of urlParams) {
          params[key] = value;
        }
      } catch (e) {
        // Silent fail
      }
      return params;
    }
    
    inferFormAction(form) {
      // Try to infer action from form attributes
      if (form.action && form.action !== window.location.href) {
        const actionPath = new URL(form.action, window.location.origin).pathname;
        if (actionPath.includes('project')) return 'create_project';
        if (actionPath.includes('task')) return 'create_task';
        if (actionPath.includes('checkout')) return 'checkout';
        if (actionPath.includes('payment')) return 'payment';
        if (actionPath.includes('invite')) return 'invite_team';
        if (actionPath.includes('settings')) return 'update_settings';
        return actionPath;
      }
      
      // Infer from form ID or name
      const formId = (form.id || form.name || '').toLowerCase();
      if (formId.includes('project')) return 'create_project';
      if (formId.includes('task')) return 'create_task';
      if (formId.includes('checkout')) return 'checkout';
      if (formId.includes('payment')) return 'payment';
      if (formId.includes('invite')) return 'invite_team';
      if (formId.includes('login')) return 'login';
      if (formId.includes('signup')) return 'signup';
      if (formId.includes('settings')) return 'update_settings';
      
      // Infer from submit button text
      const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        const buttonText = (submitButton.textContent || submitButton.value || '').toLowerCase();
        if (buttonText.includes('project')) return 'create_project';
        if (buttonText.includes('task')) return 'create_task';
        if (buttonText.includes('checkout') || buttonText.includes('pay')) return 'checkout';
        if (buttonText.includes('invite')) return 'invite_team';
        if (buttonText.includes('save')) return 'save_changes';
      }
      
      return 'form_submit';
    }
    
    getFormFieldValues(form) {
      const data = {};
      
      try {
        const formData = new FormData(form);
        for (const [key, value] of formData) {
          // Skip empty values and passwords
          if (!value || key.toLowerCase().includes('password')) continue;
          
          // Sanitize sensitive fields
          if (key.toLowerCase().includes('card') || key.toLowerCase().includes('cvv')) {
            data[key] = '[REDACTED]';
          } else if (key.toLowerCase().includes('email')) {
            // Anonymize email
            data[key] = this.anonymizeEmail(value);
          } else {
            // Truncate long values
            data[key] = String(value).slice(0, 100);
          }
        }
      } catch (e) {
        // Silent fail
      }
      
      return data;
    }
    
    anonymizeEmail(email) {
      try {
        const [local, domain] = email.split('@');
        if (!domain) return '[EMAIL]';
        const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
        return maskedLocal + '@' + domain;
      } catch {
        return '[EMAIL]';
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
          
          // Build event data - cleaner schema without redundant fields
          const eventData = {
            element_text: this.getElementText(element).slice(0, 100),
            element_type: this.getButtonType(element),
            surface: this.getSurface(element),
            page_path: window.location.pathname,
            component_name: componentInfo?.name || this.inferComponentName(element)
          };
          
          // Only add context if it has meaningful data (not empty object)
          if (contextData && Object.keys(contextData).length > 0) {
            eventData.context = contextData;
          }
          
          this.trackEvent('BUTTON_CLICK', eventData);
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
          
          // Skip FORM_INTERACTION for forms inside modals (handled by MODAL_INTERACTION)
          const isInModal = form.closest('[role="dialog"]') || 
                           form.closest('.modal') || 
                           form.closest('[data-modal]') ||
                           form.closest('[class*="modal"]');
          
          if (!isInModal) {
            this.trackEvent('FORM_INTERACTION', {
              action: 'started',
              form_name: this.getFormName(form),
              surface: this.getSurface(form),
              page_path: window.location.pathname,
              fields_total: this.countFormFields(form),
              fields_completed: 0
            });
          }
        }
        
        if (form && this.formTracking.has(form)) {
          const tracking = this.formTracking.get(form);
          tracking.fieldsInteracted.add(field.name || field.id || field.type);
        }
      });

      document.addEventListener('submit', (e) => {
        const form = e.target;
        const tracking = this.formTracking.get(form);
        
        // Check if form is inside a modal
        const modal = form.closest('[role="dialog"]') || 
                      form.closest('.modal') || 
                      form.closest('[data-modal]') ||
                      form.closest('[class*="modal"]');
        
        if (modal) {
          // For modal forms: track MODAL_INTERACTION with form_data (skip FORM_INTERACTION)
          const formData = this.captureFormData(form);
          
          this.trackEvent('MODAL_INTERACTION', {
            action: 'submitted',
            modal_name: this.getModalTitle(modal),
            trigger_source: 'button_click',
            page_path: window.location.pathname,
            form_data: formData
          });
        } else {
          // For standalone forms: track FORM_INTERACTION only
          this.trackEvent('FORM_INTERACTION', {
            action: 'submitted',
            form_name: this.getFormName(form),
            surface: this.getSurface(form),
            page_path: window.location.pathname,
            fields_total: this.countFormFields(form),
            fields_completed: tracking ? tracking.fieldsInteracted.size : 0
          });
        }
        
        this.formTracking.delete(form);
      });

      // Track form abandonment (only for non-modal forms)
      window.addEventListener('beforeunload', () => {
        this.formTracking.forEach((tracking, form) => {
          const isInModal = form.closest('[role="dialog"]') || 
                           form.closest('.modal') || 
                           form.closest('[data-modal]') ||
                           form.closest('[class*="modal"]');
          
          if (!isInModal && tracking.started && Date.now() - tracking.startTime > 1000) {
            this.trackEvent('FORM_INTERACTION', {
              action: 'abandoned',
              form_name: this.getFormName(form),
              surface: this.getSurface(form),
              page_path: window.location.pathname,
              fields_total: this.countFormFields(form),
              fields_completed: tracking.fieldsInteracted.size
            });
          }
        });
      });
    }

    trackElementVisibility() {
      // Track modal/popup/dialog visibility with debouncing for performance
      let mutationTimer;
      const debouncedHandler = (mutations) => {
        clearTimeout(mutationTimer);
        mutationTimer = setTimeout(() => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'class' || 
               mutation.attributeName === 'style' || 
                 mutation.attributeName === 'aria-hidden' ||
                 mutation.attributeName === 'data-state')) {
            
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
                  this.trackEvent('MODAL_INTERACTION', {
                    action: 'opened',
                    modal_name: this.getModalTitle(element),
                    trigger_source: 'button_click',
                    page_path: window.location.pathname
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
                  this.trackEvent('MODAL_INTERACTION', {
                    action: 'closed',
                    modal_name: this.getModalTitle(element),
                    trigger_source: 'button_click',
                    page_path: window.location.pathname
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
        }, 50);  // 50ms debounce
      };
      
      const observer = new MutationObserver(debouncedHandler);

      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class', 'style', 'aria-hidden', 'data-state']
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

    // Get a meaningful page name from H1 or path
    getPageName() {
      // Try to find main heading
      const h1 = document.querySelector('main h1, [role="main"] h1, h1');
      if (h1 && h1.textContent) {
        return h1.textContent.trim().slice(0, 80);
      }
      
      // Parse from path: /dashboard/settings → "Settings"
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        // Handle UUIDs and numeric IDs - go back one level
        if (/^[a-f0-9-]{20,}$/i.test(lastPart) || /^\d+$/.test(lastPart)) {
          if (pathParts.length > 1) {
            const secondLast = pathParts[pathParts.length - 2];
            return secondLast.charAt(0).toUpperCase() + secondLast.slice(1).replace(/-/g, ' ') + ' Detail';
          }
        }
        return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
      }
      
      return 'Home';
    }

    // Get modal title from heading or aria attributes
    getModalTitle(modal) {
      // Try to find modal heading/title
      const heading = modal.querySelector('[role="heading"], h1, h2, h3, [data-dialog-title], [class*="title"], [class*="Title"]');
      if (heading && heading.textContent) {
        return heading.textContent.trim().slice(0, 50);
      }
      
      // Try aria-labelledby reference
      const labelledBy = modal.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl && labelEl.textContent) {
          return labelEl.textContent.trim().slice(0, 50);
        }
      }
      
      // Try aria-label
      const ariaLabel = modal.getAttribute('aria-label');
      if (ariaLabel) {
        return ariaLabel.slice(0, 50);
      }
      
      // Fallback: look for any text in the first part of modal
      const firstText = modal.querySelector('p, span, div');
      if (firstText && firstText.textContent) {
        const text = firstText.textContent.trim();
        if (text.length > 0 && text.length < 50) {
          return text;
        }
      }
      
      return 'Modal';
    }

    // Infer component name from element attributes and text
    inferComponentName(element) {
      // Try data attributes
      if (element.dataset.component) return element.dataset.component;
      if (element.dataset.testid) return element.dataset.testid;
      if (element.dataset.cy) return element.dataset.cy;
      
      // Try id (but not Radix auto-generated ones)
      if (element.id && !element.id.startsWith('radix-') && !element.id.startsWith(':r')) {
        return element.id;
      }
      
      // Build from element text + type
      const text = this.getElementText(element).slice(0, 30).replace(/\s+/g, '');
      const type = this.getButtonType(element);
      if (text && text !== 'Unknown') {
        return text + type.charAt(0).toUpperCase() + type.slice(1);
      }
      
      return 'UnknownComponent';
    }

    getFormName(form) {
      return form.getAttribute('name') || 
             form.getAttribute('aria-label') ||
             form.id ||
             'form';
    }

    // Count only visible/fillable form fields (exclude buttons, hidden, submit)
    countFormFields(form) {
      if (!form || !form.elements) return 0;
      
      let count = 0;
      const elements = form.elements;
      
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const type = (el.type || '').toLowerCase();
        const tagName = (el.tagName || '').toLowerCase();
        
        // Skip buttons, hidden fields, and submit inputs
        if (type === 'submit' || type === 'button' || type === 'hidden' || type === 'reset') {
          continue;
        }
        if (tagName === 'button') {
          continue;
        }
        
        // Count this as a fillable field
        count++;
      }
      
      return count;
    }

    // Capture form field values (sanitized for analytics)
    captureFormData(form) {
      const formData = {};
      
      // Sensitive field patterns to skip entirely
      const sensitivePatterns = /password|pwd|secret|token|cvv|cvc|ssn|social.*security|card.*number|credit.*card/i;
      
      // Fields to anonymize (show partial value)
      const anonymizePatterns = /email|phone|tel|mobile/i;
      
      try {
        const elements = form.elements || [];
        
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          const name = el.name || el.id;
          
          // Skip unnamed fields, buttons, and hidden fields
          if (!name || el.type === 'submit' || el.type === 'button' || el.type === 'hidden') {
            continue;
          }
          
          // Skip sensitive fields entirely
          if (sensitivePatterns.test(name)) {
            continue;
          }
          
          let value = null;
          
          // Get value based on element type
          if (el.type === 'checkbox') {
            value = el.checked;
          } else if (el.type === 'radio') {
            if (el.checked) {
              value = el.value;
            } else {
              continue; // Skip unchecked radio buttons
            }
          } else if (el.tagName === 'SELECT') {
            const selected = el.options[el.selectedIndex];
            value = selected ? (selected.text || selected.value) : null;
          } else if (el.value) {
            value = el.value;
          }
          
          // Skip empty values
          if (value === null || value === '' || value === undefined) {
            continue;
          }
          
          // Anonymize email/phone fields
          if (anonymizePatterns.test(name) && typeof value === 'string') {
            if (name.toLowerCase().includes('email') && value.includes('@')) {
              const [local, domain] = value.split('@');
              value = local.charAt(0) + '***@' + domain;
            } else {
              // Phone/other: show last 4 chars
              value = '***' + value.slice(-4);
            }
          }
          
          // Truncate long values
          if (typeof value === 'string' && value.length > 100) {
            value = value.slice(0, 100) + '...';
          }
          
          formData[name] = value;
        }
      } catch (e) {
        // Silent fail - return whatever we captured
      }
      
      return Object.keys(formData).length > 0 ? formData : null;
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
      // 1. Try semantic elements first
      const semantic = element.closest('header, nav, main, footer, aside, [data-surface]');
      if (semantic) {
        return semantic.dataset.surface || semantic.tagName.toLowerCase();
      }
      
      // 2. Try class-based detection
      const classContainer = element.closest('[class*="header"], [class*="Header"], [class*="nav"], [class*="Nav"], [class*="sidebar"], [class*="Sidebar"], [class*="footer"], [class*="Footer"], [class*="modal"], [class*="Modal"], [class*="dialog"], [class*="Dialog"]');
      if (classContainer) {
        const classes = (classContainer.className || '').toString().toLowerCase();
        if (classes.includes('header')) return 'header';
        if (classes.includes('sidebar') || classes.includes('nav')) return 'nav';
        if (classes.includes('footer')) return 'footer';
        if (classes.includes('modal') || classes.includes('dialog')) return 'modal';
      }
      
      // 3. Check if inside modal/dialog
      if (element.closest('[role="dialog"]')) return 'modal';
      
      // 4. Default to 'main' instead of 'unknown'
      return 'main';
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

    // Build component lookup map from AI-discovered components
    buildComponentMap() {
      const map = {};
      this.componentDetectors.forEach(comp => {
        // Index by element selectors for fast lookup
        if (comp.selectors && comp.selectors.length > 0) {
          comp.selectors.forEach(selector => {
            map[selector] = comp;
          });
        }
        // Also index by component name if it matches element ID pattern
        if (comp.name) {
          map[comp.name] = comp;
        }
      });
      return map;
    }
    
    // Get pre-computed metadata for an element
    getComponentMetadata(element) {
      // Try to match element to AI-discovered component
      if (element.id && this.componentMap[element.id]) {
        return this.componentMap[element.id];
      }
      
      // Try CSS selectors
      for (const [selector, metadata] of Object.entries(this.componentMap)) {
        try {
          if (element.matches && element.matches(selector)) {
            return metadata;
          }
        } catch (e) {
          // Invalid selector, skip
        }
      }
      
      // Return minimal metadata if no match
      return null;
    }
    
    trackEvent(eventType, data = {}) {
      // Check if tracking is disabled
      if (this.disabled) return;
      
      // SIMPLIFIED: Just add runtime context, no inference/deduplication
      // Schema already contains semantic_action, conversion_relevance, etc.
      // Server handles deduplication
      
      // All 6 base fields are REQUIRED and NEVER null
      const event = {
        id: this.generateUUID(),                  // Always generated, never null
        ts: Math.floor(Date.now() / 1000),       // Unix timestamp, never null
        app_key: this.config.appKey,             // From config, never null
        session_id: this.sessionId,              // Generated on init, never null
        user_id: this.userId,                    // Generated/retrieved on init, never null
        event_type: eventType,                   // Passed parameter, never null
        data: data                               // Event-specific data (already has schema metadata)
      };
      
      this.eventQueue.push(event);
      
      if (this.eventQueue.length >= this.config.batchSize) {
        this.flush();
      }
    }

    trackPageView(page) {
      this.maxScrollDepth = 0;
      this.pageLoadTime = Date.now();
      
      const currentPath = window.location.pathname;
      
      this.trackEvent('PAGE_VIEW', {
        url: page?.url || window.location.href,
        path: currentPath,
        page_name: this.getPageName(),
        previous_page: this.previousPage,
        is_first_view: !this.hasViewedPage,
        entry_type: this.getEntryType()
      });
      
      // Store current path for next navigation (journey tracking)
      this.previousPage = currentPath;
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
      })
      .then(response => {
        if (!response.ok) {
          console.error('[demo-test-apps-2025-12-23-0w13urvcrtsl] Analytics flush failed:', response.status);
          // Re-add to queue and persist on failure
        this.eventQueue.unshift(...batch);
          this.saveQueueToStorage();
        }
      })
      .catch(err => {
        console.error('[demo-test-apps-2025-12-23-0w13urvcrtsl] Analytics flush error:', err);
        // Re-add to queue and persist on failure
        this.eventQueue.unshift(...batch);
        this.saveQueueToStorage();
      });
    }
  }

  // Auto-initialize
  if (typeof window !== 'undefined' && !window.analytics) {
    window.analytics = new AnalyticsTracker();
    console.log('[demo-test-apps-2025-12-23-0w13urvcrtsl] ✅ AI-Enhanced Analytics tracker with new event schema initialized');
  }

  return AnalyticsTracker;
}));