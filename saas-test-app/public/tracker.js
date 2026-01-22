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
        appKey: 'demo-test-apps-2026-01-22-mnhctas3am',
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
            name: 'CheckoutContinueToPaymentButton',
            type: 'button',
            pattern_type: 'multi_step_flow',
            selectors: ["button[type='button']",".checkout-continue-btn"],
            purpose: 'Advance to payment step in checkout',
            contextNeeded: ["plan","billing_cycle","amount","step"],
            context_collection: {"strategy":"accumulated_state","scope_selector":"form, .checkout-container","fields":[{"field_name":"plan","selector":"input[name='plan'], [data-plan]","extraction_method":"value","data_type":"string","required":true,"description":"Selected subscription plan"},{"field_name":"billing_cycle","selector":"input[name='cycle'], [data-cycle]","extraction_method":"value","data_type":"string","required":true,"description":"Monthly or annual billing"},{"field_name":"step","selector":"[data-step]","extraction_method":"data-attribute","data_type":"number","attribute_name":"data-step","required":true,"description":"Current checkout step"}],"state_tracking":{"track_previous_value":true,"track_change_delta":false,"track_timing":true}},
            relationships: {"triggers":["step_change"],"affects":["checkout_step_state"],"depends_on":["plan_selection"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'CheckoutCompleteButton',
            type: 'button',
            pattern_type: 'form_submission',
            selectors: ["button[type='submit']","form button:last-child"],
            purpose: 'Submit payment and complete checkout',
            contextNeeded: ["card_number","expiry","cvv","cardholder_name","billing_address","city","state","zip","plan","billing_cycle","total"],
            context_collection: {"strategy":"form_state","scope_selector":"form","fields":[{"field_name":"card_number","selector":"input[name='cardNumber']","extraction_method":"value","data_type":"string","required":true,"description":"Credit card number","field_purpose":"pci_protected","anonymize":true},{"field_name":"cvv","selector":"input[name='cvv']","extraction_method":"value","data_type":"string","required":true,"description":"Card CVV","field_purpose":"pci_protected","anonymize":true},{"field_name":"total_amount","selector":"[data-total]","extraction_method":"textContent","data_type":"number","required":true,"description":"Total checkout amount"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":true}},
            relationships: {"triggers":["payment_processing"],"affects":["subscription_status"],"depends_on":["payment_form_validation"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: true,
            form_schema: {"form_name":"CheckoutPaymentForm","form_selector":"form","fields":[{"field_name":"cardNumber","field_label":"Card Number","field_type":"text","required":true,"is_sensitive":true},{"field_name":"expiry","field_label":"Expiry Date","field_type":"text","required":true,"is_sensitive":true},{"field_name":"cvv","field_label":"CVV","field_type":"text","required":true,"is_sensitive":true},{"field_name":"cardholderName","field_label":"Cardholder Name","field_type":"text","required":true,"is_sensitive":false},{"field_name":"billingAddress","field_label":"Billing Address","field_type":"text","required":true,"is_sensitive":false},{"field_name":"city","field_label":"City","field_type":"text","required":true,"is_sensitive":false},{"field_name":"state","field_label":"State","field_type":"text","required":true,"is_sensitive":false},{"field_name":"zip","field_label":"ZIP Code","field_type":"text","required":true,"is_sensitive":false}],"submit_button_selector":"button[type='submit']"}
        },

        {
            name: 'BackToPricingLink',
            type: 'link',
            pattern_type: 'navigation',
            selectors: ["a[href='/pricing']",".back-link"],
            purpose: 'Return to pricing page',
            contextNeeded: ["current_step","form_abandoned"],
            context_collection: {"strategy":"global_context","scope_selector":"body","fields":[{"field_name":"checkout_step","selector":"[data-step]","extraction_method":"data-attribute","data_type":"number","attribute_name":"data-step","required":false,"description":"Step when user abandoned"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["navigation"],"affects":["checkout_abandonment"],"depends_on":[]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'GetStartedButton',
            type: 'button',
            pattern_type: 'navigation',
            selectors: ["a[href='/dashboard']",".get-started-btn"],
            purpose: 'Navigate to dashboard after upgrade',
            contextNeeded: ["upgrade_completed"],
            context_collection: {"strategy":"global_context","scope_selector":"body","fields":[{"field_name":"page_type","selector":"body","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-page","required":false,"description":"Success page identifier"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["navigation"],"affects":["user_activation"],"depends_on":["upgrade_completion"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'CreateProjectButton',
            type: 'button',
            pattern_type: 'form_submission',
            selectors: ["button[type='submit']","form button"],
            purpose: 'Create new project',
            contextNeeded: ["name","description","workspace_id"],
            context_collection: {"strategy":"form_state","scope_selector":"form","fields":[{"field_name":"project_name","selector":"input[name='name']","extraction_method":"value","data_type":"string","required":true,"description":"Name of new project"},{"field_name":"project_description","selector":"textarea[name='description']","extraction_method":"value","data_type":"string","required":false,"description":"Project description"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":true}},
            relationships: {"triggers":["project_creation"],"affects":["project_count"],"depends_on":["workspace_membership"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: true,
            form_schema: {"form_name":"CreateProjectForm","form_selector":"form","fields":[{"field_name":"name","field_label":"Project Name","field_type":"text","required":true,"is_sensitive":false},{"field_name":"description","field_label":"Description","field_type":"textarea","required":false,"is_sensitive":false}],"submit_button_selector":"button[type='submit']"}
        },

        {
            name: 'CreateTaskButton',
            type: 'button',
            pattern_type: 'form_submission',
            selectors: ["button[type='submit']",".create-task-btn"],
            purpose: 'Create new task in project',
            contextNeeded: ["title","description","priority","assigned_to","due_date","project_id"],
            context_collection: {"strategy":"modal_scope","scope_selector":"[role='dialog']","fields":[{"field_name":"task_title","selector":"input[name='taskTitle']","extraction_method":"value","data_type":"string","required":true,"description":"Task title"},{"field_name":"task_priority","selector":"select[name='taskPriority']","extraction_method":"value","data_type":"string","required":false,"description":"Task priority level"},{"field_name":"project_id","selector":"[data-project-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-project-id","required":true,"description":"Parent project ID"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":true}},
            relationships: {"triggers":["task_creation"],"affects":["task_count","project_tasks"],"depends_on":["project_id"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: true,
            form_schema: {"form_name":"CreateTaskForm","form_selector":"form, [role='dialog'] form","fields":[{"field_name":"taskTitle","field_label":"Task Title","field_type":"text","required":true,"is_sensitive":false},{"field_name":"taskDescription","field_label":"Description","field_type":"textarea","required":false,"is_sensitive":false},{"field_name":"taskPriority","field_label":"Priority","field_type":"select","required":false,"is_sensitive":false},{"field_name":"taskAssignedTo","field_label":"Assigned To","field_type":"select","required":false,"is_sensitive":false},{"field_name":"taskDueDate","field_label":"Due Date","field_type":"date","required":false,"is_sensitive":false}],"submit_button_selector":"button[type='submit']"}
        },

        {
            name: 'TaskStatusDropdown',
            type: 'select_dropdown',
            pattern_type: 'toggle_state',
            selectors: ["select[name='status']",".task-status-select"],
            purpose: 'Change task status',
            contextNeeded: ["task_id","previous_status","new_status"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-task-id]","fields":[{"field_name":"task_id","selector":"[data-task-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-task-id","required":true,"description":"Task identifier"},{"field_name":"previous_status","selector":"select[name='status']","extraction_method":"value","data_type":"string","required":true,"description":"Status before change"},{"field_name":"new_status","selector":"select[name='status']","extraction_method":"value","data_type":"string","required":true,"description":"Status after change"}],"state_tracking":{"track_previous_value":true,"track_change_delta":true,"track_timing":false}},
            relationships: {"triggers":["status_change"],"affects":["task_state","project_progress"],"depends_on":["task_id"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'EditProjectButton',
            type: 'button',
            pattern_type: 'form_submission',
            selectors: ["button[type='submit']",".edit-project-btn"],
            purpose: 'Update project details',
            contextNeeded: ["project_id","name","description"],
            context_collection: {"strategy":"modal_scope","scope_selector":"[role='dialog']","fields":[{"field_name":"project_id","selector":"[data-project-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-project-id","required":true,"description":"Project being edited"},{"field_name":"project_name","selector":"input[name='projectName']","extraction_method":"value","data_type":"string","required":true,"description":"Updated project name"}],"state_tracking":{"track_previous_value":true,"track_change_delta":true,"track_timing":false}},
            relationships: {"triggers":["project_update"],"affects":["project_metadata"],"depends_on":["project_id"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: true,
            form_schema: {"form_name":"EditProjectForm","form_selector":"[role='dialog'] form","fields":[{"field_name":"projectName","field_label":"Project Name","field_type":"text","required":true,"is_sensitive":false},{"field_name":"projectDescription","field_label":"Description","field_type":"textarea","required":false,"is_sensitive":false}],"submit_button_selector":"button[type='submit']"}
        },

        {
            name: 'ArchiveProjectButton',
            type: 'button',
            pattern_type: 'item_selection',
            selectors: ["button.archive-btn","[data-action='archive']"],
            purpose: 'Archive project',
            contextNeeded: ["project_id","project_name"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-project-id]","fields":[{"field_name":"project_id","selector":"[data-project-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-project-id","required":true,"description":"Project to archive"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["project_archival"],"affects":["project_status","active_project_count"],"depends_on":["project_id"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'DeleteTaskButton',
            type: 'button',
            pattern_type: 'item_selection',
            selectors: ["button.delete-btn","[data-action='delete']"],
            purpose: 'Delete task',
            contextNeeded: ["task_id","project_id"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-task-id]","fields":[{"field_name":"task_id","selector":"[data-task-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-task-id","required":true,"description":"Task to delete"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["task_deletion"],"affects":["task_count"],"depends_on":["task_id"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'InviteTeamMemberButton',
            type: 'button',
            pattern_type: 'form_submission',
            selectors: ["button[type='submit']",".invite-btn"],
            purpose: 'Send team invitation',
            contextNeeded: ["email","workspace_id"],
            context_collection: {"strategy":"modal_scope","scope_selector":"[role='dialog']","fields":[{"field_name":"invite_email","selector":"input[name='inviteEmail']","extraction_method":"value","data_type":"string","required":true,"description":"Email of invitee","field_purpose":"pii","anonymize":true}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["invitation_sent"],"affects":["pending_invitations"],"depends_on":["workspace_id"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: true,
            form_schema: {"form_name":"InviteTeamMemberForm","form_selector":"[role='dialog'] form","fields":[{"field_name":"inviteEmail","field_label":"Email Address","field_type":"email","required":true,"is_sensitive":false}],"submit_button_selector":"button[type='submit']"}
        },

        {
            name: 'RemoveTeamMemberButton',
            type: 'button',
            pattern_type: 'item_selection',
            selectors: ["button.remove-member","[data-action='remove']"],
            purpose: 'Remove team member',
            contextNeeded: ["member_id","workspace_id"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-member-id]","fields":[{"field_name":"member_id","selector":"[data-member-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-member-id","required":true,"description":"Member to remove"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["member_removal"],"affects":["team_member_count"],"depends_on":["member_id"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'SaveProfileButton',
            type: 'button',
            pattern_type: 'form_submission',
            selectors: ["button[type='submit']",".save-profile-btn"],
            purpose: 'Update user profile',
            contextNeeded: ["full_name","email"],
            context_collection: {"strategy":"form_state","scope_selector":"form","fields":[{"field_name":"full_name","selector":"input[name='fullName']","extraction_method":"value","data_type":"string","required":true,"description":"User full name","field_purpose":"pii","anonymize":true}],"state_tracking":{"track_previous_value":true,"track_change_delta":true,"track_timing":false}},
            relationships: {"triggers":["profile_update"],"affects":["user_profile"],"depends_on":["user_id"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: true,
            form_schema: {"form_name":"ProfileSettingsForm","form_selector":"form","fields":[{"field_name":"fullName","field_label":"Full Name","field_type":"text","required":true,"is_sensitive":false},{"field_name":"email","field_label":"Email","field_type":"email","required":true,"is_sensitive":false}],"submit_button_selector":"button[type='submit']"}
        },

        {
            name: 'EmailNotificationsToggle',
            type: 'toggle_switch',
            pattern_type: 'toggle_state',
            selectors: ["input[type='checkbox'][name='emailNotifications']",".notification-toggle"],
            purpose: 'Enable/disable email notifications',
            contextNeeded: ["previous_state","new_state"],
            context_collection: {"strategy":"component_props","scope_selector":"label","fields":[{"field_name":"email_notifications_enabled","selector":"input[name='emailNotifications']","extraction_method":"checked","data_type":"boolean","required":true,"description":"Notification preference"}],"state_tracking":{"track_previous_value":true,"track_change_delta":true,"track_timing":false}},
            relationships: {"triggers":["preference_change"],"affects":["notification_settings"],"depends_on":[]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'UpgradeToPremiumButton',
            type: 'button',
            pattern_type: 'navigation',
            selectors: ["a[href='/pricing']",".upgrade-btn"],
            purpose: 'Navigate to pricing page',
            contextNeeded: ["current_plan","trigger_location"],
            context_collection: {"strategy":"global_context","scope_selector":"body","fields":[{"field_name":"trigger_location","selector":"body","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-page","required":false,"description":"Where upgrade was triggered"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["navigation"],"affects":["upgrade_funnel_entry"],"depends_on":[]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'NewProjectLink',
            type: 'link',
            pattern_type: 'navigation',
            selectors: ["a[href='/dashboard/projects/new']",".new-project-link"],
            purpose: 'Navigate to project creation',
            contextNeeded: ["current_project_count"],
            context_collection: {"strategy":"global_context","scope_selector":"body","fields":[{"field_name":"project_count","selector":"[data-project-count]","extraction_method":"data-attribute","data_type":"number","attribute_name":"data-project-count","required":false,"description":"Current project count"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["navigation"],"affects":["page_view"],"depends_on":[]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'ProjectCardLink',
            type: 'link',
            pattern_type: 'item_selection',
            selectors: ["a[href*='/dashboard/projects/']",".project-card"],
            purpose: 'View project details',
            contextNeeded: ["project_id","project_name"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-project-id]","fields":[{"field_name":"project_id","selector":"[data-project-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-project-id","required":true,"description":"Selected project ID"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["navigation"],"affects":["project_view"],"depends_on":["project_id"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'SettingsTabSwitch',
            type: 'tab',
            pattern_type: 'tab_switch',
            selectors: ["button[role='tab']",".tabs-trigger"],
            purpose: 'Switch settings tab',
            contextNeeded: ["previous_tab","new_tab","unsaved_changes"],
            context_collection: {"strategy":"sibling_state","scope_selector":"[role='tablist']","fields":[{"field_name":"active_tab","selector":"button[role='tab'][aria-selected='true']","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-value","required":true,"description":"Currently active tab"}],"state_tracking":{"track_previous_value":true,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["tab_change"],"affects":["visible_content"],"depends_on":[]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
        },

        {
            name: 'DownloadInvoiceButton',
            type: 'button',
            pattern_type: 'item_selection',
            selectors: ["button.download-invoice","[data-action='download']"],
            purpose: 'Download invoice PDF',
            contextNeeded: ["invoice_id","invoice_date"],
            context_collection: {"strategy":"parent_data","scope_selector":"[data-invoice-id]","fields":[{"field_name":"invoice_id","selector":"[data-invoice-id]","extraction_method":"data-attribute","data_type":"string","attribute_name":"data-invoice-id","required":true,"description":"Invoice to download"}],"state_tracking":{"track_previous_value":false,"track_change_delta":false,"track_timing":false}},
            relationships: {"triggers":["file_download"],"affects":[],"depends_on":["invoice_id"]},
            // Form collection detection - for buttons that submit forms
            is_form_collection: false,
            form_schema: null
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
      console.log('[demo-test-apps-2026-01-22-mnhctas3am] 🤖 AI-Enhanced Analytics initialized');
      console.log('[demo-test-apps-2026-01-22-mnhctas3am] 📊 Tracking 19 discovered components');
      console.log('[demo-test-apps-2026-01-22-mnhctas3am] 🔑 User ID:', this.userId);
      console.log('[demo-test-apps-2026-01-22-mnhctas3am] 📍 Session ID:', this.sessionId);
      
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

    // ============ FORM COLLECTION CONTEXT EXTRACTION ============
    // Extracts form field values with GUARANTEED SLOTS (always includes all expected fields)
    extractFormContext(element, componentInfo) {
      const formSchema = componentInfo?.form_schema;
      
      // Find the form - try component's selector first, then closest form
      let form = null;
      if (formSchema?.form_selector) {
        // Try each selector in the form_selector (may be comma-separated)
        const selectors = formSchema.form_selector.split(',').map(s => s.trim());
        for (const sel of selectors) {
          try {
            form = element.closest(sel) || document.querySelector(sel);
            if (form) break;
          } catch (e) { /* invalid selector */ }
        }
      }
      
      // Fallback to closest form
      if (!form) {
        form = element.closest('form');
      }
      
      if (!form) return null;
      
      // Initialize context with ALL expected fields as null (guaranteed slots)
      const context = {};
      
      if (formSchema && formSchema.fields && formSchema.fields.length > 0) {
        // Pre-populate all expected slots with null for consistent schema
        for (const field of formSchema.fields) {
          context[field.field_name] = null;
        }
        
        // Now extract actual values from form
        for (const field of formSchema.fields) {
          try {
            // Build flexible selector to find the input
            const selectors = [
              `[name="${field.field_name}"]`,
              `#${field.field_name}`,
              `[id*="${field.field_name}"]`,
              `[data-field="${field.field_name}"]`,
              `[placeholder*="${field.field_label || field.field_name}"]`
            ];
            
            let input = null;
            for (const sel of selectors) {
              try {
                input = form.querySelector(sel);
                if (input) break;
              } catch (e) { /* invalid selector */ }
            }
            
            if (!input) continue;
            
            // Handle sensitive fields - just indicate if filled
            if (field.is_sensitive) {
              context[field.field_name] = input.value ? '[FILLED]' : null;
              continue;
            }
            
            // Get value based on field type
            let value = null;
            switch (field.field_type) {
              case 'checkbox':
                value = input.checked;
                break;
              case 'radio':
                const checked = form.querySelector(`[name="${field.field_name}"]:checked`);
                value = checked ? checked.value : null;
                break;
              case 'select':
                value = input.options && input.selectedIndex >= 0 
                  ? (input.options[input.selectedIndex]?.text || input.value)
                  : null;
                break;
              case 'file':
                value = input.files && input.files.length > 0 
                  ? `${input.files.length} file(s)` 
                  : null;
                break;
              default:
                value = input.value || null;
            }
            
            // Truncate long text values
            if (typeof value === 'string' && value.length > 200) {
              value = value.slice(0, 200) + '...';
            }
            
            // Don't store empty strings as values
            if (value === '') value = null;
            
            context[field.field_name] = value;
            
          } catch (e) {
            // Keep as null on error - slot is still guaranteed
          }
        }
      } else {
        // No schema defined - fall back to dynamic form extraction
        return this.captureFormData(form);
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
        
        // Find clickable element (including Radix UI menu items and dropdown items)
        const clickable = target.closest(`
          button, [role="button"], [role="menuitem"], [role="option"], [role="menuitemcheckbox"], [role="menuitemradio"],
          [onclick], input[type="submit"], input[type="button"],
          [class*="button"], [class*="btn"], svg, [class*="icon"], [data-clickable],
          [style*="cursor: pointer"], a, [data-radix-collection-item]
        `);
        
        if (clickable || componentInfo) {
          const element = clickable || target;
          
          // BUTTON_CLICK is a simple click event - no form context
          // Form data is captured in MODAL_INTERACTION (action: "submitted") or FORM_INTERACTION
          const eventData = {
            element_text: this.getElementText(element).slice(0, 100),
            element_type: this.getButtonType(element),
            surface: this.getSurface(element),
            page_path: window.location.pathname,
            component_name: componentInfo?.name || this.inferComponentName(element)
          };
          
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
        
        // Capture form data for all form submissions (sanitized)
        const formData = this.captureFormData(form);
        const formAction = this.inferFormAction(form);
        
        if (modal) {
          // For modal forms: track MODAL_INTERACTION with form_data (skip FORM_INTERACTION)
          this.trackEvent('MODAL_INTERACTION', {
            action: 'submitted',
            modal_name: this.getModalTitle(modal),
            page_path: window.location.pathname,
            form_data: formData
          });
        } else {
          // For standalone forms: track FORM_INTERACTION with context
          this.trackEvent('FORM_INTERACTION', {
            action: 'submitted',
            form_name: this.getFormName(form),
            form_action: formAction,
            page_path: window.location.pathname,
            fields_total: this.countFormFields(form),
            fields_completed: tracking ? tracking.fieldsInteracted.size : 0,
            form_data: Object.keys(formData).length > 0 ? formData : undefined
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
                    page_path: window.location.pathname
                  });
                } else {
                this.trackEvent('ELEMENT_VISIBILITY', {
                  action: 'shown',
                    element_type: overlayType,
                  element_name: this.getElementName(element),
                  page_path: window.location.pathname
                });
                }
              } else if (!isVisible && wasVisible) {
                this.visibleElements.set(element, false);
                
                // Use MODAL_INTERACTION for modals, ELEMENT_VISIBILITY for others
                if (isModal) {
                  this.trackEvent('MODAL_INTERACTION', {
                    action: 'closed',
                    modal_name: this.getModalTitle(element),
                    page_path: window.location.pathname
                  });
                } else {
                this.trackEvent('ELEMENT_VISIBILITY', {
                  action: 'hidden',
                    element_type: overlayType,
                  element_name: this.getElementName(element),
                  page_path: window.location.pathname
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
            depth_percentage: milestone,
            page_path: window.location.pathname
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
      // Check meaningful attributes first
      if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');
      if (element.getAttribute('title')) return element.getAttribute('title');
      if (element.dataset.name) return element.dataset.name;
      
      // Only use id if it's not a Radix/React auto-generated one
      const id = element.id;
      if (id && !id.startsWith('radix-') && !id.startsWith(':r') && !id.match(/^radix-.*_r_d+/)) {
        return id;
      }
      
      // Try to build a name from content
      const text = element.textContent?.trim().slice(0, 30);
      if (text && text.length > 2) return text;
      
      return 'unnamed';
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
      // 1. Try explicit form attributes
      if (form.getAttribute('name')) return form.getAttribute('name');
      if (form.getAttribute('aria-label')) return form.getAttribute('aria-label');
      if (form.id && !form.id.startsWith('radix-') && !form.id.startsWith(':r')) return form.id;
      
      // 2. Try to find heading inside or near the form
      const heading = form.querySelector('h1, h2, h3, h4, [class*="title"], [class*="heading"]');
      if (heading && heading.textContent) {
        const headingText = heading.textContent.trim().slice(0, 50);
        if (headingText.length > 2) return headingText;
      }
      
      // 3. Try to find heading in parent container (for card-wrapped forms)
      const parent = form.closest('section, article, [class*="card"], [class*="modal"], [class*="dialog"]');
      if (parent) {
        const parentHeading = parent.querySelector('h1, h2, h3, h4, [class*="title"], [class*="heading"]');
        if (parentHeading && parentHeading.textContent) {
          const parentText = parentHeading.textContent.trim().slice(0, 50);
          if (parentText.length > 2) return parentText;
        }
      }
      
      // 4. Try to infer from submit button text
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      if (submitBtn) {
        const btnText = (submitBtn.textContent || submitBtn.value || '').trim();
        if (btnText && btnText.length > 2 && btnText.length < 30) {
          return btnText + ' Form';
        }
      }
      
      // 5. Try to infer from page path
      const path = window.location.pathname;
      if (path.includes('/new')) return 'Create Form';
      if (path.includes('/edit')) return 'Edit Form';
      if (path.includes('/login')) return 'Login Form';
      if (path.includes('/signup') || path.includes('/register')) return 'Signup Form';
      if (path.includes('/settings')) return 'Settings Form';
      
      return 'form';
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

    // =============================================================================
    // UNIVERSAL FORM DATA CAPTURE - Framework Agnostic
    // =============================================================================
    // Works with: React, Vue, Angular, Svelte, vanilla JS, Radix UI, Material UI,
    // Chakra, Ant Design, shadcn/ui, Headless UI, and any other framework.
    //
    // Strategy: Scan the form scope for ALL field groups (label + input pairs),
    // detect field type semantically, and extract values accordingly.
    // =============================================================================
    captureFormData(form) {
      const formData = {};
      const capturedElements = new Set(); // Avoid duplicates
      
      // Sensitive field patterns to skip entirely
      const sensitivePatterns = /password|pwd|secret|token|cvv|cvc|ssn|social.*security|card.*number|credit.*card|pin/i;
      
      // Fields to anonymize (show partial value)
      const anonymizePatterns = /email|phone|tel|mobile/i;
      
      // Get the widest reasonable scope (modal > form)
      const scope = form.closest('[role="dialog"]') || 
                   form.closest('[data-radix-dialog-content]') ||
                   form.closest('[class*="modal"]') ||
                   form.closest('[class*="Modal"]') ||
                   form.closest('[class*="dialog"]') ||
                   form.closest('[class*="Dialog"]') ||
                   form;
      
      try {
        // =================================================================
        // STRATEGY 1: Find all form field GROUPS (label + input containers)
        // This is the most reliable approach for modern component libraries
        // =================================================================
        console.log('[Analytics Debug] Scanning scope:', scope.tagName, scope.className?.toString().slice(0, 50));
        const fieldGroups = this.findFieldGroups(scope);
        console.log('[Analytics Debug] Found', fieldGroups.length, 'field groups');
        
        for (const group of fieldGroups) {
          const { label, element, type } = group;
          console.log('[Analytics Debug] Field group:', { label, type, tagName: element.tagName, value: element.value || element.textContent?.slice(0, 30) });
          if (!label || capturedElements.has(element)) continue;
          
          const fieldName = this.cleanFieldName(label);
          if (!fieldName || formData[fieldName] || sensitivePatterns.test(fieldName)) continue;
          
          let value = this.extractFieldValue(element, type);
          console.log('[Analytics Debug] Extracted value for', fieldName, ':', value);
          if (value === null || value === '' || value === undefined) continue;
          
          // Anonymize if needed
          value = this.sanitizeValue(fieldName, value, anonymizePatterns);
          if (value === null) continue;
          
          formData[fieldName] = value;
          capturedElements.add(element);
        }
        
        // =================================================================
        // STRATEGY 2: Native form.elements as fallback
        // =================================================================
        if (form.elements) {
          for (let i = 0; i < form.elements.length; i++) {
            const el = form.elements[i];
            if (capturedElements.has(el)) continue;
            
          const name = el.name || el.id;
            if (!name || el.type === 'submit' || el.type === 'button' || el.type === 'hidden') continue;
            if (sensitivePatterns.test(name) || formData[name]) continue;
            
            let value = this.extractNativeInputValue(el);
            if (value === null || value === '' || value === undefined) continue;
            
            value = this.sanitizeValue(name, value, anonymizePatterns);
            if (value === null) continue;
            
            formData[name] = value;
            capturedElements.add(el);
          }
        }
        
      } catch (e) {
        console.warn('[Analytics] Error capturing form data:', e);
      }
      
      return Object.keys(formData).length > 0 ? formData : null;
    }
    
    // Find all field groups (label + input pairs) in scope
    findFieldGroups(scope) {
      const groups = [];
      const processedInputs = new Set();
      
      // =====================================================================
      // APPROACH 1: Find all LABELS first, then find their associated inputs
      // This is more reliable than looking for wrapper patterns
      // =====================================================================
      const allLabels = scope.querySelectorAll('label, [class*="label"]:not(input):not(button):not(select), [class*="Label"]:not(input):not(button):not(select)');
      
      console.log('[Analytics Debug] Found', allLabels.length, 'labels in scope');
      
      for (const labelEl of allLabels) {
        const labelText = labelEl.textContent?.trim();
        if (!labelText || labelText.length > 100 || labelText.length < 1) continue;
        
        // Skip if this looks like a button label
        if (labelEl.closest('button')) continue;
        
        // Find the associated input
        let input = null;
        
        // Method 1: label[for] -> input[id]
        const forAttr = labelEl.getAttribute('for');
        if (forAttr) {
          input = scope.querySelector(`#${forAttr}`) || 
                  scope.querySelector(`[name="${forAttr}"]`);
        }
        
        // Method 2: Input is inside the label
        if (!input) {
          input = labelEl.querySelector('input, textarea, select, [role="combobox"], button[data-state]');
        }
        
        // Method 3: Input is a sibling (next element)
        if (!input) {
          const parent = labelEl.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children);
            const labelIndex = siblings.indexOf(labelEl);
            for (let i = labelIndex + 1; i < siblings.length; i++) {
              const sib = siblings[i];
              // Check if sibling IS an input
              if (sib.matches('input, textarea, select, [role="combobox"], button[data-state]')) {
                input = sib;
                break;
              }
              // Check if sibling CONTAINS an input
              const innerInput = sib.querySelector('input, textarea, select, [role="combobox"], button[data-state]');
              if (innerInput) {
                input = innerInput;
                break;
              }
            }
          }
        }
        
        // Method 4: Input is in the same container (parent)
        if (!input) {
          const parent = labelEl.parentElement;
          if (parent) {
            input = parent.querySelector('input:not([type="hidden"]):not([type="submit"]), textarea, select, [role="combobox"], button[data-state]');
          }
        }
        
        if (input && !processedInputs.has(input) && !this.isActionButton(input)) {
          const type = this.detectFieldType(input);
          groups.push({ label: labelText, element: input, type });
          processedInputs.add(input);
          console.log('[Analytics Debug] Matched label:', labelText, '-> input type:', type, 'tag:', input.tagName);
        }
      }
      
      // =====================================================================
      // APPROACH 2: Find orphan inputs (no label found above) and try harder
      // =====================================================================
      const allInputs = scope.querySelectorAll(`
        input:not([type="hidden"]):not([type="submit"]):not([type="button"]),
        textarea,
        select,
        [role="combobox"],
        [role="listbox"],
        [role="slider"],
        [role="spinbutton"],
        [contenteditable="true"],
        [data-radix-select-trigger],
        button[data-state]
      `);
      
      for (const input of allInputs) {
        if (processedInputs.has(input)) continue;
        if (this.isActionButton(input)) continue;
        
        const label = this.findLabelForElement(input, scope);
        const type = this.detectFieldType(input);
        
        if (label) {
          groups.push({ label, element: input, type });
          processedInputs.add(input);
          console.log('[Analytics Debug] Orphan input found label:', label, '-> type:', type);
            } else {
          console.log('[Analytics Debug] Orphan input NO LABEL:', input.tagName, input.className?.toString().slice(0, 30));
        }
      }
      
      return groups;
    }
    
    // Analyze a field wrapper to extract label and input
    analyzeFieldWrapper(wrapper, processedInputs) {
      // Find label in this wrapper
      const labelEl = wrapper.querySelector('label, [class*="label"], [class*="Label"]');
      if (!labelEl) return null;
      
      const label = labelEl.textContent?.trim();
      if (!label || label.length > 100) return null;
      
      // Find the input element in this wrapper
      const input = wrapper.querySelector(`
        input:not([type="hidden"]):not([type="submit"]):not([type="button"]),
        textarea,
        select,
        [role="combobox"],
        [role="listbox"],
        [data-radix-select-trigger],
        button[data-state]:not([class*="close"]):not([class*="cancel"])
      `);
      
      if (!input || processedInputs.has(input)) return null;
      if (this.isActionButton(input)) return null;
      
      const type = this.detectFieldType(input);
      return { label, element: input, type };
    }
    
    // Check if an element is an action button (not a form field)
    isActionButton(el) {
      if (el.tagName !== 'BUTTON') return false;
      
      const text = (el.textContent || '').toLowerCase().trim();
      const actionPatterns = [
        'submit', 'save', 'create', 'update', 'delete', 'cancel', 'close',
        'ok', 'confirm', 'apply', 'done', 'next', 'back', 'previous',
        'שמור', 'צור', 'עדכן', 'מחק', 'ביטול', 'סגור', 'אישור'
      ];
      
      return actionPatterns.some(p => text.includes(p));
    }
    
    // Detect the semantic type of a form field
    detectFieldType(el) {
      // Native input types
      if (el.tagName === 'INPUT') {
        return el.type || 'text';
      }
      if (el.tagName === 'TEXTAREA') return 'textarea';
      if (el.tagName === 'SELECT') return 'select';
      
      // ARIA roles
      const role = el.getAttribute('role');
      if (role === 'combobox' || role === 'listbox') return 'select';
      if (role === 'slider') return 'slider';
      if (role === 'spinbutton') return 'number';
      if (role === 'checkbox') return 'checkbox';
      if (role === 'radio') return 'radio';
      if (role === 'switch') return 'switch';
      
      // Radix/shadcn patterns
      if (el.hasAttribute('data-radix-select-trigger')) return 'select';
      if (el.hasAttribute('data-state') && el.tagName === 'BUTTON') return 'select';
      
      // Contenteditable
      if (el.getAttribute('contenteditable') === 'true') return 'richtext';
      
      // Class-based detection
      const classes = (el.className || '').toString().toLowerCase();
      if (classes.includes('date') || classes.includes('calendar')) return 'date';
      if (classes.includes('color')) return 'color';
      if (classes.includes('slider') || classes.includes('range')) return 'slider';
      
      return 'unknown';
    }
    
    // Extract value from any field type
    extractFieldValue(el, type) {
      try {
        switch (type) {
          case 'checkbox':
          case 'switch':
            return el.checked ?? el.getAttribute('data-state') === 'checked' ?? 
                   el.getAttribute('aria-checked') === 'true';
          
          case 'radio':
            if (el.checked) return el.value;
            return null;
          
          case 'select':
            // Native select
            if (el.tagName === 'SELECT') {
              const opt = el.options?.[el.selectedIndex];
              return opt ? (opt.text || opt.value) : null;
            }
            // Custom select (Radix, etc.) - get displayed text
            const valueEl = el.querySelector('[data-radix-select-value]') ||
                           el.querySelector('[class*="value"]') ||
                           el.querySelector('span:first-child') ||
                           el;
            const text = valueEl?.textContent?.trim();
            // Skip placeholder text
            if (this.isPlaceholder(text)) return null;
            return text;
          
          case 'textarea':
          case 'richtext':
            return el.value || el.textContent?.trim() || null;
          
          case 'date':
            return el.value || el.textContent?.trim() || null;
          
          case 'slider':
          case 'number':
            return el.value || el.getAttribute('aria-valuenow') || null;
          
          default:
            // Standard input
            return el.value || null;
        }
      } catch (e) {
        return null;
      }
    }
    
    // Extract value from native form input
    extractNativeInputValue(el) {
      if (el.type === 'checkbox') return el.checked;
      if (el.type === 'radio') return el.checked ? el.value : null;
      if (el.tagName === 'SELECT') {
        const opt = el.options?.[el.selectedIndex];
        return opt ? (opt.text || opt.value) : null;
      }
      return el.value || null;
    }
    
    // Check if text is a placeholder
    isPlaceholder(text) {
      if (!text) return true;
      const placeholders = [
        'select', 'choose', 'pick', 'בחר', 'בחירה',
        'select...', 'choose...', 'pick...', 'בחר...',
        'select an option', 'choose an option',
        'please select', 'please choose',
        '--', '---', 'none', 'n/a'
      ];
      return placeholders.includes(text.toLowerCase());
    }
    
    // Find label for an element using multiple strategies
    findLabelForElement(el, scope) {
      // 1. Explicit label via for attribute
      if (el.id) {
        const label = scope.querySelector(`label[for="${el.id}"]`);
        if (label) return label.textContent?.trim();
      }
      
      // 2. Aria-label
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;
      
      // 3. Aria-labelledby
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) return labelEl.textContent?.trim();
      }
      
      // 4. Walk up DOM to find label in parent containers
      let parent = el.parentElement;
      for (let i = 0; i < 5 && parent && parent !== scope; i++) {
        const label = parent.querySelector('label, [class*="label"], [class*="Label"]');
        if (label && !label.contains(el)) {
          const text = label.textContent?.trim();
          if (text && text.length < 50) return text;
        }
        parent = parent.parentElement;
      }
      
      // 5. Placeholder as fallback
      if (el.placeholder) return el.placeholder;
      
      // 6. Name attribute as last resort
      if (el.name) {
        return el.name
          .replace(/([A-Z])/g, ' $1')
          .replace(/[-_]/g, ' ')
          .trim();
      }
      
      return null;
    }
    
    // Sanitize/anonymize a value
    sanitizeValue(fieldName, value, anonymizePatterns) {
      if (value === null || value === undefined) return null;
          
          // Anonymize email/phone fields
      if (anonymizePatterns.test(fieldName) && typeof value === 'string') {
        if (fieldName.toLowerCase().includes('email') && value.includes('@')) {
          const [local, domain] = value.split('@');
          return local.charAt(0) + '***@' + domain;
        }
        return '***' + value.slice(-4);
      }
      
      // Truncate long strings
      if (typeof value === 'string' && value.length > 200) {
        return value.slice(0, 200) + '...';
      }
      
      return value;
    }

    // === SEMANTIC SUBMIT BUTTON DETECTION (for React/controlled forms) ===
    // Detects if a button is a submit-type button using SEMANTIC ANALYSIS
    // Instead of hardcoding text patterns (fragile), we analyze:
    // 1. Button position (last/primary in container)
    // 2. Button styling (primary vs secondary/outline)
    // 3. Proximity to form inputs
    // 4. Sibling button patterns (cancel buttons nearby)
    // 5. Container context (is inside a modal/form-like container with inputs?)
    isSubmitTypeButton(element) {
      // === EXPLICIT INDICATORS (always trust these) ===
      if (element.getAttribute('type') === 'submit' ||
          element.dataset.action === 'submit' ||
          element.dataset.type === 'submit' ||
          element.getAttribute('data-submit') === 'true') {
        return true;
      }
      
      // === CONTEXT CHECK: Is there a form-like container with inputs? ===
      const container = element.closest('[role="dialog"]') ||
                        element.closest('[data-radix-dialog-content]') ||
                        element.closest('[class*="modal"]') ||
                        element.closest('[class*="Modal"]') ||
                        element.closest('[class*="dialog"]') ||
                        element.closest('[class*="Dialog"]') ||
                        element.closest('[class*="card"]') ||
                        element.closest('[class*="Card"]') ||
                        element.closest('[data-form]') ||
                        element.closest('form');
      
      if (!container) {
        return false; // Not in a form-like container
      }
      
      // Check if container has form inputs
      const hasFormInputs = container.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select, [role="combobox"]');
      if (!hasFormInputs) {
        return false; // No form inputs in container - not a form submission
      }
      
      // === SEMANTIC INDICATOR 1: Primary button styling ===
      const isPrimaryStyled = this.isPrimaryButton(element);
      
      // === SEMANTIC INDICATOR 2: Button position (footer/bottom of container) ===
      const isInFooter = this.isButtonInFooter(element, container);
      
      // === SEMANTIC INDICATOR 3: Has cancel/close sibling ===
      const hasCancelSibling = this.hasCancelSibling(element);
      
      // === SEMANTIC INDICATOR 4: Is the rightmost/last button (in LTR) or leftmost (in RTL) ===
      const isActionPosition = this.isInActionPosition(element);
      
      // === SCORING: Combine semantic signals ===
      let score = 0;
      
      if (isPrimaryStyled) score += 3;      // Strong signal
      if (isInFooter) score += 2;           // Medium signal
      if (hasCancelSibling) score += 2;     // Medium signal (cancel nearby means this is the action)
      if (isActionPosition) score += 1;     // Weak signal
      
      // Threshold: need at least 3 points to be considered a submit button
      return score >= 3;
    }
    
    // Check if button has primary/action styling
    isPrimaryButton(element) {
      const classes = (element.className || '').toString().toLowerCase();
      const computedStyle = window.getComputedStyle ? window.getComputedStyle(element) : null;
      
      // Check class-based indicators
      const primaryClassPatterns = [
        'primary', 'submit', 'action', 'confirm', 'cta',
        'btn-primary', 'button-primary', 'bg-primary',
        'filled', 'contained', 'solid'
      ];
      
      const secondaryClassPatterns = [
        'secondary', 'outline', 'ghost', 'cancel', 'close', 'dismiss',
        'btn-secondary', 'button-secondary', 'btn-outline', 'btn-ghost',
        'text-only', 'link', 'tertiary'
      ];
      
      // If has secondary styling, not primary
      for (const pattern of secondaryClassPatterns) {
        if (classes.includes(pattern)) {
          return false;
        }
      }
      
      // If has primary styling, is primary
      for (const pattern of primaryClassPatterns) {
        if (classes.includes(pattern)) {
          return true;
        }
      }
      
      // Check computed style: filled background usually indicates primary
      if (computedStyle) {
        const bgColor = computedStyle.backgroundColor;
        const textColor = computedStyle.color;
        
        // If background is not transparent/white and has contrast with text, likely primary
        if (bgColor && 
            bgColor !== 'transparent' && 
            bgColor !== 'rgba(0, 0, 0, 0)' &&
            !bgColor.includes('255, 255, 255') &&
            !bgColor.includes('rgb(255, 255, 255)')) {
          return true;
        }
      }
      
      return false;
    }
    
    // Check if button is in footer/bottom section of container
    isButtonInFooter(element, container) {
      // Check if in a footer-like element
      const footer = element.closest('footer, [class*="footer"], [class*="Footer"], [class*="actions"], [class*="Actions"], [class*="buttons"], [class*="Buttons"]');
      if (footer && container.contains(footer)) {
        return true;
      }
      
      // Check if near bottom of container using position
      try {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // If button is in the bottom 30% of the container, consider it "in footer"
        const containerBottom = containerRect.bottom;
        const containerHeight = containerRect.height;
        const elementCenter = elementRect.top + elementRect.height / 2;
        
        const bottomThreshold = containerRect.top + (containerHeight * 0.7);
        return elementCenter > bottomThreshold;
      } catch (e) {
        return false;
      }
    }
    
    // Check if there's a cancel/close button as sibling
    hasCancelSibling(element) {
      const parent = element.parentElement;
      if (!parent) return false;
      
      const siblings = parent.querySelectorAll('button, [role="button"], a[class*="button"], a[class*="btn"]');
      
      for (const sibling of siblings) {
        if (sibling === element) continue;
        
        const siblingClasses = (sibling.className || '').toString().toLowerCase();
        const siblingText = (sibling.textContent || '').toLowerCase();
        
        // Check if sibling looks like a cancel/close button
        const cancelIndicators = ['cancel', 'close', 'dismiss', 'secondary', 'outline', 'ghost', 'back', 'nevermind'];
        
        for (const indicator of cancelIndicators) {
          if (siblingClasses.includes(indicator) || siblingText.includes(indicator)) {
            return true;
          }
        }
        
        // Check for X/close icon button
        if (sibling.querySelector('svg') && siblingText.trim() === '') {
          const ariaLabel = (sibling.getAttribute('aria-label') || '').toLowerCase();
          if (ariaLabel.includes('close') || ariaLabel.includes('dismiss')) {
            return true;
          }
        }
      }
      
      return false;
    }
    
    // Check if button is in the "action" position (rightmost in LTR, leftmost in RTL)
    isInActionPosition(element) {
      const parent = element.parentElement;
      if (!parent) return false;
      
      const siblings = Array.from(parent.querySelectorAll('button, [role="button"]'));
      if (siblings.length < 2) return true; // Only button, so it's the action
      
      const elementIndex = siblings.indexOf(element);
      
      // Check document direction
      const isRTL = document.documentElement.dir === 'rtl' || 
                    document.body.dir === 'rtl' ||
                    window.getComputedStyle(document.body).direction === 'rtl';
      
      // In LTR: action button is usually last (rightmost)
      // In RTL: action button is usually first (leftmost)
      if (isRTL) {
        return elementIndex === 0;
      } else {
        return elementIndex === siblings.length - 1;
      }
    }

    // === COLLECT FORM FIELDS FROM SCOPE (for React/controlled forms) ===
    // Collects all input values from a container (modal, dialog, card, etc.)
    // Works with React controlled inputs that don't use <form> elements
    collectFieldsFromScope(scope) {
      const formData = {};
      
      // Sensitive field patterns to skip entirely
      const sensitivePatterns = /password|pwd|secret|token|cvv|cvc|ssn|social.*security|card.*number|credit.*card/i;
      
      // Fields to anonymize (show partial value)
      const anonymizePatterns = /email|phone|tel|mobile/i;
      
      try {
        // === STRATEGY 1: Find labeled form field groups ===
        // Look for common form field wrapper patterns (Label + Input pairs)
        const fieldGroups = scope.querySelectorAll('[class*="field"], [class*="Field"], [class*="form-group"], [class*="FormGroup"], [class*="input-group"], [class*="InputGroup"], .space-y-2 > div, .gap-2 > div, .grid > div');
        
        for (const group of fieldGroups) {
          // Find label in this group
          const labelEl = group.querySelector('label, [class*="label"], [class*="Label"]');
          if (!labelEl) continue;
          
          const fieldName = this.cleanFieldName(labelEl.textContent?.trim());
          if (!fieldName || sensitivePatterns.test(fieldName)) continue;
          if (formData[fieldName]) continue; // Already have this field
          
          // Find input in this group
          const input = group.querySelector('input, textarea, select, [role="combobox"], button[data-state]');
          if (!input) continue;
          
          let value = this.extractInputValue(input);
          
          if (value !== null && value !== '') {
            // Anonymize if needed
            if (anonymizePatterns.test(fieldName) && typeof value === 'string') {
              if (fieldName.toLowerCase().includes('email') && value.includes('@')) {
              const [local, domain] = value.split('@');
              value = local.charAt(0) + '***@' + domain;
            } else {
              value = '***' + value.slice(-4);
              }
            }
            formData[fieldName] = value;
          }
        }
        
        // === STRATEGY 2: Direct input collection ===
        // Find all input elements within the scope
        const inputs = scope.querySelectorAll('input, textarea, select, [role="combobox"], [role="listbox"], [contenteditable="true"]');
        
        for (const el of inputs) {
          // Get field identifier - prefer label, then name, then id, then placeholder
          let fieldName = this.getFieldLabel(el, scope) || el.name || el.id || el.placeholder;
          
          // Skip if no identifier
          if (!fieldName) continue;
          
          // Clean up field name - make it a clean key
          fieldName = this.cleanFieldName(fieldName);
          
          // Skip if already captured, buttons, hidden inputs, or sensitive
          if (formData[fieldName]) continue;
          if (el.type === 'submit' || el.type === 'button' || el.type === 'hidden') continue;
          if (sensitivePatterns.test(fieldName)) continue;
          
          let value = this.extractInputValue(el);
          
          if (value !== null && value !== '' && value !== undefined) {
            // Anonymize if needed
            if (anonymizePatterns.test(fieldName) && typeof value === 'string') {
              if (fieldName.toLowerCase().includes('email') && value.includes('@')) {
                const [local, domain] = value.split('@');
                value = local.charAt(0) + '***@' + domain;
              } else {
                value = '***' + value.slice(-4);
              }
            }
          // Truncate long values
            if (typeof value === 'string' && value.length > 200) {
              value = value.slice(0, 200) + '...';
            }
            formData[fieldName] = value;
          }
        }
        
        // === STRATEGY 3: Radix UI Select triggers ===
        const selectTriggers = scope.querySelectorAll('[data-radix-select-trigger], button[role="combobox"], button[data-state]');
        for (const trigger of selectTriggers) {
          const label = this.getFieldLabel(trigger, scope);
          if (!label) continue;
          
          const fieldName = this.cleanFieldName(label);
          if (formData[fieldName] || sensitivePatterns.test(fieldName)) continue;
          
          // Get the displayed value from the trigger
          const valueSpan = trigger.querySelector('[data-radix-select-value], span:not([class*="icon"])') || trigger;
          let value = valueSpan?.textContent?.trim();
          
          // Skip placeholder values
          if (value && !['Select...', 'Choose...', 'Select', 'Choose', 'בחר', 'בחר...'].includes(value)) {
            formData[fieldName] = value;
          }
        }
        
        // === STRATEGY 4: Date picker inputs ===
        const datePickers = scope.querySelectorAll('input[type="date"], input[type="datetime-local"], [data-radix-calendar], button[class*="date"], button[class*="Date"], [class*="datepicker"], [class*="DatePicker"]');
        for (const picker of datePickers) {
          const label = this.getFieldLabel(picker, scope);
          if (!label) continue;
          
          const fieldName = this.cleanFieldName(label);
          if (formData[fieldName]) continue;
          
          let value = picker.value || picker.textContent?.trim();
          if (value && value.length > 0) {
            formData[fieldName] = value;
          }
        }
        
      } catch (e) {
        // Silent fail - return whatever we captured
      }
      
      return Object.keys(formData).length > 0 ? formData : null;
    }
    
    // Extract value from various input types
    extractInputValue(el) {
      if (!el) return null;
      
      // Checkbox
      if (el.type === 'checkbox') {
        return el.checked;
      }
      
      // Radio - only return if checked
      if (el.type === 'radio') {
        return el.checked ? el.value : null;
      }
      
      // Native select
      if (el.tagName === 'SELECT') {
        const selected = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
        return selected ? (selected.text || selected.value) : null;
      }
      
      // Radix UI combobox/select trigger
      if (el.getAttribute('role') === 'combobox' || el.hasAttribute('data-state')) {
        const valueSpan = el.querySelector('[data-radix-select-value], span') || el;
        const value = valueSpan?.textContent?.trim();
        if (value && !['Select...', 'Choose...', 'Select', 'Choose', 'בחר'].includes(value)) {
          return value;
        }
        return null;
      }
      
      // Contenteditable
      if (el.getAttribute('contenteditable') === 'true') {
        return el.textContent?.trim() || null;
      }
      
      // Standard input/textarea
      if (el.value !== undefined && el.value !== '') {
        return el.value;
      }
      
      // Button with displayed value (for custom selects)
      if (el.tagName === 'BUTTON') {
        const text = el.textContent?.trim();
        if (text && text.length < 100) {
          return text;
        }
      }
      
      return null;
    }

    // Get the label text for a form field
    getFieldLabel(element, scope) {
      // 1. Try associated label via for attribute
      if (element.id) {
        const label = scope.querySelector(`label[for="${element.id}"]`);
        if (label) return label.textContent?.trim();
      }
      
      // 2. Try parent label
      const parentLabel = element.closest('label');
      if (parentLabel) {
        // Get label text without the input's value
        const clone = parentLabel.cloneNode(true);
        const inputs = clone.querySelectorAll('input, textarea, select');
        inputs.forEach(i => i.remove());
        return clone.textContent?.trim();
      }
      
      // 3. Look in wrapper containers (common in Radix UI / shadcn forms)
      // Structure: <div class="space-y-2"><Label>Title</Label><Input/></div>
      let wrapper = element.parentElement;
      for (let depth = 0; depth < 3 && wrapper && wrapper !== scope; depth++) {
        // Look for label element in this wrapper
        const labelInWrapper = wrapper.querySelector('label, [class*="Label"]:not(input):not(textarea):not(select):not(button)');
        if (labelInWrapper && !labelInWrapper.contains(element)) {
          const text = labelInWrapper.textContent?.trim();
          if (text && text.length > 0 && text.length < 50) {
            return text;
          }
        }
        
        // Also check for text node or span before the input
        const children = Array.from(wrapper.children);
        const elIndex = children.findIndex(c => c === element || c.contains(element));
        for (let i = 0; i < elIndex; i++) {
          const child = children[i];
          if (child.tagName === 'LABEL' || child.tagName === 'SPAN' || 
              (child.className && (child.className.toString().includes('label') || child.className.toString().includes('Label')))) {
            const text = child.textContent?.trim();
            if (text && text.length > 0 && text.length < 50) {
              return text;
            }
          }
        }
        
        wrapper = wrapper.parentElement;
      }
      
      // 4. Look for label-like element before the input (common in forms)
      const parent = element.parentElement;
      if (parent) {
        const prevSibling = element.previousElementSibling;
        if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.classList?.contains('label'))) {
          return prevSibling.textContent?.trim();
        }
        
        // Look for label in parent's children before this element
        const siblings = Array.from(parent.children);
        const elIndex = siblings.indexOf(element);
        for (let i = elIndex - 1; i >= 0; i--) {
          const sib = siblings[i];
          if (sib.tagName === 'LABEL' || sib.classList?.contains('label') || sib.tagName === 'SPAN') {
            const text = sib.textContent?.trim();
            if (text && text.length < 50) return text;
          }
        }
      }
      
      // 5. Try aria-label or aria-labelledby
      if (element.getAttribute('aria-label')) {
        return element.getAttribute('aria-label');
      }
      if (element.getAttribute('aria-labelledby')) {
        const labelEl = scope.querySelector(`#${element.getAttribute('aria-labelledby')}`);
        if (labelEl) return labelEl.textContent?.trim();
      }
      
      // 6. Try name attribute (often semantic)
      if (element.name) {
        // Convert camelCase/snake_case to readable: 'projectName' -> 'Project Name'
        return element.name
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .trim()
          .replace(/^./, c => c.toUpperCase());
      }
      
      // 7. Try placeholder as last resort
      if (element.placeholder) {
        return element.placeholder;
      }
      
      return null;
    }

    // Clean up field name to be a valid key
    cleanFieldName(name) {
      if (!name) return '';
      
      // Remove required indicator (*) and trim
      name = name.replace(/\*$/, '').trim();
      
      // Remove colon at end
      name = name.replace(/:$/, '').trim();
      
      // Replace spaces with underscores for cleaner keys (optional - can keep spaces)
      // name = name.replace(/\s+/g, '_').toLowerCase();
      
      return name;
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
      const role = element.getAttribute('role');
      if (role === 'menuitem' || role === 'menuitemcheckbox' || role === 'menuitemradio') return 'menu_item';
      if (role === 'option') return 'dropdown_option';
      if (role === 'tab') return 'tab';
      if (element.querySelector('svg') || (element.className && element.className.toString().includes('icon'))) return 'icon';
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
          console.error('[demo-test-apps-2026-01-22-mnhctas3am] Analytics flush failed:', response.status);
          // Re-add to queue and persist on failure
        this.eventQueue.unshift(...batch);
          this.saveQueueToStorage();
        }
      })
      .catch(err => {
        console.error('[demo-test-apps-2026-01-22-mnhctas3am] Analytics flush error:', err);
        // Re-add to queue and persist on failure
        this.eventQueue.unshift(...batch);
        this.saveQueueToStorage();
      });
    }
  }

  // Auto-initialize
  if (typeof window !== 'undefined' && !window.analytics) {
    window.analytics = new AnalyticsTracker();
    console.log('[demo-test-apps-2026-01-22-mnhctas3am] ✅ AI-Enhanced Analytics tracker with new event schema initialized');
  }

  return AnalyticsTracker;
}));