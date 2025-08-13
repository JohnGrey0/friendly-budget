/**
 * Modern Responsive Family Budget Tool
 * Built with Bootstrap 5.3.0 for seamless device experience
 * Author: Budget Tool Team
 * Version: 2.0.0
 */

class ResponsiveBudgetTool {
    constructor() {
        // Data Storage
        this.people = [];
        this.expenses = [];
        this.settings = {
            globalSharingMethod: 'percentage',
            customPercentages: {}, // Will store person.id -> percentage mappings
            emergencyFundTarget: 0,
            emergencyFundTargetMonths: 6,
            theme: 'light',
            analyticsPeriod: 'monthly'
        };

        // UI State
        this.activeTab = 'people';
        this.editingPerson = null;
        this.editingExpense = null;
        this.charts = {};

        // Initialize the application
        this.init();
    }

    /**
     * Initialize the budget tool
     */
    async init() {
        try {
            this.loadData();
            this.initializeTheme();
            
            // Wait for DOM to be fully ready before setting up tabs
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Wait a bit more for Bootstrap to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
            
            this.setupEventListeners();
            this.restoreActiveTab();
            // Initialize pay label
            this.updatePayLabel();
            // Render after restoring active tab to ensure proper initialization
            this.render();
            this.showToast('Budget tool loaded successfully!', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Error loading budget tool', 'error');
        }
    }

    /**
     * Restore the active tab from localStorage
     */
    restoreActiveTab() {
        try {
            // Activate the saved tab
            const tabElement = document.getElementById(`${this.activeTab}-tab`);
            if (tabElement && bootstrap && bootstrap.Tab) {
                console.log('Attempting to restore tab:', this.activeTab);
                const tab = new bootstrap.Tab(tabElement);
                tab.show();
                console.log('Tab restored successfully');
            } else {
                console.log('Bootstrap not ready or tab element not found, using default tab');
                // Fallback to default tab if Bootstrap isn't ready
                this.activeTab = 'people';
            }
        } catch (error) {
            console.error('Error restoring tab:', error);
            // Fallback to default tab
            this.activeTab = 'people';
        }
    }

    /**
     * Load data from localStorage
     */
    loadData() {
        try {
            const savedPeople = localStorage.getItem('budgetPeople');
            const savedExpenses = localStorage.getItem('budgetExpenses');
            const savedSettings = localStorage.getItem('budgetSettings');
            const savedActiveTab = localStorage.getItem('budgetActiveTab');

            if (savedPeople) {
                this.people = JSON.parse(savedPeople);
            }

            if (savedExpenses) {
                this.expenses = JSON.parse(savedExpenses);
            }

            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }

            if (savedActiveTab) {
                this.activeTab = savedActiveTab;
            }

            // Migrate old data if necessary
            this.migrateData();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error loading saved data', 'warning');
        }
    }

    /**
     * Save data to localStorage
     */
    saveData() {
        try {
            localStorage.setItem('budgetPeople', JSON.stringify(this.people));
            localStorage.setItem('budgetExpenses', JSON.stringify(this.expenses));
            localStorage.setItem('budgetSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving data:', error);
            this.showToast('Error saving data', 'error');
        }
    }

    /**
     * Migrate old data structure to new format
     */
    migrateData() {
        // Ensure all people have required fields
        this.people = this.people.map(person => {
            const migrated = {
                id: person.id || Date.now() + Math.random(),
                name: person.name || 'Unknown',
                biWeeklyPay: parseFloat(person.biWeeklyPay) || 0,
                payPeriods: parseInt(person.payPeriods) || 26,
                customSplits: person.customSplits || {},
                ...person
            };
            
            // Migrate to payPerPeriod field if it doesn't exist
            if (!migrated.hasOwnProperty('payPerPeriod')) {
                migrated.payPerPeriod = migrated.biWeeklyPay;
            }
            
            return migrated;
        });

        // Ensure all expenses have required fields
        this.expenses = this.expenses.map(expense => ({
            id: expense.id || Date.now() + Math.random(),
            name: expense.name || 'Unknown Expense',
            monthlyAmount: parseFloat(expense.monthlyAmount) || 0,
            category: expense.category || 'other',
            subCategory: expense.subCategory || '',
            sharingMethod: expense.sharingMethod || this.settings.globalSharingMethod,
            customSplits: expense.customSplits || {},
            ...expense
        }));

        this.saveData();
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Navigation actions
        document.getElementById('shareBtn').addEventListener('click', () => this.shareBudget());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToPDF());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.confirmClearAll());

        // Tab navigation with manual fallback
        const tabButtons = document.querySelectorAll('[data-bs-toggle="pill"]');
        console.log('Found tab buttons:', tabButtons.length);
        tabButtons.forEach(button => {
            // Add both Bootstrap event and manual click handler
            button.addEventListener('shown.bs.tab', (e) => {
                try {
                    console.log('Bootstrap tab shown event fired for:', e.target.getAttribute('data-bs-target'));
                    this.activeTab = e.target.getAttribute('data-bs-target').replace('#', '').replace('-panel', '');
                    console.log('Active tab set to:', this.activeTab);
                    this.onTabChange();
                } catch (error) {
                    console.error('Error in Bootstrap tab change handler:', error);
                }
            });
            
            // Manual click handler as fallback
            button.addEventListener('click', (e) => {
                try {
                    console.log('Manual click on tab:', e.target.getAttribute('data-bs-target'));
                    const targetPanel = e.target.getAttribute('data-bs-target');
                    if (targetPanel) {
                        // Hide all panels
                        document.querySelectorAll('.tab-pane').forEach(panel => {
                            panel.classList.remove('show', 'active');
                        });
                        
                        // Show target panel
                        const panel = document.querySelector(targetPanel);
                        if (panel) {
                            panel.classList.add('show', 'active');
                            console.log('Manually activated panel:', targetPanel);
                        }
                        
                        // Update active tab
                        this.activeTab = targetPanel.replace('#', '').replace('-panel', '');
                        console.log('Manual tab change to:', this.activeTab);
                        
                        // Update button states
                        document.querySelectorAll('[data-bs-toggle="pill"]').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        e.target.classList.add('active');
                        
                        // Trigger content update
                        setTimeout(() => this.onTabChange(), 50);
                    }
                } catch (error) {
                    console.error('Error in manual tab change handler:', error);
                }
            });
        });

        // People form
        document.getElementById('addPersonForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPerson();
        });

        // Expense form
        document.getElementById('addExpenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        // Global settings
        document.querySelectorAll('input[name="sharingMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.settings.globalSharingMethod = e.target.value;
                
                // Show/hide custom split section
                const customSplitSection = document.getElementById('customSplitSection');
                if (e.target.value === 'custom') {
                    customSplitSection.style.display = 'block';
                    this.initializeCustomPercentages();
                    this.renderCustomSplitSliders();
                } else {
                    customSplitSection.style.display = 'none';
                }
                
                // Update all existing expenses to use the new sharing method
                this.expenses.forEach(expense => {
                    expense.sharingMethod = this.settings.globalSharingMethod;
                });
                
                this.saveData();
                this.render();
                
                if (this.expenses.length > 0) {
                    this.showToast(`Updated ${this.expenses.length} expenses to use ${this.getSharingMethodLabel(e.target.value)}`, 'success');
                } else {
                    this.showToast('Sharing method updated', 'success');
                }
            });
        });

        // Emergency fund settings
        document.getElementById('emergencyFund').addEventListener('input', (e) => {
            this.settings.emergencyFundTarget = parseFloat(e.target.value) || 0;
            this.saveData();
            this.renderAnalytics();
        });

        document.getElementById('emergencyMonths').addEventListener('input', (e) => {
            this.settings.emergencyFundTargetMonths = parseInt(e.target.value);
            document.getElementById('emergencyMonthsDisplay').textContent = `${e.target.value} months`;
            this.saveData();
            this.renderAnalytics();
        });

        // Clear expenses button
        document.getElementById('clearExpensesBtn').addEventListener('click', () => this.confirmClearExpenses());

        // Window resize handling
        window.addEventListener('resize', this.debounce(() => this.onResize(), 250));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    /**
     * Handle tab changes
     */
    onTabChange() {
        // Save the active tab to localStorage
        localStorage.setItem('budgetActiveTab', this.activeTab);
        
        switch (this.activeTab) {
            case 'people':
                this.renderPeople();
                break;
            case 'expenses':
                this.renderExpenses();
                break;
            case 'summary':
                this.renderSummary();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
        }
    }

    /**
     * Handle window resize
     */
    onResize() {
        // Redraw charts if they exist
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + 1-4 for tab navigation
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const tabIndex = parseInt(e.key) - 1;
            const tabs = ['people', 'expenses', 'summary', 'analytics'];
            const targetTab = tabs[tabIndex];
            if (targetTab) {
                document.getElementById(`${targetTab}-tab`).click();
            }
        }

        // Escape to cancel editing
        if (e.key === 'Escape') {
            this.cancelEditing();
        }
    }

    /**
     * Render all components
     */
    render() {
        this.renderPeople();
        this.renderExpenses();
        this.updateCounts();
        this.updateGlobalSettings();
        
        // Only re-render current active tab content if it's summary or analytics
        // and only if the tab is actually visible
        if (this.activeTab === 'summary') {
            const summaryPanel = document.getElementById('summary-panel');
            if (summaryPanel && summaryPanel.classList.contains('active')) {
                this.renderSummary();
            }
        } else if (this.activeTab === 'analytics') {
            const analyticsPanel = document.getElementById('analytics-panel');
            if (analyticsPanel && analyticsPanel.classList.contains('active')) {
                this.renderAnalytics();
            }
        }
    }

    /**
     * Update global settings UI
     */
    updateGlobalSettings() {
        // Update sharing method radio buttons
        const sharingMethodRadio = document.querySelector(`input[name="sharingMethod"][value="${this.settings.globalSharingMethod}"]`);
        if (sharingMethodRadio) {
            sharingMethodRadio.checked = true;
        }

        // Show/hide custom split section
        const customSplitSection = document.getElementById('customSplitSection');
        if (customSplitSection) {
            if (this.settings.globalSharingMethod === 'custom') {
                customSplitSection.style.display = 'block';
                this.initializeCustomPercentages();
                this.renderCustomSplitSliders();
            } else {
                customSplitSection.style.display = 'none';
            }
        }

        // Update expense form sharing method dropdown
        const expenseSharingDropdown = document.getElementById('expenseSharingMethod');
        if (expenseSharingDropdown) {
            expenseSharingDropdown.value = this.settings.globalSharingMethod;
        }

        // Update emergency fund values
        const emergencyFundInput = document.getElementById('emergencyFund');
        if (emergencyFundInput) {
            emergencyFundInput.value = this.settings.emergencyFundTarget;
        }

        const emergencyMonthsInput = document.getElementById('emergencyMonths');
        const emergencyMonthsDisplay = document.getElementById('emergencyMonthsDisplay');
        if (emergencyMonthsInput && emergencyMonthsDisplay) {
            emergencyMonthsInput.value = this.settings.emergencyFundTargetMonths;
            emergencyMonthsDisplay.textContent = `${this.settings.emergencyFundTargetMonths} months`;
        }
    }

    /**
     * Update count badges
     */
    updateCounts() {
        document.getElementById('peopleCount').textContent = this.people.length;
        document.getElementById('expenseCount').textContent = this.expenses.length;
    }

    // ==========================================================================
    // PEOPLE MANAGEMENT
    // ==========================================================================

    /**
     * Update pay amount label based on selected pay period
     */
    updatePayLabel() {
        const payPeriods = parseInt(document.getElementById('payPeriods').value);
        const label = document.getElementById('payAmountLabel');
        const help = document.getElementById('payAmountHelp');
        
        const scheduleLabels = {
            52: { label: 'Weekly Pay Amount *', help: 'Enter your weekly pay amount' },
            26: { label: 'Bi-weekly Pay Amount *', help: 'Enter your bi-weekly pay amount' },
            24: { label: 'Semi-monthly Pay Amount *', help: 'Enter your semi-monthly pay amount' },
            12: { label: 'Monthly Pay Amount *', help: 'Enter your monthly pay amount' }
        };
        
        const scheduleInfo = scheduleLabels[payPeriods] || scheduleLabels[26];
        label.textContent = scheduleInfo.label;
        help.textContent = scheduleInfo.help;
    }

    /**
     * Add a new person
     */
    addPerson() {
        const name = document.getElementById('personName').value.trim();
        const payPerPeriod = parseFloat(document.getElementById('biWeeklyPay').value) || 0;
        const payPeriods = parseInt(document.getElementById('payPeriods').value) || 26;

        // Validation
        if (!name) {
            this.showToast('Please enter a name', 'error');
            document.getElementById('personName').focus();
            return;
        }

        if (payPerPeriod <= 0) {
            this.showToast('Please enter a valid pay amount', 'error');
            document.getElementById('biWeeklyPay').focus();
            return;
        }

        // Check for duplicate names
        if (this.people.some(person => person.name.toLowerCase() === name.toLowerCase())) {
            this.showToast('A person with this name already exists', 'error');
            document.getElementById('personName').focus();
            return;
        }

        // Create new person - store actual pay per period, not "biWeeklyPay"
        const person = {
            id: Date.now() + Math.random(),
            name,
            payPerPeriod,  // Actual amount per pay period
            payPeriods,    // Number of periods per year
            customSplits: {},
            // Keep biWeeklyPay for backward compatibility, but calculate it properly
            biWeeklyPay: payPerPeriod
        };

        this.people.push(person);
        
        // Reinitialize custom percentages if using custom sharing method
        if (this.settings.globalSharingMethod === 'custom') {
            this.initializeCustomPercentages();
        }
        
        this.saveData();
        this.render();

        // Clear form
        document.getElementById('addPersonForm').reset();
        document.getElementById('personName').focus();

        this.showToast(`${name} added successfully!`, 'success');
    }

    /**
     * Remove a person
     */
    removePerson(id) {
        const person = this.people.find(p => p.id === id);
        if (!person) return;

        this.showConfirm(
            `Remove ${person.name}?`,
            `Are you sure you want to remove ${person.name} from your budget?`,
            () => {
                this.people = this.people.filter(p => p.id !== id);
                
                // Remove from custom percentages and reinitialize if using custom sharing method
                if (this.settings.customPercentages) {
                    delete this.settings.customPercentages[id];
                }
                if (this.settings.globalSharingMethod === 'custom' && this.people.length > 1) {
                    this.initializeCustomPercentages();
                }
                
                this.saveData();
                this.render();
                this.showToast(`${person.name} removed`, 'info');
            }
        );
    }

    /**
     * Start editing a person inline
     */
    editPerson(id, field) {
        // Prevent event bubbling
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        const person = this.people.find(p => p.id === id);
        if (!person) return;

        // Find the element that was clicked
        const element = event.target;
        
        // Don't edit if already editing
        if (element.querySelector('input, select')) {
            return;
        }
        
        const originalValue = person[field];
        const originalContent = element.innerHTML;
        
        // Create appropriate input based on field type
        let input;
        
        if (field === 'payPeriods') {
            input = document.createElement('select');
            input.className = 'form-select form-select-sm inline-edit';
            input.innerHTML = `
                <option value="52" ${person.payPeriods === 52 ? 'selected' : ''}>Weekly (52/year)</option>
                <option value="26" ${person.payPeriods === 26 ? 'selected' : ''}>Bi-weekly (26/year)</option>
                <option value="24" ${person.payPeriods === 24 ? 'selected' : ''}>Semi-monthly (24/year)</option>
                <option value="12" ${person.payPeriods === 12 ? 'selected' : ''}>Monthly (12/year)</option>
            `;
        } else if (field === 'biWeeklyPay') {
            input = document.createElement('input');
            input.type = 'number';
            input.step = '0.01';
            input.min = '0';
            input.className = 'form-control form-control-sm inline-edit';
            input.value = originalValue;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control form-control-sm inline-edit';
            input.value = originalValue || '';
        }

        // Replace element content with input
        element.innerHTML = '';
        element.appendChild(input);
        
        // Style the input to exactly match the div.fw-bold appearance in side-by-side layout
        input.style.width = '100%';
        input.style.textAlign = 'right';
        input.style.fontWeight = 'bold';
        input.style.background = 'transparent';
        input.style.border = 'none';
        input.style.borderRadius = '0';
        input.style.padding = '0';
        input.style.margin = '0';
        input.style.height = 'auto';
        input.style.lineHeight = 'inherit';
        input.style.fontSize = 'inherit';
        input.style.outline = 'none';
        input.style.boxSizing = 'border-box';
        
        // Focus the input
        setTimeout(() => {
            input.focus();
            if (input.type === 'text' || input.type === 'number') {
                input.select();
            }
        }, 10);

        // Handle save
        const saveEdit = () => {
            const newValue = input.value.trim();
            
            // Validate
            if (field === 'biWeeklyPay') {
                const numValue = parseFloat(newValue);
                if (isNaN(numValue) || numValue < 0) {
                    this.showToast('Please enter a valid pay amount', 'error');
                    input.focus();
                    return;
                }
                person[field] = numValue;
            } else if (field === 'payPeriods') {
                person[field] = parseInt(newValue);
            } else if (field === 'name' && !newValue) {
                this.showToast('Name cannot be empty', 'error');
                input.focus();
                return;
            } else {
                person[field] = newValue;
            }

            // Save and re-render
            this.saveData();
            this.render();
            this.showToast('Person updated', 'success');
        };

        // Handle cancel
        const cancelEdit = () => {
            element.innerHTML = originalContent;
        };

        // Event listeners
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });

        // For select elements, save on change or blur
        if (input.tagName === 'SELECT') {
            input.addEventListener('change', (e) => {
                e.stopPropagation();
                saveEdit();
            });
            input.addEventListener('blur', (e) => {
                // Small delay to allow for other events
                setTimeout(saveEdit, 100);
            });
        } else {
            input.addEventListener('blur', (e) => {
                // Small delay to allow for other events
                setTimeout(saveEdit, 100);
            });
        }

        // Prevent clicks on the input from bubbling up
        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Render people list
     */
    renderPeople() {
        const peopleContainer = document.getElementById('peopleList');
        const overviewContainer = document.getElementById('householdOverview');
        
        if (this.people.length === 0) {
            overviewContainer.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-house-heart"></i>
                    <h3>No household data yet</h3>
                    <p>Add household members to see overview statistics.</p>
                </div>
            `;
            peopleContainer.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-people"></i>
                    <h3>No household members yet</h3>
                    <p>Add your first household member using the form above to get started with your budget planning.</p>
                </div>
            `;
            return;
        }

        // Calculate total household income for percentage calculations
        const totalHouseholdIncome = this.people.reduce((sum, person) => {
            return sum + (this.calculatePersonAnnualIncome(person) / 12);
        }, 0);

        const totalHouseholdExpenses = this.expenses.reduce((sum, expense) => {
            return sum + expense.monthlyAmount;
        }, 0);

        // Color gradients for different users
        const colorGradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
        ];

        // Render household overview
        if (this.people.length >= 1) {
            const householdTakeHome = totalHouseholdIncome - totalHouseholdExpenses;
            // Use proper savings calculation that includes savings categories and excess funds
            const totalHouseholdSavings = this.calculateTotalSavings(totalHouseholdIncome, totalHouseholdExpenses);
            const householdSavingsRate = totalHouseholdIncome > 0 ? 
                Math.round((totalHouseholdSavings / totalHouseholdIncome) * 100) : 0;

            overviewContainer.innerHTML = `
                <div class="card-body">
                    <div class="row text-center">
                        <div class="col-6 col-lg-3 mb-3">
                            <div class="fw-bold fs-4 text-primary">$${this.formatNumber(totalHouseholdIncome)}</div>
                            <small class="text-muted">Monthly Income</small>
                        </div>
                        <div class="col-6 col-lg-3 mb-3">
                            <div class="fw-bold fs-4 text-warning">$${this.formatNumber(totalHouseholdExpenses)}</div>
                            <small class="text-muted">Monthly Expenses</small>
                        </div>
                        <div class="col-6 col-lg-3 mb-3">
                            <div class="fw-bold fs-4 ${householdTakeHome >= 0 ? 'text-success' : 'text-danger'}">
                                $${this.formatNumber(Math.abs(householdTakeHome))}
                            </div>
                            <small class="text-muted">${householdTakeHome >= 0 ? 'Remainder' : 'Deficit'}</small>
                        </div>
                        <div class="col-6 col-lg-3 mb-3">
                            <div class="fw-bold fs-4 text-info">${householdSavingsRate}%</div>
                            <small class="text-muted">Savings Rate</small>
                        </div>
                    </div>
                    <div class="mt-3">
                        <div class="d-flex justify-content-between mb-1">
                            <small class="text-muted">Household Financial Health</small>
                            <small class="text-muted">${householdSavingsRate}%</small>
                        </div>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar bg-info" style="width: ${Math.min(100, Math.max(0, householdSavingsRate))}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Render individual household members
        peopleContainer.innerHTML = `
            <div class="row g-2 p-3">
                ${this.people.map((person, index) => {
                    const income = this.calculatePersonIncome(person);
                    const contributionPercentage = totalHouseholdIncome > 0 ? 
                        Math.round((income.monthly / totalHouseholdIncome) * 100) : 0;
                    
                    // Get unique color gradient for this person
                    const personGradient = colorGradients[index % colorGradients.length];

                    return `
                        <div class="col-12 col-sm-6 col-lg-6">
                            <div class="person-card-compact p-3 rounded" style="background: ${personGradient}; color: white;">
                                <!-- Person Header -->
                                <div class="d-flex align-items-center mb-3">
                                    <div class="person-avatar-small me-2" style="background: rgba(255,255,255,0.2); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                                        ${person.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div class="flex-grow-1">
                                        <div class="fw-bold editable" onclick="budgetTool.editPerson(${person.id}, 'name')" title="Click to edit name">${this.escapeHtml(person.name)}</div>
                                        <small class="opacity-75">${contributionPercentage}% of household</small>
                                    </div>
                                    <button class="btn btn-outline-light btn-sm py-0 px-1" onclick="budgetTool.removePerson(${person.id})" title="Remove">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                                
                                <!-- Income Grid -->
                                <div class="row g-2 text-center">
                                    <div class="col-6">
                                        <div class="p-2 rounded d-flex flex-column justify-content-center" style="background: rgba(255,255,255,0.15); min-height: 60px;">
                                            <div class="small opacity-75">${this.getPayPeriodLabel(person.payPeriods)}</div>
                                            <div class="fw-bold editable" onclick="budgetTool.editPerson(${person.id}, 'biWeeklyPay')" title="Click to edit pay">$${this.formatNumber(income.payPeriod)}</div>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="p-2 rounded d-flex flex-column justify-content-center" style="background: rgba(255,255,255,0.15); min-height: 60px;">
                                            <div class="small opacity-75">Monthly</div>
                                            <input type="text" class="form-control fw-bold text-center" value="$${this.formatNumber(income.monthly)}" readonly style="background: transparent; border: none; color: inherit; pointer-events: none;">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pay Periods Info -->
                                <div class="mt-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.2);">
                                    <div class="row g-2 text-center">
                                        <div class="col-6">
                                            <div class="p-2 rounded d-flex flex-column justify-content-center" style="background: rgba(255,255,255,0.15); min-height: 60px;">
                                                <div class="small opacity-75">Pay Periods</div>
                                                <div class="fw-bold editable" onclick="budgetTool.editPerson(${person.id}, 'payPeriods')" title="Click to edit">${person.payPeriods}</div>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="p-2 rounded d-flex flex-column justify-content-center" style="background: rgba(255,255,255,0.15); min-height: 60px;">
                                                <div class="small opacity-75">Yearly</div>
                                                <input type="text" class="form-control fw-bold text-center" value="$${this.formatNumber(income.yearly)}" readonly style="background: transparent; border: none; color: inherit; pointer-events: none;">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // ==========================================================================
    // EXPENSE MANAGEMENT
    // ==========================================================================

    /**
     * Add a new expense
     */
    addExpense() {
        const name = document.getElementById('expenseName').value.trim();
        const monthlyAmount = parseFloat(document.getElementById('monthlyAmount').value) || 0;
        const category = document.getElementById('category').value;
        let subCategory = document.getElementById('subCategory').value;
        const sharingMethod = document.getElementById('expenseSharingMethod').value;

        // Handle custom subcategory
        if (subCategory === 'other') {
            const customSubCategory = document.getElementById('customSubCategory').value.trim();
            if (customSubCategory) {
                subCategory = customSubCategory;
            } else {
                this.showToast('Please enter a custom subcategory or select a different option', 'error');
                document.getElementById('customSubCategory').focus();
                return;
            }
        }

        // Validation
        if (!name) {
            this.showToast('Please enter an expense name', 'error');
            document.getElementById('expenseName').focus();
            return;
        }

        if (monthlyAmount <= 0) {
            this.showToast('Please enter a valid expense amount', 'error');
            document.getElementById('monthlyAmount').focus();
            return;
        }

        // Create new expense
        const expense = {
            id: Date.now() + Math.random(),
            name,
            monthlyAmount,
            category,
            subCategory,
            sharingMethod,
            customSplits: {}
        };

        this.expenses.push(expense);
        this.saveData();
        this.render();

        // Clear form
        document.getElementById('addExpenseForm').reset();
        
        // Hide custom subcategory field
        const customSubCategoryContainer = document.getElementById('customSubCategoryContainer');
        if (customSubCategoryContainer) {
            customSubCategoryContainer.classList.add('d-none');
        }
        
        document.getElementById('expenseName').focus();

        this.showToast(`${name} added successfully!`, 'success');
    }

    /**
     * Edit custom splits for an expense
     */
    editCustomSplits(expenseId) {
        const expense = this.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        // Create modal content for custom splits
        let modalHTML = `
            <div class="mb-3">
                <h6><strong>${this.escapeHtml(expense.name)}</strong> - Custom Splits</h6>
                <p class="text-muted small">Set individual amounts for each person. Total: $${this.formatNumber(expense.monthlyAmount)}/month</p>
            </div>
        `;

        this.people.forEach(person => {
            const currentAmount = expense.customSplits[person.id] || 0;
            modalHTML += `
                <div class="row mb-3 align-items-center">
                    <div class="col-6">
                        <label class="form-label mb-0">${this.escapeHtml(person.name)}</label>
                    </div>
                    <div class="col-6">
                        <div class="input-group">
                            <span class="input-group-text">$</span>
                            <input type="number" class="form-control" id="customSplit_${person.id}" 
                                   value="${currentAmount}" step="0.01" min="0" max="${expense.monthlyAmount}">
                        </div>
                    </div>
                </div>
            `;
        });

        modalHTML += `
            <div class="alert alert-info small mt-3">
                <strong>Tip:</strong> Amounts should add up to $${this.formatNumber(expense.monthlyAmount)}. Any difference will be automatically adjusted.
            </div>
        `;

        this.showConfirm(
            'Set Custom Splits',
            modalHTML,
            () => {
                // Save custom splits
                let totalAssigned = 0;
                this.people.forEach(person => {
                    const input = document.getElementById(`customSplit_${person.id}`);
                    const amount = parseFloat(input.value) || 0;
                    expense.customSplits[person.id] = amount;
                    totalAssigned += amount;
                });

                // Auto-adjust if totals don't match (assign difference to first person)
                const difference = expense.monthlyAmount - totalAssigned;
                if (Math.abs(difference) > 0.01 && this.people.length > 0) {
                    expense.customSplits[this.people[0].id] += difference;
                    this.showToast(`Adjusted ${this.people[0].name}'s amount by $${this.formatNumber(Math.abs(difference))} to balance total`, 'info');
                }

                this.saveData();
                this.render();
                this.showToast('Custom splits saved!', 'success');
            }
        );
    }

    /**
     * Remove an expense
     */
    removeExpense(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (!expense) return;

        this.showConfirm(
            `Remove ${expense.name}?`,
            `Are you sure you want to remove "${expense.name}" from your expenses?`,
            () => {
                this.expenses = this.expenses.filter(e => e.id !== id);
                this.saveData();
                this.render();
                this.showToast(`${expense.name} removed`, 'info');
            }
        );
    }

    /**
     * Start editing an expense inline
     */
    editExpense(id, field) {
        // Prevent event bubbling
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        const expense = this.expenses.find(e => e.id === id);
        if (!expense) return;

        // Find the element that was clicked
        const element = event.target;
        
        // Don't edit if already editing
        if (element.querySelector('input, select')) {
            return;
        }
        
        const originalValue = expense[field];
        const originalContent = element.innerHTML;
        
        // Create appropriate input based on field type
        let input;
        
        if (field === 'category') {
            input = document.createElement('select');
            input.className = 'form-select form-select-sm inline-edit';
            input.innerHTML = `
                <option value="bills" ${expense.category === 'bills' ? 'selected' : ''}>Bills</option>
                <option value="emergency" ${expense.category === 'emergency' ? 'selected' : ''}>Emergency</option>
                <option value="savings" ${expense.category === 'savings' ? 'selected' : ''}>Savings</option>
            `;
        } else if (field === 'subCategory') {
            input = document.createElement('select');
            input.className = 'form-select form-select-sm inline-edit';
            input.innerHTML = `
                <option value="">No subcategory</option>
                
                <!-- Housing & Home -->
                <option value="rent-mortgage" ${expense.subCategory === 'rent-mortgage' ? 'selected' : ''}>Rent/Mortgage</option>
                <option value="utilities-electric" ${expense.subCategory === 'utilities-electric' ? 'selected' : ''}>Utilities - Electric</option>
                <option value="utilities-gas" ${expense.subCategory === 'utilities-gas' ? 'selected' : ''}>Utilities - Gas</option>
                <option value="utilities-water" ${expense.subCategory === 'utilities-water' ? 'selected' : ''}>Utilities - Water/Sewer</option>
                <option value="utilities-internet" ${expense.subCategory === 'utilities-internet' ? 'selected' : ''}>Internet/Cable</option>
                <option value="utilities-phone" ${expense.subCategory === 'utilities-phone' ? 'selected' : ''}>Phone/Mobile</option>
                <option value="home-maintenance" ${expense.subCategory === 'home-maintenance' ? 'selected' : ''}>Home Maintenance</option>
                <option value="property-tax" ${expense.subCategory === 'property-tax' ? 'selected' : ''}>Property Tax</option>
                <option value="hoa-fees" ${expense.subCategory === 'hoa-fees' ? 'selected' : ''}>HOA Fees</option>
                
                <!-- Transportation -->
                <option value="car-payment" ${expense.subCategory === 'car-payment' ? 'selected' : ''}>Car Payment</option>
                <option value="gas-fuel" ${expense.subCategory === 'gas-fuel' ? 'selected' : ''}>Gas/Fuel</option>
                <option value="car-insurance" ${expense.subCategory === 'car-insurance' ? 'selected' : ''}>Auto Insurance</option>
                <option value="car-maintenance" ${expense.subCategory === 'car-maintenance' ? 'selected' : ''}>Car Maintenance</option>
                <option value="public-transport" ${expense.subCategory === 'public-transport' ? 'selected' : ''}>Public Transport</option>
                <option value="parking" ${expense.subCategory === 'parking' ? 'selected' : ''}>Parking</option>
                <option value="rideshare" ${expense.subCategory === 'rideshare' ? 'selected' : ''}>Rideshare/Taxi</option>
                
                <!-- Food & Dining -->
                <option value="groceries" ${expense.subCategory === 'groceries' ? 'selected' : ''}>Groceries</option>
                <option value="dining-out" ${expense.subCategory === 'dining-out' ? 'selected' : ''}>Dining Out</option>
                <option value="fast-food" ${expense.subCategory === 'fast-food' ? 'selected' : ''}>Fast Food</option>
                <option value="coffee-drinks" ${expense.subCategory === 'coffee-drinks' ? 'selected' : ''}>Coffee/Drinks</option>
                <option value="meal-delivery" ${expense.subCategory === 'meal-delivery' ? 'selected' : ''}>Meal Delivery</option>
                
                <!-- Healthcare -->
                <option value="health-insurance" ${expense.subCategory === 'health-insurance' ? 'selected' : ''}>Health Insurance</option>
                <option value="dental-vision" ${expense.subCategory === 'dental-vision' ? 'selected' : ''}>Dental/Vision</option>
                <option value="prescriptions" ${expense.subCategory === 'prescriptions' ? 'selected' : ''}>Prescriptions</option>
                <option value="doctor-visits" ${expense.subCategory === 'doctor-visits' ? 'selected' : ''}>Doctor Visits</option>
                <option value="mental-health" ${expense.subCategory === 'mental-health' ? 'selected' : ''}>Mental Health</option>
                
                <!-- Insurance -->
                <option value="life-insurance" ${expense.subCategory === 'life-insurance' ? 'selected' : ''}>Life Insurance</option>
                <option value="disability-insurance" ${expense.subCategory === 'disability-insurance' ? 'selected' : ''}>Disability Insurance</option>
                <option value="home-insurance" ${expense.subCategory === 'home-insurance' ? 'selected' : ''}>Home/Renters Insurance</option>
                
                <!-- Debt & Finance -->
                <option value="credit-cards" ${expense.subCategory === 'credit-cards' ? 'selected' : ''}>Credit Card Payments</option>
                <option value="student-loans" ${expense.subCategory === 'student-loans' ? 'selected' : ''}>Student Loans</option>
                <option value="personal-loans" ${expense.subCategory === 'personal-loans' ? 'selected' : ''}>Personal Loans</option>
                <option value="business-loans" ${expense.subCategory === 'business-loans' ? 'selected' : ''}>Business Loans</option>
                
                <!-- Savings & Investment -->
                <option value="emergency-fund" ${expense.subCategory === 'emergency-fund' ? 'selected' : ''}>Emergency Fund</option>
                <option value="retirement-401k" ${expense.subCategory === 'retirement-401k' ? 'selected' : ''}>401k/403b</option>
                <option value="retirement-ira" ${expense.subCategory === 'retirement-ira' ? 'selected' : ''}>IRA</option>
                <option value="stocks-bonds" ${expense.subCategory === 'stocks-bonds' ? 'selected' : ''}>Stocks/Bonds</option>
                <option value="savings-goals" ${expense.subCategory === 'savings-goals' ? 'selected' : ''}>Savings Goals</option>
                
                <!-- Entertainment & Lifestyle -->
                <option value="streaming-services" ${expense.subCategory === 'streaming-services' ? 'selected' : ''}>Streaming Services</option>
                <option value="gaming" ${expense.subCategory === 'gaming' ? 'selected' : ''}>Gaming</option>
                <option value="movies-events" ${expense.subCategory === 'movies-events' ? 'selected' : ''}>Movies/Events</option>
                <option value="hobbies" ${expense.subCategory === 'hobbies' ? 'selected' : ''}>Hobbies</option>
                <option value="gym-fitness" ${expense.subCategory === 'gym-fitness' ? 'selected' : ''}>Gym/Fitness</option>
                <option value="travel-vacation" ${expense.subCategory === 'travel-vacation' ? 'selected' : ''}>Travel/Vacation</option>
                
                <!-- Personal Care -->
                <option value="clothing" ${expense.subCategory === 'clothing' ? 'selected' : ''}>Clothing</option>
                <option value="haircare-beauty" ${expense.subCategory === 'haircare-beauty' ? 'selected' : ''}>Hair/Beauty</option>
                <option value="personal-items" ${expense.subCategory === 'personal-items' ? 'selected' : ''}>Personal Items</option>
                
                <!-- Family & Children -->
                <option value="childcare" ${expense.subCategory === 'childcare' ? 'selected' : ''}>Childcare</option>
                <option value="school-supplies" ${expense.subCategory === 'school-supplies' ? 'selected' : ''}>School Supplies</option>
                <option value="kids-activities" ${expense.subCategory === 'kids-activities' ? 'selected' : ''}>Kids Activities</option>
                <option value="baby-supplies" ${expense.subCategory === 'baby-supplies' ? 'selected' : ''}>Baby Supplies</option>
                
                <!-- Business & Education -->
                <option value="education-tuition" ${expense.subCategory === 'education-tuition' ? 'selected' : ''}>Tuition</option>
                <option value="books-supplies" ${expense.subCategory === 'books-supplies' ? 'selected' : ''}>Books/Supplies</option>
                <option value="professional-dev" ${expense.subCategory === 'professional-dev' ? 'selected' : ''}>Professional Development</option>
                <option value="business-expenses" ${expense.subCategory === 'business-expenses' ? 'selected' : ''}>Business Expenses</option>
                
                <!-- Miscellaneous -->
                <option value="gifts-donations" ${expense.subCategory === 'gifts-donations' ? 'selected' : ''}>Gifts/Donations</option>
                <option value="pet-expenses" ${expense.subCategory === 'pet-expenses' ? 'selected' : ''}>Pet Expenses</option>
                <option value="legal-fees" ${expense.subCategory === 'legal-fees' ? 'selected' : ''}>Legal Fees</option>
                <option value="other" ${expense.subCategory === 'other' ? 'selected' : ''}>Other</option>
            `;
            
            // Add custom subcategory option if current value is not in predefined list
            const predefinedSubcategories = [
                '', 'rent-mortgage', 'utilities-electric', 'utilities-gas', 'utilities-water', 'utilities-internet', 
                'utilities-phone', 'home-maintenance', 'property-tax', 'hoa-fees', 'car-payment', 'gas-fuel', 
                'car-insurance', 'car-maintenance', 'public-transport', 'parking', 'rideshare', 'groceries', 
                'dining-out', 'fast-food', 'coffee-drinks', 'meal-delivery', 'health-insurance', 'dental-vision', 
                'prescriptions', 'doctor-visits', 'mental-health', 'life-insurance', 'disability-insurance', 
                'home-insurance', 'credit-cards', 'student-loans', 'personal-loans', 'business-loans', 
                'emergency-fund', 'retirement-401k', 'retirement-ira', 'stocks-bonds', 'savings-goals', 
                'streaming-services', 'gaming', 'movies-events', 'hobbies', 'gym-fitness', 'travel-vacation', 
                'clothing', 'haircare-beauty', 'personal-items', 'childcare', 'school-supplies', 'kids-activities', 
                'baby-supplies', 'education-tuition', 'books-supplies', 'professional-dev', 'business-expenses', 
                'gifts-donations', 'pet-expenses', 'legal-fees', 'other'
            ];
            
            if (expense.subCategory && !predefinedSubcategories.includes(expense.subCategory)) {
                input.innerHTML += `<option value="${expense.subCategory}" selected>${expense.subCategory} (Custom)</option>`;
            }
        } else if (field === 'sharingMethod') {
            input = document.createElement('select');
            input.className = 'form-select form-select-sm inline-edit';
            input.innerHTML = `
                <option value="percentage" ${expense.sharingMethod === 'percentage' ? 'selected' : ''}>% Weighted</option>
                <option value="even" ${expense.sharingMethod === 'even' ? 'selected' : ''}>50/50 Split</option>
                <option value="custom" ${expense.sharingMethod === 'custom' ? 'selected' : ''}>Custom Split</option>
            `;
        } else if (field === 'monthlyAmount') {
            input = document.createElement('input');
            input.type = 'number';
            input.step = '0.01';
            input.min = '0';
            input.className = 'form-control form-control-sm inline-edit';
            input.value = originalValue;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control form-control-sm inline-edit';
            input.value = originalValue || '';
        }

        // Replace element content with input
        element.innerHTML = '';
        element.appendChild(input);
        element.style.padding = '0';
        
        // Focus the input
        setTimeout(() => {
            input.focus();
            if (input.type === 'text' || input.type === 'number') {
                input.select();
            }
        }, 10);

        // Handle save
        const saveEdit = () => {
            const newValue = input.value.trim();
            
            // Check if value actually changed
            if (newValue === originalValue || (originalValue === null && newValue === '') || (originalValue === undefined && newValue === '')) {
                // No change, just restore original content
                cancelEdit();
                return;
            }
            
            // Validate
            if (field === 'monthlyAmount') {
                const numValue = parseFloat(newValue);
                if (isNaN(numValue) || numValue < 0) {
                    this.showToast('Please enter a valid amount', 'error');
                    input.focus();
                    return;
                }
                expense[field] = numValue;
            } else if (field === 'name' && !newValue) {
                this.showToast('Expense name cannot be empty', 'error');
                input.focus();
                return;
            } else {
                expense[field] = newValue;
            }

            // Special handling for sharing method changes
            if (field === 'sharingMethod' && newValue === 'custom') {
                // Initialize custom splits if switching to custom
                if (!expense.customSplits) {
                    expense.customSplits = {};
                }
                // Initialize all people with equal split amounts
                const equalShare = expense.monthlyAmount / this.people.length;
                this.people.forEach(person => {
                    if (!expense.customSplits[person.id]) {
                        expense.customSplits[person.id] = equalShare;
                    }
                });
                
                // Save and re-render, then show custom split editor
                this.saveData();
                this.render();
                this.showToast('Expense updated - Set custom splits below', 'success');
                
                // Show custom split editor after a brief delay
                setTimeout(() => {
                    this.editCustomSplits(expenseId);
                }, 100);
                return;
            }

            // Save and re-render
            this.saveData();
            this.render();
            this.showToast('Expense updated', 'success');
        };

        // Handle cancel
        const cancelEdit = () => {
            element.innerHTML = originalContent;
            element.style.padding = '';
        };

        // Event listeners
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });

        // For select elements, save on change or blur
        if (input.tagName === 'SELECT') {
            input.addEventListener('change', (e) => {
                e.stopPropagation();
                saveEdit();
            });
            input.addEventListener('blur', (e) => {
                // Small delay to allow for other events
                setTimeout(saveEdit, 100);
            });
        } else {
            input.addEventListener('blur', (e) => {
                // Small delay to allow for other events
                setTimeout(saveEdit, 100);
            });
        }

        // Prevent clicks on the input from bubbling up
        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Clear all expenses
     */
    confirmClearExpenses() {
        if (this.expenses.length === 0) {
            this.showToast('No expenses to clear', 'info');
            return;
        }

        this.showConfirm(
            'Clear All Expenses?',
            `Are you sure you want to remove all ${this.expenses.length} expenses? This action cannot be undone.`,
            () => {
                this.expenses = [];
                this.saveData();
                this.render();
                this.showToast('All expenses cleared', 'info');
            }
        );
    }

    /**
     * Render expenses list
     */
    renderExpenses() {
        const container = document.getElementById('expensesList');
        
        if (this.expenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-receipt"></i>
                    <h3>No expenses yet</h3>
                    <p>Add your first expense using the form above to start tracking your budget.</p>
                </div>
            `;
            return;
        }

        // Group expenses by category
        const groupedExpenses = this.expenses.reduce((groups, expense) => {
            const category = expense.category;
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(expense);
            return groups;
        }, {});

        // Calculate totals for each category
        const categoryTotals = {};
        Object.keys(groupedExpenses).forEach(category => {
            categoryTotals[category] = groupedExpenses[category].reduce((sum, expense) => 
                sum + expense.monthlyAmount, 0
            );
        });

        // Sort categories by total amount (highest first)
        const sortedCategories = Object.keys(groupedExpenses).sort((a, b) => 
            categoryTotals[b] - categoryTotals[a]
        );

        // Create responsive grid layout for categories
        const categoryColumns = sortedCategories.map(category => {
            const expenses = groupedExpenses[category];
            const total = categoryTotals[category];
            const categoryId = `category-${category}`;
            
            return `
                <div class="col-12 col-lg-6 col-xl-4 mb-3">
                    <div class="expense-category-group h-100">
                        <div class="expense-category-header p-2 rounded mb-2" data-bs-toggle="collapse" 
                             data-bs-target="#${categoryId}" aria-expanded="true" 
                             aria-controls="${categoryId}" style="background: var(--bs-primary); color: white; cursor: pointer;">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-chevron-down category-chevron me-2"></i>
                                    <span class="fw-bold">${this.capitalize(category)}</span>
                                    <span class="badge bg-light text-dark ms-2">${expenses.length}</span>
                                </div>
                                <div class="text-end">
                                    <div class="fw-bold">$${this.formatNumber(total)}</div>
                                    <small class="opacity-75">per month</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="collapse show" id="${categoryId}">
                            <div class="list-group list-group-flush p-2">
                                ${expenses.map((expense, index) => `
                                    <div class="list-group-item px-2 py-1 rounded mb-1 ${index % 2 === 0 ? 'bg-body-secondary bg-opacity-50' : ''}">
                                        <!-- Main expense row - 3 column layout -->
                                        <div class="row align-items-start g-1">
                                            <!-- Column 1: Name and Subcategory -->
                                            <div class="col-4">
                                                <div class="fw-bold editable lh-sm small" onclick="budgetTool.editExpense(${expense.id}, 'name')" title="Click to edit">
                                                    ${this.escapeHtml(expense.name)}
                                                </div>
                                                ${expense.subCategory ? `
                                                    <div class="text-muted editable lh-1" style="font-size: 0.75rem;" onclick="budgetTool.editExpense(${expense.id}, 'subCategory')" title="Click to edit">
                                                        ${this.escapeHtml(expense.subCategory)}
                                                    </div>
                                                ` : `
                                                    <div class="text-muted editable lh-1" style="font-size: 0.75rem;" onclick="budgetTool.editExpense(${expense.id}, 'subCategory')" title="Click to add">
                                                        Add subcategory
                                                    </div>
                                                `}
                                            </div>
                                            
                                            <!-- Column 2: Sharing Method and Individual Splits -->
                                            <div class="col-4">
                                                <div class="mb-1">
                                                    <span class="badge bg-secondary editable small" onclick="budgetTool.editExpense(${expense.id}, 'sharingMethod')" title="Click to edit">
                                                        ${this.getSharingMethodLabel(expense.sharingMethod)}
                                                    </span>
                                                </div>
                                                ${this.people.length > 0 ? `
                                                <div class="d-flex flex-wrap gap-1">
                                                    ${this.people.map(person => {
                                                        const personShare = this.calculatePersonShare(expense, person);
                                                        return `
                                                            <span class="badge bg-body-secondary text-body px-1 py-0" style="font-size: 0.65rem;" title="${this.escapeHtml(person.name)}: $${this.formatNumber(personShare)}">
                                                                ${this.escapeHtml(person.name.split(' ')[0])}: $${this.formatNumber(personShare)}
                                                            </span>
                                                        `;
                                                    }).join('')}
                                                </div>
                                                ` : ''}
                                            </div>
                                            
                                            <!-- Column 3: Monthly Amount and Remove Button -->
                                            <div class="col-4 text-end">
                                                <div class="fw-bold editable lh-1 small" onclick="budgetTool.editExpense(${expense.id}, 'monthlyAmount')" title="Click to edit">
                                                    $${this.formatNumber(expense.monthlyAmount)}
                                                </div>
                                                <div class="text-muted lh-1" style="font-size: 0.7rem;">monthly</div>
                                                <div class="mt-1">
                                                    <button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="budgetTool.removeExpense(${expense.id})" title="Remove expense">
                                                        <i class="bi bi-trash small"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="row">
                ${categoryColumns.join('')}
            </div>
        `;

        // Add event listeners for collapse/expand animations
        container.querySelectorAll('.expense-category-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const chevron = header.querySelector('.category-chevron');
                const isExpanded = header.getAttribute('aria-expanded') === 'true';
                
                // Toggle chevron rotation
                if (isExpanded) {
                    chevron.style.transform = 'rotate(0deg)';
                } else {
                    chevron.style.transform = 'rotate(-90deg)';
                }
            });
        });

        // Handle the Bootstrap collapse events for smooth animations
        container.querySelectorAll('.collapse').forEach(collapse => {
            collapse.addEventListener('shown.bs.collapse', (e) => {
                const header = e.target.previousElementSibling;
                const chevron = header.querySelector('.category-chevron');
                chevron.style.transform = 'rotate(0deg)';
            });
            
            collapse.addEventListener('hidden.bs.collapse', (e) => {
                const header = e.target.previousElementSibling;
                const chevron = header.querySelector('.category-chevron');
                chevron.style.transform = 'rotate(-90deg)';
            });
        });
    }

    // ==========================================================================
    // SUMMARY TAB
    // ==========================================================================

    /**
     * Render summary tab
     */
    renderSummary() {
        const container = document.getElementById('summaryContent');
        
        if (!container) {
            console.error('Summary container not found!');
            return;
        }
        
        console.log('Rendering summary, people:', this.people.length, 'expenses:', this.expenses.length);
        
        if (this.people.length === 0 || this.expenses.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-clipboard-data display-1 text-muted"></i>
                    <h3 class="mt-3">Summary not available</h3>
                    <p class="text-muted">Add at least one household member and one expense to view your budget summary.</p>
                </div>
            `;
            return;
        }

        // Get categories for column headers
        const categories = [...new Set(this.expenses.map(e => e.category))].sort();
        
        let html = '<div class="row g-4">';
        
        // Who Pays What Table
        html += `
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-people-fill me-2"></i>Who Pays What (Per Pay Period)</h5>
                        <small class="text-muted">Amounts shown are per individual pay period to help with payment elections</small>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Person</th>
        `;
        
        // Add category columns
        categories.forEach(category => {
            html += `<th class="text-end">${this.capitalize(category)}</th>`;
        });
        html += `<th class="text-end fw-bold">Total</th>`;
        html += `</tr></thead><tbody>`;
        
        let categoryTotals = {};
        categories.forEach(cat => categoryTotals[cat] = 0);
        let grandTotal = 0;
        
        // Add rows for each person
        this.people.forEach(person => {
            html += `<tr><td class="fw-medium">${this.escapeHtml(person.name)}</td>`;
            let personTotal = 0;
            
            categories.forEach(category => {
                const categoryExpenses = this.expenses.filter(e => e.category === category);
                let personCategoryTotal = 0;
                
                categoryExpenses.forEach(expense => {
                    const monthlyShare = this.calculatePersonShare(expense, person);
                    personCategoryTotal += monthlyShare;
                });
                
                // Convert to pay period amount
                const payPeriodCategoryTotal = this.convertToPayPeriod(personCategoryTotal, person.payPeriods);
                
                categoryTotals[category] += payPeriodCategoryTotal;
                personTotal += payPeriodCategoryTotal;
                
                html += `<td class="text-end">$${this.formatNumber(payPeriodCategoryTotal)}</td>`;
            });
            
            grandTotal += personTotal;
            html += `<td class="text-end fw-bold">$${this.formatNumber(personTotal)}</td></tr>`;
        });
        
        // Add totals row (sum of actual pay period amounts shown above)
        html += `<tr class="table-secondary fw-bold">
                    <td>Total</td>`;
        categories.forEach(category => {
            html += `<td class="text-end">$${this.formatNumber(categoryTotals[category])}</td>`;
        });
        html += `<td class="text-end">$${this.formatNumber(grandTotal)}</td></tr>`;
        
        html += `</tbody></table></div></div></div></div>`;
        
        // Excess Funds Table
        html += `
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-piggy-bank me-2"></i>Excess Funds</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Person</th>
                                        <th class="text-end">Pay Period Income</th>
                                        <th class="text-end">Pay Period Expenses</th>
                                        <th class="text-end">Pay Period Excess</th>
                                        <th class="text-end">Monthly Excess</th>
                                    </tr>
                                </thead>
                                <tbody>
        `;
        
        let totalPayPeriodIncome = 0;
        let totalPayPeriodExpenses = 0;
        let totalPayPeriodExcess = 0;
        let totalMonthlyExcess = 0;
        
        this.people.forEach(person => {
            // Calculate person's total monthly expenses (their share of all expenses)
            let personMonthlyExpenses = 0;
            this.expenses.forEach(expense => {
                personMonthlyExpenses += this.calculatePersonShare(expense, person);
            });
            
            // Calculate monthly income from actual pay period data
            const personMonthlyIncome = this.calculatePersonAnnualIncome(person) / 12;
            
            // Convert to pay period amounts
            const payPeriodIncome = this.convertToPayPeriod(personMonthlyIncome, person.payPeriods);
            const payPeriodExpenses = this.convertToPayPeriod(personMonthlyExpenses, person.payPeriods);
            const payPeriodExcess = payPeriodIncome - payPeriodExpenses;
            const monthlyExcess = personMonthlyIncome - personMonthlyExpenses;
            
            totalPayPeriodIncome += payPeriodIncome;
            totalPayPeriodExpenses += payPeriodExpenses;
            totalPayPeriodExcess += payPeriodExcess;
            totalMonthlyExcess += monthlyExcess;
            
            const excessClass = payPeriodExcess >= 0 ? 'text-success' : 'text-danger';
            const monthlyExcessClass = monthlyExcess >= 0 ? 'text-success' : 'text-danger';
            
            html += `
                <tr>
                    <td class="fw-medium">${this.escapeHtml(person.name)}</td>
                    <td class="text-end text-success">$${this.formatNumber(payPeriodIncome)}</td>
                    <td class="text-end text-warning">$${this.formatNumber(payPeriodExpenses)}</td>
                    <td class="text-end ${excessClass}">$${this.formatNumber(payPeriodExcess)}</td>
                    <td class="text-end ${monthlyExcessClass}">$${this.formatNumber(monthlyExcess)}</td>
                </tr>
            `;
        });
        
        // Add totals row
        const totalExcessClass = totalPayPeriodExcess >= 0 ? 'text-success' : 'text-danger';
        const totalMonthlyExcessClass = totalMonthlyExcess >= 0 ? 'text-success' : 'text-danger';
        
        html += `
            <tr class="table-secondary fw-bold">
                <td>Total</td>
                <td class="text-end">$${this.formatNumber(totalPayPeriodIncome)}</td>
                <td class="text-end">$${this.formatNumber(totalPayPeriodExpenses)}</td>
                <td class="text-end ${totalExcessClass}">$${this.formatNumber(totalPayPeriodExcess)}</td>
                <td class="text-end ${totalMonthlyExcessClass}">$${this.formatNumber(totalMonthlyExcess)}</td>
            </tr>
        `;
        
        html += `</tbody></table></div></div></div></div>`;
        html += '</div>'; // Close main row
        
        console.log('Setting summary HTML, length:', html.length);
        container.innerHTML = html;
        console.log('Summary HTML set successfully');
    }

    // ==========================================================================
    // ANALYTICS TAB
    // ==========================================================================

    /**
     * Render analytics tab
     */
    // === ANALYTICS RENDERING ===
    // Enhanced analytics rendering with all requested features

    /**
     * Render analytics tab with comprehensive features
     */
    renderAnalytics() {
        const container = document.getElementById('analyticsContent');
        
        if (!container) {
            console.error('Analytics container not found!');
            return;
        }
        
        if (this.people.length === 0 || this.expenses.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-graph-up display-1 text-muted"></i>
                    <h3 class="mt-3">Analytics not available</h3>
                    <p class="text-muted">Add at least one household member and one expense to view detailed analytics.</p>
                </div>
            `;
            return;
        }

        let analytics;
        try {
            analytics = this.calculateAnalytics();
            console.log('Analytics calculated successfully:', analytics);
        } catch (error) {
            console.error('Error calculating analytics:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Error</h4>
                    <p>Unable to calculate analytics: ${error.message}</p>
                </div>
            `;
            return;
        }

        let html = '<div class="row g-4">';

        // Budget Health Score with comprehensive metrics
        html += `
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-heart-pulse me-2"></i>Budget Health Score</h5>
                    </div>
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-4 text-center">
                                <div class="display-3 fw-bold ${analytics.healthScore >= 80 ? 'text-success' : analytics.healthScore >= 60 ? 'text-warning' : 'text-danger'} mb-2">
                                    ${analytics.healthScore}/100
                                </div>
                                <div class="progress mb-3" style="height: 15px;">
                                    <div class="progress-bar ${analytics.healthScore >= 80 ? 'bg-success' : analytics.healthScore >= 60 ? 'bg-warning' : 'bg-danger'}" 
                                         style="width: ${analytics.healthScore}%"></div>
                                </div>
                            </div>
                            <div class="col-md-8">
                                <p class="mb-2">${analytics.healthMessage}</p>
                                <div class="row text-center">
                                    <div class="col-6 col-md-3">
                                        <small class="text-muted">Savings Rate</small>
                                        <div class="fw-bold ${analytics.savingsRate >= 20 ? 'text-success' : analytics.savingsRate >= 10 ? 'text-warning' : 'text-danger'}">
                                            ${analytics.savingsRate}%
                                        </div>
                                    </div>
                                    <div class="col-6 col-md-3">
                                        <small class="text-muted">Emergency Fund</small>
                                        <div class="fw-bold ${analytics.emergencyFundCoverage >= 3 ? 'text-success' : analytics.emergencyFundCoverage >= 1 ? 'text-warning' : 'text-danger'}">
                                            ${analytics.emergencyFundCoverage} months
                                        </div>
                                    </div>
                                    <div class="col-6 col-md-3">
                                        <small class="text-muted">Debt Payments</small>
                                        <div class="fw-bold ${analytics.debtToIncomeRatio <= 30 ? 'text-success' : analytics.debtToIncomeRatio <= 50 ? 'text-warning' : 'text-danger'}">
                                            ${analytics.debtToIncomeRatio}%
                                        </div>
                                        <small class="text-muted">($${this.formatNumber(analytics.totalDebt)})</small>
                                    </div>
                                    <div class="col-6 col-md-3">
                                        <small class="text-muted">Monthly Balance</small>
                                        <div class="fw-bold ${(analytics.totalIncome - analytics.totalExpenses) >= 0 ? 'text-success' : 'text-danger'}">
                                            $${this.formatNumber(analytics.totalIncome - analytics.totalExpenses)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Debt Information Box
        html += `
            <div class="col-12">
                <div class="alert alert-info">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <i class="bi bi-info-circle-fill"></i>
                        </div>
                        <div class="col">
                            <strong>Debt-to-Income Calculation:</strong> Only includes actual debt payments like loans, credit cards, mortgages, and car payments. 
                            Regular expenses like utilities, groceries, and insurance are excluded. 
                            <strong>Recommended:</strong> Keep below 36% for optimal financial health.
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Budget Scenario Modeling with Interactive Sliders
        html += `
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-sliders me-2"></i>Interactive Budget Scenario Modeling</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-lg-6">
                                <h6 class="text-primary mb-3">
                                    <i class="bi bi-currency-dollar me-2"></i>Income Change Impact
                                </h6>
                                
                                <!-- Income Slider -->
                                <div class="mb-4">
                                    <label for="incomeSlider" class="form-label">
                                        Income Change: <span id="incomeChangePercent" class="fw-bold">0%</span>
                                    </label>
                                    <input type="range" class="form-range" id="incomeSlider" 
                                           min="-50" max="50" value="0" step="1">
                                    <div class="d-flex justify-content-between text-muted small">
                                        <span>-50%</span>
                                        <span>0%</span>
                                        <span>+50%</span>
                                    </div>
                                </div>
                                
                                <!-- Income Results Card -->
                                <div class="card" id="incomeResultCard">
                                    <div class="card-body text-center">
                                        <div class="row">
                                            <div class="col-6">
                                                <div class="border-end">
                                                    <div class="h5 mb-1" id="newIncomeAmount">$${this.formatNumber(analytics.totalIncome)}</div>
                                                    <small class="text-muted">New Income</small>
                                                </div>
                                            </div>
                                            <div class="col-6">
                                                <div class="h5 mb-1" id="newIncomeBalance">$${this.formatNumber(analytics.totalIncome - analytics.totalExpenses)}</div>
                                                <small class="text-muted">Monthly Balance</small>
                                            </div>
                                        </div>
                                        <div class="mt-3">
                                            <div class="h6 mb-1">Savings Rate: <span id="newIncomeSavingsRate">${analytics.savingsRate}%</span></div>
                                            <div class="progress" style="height: 8px;">
                                                <div class="progress-bar" id="newIncomeSavingsBar" 
                                                     style="width: ${Math.min(100, analytics.savingsRate * 5)}%"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-lg-6">
                                <h6 class="text-warning mb-3">
                                    <i class="bi bi-receipt me-2"></i>Expense Change Impact
                                </h6>
                                
                                <!-- Expense Slider -->
                                <div class="mb-4">
                                    <label for="expenseSlider" class="form-label">
                                        Expense Change: <span id="expenseChangePercent" class="fw-bold">0%</span>
                                    </label>
                                    <input type="range" class="form-range" id="expenseSlider" 
                                           min="-50" max="50" value="0" step="1">
                                    <div class="d-flex justify-content-between text-muted small">
                                        <span>-50%</span>
                                        <span>0%</span>
                                        <span>+50%</span>
                                    </div>
                                </div>
                                
                                <!-- Expense Results Card -->
                                <div class="card" id="expenseResultCard">
                                    <div class="card-body text-center">
                                        <div class="row">
                                            <div class="col-6">
                                                <div class="border-end">
                                                    <div class="h5 mb-1" id="newExpenseAmount">$${this.formatNumber(analytics.totalExpenses)}</div>
                                                    <small class="text-muted">New Expenses</small>
                                                </div>
                                            </div>
                                            <div class="col-6">
                                                <div class="h5 mb-1" id="newExpenseBalance">$${this.formatNumber(analytics.totalIncome - analytics.totalExpenses)}</div>
                                                <small class="text-muted">Monthly Balance</small>
                                            </div>
                                        </div>
                                        <div class="mt-3">
                                            <div class="h6 mb-1">Savings Rate: <span id="newExpenseSavingsRate">${analytics.savingsRate}%</span></div>
                                            <div class="progress" style="height: 8px;">
                                                <div class="progress-bar" id="newExpenseSavingsBar" 
                                                     style="width: ${Math.min(100, analytics.savingsRate * 5)}%"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Reset Button -->
                        <div class="text-center mt-4">
                            <button class="btn btn-outline-secondary" id="resetSlidersBtn">
                                <i class="bi bi-arrow-clockwise me-2"></i>Reset to Current Budget
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Savings Rate Card with Detailed Breakdown
        html += `
            <div class="col-lg-6">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-piggy-bank me-2"></i>Savings Rate Analysis</h5>
                    </div>
                    <div class="card-body">
                        <div class="text-center mb-4">
                            <div class="display-4 fw-bold text-success">${analytics.savingsRate}%</div>
                            <p class="text-muted">of income saved monthly</p>
                            <div class="progress mb-3" style="height: 12px;">
                                <div class="progress-bar bg-success" style="width: ${Math.min(100, analytics.savingsRate * 5)}%"></div>
                            </div>
                        </div>
                        
                        <h6>Savings Breakdown:</h6>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between">
                                <span>Total Monthly Savings:</span>
                                <strong>$${this.formatNumber(analytics.totalSavings)}</strong>
                            </div>
                            <div class="d-flex justify-content-between text-muted">
                                <span>• From savings categories:</span>
                                <span>$${this.formatNumber(this.calculateSavingsFromCategories())}</span>
                            </div>
                            <div class="d-flex justify-content-between text-muted">
                                <span>• From excess income:</span>
                                <span>$${this.formatNumber(Math.max(0, analytics.totalIncome - analytics.totalExpenses))}</span>
                            </div>
                        </div>

                        <div class="alert alert-info">
                            <small>
                                <strong>Recommendation:</strong> 
                                ${analytics.savingsRate >= 20 ? 'Excellent! You\'re saving more than the recommended 20%.' :
                                  analytics.savingsRate >= 10 ? 'Good progress! Try to reach 20% for optimal financial health.' :
                                  'Consider increasing savings to at least 10% of income.'}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // All Categories and Subcategories List
        html += `
            <div class="col-lg-6">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>Category & Subcategory Breakdown</h5>
                    </div>
                    <div class="card-body" style="max-height: 400px; overflow-y: auto;">
        `;

        // Group expenses by category and subcategory
        const categoryMap = {};
        this.expenses.forEach(expense => {
            const category = expense.category || 'Other';
            const subcategory = expense.subcategory || 'General';
            
            if (!categoryMap[category]) {
                categoryMap[category] = { total: 0, subcategories: {} };
            }
            
            if (!categoryMap[category].subcategories[subcategory]) {
                categoryMap[category].subcategories[subcategory] = 0;
            }
            
            const amount = expense.monthlyAmount || 0;
            categoryMap[category].total += amount;
            categoryMap[category].subcategories[subcategory] += amount;
        });

        // Sort categories by total amount
        const sortedCategories = Object.entries(categoryMap)
            .sort(([,a], [,b]) => b.total - a.total);

        sortedCategories.forEach(([categoryName, categoryData]) => {
            const categoryPercent = analytics.totalExpenses > 0 ? 
                Math.round((categoryData.total / analytics.totalExpenses) * 100) : 0;
            
            html += `
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-1">${this.capitalize(categoryName)}</h6>
                        <span class="badge bg-primary">$${this.formatNumber(categoryData.total)} (${categoryPercent}%)</span>
                    </div>
            `;

            // Sort subcategories by amount
            const sortedSubcategories = Object.entries(categoryData.subcategories)
                .sort(([,a], [,b]) => b - a);

            sortedSubcategories.forEach(([subcategoryName, amount]) => {
                const subPercent = categoryData.total > 0 ? 
                    Math.round((amount / categoryData.total) * 100) : 0;
                
                html += `
                    <div class="d-flex justify-content-between text-muted ps-3">
                        <span>• ${this.capitalize(subcategoryName)}</span>
                        <span>$${this.formatNumber(amount)} (${subPercent}%)</span>
                    </div>
                `;
            });

            html += `</div>`;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        // Savings Growth Projection
        html += `
            <div class="col-lg-6">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-graph-up-arrow me-2"></i>Savings Growth Projection</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Timeframe</th>
                                        <th>Savings Amount</th>
                                        <th>With 2% Return</th>
                                    </tr>
                                </thead>
                                <tbody>
        `;

        analytics.savingsGrowthProjection.forEach(projection => {
            html += `
                <tr>
                    <td>${projection.month} month${projection.month > 1 ? 's' : ''}</td>
                    <td>$${this.formatNumber(projection.amount)}</td>
                    <td class="text-success">$${this.formatNumber(projection.withInterest)}</td>
                </tr>
            `;
        });

        html += `
                                </tbody>
                            </table>
                        </div>
                        <div class="text-center mt-3">
                            <canvas id="savingsProjectionChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Expense Distribution Chart
        html += `
            <div class="col-lg-6">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-pie-chart me-2"></i>Expense Distribution</h5>
                    </div>
                    <div class="card-body text-center">
                        <canvas id="expenseDistributionChart" width="400" height="400"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Subcategory Breakdown Graph
        html += `
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-bar-chart me-2"></i>Subcategory Breakdown</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="subcategoryChart" width="800" height="400"></canvas>
                    </div>
                </div>
            </div>
        `;

        html += '</div>'; // Close main row

        console.log('Setting analytics HTML, length:', html.length);
        container.innerHTML = html;
        
        // Initialize all charts after DOM update
        setTimeout(() => {
            this.renderAnalyticsCharts(analytics);
            this.initializeScenarioSliders(analytics);
        }, 100);
        
        console.log('Analytics HTML set successfully');
    }

    // Helper method to calculate savings from categories only
    calculateSavingsFromCategories() {
        return this.expenses.reduce((sum, expense) => {
            const category = (expense.category || '').toLowerCase();
            const subcategory = (expense.subcategory || '').toLowerCase();
            
            if (category.includes('savings') || category.includes('emergency') || 
                subcategory.includes('savings')) {
                return sum + (expense.monthlyAmount || 0);
            }
            return sum;
        }, 0);
    }

    /**
     * Render all analytics charts
     */
    renderAnalyticsCharts(analytics) {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};

        // Expense Distribution Pie Chart
        const expenseDistCtx = document.getElementById('expenseDistributionChart');
        if (expenseDistCtx && analytics.categoryData.labels.length > 0) {
            this.charts.expenseDistribution = new Chart(expenseDistCtx, {
                type: 'doughnut',
                data: {
                    labels: analytics.categoryData.labels,
                    datasets: [{
                        data: analytics.categoryData.values,
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: $${this.formatNumber(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Subcategory Bar Chart
        const subcategoryCtx = document.getElementById('subcategoryChart');
        if (subcategoryCtx && Object.keys(analytics.subcategoryBreakdown).length > 0) {
            const subcategoryData = Object.entries(analytics.subcategoryBreakdown)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 15); // Show top 15 subcategories

            this.charts.subcategory = new Chart(subcategoryCtx, {
                type: 'bar',
                data: {
                    labels: subcategoryData.map(([name]) => this.capitalize(name)),
                    datasets: [{
                        label: 'Monthly Amount',
                        data: subcategoryData.map(([,amount]) => amount),
                        backgroundColor: '#36A2EB',
                        borderColor: '#1E88E5',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => '$' + this.formatNumber(value)
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${context.label}: $${this.formatNumber(context.parsed.y)}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Savings Growth Projection Line Chart
        const savingsProjectionCtx = document.getElementById('savingsProjectionChart');
        if (savingsProjectionCtx && analytics.savingsGrowthProjection.length > 0) {
            this.charts.savingsProjection = new Chart(savingsProjectionCtx, {
                type: 'line',
                data: {
                    labels: analytics.savingsGrowthProjection.map(p => `${p.month}mo`),
                    datasets: [
                        {
                            label: 'Without Interest',
                            data: analytics.savingsGrowthProjection.map(p => p.amount),
                            borderColor: '#36A2EB',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            tension: 0.1,
                            fill: false
                        },
                        {
                            label: 'With 2% Annual Return',
                            data: analytics.savingsGrowthProjection.map(p => p.withInterest),
                            borderColor: '#4BC0C0',
                            backgroundColor: 'rgba(75, 192, 192, 0.1)',
                            tension: 0.1,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => '$' + this.formatNumber(value)
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${context.dataset.label}: $${this.formatNumber(context.parsed.y)}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        console.log('All analytics charts rendered successfully');
    }

    /**
     * Initialize interactive scenario modeling sliders
     */
    initializeScenarioSliders(analytics) {
        const incomeSlider = document.getElementById('incomeSlider');
        const expenseSlider = document.getElementById('expenseSlider');
        const resetBtn = document.getElementById('resetSlidersBtn');

        if (!incomeSlider || !expenseSlider) {
            console.warn('Scenario sliders not found in DOM');
            return;
        }

        // Store original values
        const originalIncome = analytics.totalIncome;
        const originalExpenses = analytics.totalExpenses;

        // Income slider handler
        incomeSlider.addEventListener('input', (e) => {
            const changePercent = parseInt(e.target.value);
            this.updateIncomeScenario(originalIncome, originalExpenses, changePercent);
        });

        // Expense slider handler
        expenseSlider.addEventListener('input', (e) => {
            const changePercent = parseInt(e.target.value);
            this.updateExpenseScenario(originalIncome, originalExpenses, changePercent);
        });

        // Reset button handler
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                incomeSlider.value = 0;
                expenseSlider.value = 0;
                this.updateIncomeScenario(originalIncome, originalExpenses, 0);
                this.updateExpenseScenario(originalIncome, originalExpenses, 0);
            });
        }

        console.log('Scenario sliders initialized successfully');
    }

    /**
     * Update income scenario display
     */
    updateIncomeScenario(originalIncome, originalExpenses, changePercent) {
        const newIncome = originalIncome * (1 + changePercent / 100);
        const newBalance = newIncome - originalExpenses;
        
        // Calculate savings rate using the same method as expense scenario
        // This ensures consistent behavior between income and expense changes
        const newTotalSavings = this.calculateScaledSavings(newIncome, originalExpenses, originalExpenses);
        const newSavingsRate = newIncome > 0 ? Math.round((newTotalSavings / newIncome) * 100) : 0;

        // Update percentage display
        const percentElement = document.getElementById('incomeChangePercent');
        if (percentElement) {
            percentElement.textContent = `${changePercent > 0 ? '+' : ''}${changePercent}%`;
            // Color coding: green for positive, red for negative, blue for zero
            percentElement.className = changePercent > 0 ? 'fw-bold text-success' : 
                                     changePercent < 0 ? 'fw-bold text-danger' : 'fw-bold text-primary';
        }

        // Update income amount
        const incomeElement = document.getElementById('newIncomeAmount');
        if (incomeElement) {
            incomeElement.textContent = `$${this.formatNumber(newIncome)}`;
        }

        // Update balance
        const balanceElement = document.getElementById('newIncomeBalance');
        if (balanceElement) {
            balanceElement.textContent = `$${this.formatNumber(newBalance)}`;
            balanceElement.className = newBalance >= 0 ? 'h5 mb-1 text-success' : 'h5 mb-1 text-danger';
        }

        // Update savings rate
        const savingsRateElement = document.getElementById('newIncomeSavingsRate');
        if (savingsRateElement) {
            savingsRateElement.textContent = `${newSavingsRate}%`;
        }

        // Update savings rate progress bar
        const savingsBarElement = document.getElementById('newIncomeSavingsBar');
        if (savingsBarElement) {
            const barWidth = Math.min(100, Math.max(0, newSavingsRate * 5));
            savingsBarElement.style.width = `${barWidth}%`;
            savingsBarElement.className = newSavingsRate >= 20 ? 'progress-bar bg-success' :
                                         newSavingsRate >= 10 ? 'progress-bar bg-warning' : 
                                         newSavingsRate >= 0 ? 'progress-bar bg-info' : 'progress-bar bg-danger';
        }

        // Update result card color
        const resultCard = document.getElementById('incomeResultCard');
        if (resultCard) {
            resultCard.className = changePercent > 0 ? 'card border-success' :
                                  changePercent < 0 ? 'card border-danger' : 'card border-primary';
        }
    }

    /**
     * Update expense scenario display
     */
    updateExpenseScenario(originalIncome, originalExpenses, changePercent) {
        const newExpenses = originalExpenses * (1 + changePercent / 100);
        const newBalance = originalIncome - newExpenses;
        
        // Calculate proper savings rate using scaled savings calculation
        const newTotalSavings = this.calculateScaledSavings(originalIncome, newExpenses, originalExpenses);
        const newSavingsRate = originalIncome > 0 ? Math.round((newTotalSavings / originalIncome) * 100) : 0;

        // Update percentage display
        const percentElement = document.getElementById('expenseChangePercent');
        if (percentElement) {
            percentElement.textContent = `${changePercent > 0 ? '+' : ''}${changePercent}%`;
            // Color coding: red for positive (more expenses = bad), green for negative (less expenses = good), blue for zero
            percentElement.className = changePercent > 0 ? 'fw-bold text-danger' : 
                                     changePercent < 0 ? 'fw-bold text-success' : 'fw-bold text-primary';
        }

        // Update expense amount
        const expenseElement = document.getElementById('newExpenseAmount');
        if (expenseElement) {
            expenseElement.textContent = `$${this.formatNumber(newExpenses)}`;
        }

        // Update balance
        const balanceElement = document.getElementById('newExpenseBalance');
        if (balanceElement) {
            balanceElement.textContent = `$${this.formatNumber(newBalance)}`;
            balanceElement.className = newBalance >= 0 ? 'h5 mb-1 text-success' : 'h5 mb-1 text-danger';
        }

        // Update savings rate
        const savingsRateElement = document.getElementById('newExpenseSavingsRate');
        if (savingsRateElement) {
            savingsRateElement.textContent = `${newSavingsRate}%`;
        }

        // Update savings rate progress bar
        const savingsBarElement = document.getElementById('newExpenseSavingsBar');
        if (savingsBarElement) {
            const barWidth = Math.min(100, Math.max(0, newSavingsRate * 5));
            savingsBarElement.style.width = `${barWidth}%`;
            savingsBarElement.className = newSavingsRate >= 20 ? 'progress-bar bg-success' :
                                         newSavingsRate >= 10 ? 'progress-bar bg-warning' : 
                                         newSavingsRate >= 0 ? 'progress-bar bg-info' : 'progress-bar bg-danger';
        }

        // Update result card color
        const resultCard = document.getElementById('expenseResultCard');
        if (resultCard) {
            resultCard.className = changePercent > 0 ? 'card border-danger' :
                                  changePercent < 0 ? 'card border-success' : 'card border-primary';
        }
    }

    /**
     * Calculate scaled savings for scenario modeling
     * This properly accounts for savings categories being scaled with expenses
     * and adds excess funds from income changes
     */
    calculateScaledSavings(newIncome, newExpenses, originalExpenses) {
        // Get current savings from expense categories
        const originalSavingsFromExpenses = this.expenses.reduce((sum, expense) => {
            const category = expense.category.toLowerCase();
            const subcategory = (expense.subcategory || '').toLowerCase();
            
            // Include if category is savings or emergency
            if (category.includes('savings') || category.includes('emergency')) {
                return sum + expense.monthlyAmount;
            }
            
            // Include if subcategory contains savings
            if (subcategory.includes('savings')) {
                return sum + expense.monthlyAmount;
            }
            
            return sum;
        }, 0);
        
        // Scale the savings categories proportionally with total expense changes
        const expenseScaleFactor = originalExpenses > 0 ? newExpenses / originalExpenses : 1;
        const scaledSavingsFromExpenses = originalSavingsFromExpenses * expenseScaleFactor;
        
        // Add excess funds (surplus) - this is the key difference from simple balance calculation
        const surplus = newIncome - newExpenses;
        const excessFunds = Math.max(0, surplus);
        
        return scaledSavingsFromExpenses + excessFunds;
    }

    // ==========================================================================
    // CALCULATION METHODS
    // ==========================================================================

    /**
     * Calculate person's income breakdown
     */
    calculatePersonIncome(person) {
        const payAmount = person.payPerPeriod || person.biWeeklyPay;
        const annualIncome = this.calculatePersonAnnualIncome(person);
        
        return {
            payPeriod: payAmount,           // Actual amount per their pay period
            biWeekly: annualIncome / 26,    // Convert to bi-weekly for comparison
            monthly: annualIncome / 12,     // Convert to monthly
            yearly: annualIncome            // Annual income
        };
    }

    /**
     * Calculate monthly amount from bi-weekly
     */
    calculateMonthlyFromBiWeekly(biWeeklyAmount) {
        return (biWeeklyAmount * 26) / 12;
    }

    /**
     * Calculate bi-weekly amount from monthly
     */
    calculateBiWeeklyFromMonthly(monthlyAmount) {
        return (monthlyAmount * 12) / 26;
    }

    /**
     * Calculate person's actual annual income based on their pay period
     */
    calculatePersonAnnualIncome(person) {
        // Use payPerPeriod if available (new format), otherwise fall back to biWeeklyPay (old format)
        const payAmount = person.payPerPeriod || person.biWeeklyPay;
        return payAmount * person.payPeriods;
    }

    /**
     * Calculate person's share of an expense
     */
    calculatePersonShare(expense, person) {
        switch (expense.sharingMethod) {
            case 'even':
                return expense.monthlyAmount / this.people.length;
            
            case 'percentage':
                const totalAnnualIncome = this.people.reduce((sum, p) => {
                    return sum + this.calculatePersonAnnualIncome(p);
                }, 0);
                const personAnnualIncome = this.calculatePersonAnnualIncome(person);
                return totalAnnualIncome > 0 ? (personAnnualIncome / totalAnnualIncome) * expense.monthlyAmount : 0;
            
            case 'custom':
                // Use global custom percentages instead of per-expense custom splits
                const customPercentage = this.settings.customPercentages[person.id] || 0;
                return (customPercentage / 100) * expense.monthlyAmount;
            
            default:
                return 0;
        }
    }

    /**
     * Calculate summary data
     */
    calculateSummary() {
        const totalIncome = this.people.reduce((sum, person) => {
            return sum + (this.calculatePersonAnnualIncome(person) / 12); // Convert annual to monthly for summary
        }, 0);

        const totalExpenses = this.expenses.reduce((sum, expense) => {
            return sum + expense.monthlyAmount;
        }, 0);

        // Calculate total savings amount (including actual savings expenses and surplus)
        const totalSavings = this.calculateTotalSavings(totalIncome, totalExpenses);
        
        const surplus = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;

        // Individual breakdowns
        const individualBreakdowns = this.people.map(person => {
            const income = this.calculateMonthlyFromBiWeekly(person.biWeeklyPay);
            const expenses = this.expenses.reduce((sum, expense) => {
                return sum + this.calculatePersonShare(expense, person);
            }, 0);

            return {
                name: person.name,
                income,
                expenses,
                balance: income - expenses
            };
        });

        // Category breakdown
        const categoryTotals = {};
        this.expenses.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.monthlyAmount;
        });

        const categoryBreakdown = Object.entries(categoryTotals)
            .map(([name, amount]) => ({
                name,
                amount,
                percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
            }))
            .sort((a, b) => b.amount - a.amount);

        return {
            totalIncome,
            totalExpenses,
            surplus,
            savingsRate,
            totalSavings,
            individualBreakdowns,
            categoryBreakdown
        };
    }

    // Calculate total savings including savings categories, emergency, subcategories with "savings", and excess funds
    calculateTotalSavings(totalIncome, totalExpenses) {
        // Get savings from expense categories
        const savingsFromExpenses = this.expenses.reduce((sum, expense) => {
            const category = expense.category.toLowerCase();
            const subcategory = (expense.subcategory || '').toLowerCase();
            
            // Include if category is savings or emergency
            if (category.includes('savings') || category.includes('emergency')) {
                return sum + expense.monthlyAmount;
            }
            
            // Include if subcategory contains savings
            if (subcategory.includes('savings')) {
                return sum + expense.monthlyAmount;
            }
            
            return sum;
        }, 0);
        
        // Add excess funds (surplus)
        const surplus = totalIncome - totalExpenses;
        const excessFunds = Math.max(0, surplus);
        
        return savingsFromExpenses + excessFunds;
    }

    // Calculate total debt payments (only actual debt obligations)
    calculateTotalDebt() {
        return this.expenses.reduce((sum, expense) => {
            const category = (expense.category || '').toLowerCase();
            const subcategory = (expense.subcategory || '').toLowerCase();
            const name = (expense.name || '').toLowerCase();
            
            // Include if category contains debt-related terms
            if (category.includes('debt') || 
                category.includes('loan') || 
                category.includes('credit') || 
                category.includes('mortgage') ||
                category.includes('car payment') ||
                category.includes('student loan')) {
                return sum + (expense.monthlyAmount || 0);
            }
            
            // Include if subcategory contains debt-related terms
            if (subcategory.includes('debt') || 
                subcategory.includes('loan') || 
                subcategory.includes('credit') || 
                subcategory.includes('mortgage') ||
                subcategory.includes('payment')) {
                return sum + (expense.monthlyAmount || 0);
            }
            
            // Include if expense name contains debt-related terms
            if (name.includes('loan') || 
                name.includes('credit card') || 
                name.includes('mortgage') ||
                name.includes('car payment') ||
                name.includes('student loan') ||
                name.includes('debt') ||
                name.includes('financing')) {
                return sum + (expense.monthlyAmount || 0);
            }
            
            return sum;
        }, 0);
    }

    /**
     * Calculate analytics data
     */
    calculateAnalytics() {
        const summary = this.calculateSummary();
        
        // Ensure we have valid numbers
        const totalIncome = summary.totalIncome || 0;
        const totalExpenses = summary.totalExpenses || 0;
        const totalSavings = summary.totalSavings || 0;
        
        // Health score calculation with proper bounds checking
        let healthScore = 0;
        let healthMessage = '';

        if (summary.savingsRate >= 20) {
            healthScore = Math.min(100, 80 + (summary.savingsRate - 20) * 2);
            healthMessage = 'Excellent financial health! You\'re saving at an optimal rate.';
        } else if (summary.savingsRate >= 10) {
            healthScore = 60 + (summary.savingsRate - 10) * 2;
            healthMessage = 'Good financial health with room for improvement.';
        } else if (summary.savingsRate >= 0) {
            healthScore = summary.savingsRate * 6;
            healthMessage = 'Your finances need attention. Consider reducing expenses or increasing income.';
        } else {
            healthScore = 0;
            healthMessage = 'Critical: Your expenses exceed your income. Immediate action required.';
        }

        // Emergency fund calculations with safe defaults
        const monthlyExpenses = totalExpenses || 1; // Avoid division by zero
        const emergencyFundTargetAmount = monthlyExpenses * (this.settings.emergencyFundTargetMonths || 3);
        const currentEmergencyFund = this.settings.emergencyFundTarget || 0;
        const emergencyFundProgress = emergencyFundTargetAmount > 0 ? 
            (currentEmergencyFund / emergencyFundTargetAmount) * 100 : 0;
        const emergencyFundCoverage = monthlyExpenses > 0 ? 
            Math.round((currentEmergencyFund / monthlyExpenses) * 10) / 10 : 0;

        // Debt calculations - only include actual debt payments
        const totalDebt = this.calculateTotalDebt();
        const debtToIncomeRatio = totalIncome > 0 ? 
            Math.round((totalDebt / totalIncome) * 100) : 0;

        // Category data for charts with safe fallbacks
        const categoryData = {
            labels: (summary.categoryBreakdown || []).map(cat => this.capitalize(cat.name || 'Other')),
            values: (summary.categoryBreakdown || []).map(cat => cat.amount || 0)
        };

        // Subcategory breakdown with safe aggregation
        const subcategoryBreakdown = {};
        this.expenses.forEach(expense => {
            const subcat = expense.subcategory || 'Other';
            subcategoryBreakdown[subcat] = (subcategoryBreakdown[subcat] || 0) + (expense.monthlyAmount || 0);
        });

        return {
            healthScore: Math.round(healthScore) || 0,
            healthMessage: healthMessage || 'No data available',
            savingsRate: summary.savingsRate || 0,
            emergencyFundTarget: emergencyFundTargetAmount || 0,
            emergencyFundProgress: Math.round(emergencyFundProgress) || 0,
            emergencyFundCoverage: emergencyFundCoverage || 0,
            totalDebt: totalDebt || 0,
            debtToIncomeRatio: debtToIncomeRatio || 0,
            totalIncome: totalIncome || 0,
            totalExpenses: totalExpenses || 0,
            totalSavings: totalSavings || 0,
            categoryData: categoryData,
            subcategoryBreakdown: subcategoryBreakdown || {},
            savingsGrowthProjection: this.calculateSavingsProjection(totalSavings),
            incomeChangeScenarios: this.calculateIncomeScenarios(totalIncome, totalExpenses),
            expenseChangeScenarios: this.calculateExpenseScenarios(totalIncome, totalExpenses)
        };
    }

    // Helper method for savings growth projection
    calculateSavingsProjection(monthlySavings) {
        const months = [1, 3, 6, 12, 24, 36];
        return months.map(month => ({
            month,
            amount: (monthlySavings || 0) * month,
            withInterest: ((monthlySavings || 0) * month) * (1 + 0.02) // Assuming 2% annual return
        }));
    }

    // Helper method for income change scenarios
    calculateIncomeScenarios(currentIncome, currentExpenses) {
        const scenarios = [-20, -10, -5, 0, 5, 10, 20];
        return scenarios.map(changePercent => {
            const newIncome = (currentIncome || 0) * (1 + changePercent / 100);
            const newBalance = newIncome - (currentExpenses || 0);
            const newSavingsRate = newIncome > 0 ? Math.round((newBalance / newIncome) * 100) : 0;
            return {
                changePercent,
                newIncome: Math.round(newIncome),
                newBalance: Math.round(newBalance),
                newSavingsRate,
                color: newBalance >= 0 ? (newBalance > currentIncome * 0.1 ? 'success' : 'warning') : 'danger'
            };
        });
    }

    // Helper method for expense change scenarios
    calculateExpenseScenarios(currentIncome, currentExpenses) {
        const scenarios = [-20, -10, -5, 0, 5, 10, 20];
        return scenarios.map(changePercent => {
            const newExpenses = (currentExpenses || 0) * (1 + changePercent / 100);
            const newBalance = (currentIncome || 0) - newExpenses;
            const newSavingsRate = currentIncome > 0 ? Math.round((newBalance / currentIncome) * 100) : 0;
            return {
                changePercent,
                newExpenses: Math.round(newExpenses),
                newBalance: Math.round(newBalance),
                newSavingsRate,
                color: newBalance >= 0 ? (newBalance > currentIncome * 0.1 ? 'success' : 'warning') : 'danger'
            };
        });
    }

    // ==========================================================================
    // THEME MANAGEMENT
    // ==========================================================================

    /**
     * Initialize theme
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('budgetTheme') || 
            (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        this.setTheme(savedTheme);

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('budgetTheme')) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        this.settings.theme = theme;
        document.documentElement.setAttribute('data-bs-theme', theme);
        
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
        }

        localStorage.setItem('budgetTheme', theme);
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const newTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    // ==========================================================================
    // UTILITY METHODS
    // ==========================================================================

    /**
     * Format number for display
     */
    formatNumber(number) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(number);
    }

    /**
     * Capitalize string
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Convert monthly amount to pay period amount
     */
    convertToPayPeriod(monthlyAmount, payPeriods) {
        // payPeriods is the number of pay periods per year
        // 52 = weekly, 26 = bi-weekly, 24 = semi-monthly, 12 = monthly
        return (monthlyAmount * 12) / payPeriods;
    }

    /**
     * Get pay period label from number of periods
     */
    getPayPeriodLabel(payPeriods) {
        const labels = {
            52: 'Weekly',
            26: 'Bi-weekly', 
            24: 'Semi-monthly',
            12: 'Monthly'
        };
        return labels[payPeriods] || 'Bi-weekly';
    }

    /**
     * Get sharing method label
     */
    // Initialize custom percentages for all people
    initializeCustomPercentages() {
        if (!this.settings.customPercentages) {
            this.settings.customPercentages = {};
        }
        
        // Set equal percentages for all people if not already set
        const equalPercentage = Math.round(100 / this.people.length * 100) / 100;
        let totalAssigned = 0;
        
        this.people.forEach((person, index) => {
            if (!this.settings.customPercentages[person.id]) {
                if (index === this.people.length - 1) {
                    // Last person gets the remainder to ensure exactly 100%
                    this.settings.customPercentages[person.id] = 100 - totalAssigned;
                } else {
                    this.settings.customPercentages[person.id] = equalPercentage;
                    totalAssigned += equalPercentage;
                }
            }
        });
    }

    // Render custom split sliders
    renderCustomSplitSliders() {
        const container = document.getElementById('customSlidersContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.people.forEach(person => {
            const percentage = this.settings.customPercentages[person.id] || 0;
            
            const sliderDiv = document.createElement('div');
            sliderDiv.className = 'mb-4';
            sliderDiv.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="form-label mb-0">
                        ${person.name} <span class="text-muted">(${percentage.toFixed(1)}%)</span>
                    </label>
                </div>
                <div class="row g-1 mb-2">
                    <div class="col">
                        <button type="button" class="btn btn-outline-primary btn-sm w-100" data-percentage="25" data-person-id="${person.id}">25%</button>
                    </div>
                    <div class="col">
                        <button type="button" class="btn btn-outline-primary btn-sm w-100" data-percentage="50" data-person-id="${person.id}">50%</button>
                    </div>
                    <div class="col">
                        <button type="button" class="btn btn-outline-primary btn-sm w-100" data-percentage="75" data-person-id="${person.id}">75%</button>
                    </div>
                </div>
                <input type="range" class="form-range" id="customSlider_${person.id}" 
                       min="0" max="100" step="1" value="${percentage.toFixed(1)}"
                       data-person-id="${person.id}" style="margin-bottom: 8px;">
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar" role="progressbar" style="width: ${percentage}%" 
                         aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            `;
            
            container.appendChild(sliderDiv);
            
            // Add event listeners for quick percentage buttons
            sliderDiv.querySelectorAll('button[data-percentage]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetPercentage = parseFloat(e.target.getAttribute('data-percentage'));
                    this.updateCustomPercentage(person.id, targetPercentage);
                });
            });
            
            // Add event listener for immediate, smooth slider response
            const slider = sliderDiv.querySelector('input[type="range"]');
            
            // Handle every slider movement immediately
            slider.addEventListener('input', (e) => {
                const newValue = parseFloat(e.target.value);
                // Use lightweight update during dragging
                this.updateCustomPercentageLightweight(person.id, newValue, true);
            });
            
            // Handle final value when user stops dragging
            slider.addEventListener('change', (e) => {
                const newValue = parseFloat(e.target.value);
                // Full update when dragging ends
                this.updateCustomPercentageLightweight(person.id, newValue, false);
            });
        });
    }

    // Update slider values without recreating them
    updateSliderValues() {
        this.people.forEach(person => {
            const personDiv = document.querySelector(`[data-person-id="${person.id}"]`)?.closest('.mb-4');
            const percentage = this.settings.customPercentages[person.id] || 0;
            
            if (personDiv) {
                // Update label
                const label = personDiv.querySelector('.form-label');
                if (label) {
                    label.innerHTML = `${person.name} <span class="text-muted">(${percentage.toFixed(1)}%)</span>`;
                }
                
                // Update slider
                const slider = personDiv.querySelector('input[type="range"]');
                if (slider) {
                    slider.value = percentage.toFixed(1);
                }
                
                // Update progress bar
                const progressBar = personDiv.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${percentage}%`;
                    progressBar.setAttribute('aria-valuenow', percentage);
                }
            }
        });
    }

    // Immediate visual update during slider movement (no rebalancing yet)
    updateCustomPercentageImmediate(personId, newPercentage) {
        // Just update the visual elements for this person immediately
        const personDiv = document.querySelector(`input[data-person-id="${personId}"]`)?.closest('.mb-4');
        
        if (personDiv) {
            // Update label
            const label = personDiv.querySelector('.form-label');
            if (label) {
                const person = this.people.find(p => p.id === personId);
                if (person) {
                    label.innerHTML = `${person.name} <span class="text-muted">(${newPercentage.toFixed(1)}%)</span>`;
                }
            }
            
            // Update progress bar
            const progressBar = personDiv.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${newPercentage}%`;
                progressBar.setAttribute('aria-valuenow', newPercentage);
            }
        }
    }

    // Update custom percentage and rebalance others
    // Lightweight update that avoids render() calls during dragging
    updateCustomPercentageLightweight(personId, newPercentage, isDragging) {
        const oldPercentage = this.settings.customPercentages[personId] || 0;
        
        // Don't process if the value hasn't actually changed
        if (Math.abs(newPercentage - oldPercentage) < 0.01) return;
        
        // Update this person's percentage
        this.settings.customPercentages[personId] = newPercentage;
        
        // Get other people to redistribute the difference
        const otherPeople = this.people.filter(p => p.id !== personId);
        
        if (otherPeople.length === 0) {
            // Only one person, just set to 100%
            this.settings.customPercentages[personId] = 100;
        } else {
            // Calculate what's left for others
            const remainingPercentage = 100 - newPercentage;
            
            if (remainingPercentage <= 0) {
                // If at or over 100%, set others to 0
                otherPeople.forEach(person => {
                    this.settings.customPercentages[person.id] = 0;
                });
            } else {
                // Get current total of other people
                const currentOtherTotal = otherPeople.reduce((sum, person) => {
                    return sum + (this.settings.customPercentages[person.id] || 0);
                }, 0);
                
                if (currentOtherTotal > 0) {
                    // Distribute proportionally based on current values
                    otherPeople.forEach(person => {
                        const currentPercentage = this.settings.customPercentages[person.id] || 0;
                        const proportion = currentPercentage / currentOtherTotal;
                        this.settings.customPercentages[person.id] = remainingPercentage * proportion;
                    });
                } else {
                    // If others are all 0, distribute equally
                    const equalShare = remainingPercentage / otherPeople.length;
                    otherPeople.forEach(person => {
                        this.settings.customPercentages[person.id] = equalShare;
                    });
                }
            }
        }
        
        // Update visual elements for current person
        this.updateCurrentPersonVisual(personId);
        
        // Update visual elements for other people
        this.updateOtherSlidersVisualOnly(personId);
        
        // Only do full save/render when not actively dragging
        if (!isDragging) {
            this.saveData();
            this.render();
        }
    }

    // Update visual elements for the current person being dragged
    updateCurrentPersonVisual(personId) {
        const personDiv = document.querySelector(`[data-person-id="${personId}"]`)?.closest('.mb-4');
        const percentage = this.settings.customPercentages[personId] || 0;
        
        if (personDiv) {
            const person = this.people.find(p => p.id === personId);
            if (!person) return;
            
            // Update label
            const label = personDiv.querySelector('.form-label');
            if (label) {
                label.innerHTML = `${person.name} <span class="text-muted">(${percentage.toFixed(1)}%)</span>`;
            }
            
            // Update progress bar (don't update slider value as user is dragging it)
            const progressBar = personDiv.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
                progressBar.setAttribute('aria-valuenow', percentage);
            }
        }
    }

    // Update visual elements only (no render calls)
    updateOtherSlidersVisualOnly(excludePersonId) {
        this.people.forEach(person => {
            if (person.id === excludePersonId) return; // Skip the person being dragged
            
            const personDiv = document.querySelector(`[data-person-id="${person.id}"]`)?.closest('.mb-4');
            const percentage = this.settings.customPercentages[person.id] || 0;
            
            if (personDiv) {
                // Update label
                const label = personDiv.querySelector('.form-label');
                if (label) {
                    label.innerHTML = `${person.name} <span class="text-muted">(${percentage.toFixed(1)}%)</span>`;
                }
                
                // Update slider value (this is safe because we exclude the one being dragged)
                const slider = personDiv.querySelector('input[type="range"]');
                if (slider) {
                    slider.value = percentage.toFixed(1);
                }
                
                // Update progress bar
                const progressBar = personDiv.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${percentage}%`;
                    progressBar.setAttribute('aria-valuenow', percentage);
                }
            }
        });
    }

    updateCustomPercentage(personId, newPercentage) {
        const oldPercentage = this.settings.customPercentages[personId] || 0;
        
        // Don't process if the value hasn't actually changed
        if (Math.abs(newPercentage - oldPercentage) < 0.01) return;
        
        // Get other people to redistribute the difference
        const otherPeople = this.people.filter(p => p.id !== personId);
        
        if (otherPeople.length === 0) {
            // Only one person, just set to 100%
            this.settings.customPercentages[personId] = 100;
        } else {
            // Calculate what's left for others
            const remainingPercentage = 100 - newPercentage;
            
            if (remainingPercentage < 0) {
                // If trying to go over 100%, cap at 100% and set others to 0
                this.settings.customPercentages[personId] = 100;
                otherPeople.forEach(person => {
                    this.settings.customPercentages[person.id] = 0;
                });
            } else if (remainingPercentage === 0) {
                // If at 100%, set others to 0
                this.settings.customPercentages[personId] = 100;
                otherPeople.forEach(person => {
                    this.settings.customPercentages[person.id] = 0;
                });
            } else {
                // Normal case: distribute remaining percentage proportionally
                this.settings.customPercentages[personId] = newPercentage;
                
                // Get current total of other people
                const currentOtherTotal = otherPeople.reduce((sum, person) => {
                    return sum + (this.settings.customPercentages[person.id] || 0);
                }, 0);
                
                if (currentOtherTotal > 0) {
                    // Distribute proportionally based on current values
                    otherPeople.forEach(person => {
                        const currentPercentage = this.settings.customPercentages[person.id] || 0;
                        const proportion = currentPercentage / currentOtherTotal;
                        this.settings.customPercentages[person.id] = remainingPercentage * proportion;
                    });
                } else {
                    // If others are all 0, distribute equally
                    const equalShare = remainingPercentage / otherPeople.length;
                    otherPeople.forEach(person => {
                        this.settings.customPercentages[person.id] = equalShare;
                    });
                }
            }
        }
        
        // Update only OTHER sliders (not the one being dragged to avoid interference)
        this.updateOtherSliders(personId);
        
        // Update displays
        this.saveData();
        this.render();
    }

    // Update slider values for everyone EXCEPT the person being dragged
    updateOtherSliders(excludePersonId) {
        this.people.forEach(person => {
            if (person.id === excludePersonId) return; // Skip the person being dragged
            
            const personDiv = document.querySelector(`[data-person-id="${person.id}"]`)?.closest('.mb-4');
            const percentage = this.settings.customPercentages[person.id] || 0;
            
            if (personDiv) {
                // Update label
                const label = personDiv.querySelector('.form-label');
                if (label) {
                    label.innerHTML = `${person.name} <span class="text-muted">(${percentage.toFixed(1)}%)</span>`;
                }
                
                // Update slider value
                const slider = personDiv.querySelector('input[type="range"]');
                if (slider) {
                    slider.value = percentage.toFixed(1);
                }
                
                // Update progress bar
                const progressBar = personDiv.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${percentage}%`;
                    progressBar.setAttribute('aria-valuenow', percentage);
                }
            }
        });
    }

    getSharingMethodLabel(method) {
        const labels = {
            percentage: '📊 Weighted by Income',
            even: '⚖️ Split Evenly',
            custom: '🎛️ Custom Split'
        };
        return labels[method] || method;
    }

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Cancel all editing states
     */
    cancelEditing() {
        this.editingPerson = null;
        this.editingExpense = null;
        this.render();
    }

    // ==========================================================================
    // UI FEEDBACK METHODS
    // ==========================================================================

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('notificationToast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');

        // Set content
        toastMessage.textContent = message;

        // Set type and icon
        const types = {
            success: { title: 'Success', icon: 'bi bi-check-circle text-success' },
            error: { title: 'Error', icon: 'bi bi-exclamation-circle text-danger' },
            warning: { title: 'Warning', icon: 'bi bi-exclamation-triangle text-warning' },
            info: { title: 'Info', icon: 'bi bi-info-circle text-primary' }
        };

        const toastType = types[type] || types.info;
        toastTitle.textContent = toastType.title;
        toastIcon.className = toastType.icon;

        // Show toast
        const bsToast = new bootstrap.Toast(toast, { delay: duration });
        bsToast.show();
    }

    /**
     * Show confirmation modal
     */
    showConfirm(title, message, onConfirm, onCancel = null) {
        const modal = document.getElementById('confirmModal');
        const modalTitle = document.getElementById('confirmModalTitle');
        const modalBody = document.getElementById('confirmModalBody');
        const confirmBtn = document.getElementById('confirmModalAction');

        modalTitle.textContent = title;
        modalBody.textContent = message;

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        
        // Set up one-time event listener for confirm
        const handleConfirm = () => {
            onConfirm();
            bsModal.hide(); // Close the modal after confirmation
            confirmBtn.removeEventListener('click', handleConfirm);
            modal.removeEventListener('hidden.bs.modal', handleCancel);
        };

        // Set up one-time event listener for cancel/dismiss
        const handleCancel = () => {
            if (onCancel) {
                onCancel();
            }
            confirmBtn.removeEventListener('click', handleConfirm);
            modal.removeEventListener('hidden.bs.modal', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        modal.addEventListener('hidden.bs.modal', handleCancel, { once: true });

        bsModal.show();
    }

    // ==========================================================================
    // EXPORT & SHARING
    // ==========================================================================

    /**
     * Share budget
     */
    async shareBudget() {
        try {
            // Validate that we have data to share
            if (this.people.length === 0 && this.expenses.length === 0) {
                this.showToast('No budget data to share. Please add people and expenses first.', 'warning');
                return;
            }

            // Category mapping for shorter encoding
            const categoryMap = {
                'bills': '1', 'food': '2', 'transport': '3', 'entertainment': '4',
                'savings': '5', 'emergency': '6', 'housing': '7', 'healthcare': '8',
                'utilities': '9', 'insurance': '10', 'debt': '11', 'other': '12'
            };
            
            // Sharing method mapping
            const sharingMap = { 'even': 'e', 'percentage': 'p', 'custom': 'c' };

            // Create ultra-compressed shareable data with minimal property names
            const shareData = {};
            
            // People data (use 'p')
            shareData.p = this.people.map(person => {
                const data = [person.name, person.payPerPeriod || person.biWeeklyPay || 0];
                // Only include payPeriods if different from default
                if (person.payPeriods && person.payPeriods !== 26) {
                    data.push(person.payPeriods);
                }
                // Only include ID if there are custom percentages for this person
                if (this.settings.customPercentages && this.settings.customPercentages[person.id]) {
                    // If we're adding ID but payPeriods wasn't added, we need a placeholder
                    if (data.length === 2) {
                        data.push(26); // Add default payPeriods as placeholder
                    }
                    data.push(person.id);
                }
                return data;
            });
            
            // Expenses data (use 'e')
            shareData.e = this.expenses.map(expense => {
                const data = [
                    expense.name,
                    expense.monthlyAmount,
                    categoryMap[expense.category] || '12', // Default to 'other'
                    sharingMap[expense.sharingMethod] || 'e' // Default to 'even'
                ];
                // Only include subCategory if it exists and isn't empty
                if (expense.subcategory && expense.subcategory.trim() !== '') {
                    data.push(expense.subcategory);
                }
                return data;
            });

            // Settings (use 's', only include non-default values)
            const settings = {};
            if (this.settings.emergencyFundTarget && this.settings.emergencyFundTarget > 0) {
                settings.f = this.settings.emergencyFundTarget; // 'f' instead of 'ef'
            }
            if (this.settings.emergencyFundTargetMonths && this.settings.emergencyFundTargetMonths !== 6) {
                settings.m = this.settings.emergencyFundTargetMonths; // 'm' instead of 'em'
            }
            if (this.settings.customPercentages && Object.keys(this.settings.customPercentages).length > 0) {
                settings.c = this.settings.customPercentages; // 'c' instead of 'cp'
            }
            
            // Only include settings if not empty
            if (Object.keys(settings).length > 0) {
                shareData.s = settings;
            }

            // Compress and encode the data
            const jsonString = JSON.stringify(shareData);
            const encodedData = btoa(jsonString);
            
            // Create shareable URL - handle different protocols
            let baseUrl;
            if (window.location.protocol === 'file:') {
                // For file:// protocol, clean the URL of any existing parameters or hash
                baseUrl = window.location.href.split('?')[0].split('#')[0];
            } else {
                baseUrl = window.location.origin + window.location.pathname;
            }
            const shareUrl = `${baseUrl}?b=${encodedData}`;

            // Log compression stats for debugging
            const originalData = { people: this.people, expenses: this.expenses, settings: this.settings };
            const originalSize = JSON.stringify(originalData).length;
            const compressedSize = jsonString.length;
            const reduction = Math.round((1 - compressedSize/originalSize) * 100);
            console.log(`Budget sharing - Compression: ${originalSize} → ${compressedSize} chars (${reduction}% reduction)`);

            // Check if Web Share API is supported
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Family Budget Tool - Shared Budget',
                        text: 'Check out this budget breakdown!',
                        url: shareUrl
                    });
                    this.showToast('Budget shared successfully!', 'success');
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        // If sharing failed (not user cancellation), fall back to clipboard
                        await this.copyToClipboard(shareUrl);
                    }
                }
            } else {
                // Fall back to copying to clipboard
                await this.copyToClipboard(shareUrl);
            }

        } catch (error) {
            console.error('Error sharing budget:', error);
            this.showToast('Error creating shareable link', 'error');
        }
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Budget link copied to clipboard!', 'success');
        } catch (error) {
            this.showToast('Could not copy to clipboard', 'error');
        }
    }

    /**
     * Export to PDF
     */
    exportToPDF() {
        this.showToast('PDF export feature coming soon!', 'info');
    }

    /**
     * Clear all data
     */
    confirmClearAll() {
        const totalItems = this.people.length + this.expenses.length;
        
        if (totalItems === 0) {
            this.showToast('No data to clear', 'info');
            return;
        }

        this.showConfirm(
            'Clear All Data?',
            `Are you sure you want to remove all data? This will delete ${this.people.length} people and ${this.expenses.length} expenses. This action cannot be undone.`,
            () => {
                this.people = [];
                this.expenses = [];
                this.settings.emergencyFundTarget = 0;
                this.saveData();
                this.render();
                this.showToast('All data cleared', 'info');
            }
        );
    }
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================

/**
 * Convert compressed share data back to full format
 */
function convertCompressedData(shareData) {
    // Category mapping (reverse of compression)
    const categoryMap = {
        '1': 'bills', '2': 'food', '3': 'transport', '4': 'entertainment',
        '5': 'savings', '6': 'emergency', '7': 'housing', '8': 'healthcare',
        '9': 'utilities', '10': 'insurance', '11': 'debt', '12': 'other'
    };
    
    // Sharing method mapping (reverse)
    const sharingMap = { 'e': 'even', 'p': 'percentage', 'c': 'custom' };

    const result = {
        people: [],
        expenses: [],
        settings: {
            emergencyFundTarget: 0,
            emergencyFundTargetMonths: 6,
            customPercentages: {}
        }
    };

    // Convert people data
    if (shareData.p && Array.isArray(shareData.p)) {
        result.people = shareData.p.map((personData, index) => {
            const person = {
                id: index + 1, // Default ID
                name: personData[0] || `Person ${index + 1}`,
                payPerPeriod: personData[1] || 0,
                payPeriods: 26 // Default to bi-weekly
            };
            
            // Handle variable-length array structure
            if (personData.length >= 3) {
                // Check if third element is payPeriods (number) or ID
                if (typeof personData[2] === 'number' && personData[2] !== person.id) {
                    person.payPeriods = personData[2];
                    // Check if fourth element is ID
                    if (personData.length >= 4) {
                        person.id = personData[3];
                    }
                } else {
                    // Third element is ID, payPeriods remains default
                    person.id = personData[2];
                }
            }
            
            // For backward compatibility, set biWeeklyPay to equal payPerPeriod
            person.biWeeklyPay = person.payPerPeriod;
            
            return person;
        });
    }

    // Convert expenses data
    if (shareData.e && Array.isArray(shareData.e)) {
        result.expenses = shareData.e.map((expenseData, index) => ({
            id: index + 1,
            name: expenseData[0] || `Expense ${index + 1}`,
            monthlyAmount: expenseData[1] || 0,
            category: categoryMap[expenseData[2]] || 'other',
            sharingMethod: sharingMap[expenseData[3]] || 'even',
            subcategory: expenseData[4] || ''
        }));
    }

    // Convert settings
    if (shareData.s && typeof shareData.s === 'object') {
        // Handle both old and new property names for backward compatibility
        if (shareData.s.f !== undefined || shareData.s.ef !== undefined) {
            result.settings.emergencyFundTarget = shareData.s.f || shareData.s.ef;
        }
        if (shareData.s.m !== undefined || shareData.s.em !== undefined) {
            result.settings.emergencyFundTargetMonths = shareData.s.m || shareData.s.em;
        }
        if (shareData.s.c || shareData.s.cp) {
            result.settings.customPercentages = shareData.s.c || shareData.s.cp;
        }
    }

    return result;
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

// Initialize the budget tool when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check for shared data in URL
    const urlParams = new URLSearchParams(window.location.search);
    const compressedData = urlParams.get('b'); // New compressed format
    const legacyData = urlParams.get('data'); // Old format for backwards compatibility
    
    if (compressedData) {
        try {
            // Decode compressed data
            const jsonString = atob(compressedData);
            const shareData = JSON.parse(jsonString);
            
            // Convert compressed data back to full format
            const budgetData = convertCompressedData(shareData);
            
            // Store shared data temporarily
            localStorage.setItem('sharedBudgetData', JSON.stringify(budgetData));
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            console.error('Error parsing compressed shared data:', error);
            // Try to show user-friendly error
            setTimeout(() => {
                if (window.budgetTool) {
                    window.budgetTool.showToast('Invalid or corrupted share link', 'error');
                }
            }, 1000);
        }
    } else if (legacyData) {
        try {
            // Handle legacy format
            const parsedData = JSON.parse(decodeURIComponent(legacyData));
            localStorage.setItem('sharedBudgetData', JSON.stringify(parsedData));
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            console.error('Error parsing legacy shared data:', error);
        }
    }

    // Initialize the budget tool
    window.budgetTool = new ResponsiveBudgetTool();

    // Add subcategory change listener for custom input
    const subCategorySelect = document.getElementById('subCategory');
    const customSubCategoryContainer = document.getElementById('customSubCategoryContainer');
    const customSubCategoryInput = document.getElementById('customSubCategory');

    if (subCategorySelect && customSubCategoryContainer && customSubCategoryInput) {
        subCategorySelect.addEventListener('change', function() {
            if (this.value === 'other') {
                customSubCategoryContainer.classList.remove('d-none');
                customSubCategoryInput.focus();
            } else {
                customSubCategoryContainer.classList.add('d-none');
                customSubCategoryInput.value = '';
            }
        });
    }

    // Handle shared data if present
    const sharedBudgetData = localStorage.getItem('sharedBudgetData');
    if (sharedBudgetData) {
        try {
            const data = JSON.parse(sharedBudgetData);
            budgetTool.showConfirm(
                'Load Shared Budget?',
                'A shared budget was detected. Would you like to load it? This will replace your current budget data.',
                () => {
                    budgetTool.people = data.people || [];
                    budgetTool.expenses = data.expenses || [];
                    budgetTool.settings = { ...budgetTool.settings, ...data.settings };
                    budgetTool.saveData();
                    budgetTool.render();
                    budgetTool.showToast('Shared budget loaded successfully!', 'success');
                }
            );
        } catch (error) {
            console.error('Error loading shared data:', error);
        } finally {
            localStorage.removeItem('sharedBudgetData');
        }
    }
});

// Handle page visibility change to save data
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && window.budgetTool) {
        window.budgetTool.saveData();
    }
});

// Handle before unload to save data
window.addEventListener('beforeunload', () => {
    if (window.budgetTool) {
        window.budgetTool.saveData();
    }
});
