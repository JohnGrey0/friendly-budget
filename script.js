class BudgetTool {
    constructor() {
        this.people = JSON.parse(localStorage.getItem('budgetPeople')) || [];
        this.expenses = JSON.parse(localStorage.getItem('budgetExpenses')) || [];
        this.payPeriods = parseInt(localStorage.getItem('budgetPayPeriods')) || 26;
        this.globalSharingMethod = localStorage.getItem('budgetGlobalSharingMethod') || 'percentage';
        this.analyticsPeriod = localStorage.getItem('budgetAnalyticsPeriod') || 'biweekly';
        this.currentEmergencyFund = parseFloat(localStorage.getItem('budgetCurrentEmergencyFund')) || 0;
        this.emergencyFundTargetMonths = parseInt(localStorage.getItem('budgetEmergencyFundTargetMonths')) || 6;
        
        // Category toggle states
        this.categoryToggleStates = JSON.parse(localStorage.getItem('budgetCategoryToggleStates')) || {};
        this.expenseCategoryToggleStates = JSON.parse(localStorage.getItem('budgetExpenseCategoryToggleStates')) || {};
        
        // Migrate existing expenses to have sharing method
        this.expenses.forEach(expense => {
            if (!expense.sharingMethod) {
                expense.sharingMethod = 'percentage'; // default to percentage-based sharing for existing expenses
            }
        });
        
        // Migrate existing people to have individual pay periods
        this.people.forEach(person => {
            if (!person.payPeriods) {
                person.payPeriods = this.payPeriods; // Use the global pay periods as default
            }
        });
        
        this.initializeEventListeners();
        
        // Check for shared budget in URL after initialization
        this.loadSharedBudget();
        
        this.render();
        
        // Recalculate income after everything is initialized
        this.recalculatePeopleIncome();
        this.saveData(); // Save the migrated data
    }

    initializeEventListeners() {
        // Add person
        document.getElementById('addPerson').addEventListener('click', () => {
            this.addPerson();
        });

        // Add Enter key support for people form
        const peopleFormInputs = ['personName', 'biWeeklyPay', 'personPayPeriods'];
        peopleFormInputs.forEach(inputId => {
            document.getElementById(inputId).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addPerson();
                }
            });
        });

        // Add expense
        document.getElementById('addExpense').addEventListener('click', () => {
            this.addExpense();
        });

        // Add Enter key support for expense form
        const expenseFormInputs = ['expenseName', 'monthlyAmount', 'subCategory'];
        expenseFormInputs.forEach(inputId => {
            document.getElementById(inputId).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addExpense();
                }
            });
        });

        // Clear all expenses
        document.getElementById('clearAllExpenses').addEventListener('click', () => {
            this.clearAllExpenses();
        });

        // Refresh expense table
        document.getElementById('refreshExpenseTable').addEventListener('click', () => {
            this.refreshExpenseTable();
        });

        // Apply global sharing method
        document.getElementById('setPercentageSharing').addEventListener('click', () => {
            this.setGlobalSharingMethod('percentage');
        });

        document.getElementById('setEvenSharing').addEventListener('click', () => {
            this.setGlobalSharingMethod('even');
        });

        // Analytics period toggle
        document.getElementById('setBiWeeklyPeriod').addEventListener('click', () => {
            this.setAnalyticsPeriod('biweekly');
        });

        document.getElementById('setMonthlyPeriod').addEventListener('click', () => {
            this.setAnalyticsPeriod('monthly');
        });

        document.getElementById('setYearlyPeriod').addEventListener('click', () => {
            this.setAnalyticsPeriod('yearly');
        });

        // Enter key handling
        document.getElementById('personName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPerson();
        });

        document.getElementById('biWeeklyPay').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPerson();
        });

        document.getElementById('personPayPeriods').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPerson();
        });

        // Update placeholder text when pay period changes
        document.getElementById('personPayPeriods').addEventListener('change', (e) => {
            this.updatePayPlaceholder();
        });

        // Initialize placeholder text
        this.updatePayPlaceholder();

        document.getElementById('expenseName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addExpense();
        });

        document.getElementById('monthlyAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addExpense();
        });

        document.getElementById('subCategory').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addExpense();
        });

        // PDF Export
        document.getElementById('exportPdf').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Share Budget
        document.getElementById('shareBudget').addEventListener('click', () => {
            this.shareBudget();
        });

        // Clear All Data
        document.getElementById('clearAllData').addEventListener('click', () => {
            this.clearAllData();
        });

        // Analytics period toggle
        document.getElementById('setBiWeeklyPeriod').addEventListener('click', () => {
            this.setAnalyticsPeriod('biweekly');
        });

        document.getElementById('setMonthlyPeriod').addEventListener('click', () => {
            this.setAnalyticsPeriod('monthly');
        });

        document.getElementById('setYearlyPeriod').addEventListener('click', () => {
            this.setAnalyticsPeriod('yearly');
        });

        // Enter key handling
        document.getElementById('personName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPerson();
        });

        document.getElementById('biWeeklyPay').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPerson();
        });

        document.getElementById('expenseName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addExpense();
        });

        document.getElementById('monthlyAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addExpense();
        });

        document.getElementById('subCategory').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addExpense();
        });

        // Event delegation for remove buttons
        document.addEventListener('click', (e) => {
            // Handle remove person buttons
            if (e.target.classList.contains('remove-person-btn') || e.target.closest('.remove-person-btn')) {
                const button = e.target.classList.contains('remove-person-btn') ? e.target : e.target.closest('.remove-person-btn');
                const personId = parseInt(button.getAttribute('data-person-id'));
                this.removePerson(personId);
            }
            // Handle remove expense buttons
            else if (e.target.classList.contains('remove-expense-btn') || e.target.closest('.remove-expense-btn')) {
                const button = e.target.classList.contains('remove-expense-btn') ? e.target : e.target.closest('.remove-expense-btn');
                const expenseId = parseInt(button.getAttribute('data-expense-id'));
                this.removeExpense(expenseId);
            }
        });
    }

    addPerson() {
        const name = document.getElementById('personName').value.trim();
        const biWeeklyPay = parseFloat(document.getElementById('biWeeklyPay').value);
        const payPeriods = parseInt(document.getElementById('personPayPeriods').value);

        if (!name || isNaN(biWeeklyPay) || biWeeklyPay <= 0) {
            this.showAlert('Please enter a valid name and pay amount.', 'Invalid Input', 'error');
            return;
        }

        const person = {
            id: Date.now(),
            name,
            biWeeklyPay,
            payPeriods,
            monthlyPay: this.calculateMonthlyFromBiWeekly(biWeeklyPay, payPeriods),
            yearlyPay: biWeeklyPay * payPeriods
        };

        this.people.push(person);
        this.clearPersonForm();
        this.saveData();
        this.render();
        
        // Focus on name field for easy consecutive entry
        document.getElementById('personName').focus();
    }

    addExpense() {
        const name = document.getElementById('expenseName').value.trim();
        const monthlyAmount = parseFloat(document.getElementById('monthlyAmount').value);
        const category = document.getElementById('category').value;
        const subCategory = document.getElementById('subCategory').value.trim();
        const sharingMethod = document.getElementById('sharingMethod').value;

        if (!name || isNaN(monthlyAmount) || monthlyAmount <= 0) {
            this.showAlert('Please enter a valid expense name and monthly amount.', 'Invalid Input', 'error');
            return;
        }

        const expense = {
            id: Date.now(),
            name,
            monthlyAmount,
            biWeeklyAmount: this.calculateBiWeeklyFromMonthly(monthlyAmount),
            category,
            subCategory,
            sharingMethod
        };

        this.expenses.push(expense);
        this.clearExpenseForm();
        this.saveData();
        this.render();
    }

    setGlobalSharingMethod(method) {
        this.globalSharingMethod = method;
        
        // Update button states
        const buttons = document.querySelectorAll('.btn-toggle');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-method') === method) {
                btn.classList.add('active');
            }
        });

        // Update the expense form dropdown to match
        document.getElementById('sharingMethod').value = method;

        if (this.expenses.length === 0) {
            this.saveData(); // Save the global setting even if no expenses
            return;
        }

        // Update all expenses with the selected sharing method
        this.expenses.forEach(expense => {
            expense.sharingMethod = method;
        });

        this.saveData();
        this.render();
    }

    setAnalyticsPeriod(period) {
        this.analyticsPeriod = period;
        
        // Update button states
        const buttons = document.querySelectorAll('.period-toggle-buttons .btn-toggle');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-period') === period) {
                btn.classList.add('active');
            }
        });

        localStorage.setItem('budgetAnalyticsPeriod', period);
        this.renderAnalytics(); // Re-render analytics with new period
    }

    async removePerson(id) {
        const person = this.people.find(p => p.id === id);
        if (!person) return;
        
        const confirmed = await this.showConfirm(
            `Are you sure you want to remove ${person.name} from the budget?`, 
            'Remove Person'
        );
        
        if (confirmed) {
            this.people = this.people.filter(person => person.id !== id);
            this.saveData();
            this.render();
        }
    }

    editPerson(id) {
        const person = this.people.find(p => p.id === id);
        if (!person) return;

        // Store original content in a data attribute
        const personElement = document.querySelector(`[data-person-id="${id}"]`);
        personElement.setAttribute('data-original-content', personElement.innerHTML);

        personElement.innerHTML = `
            <div class="person-edit-form">
                <div class="edit-inputs">
                    <div class="input-group">
                        <label for="editName_${id}">Name:</label>
                        <input type="text" id="editName_${id}" value="${person.name}" placeholder="Person's name">
                    </div>
                    <div class="input-group">
                        <label for="editPay_${id}">${this.getPayFrequencyLabel(person.payPeriods || 26)} Pay:</label>
                        <input type="number" id="editPay_${id}" value="${person.biWeeklyPay}" placeholder="${this.getPayFrequencyLabel(person.payPeriods || 26)} pay" step="0.01">
                    </div>
                </div>
                <div class="edit-buttons">
                    <button class="btn btn-primary" onclick="budgetTool.savePerson(${id})">Save</button>
                    <button class="btn btn-secondary" onclick="budgetTool.cancelEditPerson(${id})">Cancel</button>
                </div>
            </div>
        `;

        // Focus on the name input
        document.getElementById(`editName_${id}`).focus();

        // Add keyboard event listeners
        document.getElementById(`editName_${id}`).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.savePerson(id);
            if (e.key === 'Escape') this.cancelEditPerson(id);
        });

        document.getElementById(`editPay_${id}`).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.savePerson(id);
            if (e.key === 'Escape') this.cancelEditPerson(id);
        });
    }

    savePerson(id) {
        const newName = document.getElementById(`editName_${id}`).value.trim();
        const newPay = parseFloat(document.getElementById(`editPay_${id}`).value);

        if (!newName || isNaN(newPay) || newPay <= 0) {
            this.showAlert('Please enter a valid name and pay amount.', 'Invalid Input', 'error');
            return;
        }

        const person = this.people.find(p => p.id === id);
        if (person) {
            person.name = newName;
            person.biWeeklyPay = newPay;
            const payPeriods = person.payPeriods || this.payPeriods;
            person.monthlyPay = this.calculateMonthlyFromBiWeekly(newPay, payPeriods);
            person.yearlyPay = newPay * payPeriods;
        }

        this.saveData();
        this.render();
    }

    cancelEditPerson(id) {
        const personElement = document.querySelector(`[data-person-id="${id}"]`);
        const originalContent = personElement.getAttribute('data-original-content');
        personElement.innerHTML = originalContent;
        personElement.removeAttribute('data-original-content');
    }

    async removeExpense(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (!expense) return;
        
        const confirmed = await this.showConfirm(
            `Are you sure you want to remove the expense "${expense.name}"?`, 
            'Remove Expense'
        );
        
        if (confirmed) {
            this.expenses = this.expenses.filter(expense => expense.id !== id);
            this.saveData();
            this.render();
        }
    }

    async clearAllExpenses() {
        if (this.expenses.length === 0) {
            await this.showAlert('There are no expenses to clear.', 'No Expenses', 'info');
            return;
        }

        const confirmed = await this.showConfirm(
            `Are you sure you want to remove all ${this.expenses.length} expenses? This action cannot be undone.`, 
            'Clear All Expenses'
        );
        
        if (confirmed) {
            this.expenses = [];
            this.saveData();
            this.render();
            await this.showAlert('All expenses have been cleared.', 'Expenses Cleared', 'success');
        }
    }

    async clearAllData() {
        if (this.people.length === 0 && this.expenses.length === 0) {
            await this.showAlert('There is no data to clear.', 'No Data', 'info');
            return;
        }

        const dataCount = this.people.length + this.expenses.length;
        
        // Build a better formatted warning message with HTML
        let warningMessage = `⚠️ Are you sure you want to clear ALL budget data?\n\n`;
        warningMessage += `📊 <strong>WHAT WILL BE DELETED:</strong>\n`;
        warningMessage += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        warningMessage += `👥 <strong>People:</strong> ${this.people.length}\n`;
        warningMessage += `💰 <strong>Expenses:</strong> ${this.expenses.length}\n`;
        warningMessage += `⚙️ <strong>Settings:</strong> All preferences\n`;
        warningMessage += `💾 <strong>Storage:</strong> All saved data\n\n`;
        warningMessage += `🚨 <strong>This action CANNOT be undone!</strong>\n`;
        warningMessage += `You will get a completely fresh start.`;
        
        const confirmed = await this.showConfirm(
            warningMessage, 
            'Clear All Data'
        );
        
        if (confirmed) {
            // Clear all data arrays
            this.people = [];
            this.expenses = [];
            
            // Reset settings to defaults
            this.globalSharingMethod = 'percentage';
            this.analyticsPeriod = 'biweekly';
            
            // Clear localStorage
            localStorage.removeItem('budgetPeople');
            localStorage.removeItem('budgetExpenses');
            localStorage.removeItem('budgetGlobalSharingMethod');
            localStorage.removeItem('budgetAnalyticsPeriod');
            
            // Clear all form inputs
            document.getElementById('personName').value = '';
            document.getElementById('biWeeklyPay').value = '';
            document.getElementById('personPayPeriods').value = '26';
            document.getElementById('expenseName').value = '';
            document.getElementById('monthlyAmount').value = '';
            document.getElementById('category').value = 'bills';
            document.getElementById('subCategory').value = '';
            document.getElementById('sharingMethod').value = 'percentage';
            
            // Force complete re-render
            this.render();
            
            // Additional forced refresh of key components
            setTimeout(() => {
                this.renderAnalytics();
                this.renderBiWeeklySummary();
                this.renderPersonCategoryBreakdown();
                this.renderExcessFunds();
            }, 100);
            
            await this.showAlert('All data has been cleared. You now have a fresh start!', 'Data Cleared', 'success');
        }
    }

    refreshExpenseTable() {
        // Force a complete refresh of expense calculations and rendering
        this.recalculateExpenseBiWeekly();
        this.saveData();
        this.render();
        
        // Show a brief confirmation
        this.showAlert('Expense table refreshed successfully.', 'Table Refreshed', 'success');
    }

    calculateMonthlyFromBiWeekly(biWeeklyAmount, payPeriods) {
        return (biWeeklyAmount * payPeriods) / 12;
    }

    calculateBiWeeklyFromMonthly(monthlyAmount) {
        // Use household's weighted average pay periods
        const effectivePayPeriods = this.getHouseholdEffectivePayPeriods();
        return (monthlyAmount * 12) / effectivePayPeriods;
    }

    // Calculate the household's effective pay periods based on income weighting
    getHouseholdEffectivePayPeriods() {
        if (this.people.length === 0) {
            return 26; // Default to bi-weekly if no people
        }

        // Weight pay periods by each person's income contribution
        const totalYearlyIncome = this.people.reduce((sum, person) => sum + person.yearlyPay, 0);
        
        if (totalYearlyIncome === 0) {
            // If no income, use simple average
            const avgPayPeriods = this.people.reduce((sum, person) => sum + (person.payPeriods || 26), 0) / this.people.length;
            return avgPayPeriods;
        }

        // Weighted average based on income
        const weightedSum = this.people.reduce((sum, person) => {
            const payPeriods = person.payPeriods || 26;
            const weight = person.yearlyPay / totalYearlyIncome;
            return sum + (payPeriods * weight);
        }, 0);

        return weightedSum;
    }

    recalculatePeopleIncome() {
        this.people.forEach(person => {
            // Use person's individual pay periods if available, fallback to global
            const payPeriods = person.payPeriods || this.payPeriods;
            person.monthlyPay = this.calculateMonthlyFromBiWeekly(person.biWeeklyPay, payPeriods);
            person.yearlyPay = person.biWeeklyPay * payPeriods;
        });
    }

    recalculateExpenseBiWeekly() {
        this.expenses.forEach(expense => {
            expense.biWeeklyAmount = this.calculateBiWeeklyFromMonthly(expense.monthlyAmount);
        });
    }

    clearPersonForm() {
        document.getElementById('personName').value = '';
        document.getElementById('biWeeklyPay').value = '';
        document.getElementById('personPayPeriods').value = '26'; // Default to bi-weekly
    }

    clearExpenseForm() {
        document.getElementById('expenseName').value = '';
        document.getElementById('monthlyAmount').value = '';
        document.getElementById('subCategory').value = '';
        document.getElementById('sharingMethod').value = this.globalSharingMethod;
        
        // Focus back to the expense name input for easy continuous entry
        document.getElementById('expenseName').focus();
    }

    saveData() {
        localStorage.setItem('budgetPeople', JSON.stringify(this.people));
        localStorage.setItem('budgetExpenses', JSON.stringify(this.expenses));
        // Keep global payPeriods for backward compatibility, but individual person payPeriods take precedence
        localStorage.setItem('budgetPayPeriods', this.payPeriods.toString());
        localStorage.setItem('budgetGlobalSharingMethod', this.globalSharingMethod);
        localStorage.setItem('budgetCurrentEmergencyFund', this.currentEmergencyFund.toString());
        localStorage.setItem('budgetEmergencyFundTargetMonths', this.emergencyFundTargetMonths.toString());
        localStorage.setItem('budgetCategoryToggleStates', JSON.stringify(this.categoryToggleStates));
        localStorage.setItem('budgetExpenseCategoryToggleStates', JSON.stringify(this.expenseCategoryToggleStates));
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // Helper methods for analytics period calculations
    getAnalyticsAmount(biWeeklyAmount) {
        const effectivePayPeriods = this.getHouseholdEffectivePayPeriods();
        switch (this.analyticsPeriod) {
            case 'monthly':
                return biWeeklyAmount * effectivePayPeriods / 12;
            case 'yearly':
                return biWeeklyAmount * effectivePayPeriods;
            default: // biweekly
                return biWeeklyAmount;
        }
    }

    getAnalyticsLabel() {
        switch (this.analyticsPeriod) {
            case 'monthly':
                return 'Monthly';
            case 'yearly':
                return 'Yearly';
            default: // biweekly
                return 'Bi-weekly';
        }
    }

    getPersonAnalyticsAmount(person) {
        const biWeeklyPay = person.biWeeklyPay;
        switch (this.analyticsPeriod) {
            case 'monthly':
                return person.monthlyPay;
            case 'yearly':
                return person.yearlyPay;
            default: // biweekly
                return biWeeklyPay;
        }
    }

    calculatePercentDifference(amount, total) {
        if (total === 0) return 0;
        return ((amount / total) * 100).toFixed(1);
    }

    render() {
        this.renderSharingButtons();
        this.renderAnalyticsPeriodButtons();
        this.renderExpenseForm();
        this.renderPeople();
        this.renderExpenses();
        this.renderBiWeeklySummary();
        this.renderPersonCategoryBreakdown();
        this.renderExcessFunds();
        this.renderAnalytics();
        
        // Initialize table sorting after rendering
        setTimeout(() => this.initializeTableSorting(), 100);
    }

    renderSharingButtons() {
        const buttons = document.querySelectorAll('.btn-toggle');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-method') === this.globalSharingMethod) {
                btn.classList.add('active');
            }
        });
    }

    renderAnalyticsPeriodButtons() {
        const buttons = document.querySelectorAll('.period-toggle-buttons .btn-toggle');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-period') === this.analyticsPeriod) {
                btn.classList.add('active');
            }
        });
    }

    renderExpenseForm() {
        document.getElementById('sharingMethod').value = this.globalSharingMethod;
    }

    renderPeople() {
        const peopleList = document.getElementById('peopleList');
        
        if (this.people.length === 0) {
            peopleList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <div class="empty-title">No people added yet</div>
                    <div class="empty-subtitle">Add someone to get started with your budget!</div>
                </div>
            `;
            return;
        }

        const totalYearly = this.people.reduce((sum, person) => sum + person.yearlyPay, 0);

        let html = this.people.map((person, index) => {
            const incomePercentage = totalYearly > 0 ? (person.yearlyPay / totalYearly * 100) : 0;
            
            return `
                <div class="person-item compact" data-person-id="${person.id}">
                        <div class="person-header-with-toggle">
                        <div class="person-header">
                            <div class="person-avatar">
                                <div class="avatar-circle" style="background: ${this.getPersonColor(index)}">
                                    ${person.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div class="person-main-info">
                                <div class="person-name-container">
                                    <div class="person-name editable-person-field" data-field="name" data-type="text">${person.name}</div>
                                </div>
                                <div class="person-income-summary">
                                    <span class="primary-income editable-person-field" data-field="biWeeklyPay" data-type="number">${this.formatCurrency(person.biWeeklyPay)}</span>
                                    <span class="income-period">${person.payPeriods || 26} - ${this.getPayFrequencyLabel(person.payPeriods || 26)}</span>
                                </div>
                            </div>
                            <div class="person-contribution">
                                <div class="contribution-percentage">
                                    ${incomePercentage.toFixed(0)}%
                                </div>
                                <div class="contribution-label">contribution</div>
                            </div>
                            <div class="person-header-actions">
                                <button class="btn btn-danger btn-small remove-person-btn" data-person-id="${person.id}" title="Remove ${person.name}">
                                    🗑️
                                </button>
                            </div>
                        </div>
                        <button class="person-toggle-btn collapsed" data-person-id="${person.id}">
                            Details
                        </button>
                    </div>                    <div class="income-bar" style="margin-top: 15px;">
                        <div class="income-bar-fill" style="width: ${incomePercentage}%; background: ${this.getPersonColor(index)}"></div>
                    </div>
                    
                    <div class="person-details-expanded collapsed" data-person-id="${person.id}">
                        <div class="income-breakdown">
                            <div class="income-item">
                                <span class="income-label">Monthly</span>
                                <span class="income-value">${this.formatCurrency(person.monthlyPay)}</span>
                            </div>
                            <div class="income-item">
                                <span class="income-label">Yearly</span>
                                <span class="income-value">${this.formatCurrency(person.yearlyPay)}</span>
                            </div>
                            <div class="income-item">
                                <span class="income-label">Pay Periods</span>
                                <span class="income-value editable-person-field" data-field="payPeriods" data-type="select">${person.payPeriods || 26}/year</span>
                            </div>
                            <div class="income-item">
                                <span class="income-label">Pay Frequency</span>
                                <span class="income-value">${this.getPayFrequencyLabel(person.payPeriods || 26)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        peopleList.innerHTML = html;
        
        // Setup inline editing for people
        this.setupInlinePersonEditing();
        
        // Setup person detail toggles
        this.setupPersonToggle();
        
        // Render household totals in the right column
        this.renderHouseholdTotals();
    }

    renderHouseholdTotals() {
        const householdTotals = document.getElementById('householdTotals');
        
        if (this.people.length === 0) {
            householdTotals.innerHTML = '<div class="empty-state">Add people to see totals</div>';
            return;
        }

        const totalYearly = this.people.reduce((sum, person) => sum + person.yearlyPay, 0);
        const totalMonthly = this.people.reduce((sum, person) => sum + person.monthlyPay, 0);
        const totalBiWeekly = this.people.reduce((sum, person) => sum + person.biWeeklyPay, 0);

        householdTotals.innerHTML = `
            <div class="household-totals-content">
                <div class="total-row">
                    <span class="total-label">Bi-weekly:</span>
                    <span class="total-amount">${this.formatCurrency(totalBiWeekly)}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Monthly:</span>
                    <span class="total-amount">${this.formatCurrency(totalMonthly)}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Yearly:</span>
                    <span class="total-amount">${this.formatCurrency(totalYearly)}</span>
                </div>
            </div>
        `;
    }

    setupInlinePersonEditing() {
        const editableFields = document.querySelectorAll('.editable-person-field');
        editableFields.forEach(field => {
            field.addEventListener('click', (e) => this.startPersonFieldEdit(e));
        });
    }

    startPersonFieldEdit(e) {
        e.stopPropagation(); // Prevent event bubbling
        const field = e.target;
        if (field.classList.contains('editing')) return;

        const personItem = field.closest('.person-item');
        const personId = parseInt(personItem.getAttribute('data-person-id'));
        const fieldName = field.getAttribute('data-field');
        const fieldType = field.getAttribute('data-type');
        const person = this.people.find(p => p.id === personId);
        
        if (!person) return;

        field.classList.add('editing');
        const originalContent = field.innerHTML;
        let currentValue = person[fieldName];
        
        let inputElement;
        
        if (fieldType === 'select' && fieldName === 'payPeriods') {
            inputElement = document.createElement('select');
            inputElement.className = 'inline-edit-input';
            inputElement.innerHTML = `
                <option value="26" ${currentValue == 26 ? 'selected' : ''}>26 (bi-weekly)</option>
                <option value="24" ${currentValue == 24 ? 'selected' : ''}>24 (semi-monthly)</option>
                <option value="12" ${currentValue == 12 ? 'selected' : ''}>12 (monthly)</option>
                <option value="52" ${currentValue == 52 ? 'selected' : ''}>52 (weekly)</option>
            `;
        } else {
            inputElement = document.createElement('input');
            inputElement.type = fieldType === 'number' ? 'number' : 'text';
            inputElement.className = 'inline-edit-input';
            
            if (fieldType === 'number') {
                inputElement.step = '0.01';
                inputElement.value = currentValue;
            } else {
                inputElement.value = currentValue || '';
            }
        }

        field.innerHTML = '';
        field.appendChild(inputElement);
        
        if (fieldType === 'select') {
            // For select, just focus without trying to click
            inputElement.focus();
        } else {
            inputElement.focus();
        }
        
        const saveEdit = () => {
            let newValue;
            
            if (fieldType === 'select') {
                newValue = parseInt(inputElement.value);
            } else if (fieldType === 'number') {
                newValue = parseFloat(inputElement.value.trim());
                if (isNaN(newValue) || newValue <= 0) {
                    this.showAlert('Please enter a valid amount greater than 0.', 'Invalid Input', 'error');
                    inputElement.focus();
                    return;
                }
            } else {
                newValue = inputElement.value.trim();
                if (fieldName === 'name' && !newValue) {
                    this.showAlert('Please enter a person\'s name.', 'Invalid Input', 'error');
                    inputElement.focus();
                    return;
                }
            }

            // Update the person
            person[fieldName] = newValue;
            
            // Recalculate dependent fields
            if (fieldName === 'biWeeklyPay' || fieldName === 'payPeriods') {
                const payPeriods = person.payPeriods || 26;
                person.monthlyPay = this.calculateMonthlyFromBiWeekly(person.biWeeklyPay, payPeriods);
                person.yearlyPay = person.biWeeklyPay * payPeriods;
                
                // If pay periods changed, recalculate expense bi-weekly amounts since they depend on household effective pay periods
                if (fieldName === 'payPeriods') {
                    this.recalculateExpenseBiWeekly();
                }
            }

            this.saveData();
            this.render();
        };

        const cancelEdit = () => {
            field.classList.remove('editing');
            field.innerHTML = originalContent;
            this.setupInlinePersonEditing();
            this.setupPersonToggle();
        };

        if (fieldType === 'select') {
            // For select elements, save immediately on change
            inputElement.addEventListener('change', saveEdit);
            // Add click event to prevent propagation
            inputElement.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        } else {
            inputElement.addEventListener('blur', saveEdit);
            inputElement.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEdit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                }
            });
        }
    }

    setupPersonToggle() {
        const toggleBtns = document.querySelectorAll('.person-toggle-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const personId = btn.dataset.personId;
                const detailsDiv = document.querySelector(`.person-details-expanded[data-person-id="${personId}"]`);
                const personItem = btn.closest('.person-item');
                
                if (detailsDiv && personItem) {
                    const isCollapsed = detailsDiv.classList.contains('collapsed');
                    
                    if (isCollapsed) {
                        // Expand
                        detailsDiv.classList.remove('collapsed');
                        btn.classList.remove('collapsed');
                        personItem.classList.remove('compact');
                        btn.textContent = 'Details';
                    } else {
                        // Collapse
                        detailsDiv.classList.add('collapsed');
                        btn.classList.add('collapsed');
                        personItem.classList.add('compact');
                        btn.textContent = 'Details';
                    }
                }
            });
        });
    }

    renderExpenses() {
        const tbody = document.querySelector('#expensesTable tbody');
        
        if (this.expenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No expenses added yet.</td></tr>';
            return;
        }

        // Group expenses by category
        const expensesByCategory = {};
        this.expenses.forEach(expense => {
            const category = expense.category;
            if (!expensesByCategory[category]) {
                expensesByCategory[category] = [];
            }
            expensesByCategory[category].push(expense);
        });

        let html = '';
        
        // Render each category with its expenses
        Object.keys(expensesByCategory).forEach(category => {
            const categoryExpenses = expensesByCategory[category];
            const categoryTotal = categoryExpenses.reduce((sum, expense) => sum + expense.monthlyAmount, 0);
            const categoryCount = categoryExpenses.length;
            
            // Category header row
            // Check saved state for this expense category
            const isCollapsed = this.expenseCategoryToggleStates[category] !== undefined ? 
                this.expenseCategoryToggleStates[category] : false; // default expanded
            const toggleIcon = isCollapsed ? '▶' : '▼';
            const collapsedClass = isCollapsed ? 'collapsed' : '';
            
            html += `
                <tr class="expense-category-header ${collapsedClass}" data-category="${category}">
                    <td class="expense-category-toggle">
                        <span class="toggle-icon">${toggleIcon}</span>
                        <strong>${this.capitalizeCategory(category)}</strong>
                    </td>
                    <td class="category-summary">${categoryCount} expense${categoryCount !== 1 ? 's' : ''} • ${this.formatCurrency(categoryTotal)}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;
            
            // Individual expense rows (respect saved state)
            categoryExpenses.forEach(expense => {
                // Check saved state for display
                const showExpense = this.expenseCategoryToggleStates[category] !== undefined ? 
                    !this.expenseCategoryToggleStates[category] : true; // show if not collapsed (default expanded)
                const displayStyle = showExpense ? '' : ' style="display: none;"';
                
                html += `
                    <tr class="expense-item-row" data-expense-id="${expense.id}" data-parent-category="${category}"${displayStyle}>
                        <td class="editable-cell expense-indent" data-field="name" data-type="text">${expense.name}</td>
                        <td class="editable-cell" data-field="monthlyAmount" data-type="number">${this.formatCurrency(expense.monthlyAmount)}</td>
                        <td class="calculated-cell" title="Automatically calculated from monthly amount">${this.formatCurrency(expense.biWeeklyAmount)}</td>
                        <td class="editable-cell" data-field="category" data-type="select">
                            <span class="category-badge ${this.getCategoryClass(expense.category)}">${this.capitalizeCategory(expense.category)}</span>
                        </td>
                        <td class="editable-cell" data-field="subCategory" data-type="text">
                            ${expense.subCategory ? 
                                `<span class="subcategory-badge ${this.getSubcategoryClass(expense.subCategory)}">${expense.subCategory}</span>` : 
                                '<span class="subcategory-default">-</span>'
                            }
                        </td>
                        <td class="editable-cell" data-field="sharingMethod" data-type="select">
                            <span class="sharing-badge">${expense.sharingMethod === 'even' ? '⚖️' : '📊'}</span>
                        </td>
                        <td>
                            <button class="btn btn-danger remove-expense-btn" data-expense-id="${expense.id}">🗑️</button>
                        </td>
                    </tr>
                `;
            });
        });

        tbody.innerHTML = html;
        
        // Setup expense category collapse/expand functionality
        this.setupExpenseCategoryToggle();

        // Add click event listeners for inline editing
        this.setupInlineEditing();
    }

    setupInlineEditing() {
        // Remove existing listeners to prevent duplicates
        const editableCells = document.querySelectorAll('.editable-cell');
        editableCells.forEach(cell => {
            cell.addEventListener('click', (e) => this.startCellEdit(e));
        });
    }

    startCellEdit(e) {
        const cell = e.target.closest('.editable-cell');
        if (!cell || cell.classList.contains('editing')) return;

        const row = cell.closest('tr');
        const expenseId = parseInt(row.getAttribute('data-expense-id'));
        const field = cell.getAttribute('data-field');
        const type = cell.getAttribute('data-type');
        const expense = this.expenses.find(e => e.id === expenseId);
        
        if (!expense) return;

        cell.classList.add('editing');
        const originalContent = cell.innerHTML;
        let currentValue = expense[field];
        
        // Create appropriate input based on type
        let inputElement;
        
        if (type === 'select') {
            inputElement = document.createElement('select');
            if (field === 'category') {
                inputElement.innerHTML = `
                    <option value="bills" ${expense.category === 'bills' ? 'selected' : ''}>Bills</option>
                    <option value="savings" ${expense.category === 'savings' ? 'selected' : ''}>Savings</option>
                    <option value="emergency" ${expense.category === 'emergency' ? 'selected' : ''}>Emergency</option>
                    <option value="food" ${expense.category === 'food' ? 'selected' : ''}>Food</option>
                    <option value="transport" ${expense.category === 'transport' ? 'selected' : ''}>Transport</option>
                    <option value="entertainment" ${expense.category === 'entertainment' ? 'selected' : ''}>Entertainment</option>
                    <option value="other" ${expense.category === 'other' ? 'selected' : ''}>Other</option>
                `;
            } else if (field === 'sharingMethod') {
                inputElement.innerHTML = `
                    <option value="even" ${expense.sharingMethod === 'even' ? 'selected' : ''}>⚖️ 50/50</option>
                    <option value="percentage" ${expense.sharingMethod === 'percentage' ? 'selected' : ''}>📊 % Weighted</option>
                `;
            }
        } else {
            inputElement = document.createElement('input');
            inputElement.type = type === 'number' ? 'number' : 'text';
            if (type === 'number') {
                inputElement.step = '0.01';
                inputElement.value = currentValue;
            } else {
                inputElement.value = currentValue || '';
            }
        }

        inputElement.className = 'inline-edit-input';
        cell.innerHTML = '';
        cell.appendChild(inputElement);
        inputElement.focus();
        
        // Handle save/cancel
        const saveEdit = () => {
            let newValue = inputElement.value.trim();
            
            if (type === 'number') {
                newValue = parseFloat(newValue);
                if (isNaN(newValue) || newValue <= 0) {
                    this.showAlert('Please enter a valid amount greater than 0.', 'Invalid Input', 'error');
                    inputElement.focus();
                    return;
                }
            }
            
            if (field === 'name' && !newValue) {
                this.showAlert('Please enter an expense name.', 'Invalid Input', 'error');
                inputElement.focus();
                return;
            }

            // Update the expense
            expense[field] = newValue;
            if (field === 'monthlyAmount') {
                expense.biWeeklyAmount = this.calculateBiWeeklyFromMonthly(newValue);
            }

            this.saveData();
            this.render();
        };

        const cancelEdit = () => {
            cell.classList.remove('editing');
            cell.innerHTML = originalContent;
            this.setupInlineEditing();
        };

        inputElement.addEventListener('blur', saveEdit);
        inputElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    renderBiWeeklySummary() {
        const container = document.getElementById('biWeeklySummary');
        
        if (this.people.length === 0 || this.expenses.length === 0) {
            container.innerHTML = '<div class="empty-state">Add people and expenses to see the summary.</div>';
            return;
        }

        // Group expenses by category
        const expensesByCategory = this.expenses.reduce((acc, expense) => {
            if (!acc[expense.category]) {
                acc[expense.category] = [];
            }
            acc[expense.category].push(expense);
            return acc;
        }, {});

        const totalBiWeeklyExpenses = this.expenses.reduce((sum, expense) => sum + expense.biWeeklyAmount, 0);
        const effectivePayPeriods = this.getHouseholdEffectivePayPeriods();
        const totalMonthlyExpenses = totalBiWeeklyExpenses * effectivePayPeriods / 12;
        const totalYearlyExpenses = totalBiWeeklyExpenses * effectivePayPeriods;

        let html = `
            <div class="comprehensive-expense-summary">
                <!-- Category Breakdown Table -->
                <div class="category-breakdown-summary">
                    <h4>Category Breakdown</h4>
                    <table class="category-breakdown-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Bi-weekly</th>
                                <th>Monthly</th>
                                <th>Yearly</th>
                                <th>% of Total</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Add category rows
        Object.keys(expensesByCategory).forEach(category => {
            const categoryExpenses = expensesByCategory[category];
            const categoryBiWeekly = categoryExpenses.reduce((sum, expense) => sum + expense.biWeeklyAmount, 0);
            const effectivePayPeriods = this.getHouseholdEffectivePayPeriods();
            const categoryMonthly = categoryBiWeekly * effectivePayPeriods / 12;
            const categoryYearly = categoryBiWeekly * effectivePayPeriods;
            const categoryPercentage = totalBiWeeklyExpenses > 0 ? (categoryBiWeekly / totalBiWeeklyExpenses * 100) : 0;
            
            // Check saved state for this category
            const isCollapsed = this.categoryToggleStates[category] !== undefined ? 
                this.categoryToggleStates[category] : true; // default collapsed
            const toggleIcon = isCollapsed ? '▶' : '▼';
            const collapsedClass = isCollapsed ? 'collapsed' : '';
            
            html += `
                <tr class="category-header-row ${collapsedClass}" data-category="${category}">
                    <td class="category-toggle">
                        <span class="toggle-icon">${toggleIcon}</span>
                        <strong>${this.capitalizeCategory(category)}</strong>
                    </td>
                    <td class="amount">${this.formatCurrency(categoryBiWeekly)}</td>
                    <td class="amount">${this.formatCurrency(categoryMonthly)}</td>
                    <td class="amount">${this.formatCurrency(categoryYearly)}</td>
                    <td class="percentage">${categoryPercentage.toFixed(1)}%</td>
                </tr>
            `;

            // Add subcategory details if they exist
            categoryExpenses.forEach(expense => {
                if (expense.subCategory && expense.subCategory.trim() !== '') {
                    const effectivePayPeriods = this.getHouseholdEffectivePayPeriods();
                    const expenseMonthly = expense.biWeeklyAmount * effectivePayPeriods / 12;
                    const expenseYearly = expense.biWeeklyAmount * effectivePayPeriods;
                    const expensePercentage = totalBiWeeklyExpenses > 0 ? (expense.biWeeklyAmount / totalBiWeeklyExpenses * 100) : 0;
                    
                    // Check saved state for display
                    const showSubcategory = this.categoryToggleStates[category] !== undefined ? 
                        !this.categoryToggleStates[category] : false; // show if not collapsed
                    const displayStyle = showSubcategory ? 'table-row' : 'none';
                    
                    html += `
                        <tr class="subcategory-row" data-parent-category="${category}" style="display: ${displayStyle};">
                            <td class="subcategory-indent">${expense.name} (${expense.subCategory})</td>
                            <td class="amount">${this.formatCurrency(expense.biWeeklyAmount)}</td>
                            <td class="amount">${this.formatCurrency(expenseMonthly)}</td>
                            <td class="amount">${this.formatCurrency(expenseYearly)}</td>
                            <td class="percentage">${expensePercentage.toFixed(1)}%</td>
                        </tr>
                    `;
                } else {
                    const effectivePayPeriods = this.getHouseholdEffectivePayPeriods();
                    const expenseMonthly = expense.biWeeklyAmount * effectivePayPeriods / 12;
                    const expenseYearly = expense.biWeeklyAmount * effectivePayPeriods;
                    const expensePercentage = totalBiWeeklyExpenses > 0 ? (expense.biWeeklyAmount / totalBiWeeklyExpenses * 100) : 0;
                    
                    html += `
                        <tr class="subcategory-row" data-parent-category="${category}" style="display: none;">
                            <td class="subcategory-indent">└ ${expense.name}</td>
                            <td class="amount">${this.formatCurrency(expense.biWeeklyAmount)}</td>
                            <td class="amount">${this.formatCurrency(expenseMonthly)}</td>
                            <td class="amount">${this.formatCurrency(expenseYearly)}</td>
                            <td class="percentage">${expensePercentage.toFixed(1)}%</td>
                        </tr>
                    `;
                }
            });
        });

        html += `
                        </tbody>
                        <tfoot>
                            <tr class="totals-row">
                                <td><strong>Total All Categories</strong></td>
                                <td class="amount"><strong>${this.formatCurrency(totalBiWeeklyExpenses)}</strong></td>
                                <td class="amount"><strong>${this.formatCurrency(totalMonthlyExpenses)}</strong></td>
                                <td class="amount"><strong>${this.formatCurrency(totalYearlyExpenses)}</strong></td>
                                <td class="percentage"><strong>100.0%</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
        
        // Setup category collapse/expand functionality
        this.setupCategoryToggle();
    }

    setupCategoryToggle() {
        // Add click event listeners to category header rows
        const categoryHeaders = document.querySelectorAll('.category-header-row');
        categoryHeaders.forEach(header => {
            header.style.cursor = 'pointer';
            const category = header.dataset.category;
            
            // Restore saved state
            const isCollapsed = this.categoryToggleStates[category] !== undefined ? 
                this.categoryToggleStates[category] : true; // default collapsed
            
            const toggleIcon = header.querySelector('.toggle-icon');
            const subcategoryRows = document.querySelectorAll(`.subcategory-row[data-parent-category="${category}"]`);
            
            // Apply saved state
            subcategoryRows.forEach(row => {
                row.style.display = isCollapsed ? 'none' : 'table-row';
            });
            toggleIcon.textContent = isCollapsed ? '▶' : '▼';
            header.classList.toggle('collapsed', isCollapsed);
            
            header.addEventListener('click', () => {
                // Toggle visibility of subcategory rows
                const newIsCollapsed = toggleIcon.textContent === '▶';
                subcategoryRows.forEach(row => {
                    row.style.display = newIsCollapsed ? 'table-row' : 'none';
                });
                
                // Update toggle icon
                toggleIcon.textContent = newIsCollapsed ? '▼' : '▶';
                
                // Add visual feedback for collapsed state
                header.classList.toggle('collapsed', !newIsCollapsed);
                
                // Save state
                this.categoryToggleStates[category] = !newIsCollapsed;
                this.saveData();
            });
        });
    }

    setupExpenseCategoryToggle() {
        // Add click event listeners to expense category header rows
        const categoryHeaders = document.querySelectorAll('.expense-category-header');
        categoryHeaders.forEach(header => {
            header.style.cursor = 'pointer';
            const category = header.dataset.category;
            
            // Restore saved state
            const isCollapsed = this.expenseCategoryToggleStates[category] !== undefined ? 
                this.expenseCategoryToggleStates[category] : false; // default expanded
            
            const toggleIcon = header.querySelector('.toggle-icon');
            const expenseRows = document.querySelectorAll(`.expense-item-row[data-parent-category="${category}"]`);
            
            // Apply saved state
            expenseRows.forEach(row => {
                row.style.display = isCollapsed ? 'none' : 'table-row';
            });
            toggleIcon.textContent = isCollapsed ? '▶' : '▼';
            header.classList.toggle('collapsed', isCollapsed);
            
            header.addEventListener('click', () => {
                // Toggle visibility of expense rows
                const newIsCollapsed = toggleIcon.textContent === '▶';
                expenseRows.forEach(row => {
                    row.style.display = newIsCollapsed ? 'table-row' : 'none';
                });
                
                // Update toggle icon
                toggleIcon.textContent = newIsCollapsed ? '▼' : '▶';
                
                // Add visual feedback for collapsed state
                header.classList.toggle('collapsed', !newIsCollapsed);
                
                // Save state
                this.expenseCategoryToggleStates[category] = !newIsCollapsed;
                this.saveData();
            });
        });
    }

    renderExcessFunds() {
        const container = document.getElementById('excessFunds');
        
        if (this.people.length === 0) {
            container.innerHTML = '<div class="empty-state">Add people to see excess funds.</div>';
            return;
        }

        const totalBiWeeklyExpenses = this.expenses.reduce((sum, expense) => sum + expense.biWeeklyAmount, 0);

        let html = `
            <div class="excess-funds-container">
                <table class="excess-funds-table">
                    <thead>
                        <tr>
                            <th>Person</th>
                            <th title="Yearly Pay ÷ Pay Periods">Pay Period Income</th>
                            <th title="Person's allocated share of total household expenses">Pay Period Expenses</th>
                            <th title="Pay Period Income - Pay Period Expenses">Pay Period Excess</th>
                            <th title="Monthly Pay - (Pay Period Expenses × Pay Periods ÷ 12)">Monthly Excess</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.people.forEach(person => {
            const personExpenseShare = this.calculatePersonTotalExpenses(person);
            const personPayPeriods = person.payPeriods || 26;
            const personPayPeriodIncome = person.yearlyPay / personPayPeriods;
            const payPeriodExcess = personPayPeriodIncome - personExpenseShare;
            const monthlyExcess = person.monthlyPay - (personExpenseShare * personPayPeriods / 12);
            
            html += `
                <tr>
                    <td class="person-name">${person.name}</td>
                    <td class="amount" title="${this.formatCurrency(person.yearlyPay)} ÷ ${personPayPeriods} = ${this.formatCurrency(personPayPeriodIncome)}">${this.formatCurrency(personPayPeriodIncome)}</td>
                    <td class="amount" title="Person's share of total expenses: ${this.formatCurrency(personExpenseShare)}">${this.formatCurrency(personExpenseShare)}</td>
                    <td class="amount ${payPeriodExcess >= 0 ? 'positive' : 'negative'}" title="${this.formatCurrency(personPayPeriodIncome)} - ${this.formatCurrency(personExpenseShare)} = ${this.formatCurrency(payPeriodExcess)}">
                        ${this.formatCurrency(payPeriodExcess)}
                    </td>
                    <td class="amount ${monthlyExcess >= 0 ? 'positive' : 'negative'}" title="${this.formatCurrency(person.monthlyPay)} - ${this.formatCurrency(personExpenseShare * personPayPeriods / 12)} = ${this.formatCurrency(monthlyExcess)}">
                        ${this.formatCurrency(monthlyExcess)}
                    </td>
                </tr>
            `;
        });

        // Calculate totals - both pay period and monthly
        const totalPayPeriodIncome = this.people.reduce((sum, person) => {
            const personPayPeriods = person.payPeriods || 26;
            return sum + (person.yearlyPay / personPayPeriods);
        }, 0);
        const totalPayPeriodExpenses = this.people.reduce((sum, person) => {
            return sum + this.calculatePersonTotalExpenses(person);
        }, 0);
        const totalPayPeriodExcess = totalPayPeriodIncome - totalPayPeriodExpenses;
        
        const totalMonthlyIncome = this.people.reduce((sum, person) => sum + person.monthlyPay, 0);
        const totalMonthlyExpenses = this.people.reduce((sum, person) => {
            const personExpenseShare = this.calculatePersonTotalExpenses(person);
            const personPayPeriods = person.payPeriods || 26;
            return sum + (personExpenseShare * personPayPeriods / 12);
        }, 0);
        const totalMonthlyExcess = totalMonthlyIncome - totalMonthlyExpenses;

        html += `
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td><strong>Household Total</strong></td>
                            <td class="amount" title="Sum of all pay period incomes: ${this.formatCurrency(totalPayPeriodIncome)}"><strong>${this.formatCurrency(totalPayPeriodIncome)}</strong></td>
                            <td class="amount" title="Sum of all pay period expenses: ${this.formatCurrency(totalPayPeriodExpenses)}"><strong>${this.formatCurrency(totalPayPeriodExpenses)}</strong></td>
                            <td class="amount ${totalPayPeriodExcess >= 0 ? 'positive' : 'negative'}" title="${this.formatCurrency(totalPayPeriodIncome)} - ${this.formatCurrency(totalPayPeriodExpenses)} = ${this.formatCurrency(totalPayPeriodExcess)}">
                                <strong>${this.formatCurrency(totalPayPeriodExcess)}</strong>
                            </td>
                            <td class="amount ${totalMonthlyExcess >= 0 ? 'positive' : 'negative'}" title="${this.formatCurrency(totalMonthlyIncome)} - ${this.formatCurrency(totalMonthlyExpenses)} = ${this.formatCurrency(totalMonthlyExcess)}">
                                <strong>${this.formatCurrency(totalMonthlyExcess)}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    renderPersonCategoryBreakdown() {
        const container = document.getElementById('personCategoryBreakdown');
        
        if (this.people.length === 0 || this.expenses.length === 0) {
            container.innerHTML = '<div class="empty-state">Add people and expenses to see category breakdown.</div>';
            return;
        }

        // Get all categories
        const categories = [...new Set(this.expenses.map(expense => expense.category))];
        
        // Calculate category totals for each person
        const personCategoryTotals = {};
        
        this.people.forEach(person => {
            personCategoryTotals[person.id] = {
                person: person,
                categories: {}
            };
            
            categories.forEach(category => {
                const categoryExpenses = this.expenses.filter(expense => expense.category === category);
                const categoryTotal = categoryExpenses.reduce((sum, expense) => {
                    return sum + this.calculatePersonExpenseShare(expense, person);
                }, 0);
                
                personCategoryTotals[person.id].categories[category] = categoryTotal;
            });
        });

        // Calculate column totals for each category
        const categoryColumnTotals = {};
        categories.forEach(category => {
            categoryColumnTotals[category] = Object.values(personCategoryTotals).reduce((sum, personData) => {
                return sum + personData.categories[category];
            }, 0);
        });
        
        // Calculate grand total (sum of all expenses)
        const grandTotal = Object.values(categoryColumnTotals).reduce((sum, total) => sum + total, 0);

        let html = `
            <div class="category-breakdown-table">
                <table class="person-category-table">
                    <thead>
                        <tr>
                            <th>Person</th>
                            ${categories.map(category => `<th>${category.charAt(0).toUpperCase() + category.slice(1)}</th>`).join('')}
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.values(personCategoryTotals).map(personData => {
                            const categoryAmounts = categories.map(category => personData.categories[category]);
                            const personTotal = categoryAmounts.reduce((sum, amount) => sum + amount, 0);
                            
                            return `
                                <tr>
                                    <td class="person-name">${personData.person.name}</td>
                                    ${categoryAmounts.map(amount => `<td class="amount">${this.formatCurrency(amount)}</td>`).join('')}
                                    <td class="amount total-cell">${this.formatCurrency(personTotal)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td><strong>Category Totals</strong></td>
                            ${categories.map(category => `<td class="amount"><strong>${this.formatCurrency(categoryColumnTotals[category])}</strong></td>`).join('')}
                            <td class="amount total-cell"><strong>${this.formatCurrency(grandTotal)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    // Calculate how much each person should pay for a specific expense
    calculatePersonExpenseShare(expense, person) {
        if (this.people.length <= 1) {
            // Convert expense to person's pay period frequency
            return this.convertExpenseToPersonPayPeriod(expense.biWeeklyAmount, person);
        }

        if (expense.sharingMethod === 'even') {
            const sharePerPerson = expense.biWeeklyAmount / this.people.length;
            return this.convertExpenseToPersonPayPeriod(sharePerPerson, person);
        } else if (expense.sharingMethod === 'percentage') {
            const totalYearlyIncome = this.people.reduce((sum, p) => sum + p.yearlyPay, 0);
            const personPercentage = person.yearlyPay / totalYearlyIncome;
            const personBiWeeklyShare = expense.biWeeklyAmount * personPercentage;
            return this.convertExpenseToPersonPayPeriod(personBiWeeklyShare, person);
        }
        
        return 0;
    }

    // Convert a bi-weekly expense amount to a person's pay period frequency
    convertExpenseToPersonPayPeriod(biWeeklyAmount, person) {
        const personPayPeriods = person.payPeriods || 26;
        const effectivePayPeriods = this.getHouseholdEffectivePayPeriods();
        // Convert bi-weekly amount to yearly using household effective pay periods, then to person's pay frequency
        const yearlyAmount = biWeeklyAmount * effectivePayPeriods;
        return yearlyAmount / personPayPeriods; // Convert to person's pay frequency
    }

    // Calculate total expenses for a person across all expenses
    calculatePersonTotalExpenses(person) {
        return this.expenses.reduce((sum, expense) => {
            return sum + this.calculatePersonExpenseShare(expense, person);
        }, 0);
    }

    // Get expense breakdown by person for summary display
    getExpenseBreakdownByPerson() {
        const breakdown = {};
        
        this.people.forEach(person => {
            breakdown[person.id] = {
                person: person,
                expenses: [],
                totalBiWeekly: 0
            };
            
            this.expenses.forEach(expense => {
                const expenseShare = this.calculatePersonExpenseShare(expense, person);
                breakdown[person.id].expenses.push({
                    expense: expense,
                    amount: expenseShare
                });
                breakdown[person.id].totalBiWeekly += expenseShare;
            });
        });
        
        return breakdown;
    }

    // Table sorting functionality
    initializeTableSorting() {
        // Sort expenses table
        const expensesTable = document.getElementById('expensesTable');
        if (expensesTable) {
            const headers = expensesTable.querySelectorAll('th');
            headers.forEach((header, index) => {
                if (index < headers.length - 1) { // Don't make the Action column sortable
                    header.style.cursor = 'pointer';
                    header.classList.add('sortable');
                    header.addEventListener('click', () => this.sortExpensesTable(index, header));
                }
            });
        }

        // Sort category breakdown table
        const categoryTable = document.querySelector('.person-category-table');
        if (categoryTable) {
            const headers = categoryTable.querySelectorAll('th');
            headers.forEach((header, index) => {
                header.style.cursor = 'pointer';
                header.classList.add('sortable');
                header.addEventListener('click', () => this.sortCategoryTable(index, header));
            });
        }
    }

    sortExpensesTable(columnIndex, header) {
        const isAscending = !header.classList.contains('sort-asc');
        
        // Remove sort classes from all headers
        const allHeaders = document.querySelectorAll('#expensesTable th');
        allHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        
        // Add sort class to current header
        header.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
        
        // Sort the expenses array
        this.expenses.sort((a, b) => {
            let aValue, bValue;
            
            switch(columnIndex) {
                case 0: // Expense name
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 1: // Monthly amount
                    aValue = a.monthlyAmount;
                    bValue = b.monthlyAmount;
                    break;
                case 2: // Bi-weekly amount
                    aValue = a.biWeeklyAmount;
                    bValue = b.biWeeklyAmount;
                    break;
                case 3: // Category
                    aValue = a.category.toLowerCase();
                    bValue = b.category.toLowerCase();
                    break;
                case 4: // Sub-category
                    aValue = (a.subCategory || '').toLowerCase();
                    bValue = (b.subCategory || '').toLowerCase();
                    break;
                case 5: // Sharing method
                    aValue = a.sharingMethod.toLowerCase();
                    bValue = b.sharingMethod.toLowerCase();
                    break;
                default:
                    return 0;
            }
            
            if (typeof aValue === 'string') {
                return isAscending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            } else {
                return isAscending ? aValue - bValue : bValue - aValue;
            }
        });
        
        this.renderExpenses();
        this.renderBiWeeklySummary();
    }

    sortCategoryTable(columnIndex, header) {
        const table = header.closest('table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        const isAscending = !header.classList.contains('sort-asc');
        
        // Remove sort classes from all headers
        const allHeaders = table.querySelectorAll('th');
        allHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        
        // Add sort class to current header
        header.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
        
        // Sort the rows
        rows.sort((a, b) => {
            const aCell = a.cells[columnIndex];
            const bCell = b.cells[columnIndex];
            
            let aValue, bValue;
            
            if (columnIndex === 0) {
                // Person name - text comparison
                aValue = aCell.textContent.toLowerCase();
                bValue = bCell.textContent.toLowerCase();
                return isAscending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            } else {
                // Amount columns - numeric comparison
                aValue = this.parseCurrencyValue(aCell.textContent);
                bValue = this.parseCurrencyValue(bCell.textContent);
                return isAscending ? aValue - bValue : bValue - aValue;
            }
        });
        
        // Re-append sorted rows
        rows.forEach(row => tbody.appendChild(row));
    }

    parseCurrencyValue(currencyString) {
        // Remove currency symbols and commas, then parse as float
        return parseFloat(currencyString.replace(/[$,]/g, '')) || 0;
    }

    getPayFrequencyLabel(payPeriods) {
        const frequencies = {
            52: 'Weekly',
            26: 'Bi-weekly',
            24: 'Semi-monthly',
            12: 'Monthly',
            13: '4-week cycles',
            104: 'Twice weekly',
            4: 'Quarterly',
            6: 'Bi-monthly',
            18: 'Every 20 days',
            36: 'Every 10 days',
            2: 'Semi-annually',
            1: 'Annually'
        };
        return frequencies[payPeriods] || `${payPeriods}/year`;
    }

    updatePayPlaceholder() {
        const payPeriods = parseInt(document.getElementById('personPayPeriods').value);
        const payInput = document.getElementById('biWeeklyPay');
        const frequencyLabel = this.getPayFrequencyLabel(payPeriods).toLowerCase();
        
        payInput.placeholder = `${this.getPayFrequencyLabel(payPeriods)} pay ($)`;
    }

    updateSliderBackground(slider) {
        const value = slider.value;
        const min = slider.min || 0;
        const max = slider.max || 100;
        
        // Calculate percentage of slider filled
        const percentage = ((value - min) / (max - min)) * 100;
        
        // Update background gradient to show progress
        slider.style.background = `linear-gradient(90deg, #4a90e2 0%, #4a90e2 ${percentage}%, #e9ecef ${percentage}%, #e9ecef 100%)`;
    }

    updateScenarioSliderColors(slider, value) {
        // Determine color based on value (positive/negative/neutral)
        let progressColor, thumbColor;
        
        if (value > 0) {
            // Positive values - green for income increase, red for expense increase
            if (slider.id === 'incomeAdjustment') {
                progressColor = '#28a745'; // Green for income increase (good)
                thumbColor = '#28a745';
            } else {
                progressColor = '#dc3545'; // Red for expense increase (bad)
                thumbColor = '#dc3545';
            }
        } else if (value < 0) {
            // Negative values - red for income decrease, green for expense decrease
            if (slider.id === 'incomeAdjustment') {
                progressColor = '#dc3545'; // Red for income decrease (bad)
                thumbColor = '#dc3545';
            } else {
                progressColor = '#28a745'; // Green for expense decrease (good)
                thumbColor = '#28a745';
            }
        } else {
            // Neutral (zero) - default blue
            progressColor = '#4a90e2';
            thumbColor = '#4a90e2';
        }
        
        // Calculate percentage for background gradient
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const percentage = ((value - min) / (max - min)) * 100;
        
        // Update background with color
        slider.style.background = `linear-gradient(90deg, ${progressColor} 0%, ${progressColor} ${percentage}%, #e9ecef ${percentage}%, #e9ecef 100%)`;
        
        // Update thumb color
        slider.style.setProperty('--thumb-color', thumbColor);
    }

    updateScenarioDisplayColors(displayElement, value, type) {
        // Determine color and background based on value and type
        let color, backgroundColor;
        
        if (value > 0) {
            // Positive values
            if (type === 'income') {
                color = '#28a745'; // Green for income increase (good)
                backgroundColor = 'rgba(40, 167, 69, 0.1)';
            } else {
                color = '#dc3545'; // Red for expense increase (bad)
                backgroundColor = 'rgba(220, 53, 69, 0.1)';
            }
        } else if (value < 0) {
            // Negative values
            if (type === 'income') {
                color = '#dc3545'; // Red for income decrease (bad)
                backgroundColor = 'rgba(220, 53, 69, 0.1)';
            } else {
                color = '#28a745'; // Green for expense decrease (good)
                backgroundColor = 'rgba(40, 167, 69, 0.1)';
            }
        } else {
            // Neutral (zero) - default blue
            color = '#4a90e2';
            backgroundColor = 'rgba(74, 144, 226, 0.1)';
        }
        
        // Apply colors
        displayElement.style.color = color;
        displayElement.style.backgroundColor = backgroundColor;
    }

    // Helper function to capitalize category names
    capitalizeCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    // Helper function to get category CSS class
    getCategoryClass(category) {
        const normalizedCategory = category.toLowerCase().trim();
        return `category-${normalizedCategory}`;
    }

    // Helper function to get subcategory CSS class
    getSubcategoryClass(subcategory) {
        if (!subcategory || subcategory.trim() === '') return 'subcategory-default';
        
        const normalized = subcategory.toLowerCase().trim()
            .replace(/[^a-z0-9]/g, '') // Remove special characters
            .replace(/s$/, ''); // Remove trailing 's' for plurals
        
        // Check for common subcategory patterns
        const subcategoryMappings = {
            'subscription': 'subscription',
            'insurance': 'insurance',
            'utilities': 'utilities',
            'utility': 'utilities',
            'mortgage': 'mortgage',
            'rent': 'rent',
            'groceries': 'groceries',
            'grocery': 'groceries',
            'dining': 'dining',
            'restaurant': 'dining',
            'gas': 'gas',
            'fuel': 'gas',
            'maintenance': 'maintenance',
            'repair': 'maintenance',
            'streaming': 'streaming',
            'media': 'streaming',
            'gym': 'gym',
            'fitness': 'gym',
            'health': 'gym',
            // New fun subcategories
            'coffee': 'coffee',
            'tea': 'coffee',
            'shopping': 'shopping',
            'clothes': 'shopping',
            'clothing': 'shopping',
            'book': 'books',
            'books': 'books',
            'education': 'education',
            'course': 'education',
            'learning': 'education',
            'travel': 'travel',
            'vacation': 'travel',
            'trip': 'travel',
            'phone': 'phone',
            'mobile': 'phone',
            'cellular': 'phone',
            'internet': 'internet',
            'wifi': 'internet',
            'web': 'internet',
            'pet': 'pet',
            'dog': 'pet',
            'cat': 'pet',
            'vet': 'pet',
            'game': 'gaming',
            'gaming': 'gaming',
            'xbox': 'gaming',
            'playstation': 'gaming',
            'music': 'music',
            'spotify': 'music',
            'apple': 'music',
            'beauty': 'beauty',
            'skincare': 'beauty',
            'makeup': 'beauty',
            'hair': 'beauty',
            'taxi': 'transport',
            'uber': 'transport',
            'bus': 'transport',
            'train': 'transport',
            'parking': 'transport',
            'medical': 'medical',
            'doctor': 'medical',
            'dentist': 'medical',
            'pharmacy': 'medical',
            'hobby': 'hobby',
            'craft': 'hobby',
            'art': 'hobby',
            'sport': 'sports',
            'sports': 'sports',
            'ticket': 'entertainment',
            'movie': 'entertainment',
            'concert': 'entertainment',
            'show': 'entertainment',
            // Additional comprehensive subcategories
            'hoa': 'hoa',
            'homeowner': 'hoa',
            'association': 'hoa',
            'condo': 'hoa',
            'saving': 'savings',
            'savings': 'savings',
            'investment': 'savings',
            'retirement': 'savings',
            '401k': 'savings',
            'ira': 'savings',
            'upkeep': 'upkeep',
            'cleaning': 'upkeep',
            'landscaping': 'upkeep',
            'lawn': 'upkeep',
            'misc': 'misc',
            'miscellaneous': 'misc',
            'other': 'misc',
            'random': 'misc',
            'electric': 'electric',
            'electricity': 'electric',
            'power': 'electric',
            'water': 'water',
            'sewer': 'water',
            'trash': 'trash',
            'garbage': 'trash',
            'waste': 'trash',
            'recycling': 'trash',
            'loan': 'loan',
            'debt': 'loan',
            'credit': 'loan',
            'car': 'automotive',
            'auto': 'automotive',
            'vehicle': 'automotive',
            'registration': 'automotive',
            'license': 'license',
            'permit': 'license',
            'tax': 'tax',
            'taxes': 'tax',
            'income': 'tax',
            'property': 'tax',
            'tool': 'tools',
            'tools': 'tools',
            'equipment': 'tools',
            'hardware': 'tools',
            'software': 'software',
            'app': 'software',
            'program': 'software',
            'license': 'software',
            'gift': 'gifts',
            'gifts': 'gifts',
            'present': 'gifts',
            'birthday': 'gifts',
            'holiday': 'gifts',
            'christmas': 'gifts',
            'donation': 'charity',
            'charity': 'charity',
            'tithe': 'charity',
            'church': 'charity',
            'volunteer': 'charity',
            'childcare': 'childcare',
            'daycare': 'childcare',
            'babysitter': 'childcare',
            'nanny': 'childcare',
            'school': 'school',
            'tuition': 'school',
            'supplies': 'school',
            'uniform': 'school',
            'lunch': 'lunch',
            'breakfast': 'lunch',
            'snack': 'lunch',
            'alcohol': 'alcohol',
            'beer': 'alcohol',
            'wine': 'alcohol',
            'bar': 'alcohol',
            'tobacco': 'tobacco',
            'cigarette': 'tobacco',
            'smoking': 'tobacco',
            'fabric': 'fabric',
            'sewing': 'fabric',
            'yarn': 'fabric',
            'material': 'fabric',
            'garden': 'garden',
            'plant': 'garden',
            'seed': 'garden',
            'flower': 'garden',
            'landscaping': 'garden'
        };
        
        // Find matching pattern
        for (const [pattern, className] of Object.entries(subcategoryMappings)) {
            if (normalized.includes(pattern)) {
                return `subcategory-${className}`;
            }
        }
        
        return 'subcategory-default';
    }

    // Analytics and Chart Rendering
    renderAnalytics() {
        if (this.people.length === 0 || this.expenses.length === 0) {
            this.clearAnalytics();
            return;
        }

        this.renderExpensePieChart();
        this.renderSavingsRate();
        this.renderSubcategoryChart();
        this.renderSubcategoryBars();
        this.renderSavingsProjectionChart();
        this.renderBudgetHealthScore();
        this.renderScenarioModeling();
        this.renderFinancialMilestones();
    }

    clearAnalytics() {
        // Clear charts if no data
        const charts = ['expenseBarChart', 'subcategoryBarChart', 'savingsProjectionChart'];
        charts.forEach(chartId => {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#6c757d';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Add expenses to see charts', canvas.width/2, canvas.height/2);
            }
        });
        
        document.getElementById('savingsRate').textContent = '0%';
        document.getElementById('budgetBars').innerHTML = '<div class="empty-state">Add expenses to see budget overview</div>';
    }

    renderExpensePieChart() {
        const canvas = document.getElementById('expenseBarChart');
        const ctx = canvas.getContext('2d');
        
        // Group expenses by category using analytics period
        const categoryTotals = {};
        this.expenses.forEach(expense => {
            const category = this.capitalizeCategory(expense.category);
            categoryTotals[category] = (categoryTotals[category] || 0) + this.getAnalyticsAmount(expense.biWeeklyAmount);
        });

        // Sort categories alphabetically to ensure consistent color assignment
        const sortedCategories = Object.keys(categoryTotals).sort();
        const sortedCategoryValues = sortedCategories.map(cat => categoryTotals[cat]);

        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
        ];

        const data = {
            labels: Object.keys(categoryTotals),
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: colors.slice(0, Object.keys(categoryTotals).length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        if (this.expenseBarChart) {
            this.expenseBarChart.destroy();
        }

        this.expenseBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedCategories,
                datasets: [{
                    label: `${this.getAnalyticsLabel()} Amount`,
                    data: sortedCategoryValues,
                    backgroundColor: colors.slice(0, sortedCategories.length).map(color => color + '80'), // Add transparency
                    borderColor: colors.slice(0, sortedCategories.length),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${this.getAnalyticsLabel()} Expense Distribution`
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '$' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });
    }

    renderSavingsRate() {
        const totalIncome = this.people.reduce((sum, person) => sum + this.getPersonAnalyticsAmount(person), 0);
        const totalExpenses = this.expenses.reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
        
        // Calculate explicit savings (savings + emergency categories)
        const explicitSavings = this.expenses
            .filter(expense => expense.category === 'savings' || expense.category === 'emergency')
            .reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
        
        // Calculate excess funds (can be negative if expenses exceed income)
        const excessFunds = totalIncome - totalExpenses;
        
        // Total savings = explicit savings + excess funds
        const totalSavings = explicitSavings + excessFunds;
        const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome * 100) : 0;
        
        document.getElementById('savingsRate').textContent = savingsRate.toFixed(1) + '%';
        
        // Update tooltip with actual values
        const circle = document.querySelector('.metric-circle');
        const savingsExpenses = this.expenses.filter(expense => expense.category === 'savings').reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
        const emergencyExpenses = this.expenses.filter(expense => expense.category === 'emergency').reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
        
        const tooltipText = `Savings Rate Calculation:
        
Formula: (Savings + Emergency + Excess) ÷ Income × 100%

Breakdown:
• Savings expenses: ${this.formatCurrency(savingsExpenses)}
• Emergency expenses: ${this.formatCurrency(emergencyExpenses)}
• Excess funds: ${this.formatCurrency(excessFunds)}${excessFunds < 0 ? ' (deficit)' : ''}
• Total savings: ${this.formatCurrency(totalSavings)}
• Total income: ${this.formatCurrency(totalIncome)}

Result: ${this.formatCurrency(totalSavings)} ÷ ${this.formatCurrency(totalIncome)} = ${savingsRate.toFixed(1)}%${savingsRate < 0 ? ' (deficit spending)' : ''}`;
        
        circle.setAttribute('title', tooltipText);
        
        // Update circle color based on savings rate
        if (savingsRate < 0) {
            circle.style.background = 'linear-gradient(135deg, #dc3545 0%, #a71e2a 100%)'; // Dark red for deficit
        } else if (savingsRate >= 20) {
            circle.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        } else if (savingsRate >= 10) {
            circle.style.background = 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)';
        } else {
            circle.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        }
    }

    renderSubcategoryChart() {
        const canvas = document.getElementById('subcategoryBarChart');
        const ctx = canvas.getContext('2d');
        
        // Group expenses by subcategory (only those with subcategories)
        const subcategoryTotals = {};
        this.expenses.forEach(expense => {
            if (expense.subCategory && expense.subCategory.trim() !== '') {
                const subcat = expense.subCategory.trim();
                subcategoryTotals[subcat] = (subcategoryTotals[subcat] || 0) + this.getAnalyticsAmount(expense.biWeeklyAmount);
            }
        });

        // If no subcategories, show empty state
        if (Object.keys(subcategoryTotals).length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6c757d';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Add subcategories', canvas.width/2, canvas.height/2 - 10);
            ctx.fillText('to see breakdown', canvas.width/2, canvas.height/2 + 10);
            return;
        }

        const colors = [
            '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', 
            '#EF4444', '#EC4899', '#84CC16', '#6366F1'
        ];

        const data = {
            labels: Object.keys(subcategoryTotals),
            datasets: [{
                data: Object.values(subcategoryTotals),
                backgroundColor: colors.slice(0, Object.keys(subcategoryTotals).length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        if (this.subcategoryBarChart) {
            this.subcategoryBarChart.destroy();
        }

        this.subcategoryBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(subcategoryTotals),
                datasets: [{
                    label: `${this.getAnalyticsLabel()} Amount`,
                    data: Object.values(subcategoryTotals),
                    backgroundColor: colors.slice(0, Object.keys(subcategoryTotals).length).map(color => color + '80'), // Add transparency
                    borderColor: colors.slice(0, Object.keys(subcategoryTotals).length),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '$' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });
    }

    renderSavingsProjectionChart() {
        const canvas = document.getElementById('savingsProjectionChart');
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.savingsProjectionChart) {
            this.savingsProjectionChart.destroy();
        }

        // Get current analytics period
        const isYearly = this.analyticsPeriod === 'yearly';
        
        // Calculate savings amounts based on current period
        const savingsExpenses = this.expenses.filter(expense => expense.category === 'savings');
        const emergencyExpenses = this.expenses.filter(expense => expense.category === 'emergency');
        
        const periodSavings = savingsExpenses.reduce((sum, expense) => {
            return sum + this.getAnalyticsAmount(expense.biWeeklyAmount);
        }, 0);
        
        const periodEmergency = emergencyExpenses.reduce((sum, expense) => {
            return sum + this.getAnalyticsAmount(expense.biWeeklyAmount);
        }, 0);

        // Determine projection parameters based on period
        let projectionPeriods, periodLabel, timeUnit;
        
        if (isYearly) {
            // Yearly view: 5-year projection
            projectionPeriods = 5;
            periodLabel = 'year';
            timeUnit = 'Year';
        } else if (this.analyticsPeriod === 'monthly') {
            // Monthly view: 1-year projection (12 months)
            projectionPeriods = 12;
            periodLabel = 'month';
            timeUnit = 'Month';
        } else {
            // Bi-weekly view: 6-month projection (26 bi-weekly periods = ~6 months)
            projectionPeriods = 13; // 0 to 13 gives us ~6 months of bi-weekly periods
            periodLabel = 'bi-weekly period';
            timeUnit = 'Bi-weekly';
        }
        
        // Generate projection data
        const labels = [];
        const savingsData = [];
        const emergencyData = [];
        const totalSavingsData = [];
        
        let savingsAccumulated = 0;
        let emergencyAccumulated = 0;
        
        for (let i = 0; i <= projectionPeriods; i++) {
            const date = new Date();
            
            if (isYearly) {
                // 5-year projection with year labels
                date.setFullYear(date.getFullYear() + i);
                labels.push(i === 0 ? 'Now' : date.getFullYear().toString());
            } else if (this.analyticsPeriod === 'monthly') {
                // 1-year projection with month labels
                date.setMonth(date.getMonth() + i);
                labels.push(i === 0 ? 'Now' : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            } else {
                // 6-month projection with bi-weekly labels
                const biWeeklyDate = new Date();
                biWeeklyDate.setDate(biWeeklyDate.getDate() + (i * 14)); // Add 14 days for each bi-weekly period
                if (i === 0) {
                    labels.push('Now');
                } else if (i % 2 === 0) {
                    // Show label every 2 bi-weekly periods (monthly)
                    labels.push(biWeeklyDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                } else {
                    labels.push(''); // Empty label for cleaner display
                }
            }
            
            // Calculate accumulated savings for this time period
            if (isYearly) {
                // For yearly: multiply by number of years
                savingsAccumulated = periodSavings * i;
                emergencyAccumulated = periodEmergency * i;
            } else if (this.analyticsPeriod === 'monthly') {
                // For monthly: multiply by number of months
                savingsAccumulated = periodSavings * i;
                emergencyAccumulated = periodEmergency * i;
            } else {
                // For bi-weekly: multiply by number of bi-weekly periods
                savingsAccumulated = periodSavings * i;
                emergencyAccumulated = periodEmergency * i;
            }
            
            savingsData.push(savingsAccumulated);
            emergencyData.push(emergencyAccumulated);
            totalSavingsData.push(savingsAccumulated + emergencyAccumulated);
        }

        this.savingsProjectionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Savings Growth (per ${periodLabel})`,
                        data: savingsData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: `Emergency Fund Growth (per ${periodLabel})`,
                        data: emergencyData,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: `Total Savings Growth (per ${periodLabel})`,
                        data: totalSavingsData,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: `${projectionPeriods}-${timeUnit} Savings Projection (${this.formatCurrency(periodSavings + periodEmergency)}/${periodLabel})`
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: 'white',
                        hoverBorderWidth: 2
                    }
                }
            }
        });
    }

    renderSubcategoryBars() {
        const container = document.getElementById('subcategoryBars');
        
        // Group expenses by subcategory with category info
        const subcategoryData = [];
        this.expenses.forEach(expense => {
            if (expense.subCategory && expense.subCategory.trim() !== '') {
                const existing = subcategoryData.find(item => 
                    item.subcategory.toLowerCase() === expense.subCategory.toLowerCase()
                );
                
                if (existing) {
                    existing.amount += this.getAnalyticsAmount(expense.biWeeklyAmount);
                } else {
                    subcategoryData.push({
                        category: this.capitalizeCategory(expense.category),
                        subcategory: expense.subCategory,
                        amount: this.getAnalyticsAmount(expense.biWeeklyAmount)
                    });
                }
            }
        });

        if (subcategoryData.length === 0) {
            container.innerHTML = '<div class="empty-state">Add expenses with subcategories to see breakdown</div>';
            // Apply smallest size for empty state
            this.applySubcategorySizing(0);
            return;
        }

        // Sort by amount (highest first) - show all subcategories
        subcategoryData.sort((a, b) => b.amount - a.amount);
        const allSubcategories = subcategoryData; // Show all instead of limiting to top 6
        
        // Apply dynamic sizing based on number of subcategories
        this.applySubcategorySizing(allSubcategories.length);
        
        const totalSubcategoryAmount = subcategoryData.reduce((sum, item) => sum + item.amount, 0);

        let html = '<div class="top-subcategories-list">';
        allSubcategories.forEach((item, index) => {
            const percentOfTotal = totalSubcategoryAmount > 0 ? (item.amount / totalSubcategoryAmount * 100) : 0;
            
            // Color coding - cycle through colors for all items
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#A29BFE', '#6C5CE7', '#FD79A8', '#E17055', '#00B894'];
            const color = colors[index % colors.length];
            
            html += `
                <div class="top-subcategory-item">
                    <div class="subcategory-rank" style="background-color: ${color};">${index + 1}</div>
                    <div class="subcategory-info">
                        <div class="subcategory-name">${item.subcategory}</div>
                        <div class="subcategory-category">${item.category}</div>
                    </div>
                    <div class="subcategory-amount">${this.formatCurrency(item.amount)}</div>
                    <div class="subcategory-percent">${percentOfTotal.toFixed(1)}%</div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    applySubcategorySizing(subcategoryCount) {
        const subcategoryBars = document.getElementById('subcategoryBars');
        
        // Remove all existing height classes
        const barSizeClasses = [
            'small-list',
            'medium-list',
            'large-list', 
            'extra-large-list'
        ];
        
        barSizeClasses.forEach(cls => subcategoryBars.classList.remove(cls));
        
        // Apply appropriate height based on subcategory count
        // Card width stays standard, only height adjusts
        if (subcategoryCount <= 3) {
            subcategoryBars.classList.add('small-list');
        } else if (subcategoryCount <= 6) {
            subcategoryBars.classList.add('medium-list');
        } else if (subcategoryCount <= 12) {
            subcategoryBars.classList.add('large-list');
        } else {
            subcategoryBars.classList.add('extra-large-list');
        }
        
        // Refresh Muuri layout to accommodate size changes
        if (window.grid) {
            window.grid.refreshItems().layout();
        }
    }



    renderBudgetHealthScore() {
        const totalIncome = this.people.reduce((sum, person) => sum + this.getPersonAnalyticsAmount(person), 0);
        const totalExpenses = this.expenses.reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
        
        // Calculate explicit savings (savings + emergency categories)
        const explicitSavings = this.expenses
            .filter(expense => expense.category === 'savings' || expense.category === 'emergency')
            .reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
        
        // Calculate excess funds (unallocated income)
        const excessFunds = Math.max(0, totalIncome - totalExpenses);
        
        // Total savings = explicit savings + excess funds
        const totalSavings = explicitSavings + excessFunds;
        const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome * 100) : 0;
        
        // Calculate health score (0-100)
        let score = 0;
        const indicators = [];
        
        // Savings rate contributes 40% of score
        if (savingsRate >= 20) {
            score += 40;
            indicators.push({ text: 'Excellent savings rate (≥20%)', type: 'good' });
        } else if (savingsRate >= 10) {
            score += 25;
            indicators.push({ text: 'Good savings rate (≥10%)', type: 'warning' });
        } else if (savingsRate >= 0) {
            score += 10;
            indicators.push({ text: 'Low savings rate (<10%)', type: 'danger' });
        } else {
            indicators.push({ text: 'Negative savings rate', type: 'danger' });
        }
        
        // Income stability (people count) contributes 20% of score
        if (this.people.length >= 2) {
            score += 20;
            indicators.push({ text: 'Multiple income sources', type: 'good' });
        } else {
            score += 10;
            indicators.push({ text: 'Single income source', type: 'warning' });
        }
        
        // Expense categorization contributes 20% of score
        const categorizedExpenses = this.expenses.filter(exp => exp.category && exp.category !== '').length;
        const categorizationRate = this.expenses.length > 0 ? (categorizedExpenses / this.expenses.length) : 0;
        if (categorizationRate >= 0.8) {
            score += 20;
            indicators.push({ text: 'Well categorized expenses', type: 'good' });
        } else if (categorizationRate >= 0.5) {
            score += 15;
            indicators.push({ text: 'Partially categorized expenses', type: 'warning' });
        } else {
            score += 5;
            indicators.push({ text: 'Poor expense categorization', type: 'danger' });
        }
        
        // Budget balance contributes 20% of score
        if (totalIncome > totalExpenses) {
            score += 20;
            indicators.push({ text: 'Income exceeds expenses', type: 'good' });
        } else {
            indicators.push({ text: 'Expenses exceed income', type: 'danger' });
        }

        // Update UI
        const scoreElement = document.getElementById('healthScore');
        const indicatorsElement = document.getElementById('healthIndicators');
        const circleElement = document.querySelector('.health-score-circle');
        
        scoreElement.textContent = Math.round(score);
        
        // Create detailed tooltip with actual values
        let savingsPoints = 0;
        let savingsText = '';
        if (savingsRate >= 20) {
            savingsPoints = 40;
            savingsText = `Excellent (≥20%): ${savingsRate.toFixed(1)}%`;
        } else if (savingsRate >= 10) {
            savingsPoints = 25;
            savingsText = `Good (≥10%): ${savingsRate.toFixed(1)}%`;
        } else if (savingsRate >= 0) {
            savingsPoints = 10;
            savingsText = `Low (<10%): ${savingsRate.toFixed(1)}%`;
        } else {
            savingsPoints = 0;
            savingsText = `Negative: ${savingsRate.toFixed(1)}%`;
        }
        
        const incomePoints = this.people.length >= 2 ? 20 : 10;
        const incomeText = this.people.length >= 2 ? `Multiple sources (${this.people.length})` : `Single source (${this.people.length})`;
        
        const categorizationPoints = categorizationRate >= 0.8 ? 20 : (categorizationRate >= 0.5 ? 15 : 5);
        const categorizationText = `${(categorizationRate * 100).toFixed(1)}% categorized (${categorizedExpenses}/${this.expenses.length})`;
        
        const balancePoints = totalIncome > totalExpenses ? 20 : 0;
        const balanceText = totalIncome > totalExpenses ? `Surplus: ${this.formatCurrency(totalIncome - totalExpenses)}` : `Deficit: ${this.formatCurrency(totalExpenses - totalIncome)}`;
        
        const tooltipText = `Budget Health Score Breakdown:

SCORING COMPONENTS (Total: ${Math.round(score)}/100)

1. Savings Rate (40 pts max): ${savingsPoints} pts
   ${savingsText}

2. Income Stability (20 pts max): ${incomePoints} pts
   ${incomeText}

3. Expense Organization (20 pts max): ${categorizationPoints} pts
   ${categorizationText}

4. Budget Balance (20 pts max): ${balancePoints} pts
   ${balanceText}

Current Financial Health: ${score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Improvement'}`;
        
        circleElement.setAttribute('title', tooltipText);
        
        // Update circle color based on score
        if (score >= 75) {
            circleElement.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        } else if (score >= 50) {
            circleElement.style.background = 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)';
        } else {
            circleElement.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        }
        
        // Update indicators
        let indicatorsHTML = '';
        indicators.forEach(indicator => {
            indicatorsHTML += `
                <div class="health-indicator">
                    <div class="indicator-icon indicator-${indicator.type}"></div>
                    <span>${indicator.text}</span>
                </div>
            `;
        });
        indicatorsElement.innerHTML = indicatorsHTML;
    }

    renderScenarioModeling() {
        const incomeSlider = document.getElementById('incomeAdjustment');
        const expenseSlider = document.getElementById('expenseAdjustment');
        const incomeDisplay = document.getElementById('incomeChangeDisplay');
        const expenseDisplay = document.getElementById('expenseChangeDisplay');
        
        // Update scenario when sliders change
        const updateScenario = () => {
            const incomeChange = parseInt(incomeSlider.value);
            const expenseChange = parseInt(expenseSlider.value);
            
            incomeDisplay.textContent = `${incomeChange >= 0 ? '+' : ''}${incomeChange}%`;
            expenseDisplay.textContent = `${expenseChange >= 0 ? '+' : ''}${expenseChange}%`;
            
            // Update display label colors
            this.updateScenarioDisplayColors(incomeDisplay, incomeChange, 'income');
            this.updateScenarioDisplayColors(expenseDisplay, expenseChange, 'expense');
            
            // Update slider backgrounds with progress
            this.updateSliderBackground(incomeSlider);
            this.updateSliderBackground(expenseSlider);
            
            // Update slider colors based on values
            this.updateScenarioSliderColors(incomeSlider, incomeChange);
            this.updateScenarioSliderColors(expenseSlider, expenseChange);
            
            // Calculate new values
            const baseIncome = this.people.reduce((sum, person) => sum + this.getPersonAnalyticsAmount(person), 0);
            const baseExpenses = this.expenses.reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
            
            const newIncome = baseIncome * (1 + incomeChange / 100);
            const newExpenses = baseExpenses * (1 + expenseChange / 100);
            
            // Calculate explicit savings in new scenario (savings + emergency categories)
            const baseSavingsExpenses = this.expenses
                .filter(expense => expense.category === 'savings' || expense.category === 'emergency')
                .reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
            const newSavingsExpenses = baseSavingsExpenses * (1 + expenseChange / 100);
            
            // Calculate new excess funds
            const newExcessFunds = Math.max(0, newIncome - newExpenses);
            
            // Total savings = explicit savings + excess funds
            const totalNewSavings = newSavingsExpenses + newExcessFunds;
            const newSavingsRate = newIncome > 0 ? (totalNewSavings / newIncome * 100) : 0;
            
            const monthlySurplus = this.analyticsPeriod === 'monthly' ? (newIncome - newExpenses) : 
                                 this.analyticsPeriod === 'yearly' ? (newIncome - newExpenses) / 12 :
                                 (newIncome - newExpenses) * this.getHouseholdEffectivePayPeriods() / 12;
            
            document.getElementById('newSavingsRate').textContent = `${Math.max(0, newSavingsRate).toFixed(1)}%`;
            document.getElementById('monthlySurplus').textContent = this.formatCurrency(monthlySurplus);
            
            // Update color based on new savings rate
            const savingsElement = document.getElementById('newSavingsRate');
            if (newSavingsRate >= 20) {
                savingsElement.style.color = '#28a745';
            } else if (newSavingsRate >= 10) {
                savingsElement.style.color = '#ffc107';
            } else {
                savingsElement.style.color = '#dc3545';
            }
        };
        
        // Remove existing listeners to avoid duplicates
        incomeSlider.removeEventListener('input', updateScenario);
        expenseSlider.removeEventListener('input', updateScenario);
        
        // Add event listeners
        incomeSlider.addEventListener('input', updateScenario);
        expenseSlider.addEventListener('input', updateScenario);
        
        // Initial calculation
        updateScenario();
    }

    renderFinancialMilestones() {
        const container = document.getElementById('milestonesList');
        const totalIncome = this.people.reduce((sum, person) => sum + this.getPersonAnalyticsAmount(person), 0);
        const totalExpenses = this.expenses.reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
        const monthlySurplus = this.analyticsPeriod === 'monthly' ? (totalIncome - totalExpenses) : 
                              this.analyticsPeriod === 'yearly' ? (totalIncome - totalExpenses) / 12 :
                              (totalIncome - totalExpenses) * this.getHouseholdEffectivePayPeriods() / 12;
        
        // Get emergency fund target months from slider
        const emergencyFundMonthsSlider = document.getElementById('emergencyFundMonths');
        
        // Set the saved value to the slider if it hasn't been set yet
        if (!emergencyFundMonthsSlider.value || emergencyFundMonthsSlider.value == 6) {
            emergencyFundMonthsSlider.value = this.emergencyFundTargetMonths;
        }
        
        const emergencyFundMonths = parseInt(emergencyFundMonthsSlider.value) || this.emergencyFundTargetMonths || 6;
        
        // Calculate emergency fund goal based on selected months
        // Only include essential expenses (exclude savings and emergency categories)
        const essentialExpenses = this.expenses.filter(expense => 
            expense.category && 
            !expense.category.toLowerCase().includes('savings') && 
            !expense.category.toLowerCase().includes('emergency')
        );
        const totalEssentialExpenses = essentialExpenses.reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
        
        const monthlyEssentialExpenses = this.analyticsPeriod === 'monthly' ? totalEssentialExpenses : 
                                        this.analyticsPeriod === 'yearly' ? totalEssentialExpenses / 12 :
                                        totalEssentialExpenses * this.getHouseholdEffectivePayPeriods() / 12;
        const emergencyFundGoal = monthlyEssentialExpenses * emergencyFundMonths;
        
        // Calculate monthly emergency savings from expenses with "Emergency" category
        const emergencyExpenses = this.expenses.filter(expense => 
            expense.category && expense.category.toLowerCase().includes('emergency')
        );
        const monthlyEmergencySavings = emergencyExpenses.reduce((sum, expense) => {
            const monthlyAmount = this.analyticsPeriod === 'monthly' ? this.getAnalyticsAmount(expense.biWeeklyAmount) : 
                                 this.analyticsPeriod === 'yearly' ? this.getAnalyticsAmount(expense.biWeeklyAmount) / 12 :
                                 this.getAnalyticsAmount(expense.biWeeklyAmount) * this.getHouseholdEffectivePayPeriods() / 12;
            return sum + monthlyAmount;
        }, 0);

        // Get current emergency fund from input field
        const currentEmergencyFundInput = document.getElementById('currentEmergencyFund');
        
        // Set the saved value to the input field if it hasn't been set yet
        if (!currentEmergencyFundInput.value && this.currentEmergencyFund > 0) {
            currentEmergencyFundInput.value = this.currentEmergencyFund;
        }
        
        const currentEmergencyFund = parseFloat(currentEmergencyFundInput.value) || this.currentEmergencyFund || 0;
        const emergencyFundProgress = emergencyFundGoal > 0 ? (currentEmergencyFund / emergencyFundGoal) * 100 : 0;
        const remainingNeeded = Math.max(0, emergencyFundGoal - currentEmergencyFund);
        
        let monthsToEmergencyFund;
        
        if (remainingNeeded === 0) {
            monthsToEmergencyFund = 'Complete!';
        } else if (monthlyEmergencySavings <= 0) {
            monthsToEmergencyFund = 'Set up savings';
        } else {
            monthsToEmergencyFund = Math.ceil(remainingNeeded / monthlyEmergencySavings);
        }
        
        let html = `
            <div class="milestone-card emergency-fund-milestone">
                <div class="milestone-header">
                    <div class="milestone-icon">🛡️</div>
                    <div class="milestone-title">
                        <h5>Emergency Fund</h5>
                        <p class="milestone-subtitle">${emergencyFundMonths} months of essential expenses</p>
                    </div>
                </div>
                
                <div class="milestone-stats">
                    <div class="stat-item">
                        <span class="stat-label" title="Based on essential expenses only (excludes savings and emergency fund contributions)">Target</span>
                        <span class="stat-value">${this.formatCurrency(emergencyFundGoal)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Current</span>
                        <span class="stat-value">${this.formatCurrency(currentEmergencyFund)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Monthly Savings</span>
                        <span class="stat-value">${this.formatCurrency(monthlyEmergencySavings)}</span>
                    </div>
                </div>
                
                <div class="milestone-progress-section">
                    <div class="progress-header">
                        <span class="progress-label">Progress</span>
                        <span class="progress-percentage ${emergencyFundProgress > 100 ? 'over-target' : ''}">${emergencyFundProgress.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill ${emergencyFundProgress > 100 ? 'over-target' : ''}" style="width: ${Math.min(100, emergencyFundProgress)}%"></div>
                        </div>
                    </div>
                    <div class="progress-footer">
                        <span class="time-remaining">
                            ${typeof monthsToEmergencyFund === 'number' ? 
                                `${monthsToEmergencyFund} months remaining` : 
                                monthsToEmergencyFund === 'Complete!' ? 
                                    '✅ Goal achieved!' : 
                                    '⚠️ ' + monthsToEmergencyFund
                            }
                        </span>
                        ${remainingNeeded > 0 ? `<span class="amount-needed">${this.formatCurrency(remainingNeeded)} needed</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Add a debt payoff milestone if they're spending more than earning
        if (monthlySurplus < 0) {
            html += `
                <div class="milestone-card deficit-milestone">
                    <div class="milestone-header">
                        <div class="milestone-icon">⚠️</div>
                        <div class="milestone-title">
                            <h5>Budget Balance</h5>
                            <p class="milestone-subtitle">Spending exceeds income</p>
                        </div>
                    </div>
                    
                    <div class="milestone-stats">
                        <div class="stat-item">
                            <span class="stat-label">Monthly Deficit</span>
                            <span class="stat-value deficit">${this.formatCurrency(Math.abs(monthlySurplus))}</span>
                        </div>
                    </div>
                    
                    <div class="milestone-progress-section">
                        <div class="progress-header">
                            <span class="progress-label">Action Required</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-track">
                                <div class="progress-bar-fill deficit-bar" style="width: 100%"></div>
                            </div>
                        </div>
                        <div class="progress-footer">
                            <span class="time-remaining">Reduce expenses or increase income</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Update the months display
        const emergencyMonthsDisplay = document.getElementById('emergencyMonthsDisplay');
        emergencyMonthsDisplay.textContent = `${emergencyFundMonths} month${emergencyFundMonths === 1 ? '' : 's'}`;
        
        // Add event listeners to update when inputs change
        if (!currentEmergencyFundInput.hasAttribute('data-listener-added')) {
            currentEmergencyFundInput.addEventListener('input', () => {
                this.currentEmergencyFund = parseFloat(currentEmergencyFundInput.value) || 0;
                this.saveData();
                this.renderFinancialMilestones();
            });
            currentEmergencyFundInput.setAttribute('data-listener-added', 'true');
        }
        
        if (!emergencyFundMonthsSlider.hasAttribute('data-listener-added')) {
            emergencyFundMonthsSlider.addEventListener('input', () => {
                this.emergencyFundTargetMonths = parseInt(emergencyFundMonthsSlider.value) || 6;
                this.saveData();
                this.updateSliderBackground(emergencyFundMonthsSlider);
                this.renderFinancialMilestones();
            });
            emergencyFundMonthsSlider.setAttribute('data-listener-added', 'true');
            
            // Initialize slider background
            this.updateSliderBackground(emergencyFundMonthsSlider);
        }
    }

    capitalizeCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    getPersonColor(index) {
        const colors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', 
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
        ];
        return colors[index % colors.length];
    }

    // Custom Alert System
    showAlert(message, title = 'Alert', type = 'info') {
        return new Promise((resolve) => {
            const modal = document.getElementById('customAlert');
            const alertTitle = document.getElementById('alertTitle');
            const alertMessage = document.getElementById('alertMessage');
            const alertIcon = document.getElementById('alertIcon');
            const alertHeader = modal.querySelector('.alert-header');
            const okButton = document.getElementById('alertOkButton');
            const cancelButton = document.getElementById('alertCancelButton');
            const alertContent = modal.querySelector('.alert-content');

            // Set content
            alertTitle.textContent = title;
            alertMessage.textContent = message;

            // Set icon and header style based on type
            alertHeader.className = 'alert-header';
            switch (type) {
                case 'warning':
                    alertIcon.textContent = '⚠️';
                    alertHeader.classList.add('warning');
                    break;
                case 'error':
                    alertIcon.textContent = '❌';
                    alertHeader.classList.add('error');
                    break;
                case 'success':
                    alertIcon.textContent = '✅';
                    alertHeader.classList.add('success');
                    break;
                default:
                    alertIcon.textContent = 'ℹ️';
                    break;
            }

            // Show only OK button for alerts
            okButton.style.display = 'inline-block';
            cancelButton.style.display = 'none';

            // Show modal
            modal.style.display = 'block';

            // Handle OK button
            const handleOk = () => {
                modal.style.display = 'none';
                cleanup();
                resolve(true);
            };

            // Handle click outside to close
            const handleClickOutside = (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    cleanup();
                    resolve(true);
                }
            };

            // Handle Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    modal.style.display = 'none';
                    cleanup();
                    resolve(true);
                }
            };

            const cleanup = () => {
                okButton.removeEventListener('click', handleOk);
                modal.removeEventListener('click', handleClickOutside);
                document.removeEventListener('keydown', handleEscape);
            };

            okButton.addEventListener('click', handleOk);
            modal.addEventListener('click', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        });
    }

    showConfirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const modal = document.getElementById('customAlert');
            const alertTitle = document.getElementById('alertTitle');
            const alertMessage = document.getElementById('alertMessage');
            const alertIcon = document.getElementById('alertIcon');
            const alertHeader = modal.querySelector('.alert-header');
            const okButton = document.getElementById('alertOkButton');
            const cancelButton = document.getElementById('alertCancelButton');

            // Set content
            alertTitle.textContent = title;
            alertMessage.innerHTML = message.replace(/\n/g, '<br>');
            alertIcon.textContent = '❓';
            alertHeader.className = 'alert-header warning';

            // Show both buttons for confirmation
            okButton.textContent = 'Yes';
            okButton.style.display = 'inline-block';
            cancelButton.textContent = 'No';
            cancelButton.style.display = 'inline-block';

            // Show modal
            modal.style.display = 'block';

            // Handle buttons
            const handleOk = () => {
                modal.style.display = 'none';
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                modal.style.display = 'none';
                cleanup();
                resolve(false);
            };

            // Handle click outside to close (acts like cancel)
            const handleClickOutside = (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    cleanup();
                    resolve(false);
                }
            };

            // Handle Escape key (acts like cancel)
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    modal.style.display = 'none';
                    cleanup();
                    resolve(false);
                }
            };

            const cleanup = () => {
                okButton.removeEventListener('click', handleOk);
                cancelButton.removeEventListener('click', handleCancel);
                modal.removeEventListener('click', handleClickOutside);
                document.removeEventListener('keydown', handleEscape);
                okButton.textContent = 'OK';
            };

            okButton.addEventListener('click', handleOk);
            cancelButton.addEventListener('click', handleCancel);
            modal.addEventListener('click', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        });
    }

    // PDF Export functionality
    async exportToPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Title
            doc.setFontSize(20);
            doc.setTextColor(102, 126, 234);
            doc.text('Budget Report', 20, 20);
            
            // Date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
            
            let yPosition = 45;
            
            // People Section
            if (this.people.length > 0) {
                doc.setFontSize(16);
                doc.setTextColor(0, 0, 0);
                doc.text('People & Income', 20, yPosition);
                yPosition += 10;
                
                // Table headers
                doc.setFontSize(10);
                doc.setTextColor(60, 60, 60);
                doc.text('Name', 25, yPosition);
                doc.text('Bi-weekly', 80, yPosition);
                doc.text('Monthly', 120, yPosition);
                doc.text('Yearly', 160, yPosition);
                yPosition += 5;
                
                // Draw line under headers
                doc.line(20, yPosition, 190, yPosition);
                yPosition += 8;
                
                // People data
                doc.setTextColor(0, 0, 0);
                this.people.forEach(person => {
                    doc.text(person.name, 25, yPosition);
                    doc.text(this.formatCurrency(person.biWeeklyPay), 80, yPosition);
                    doc.text(this.formatCurrency(person.monthlyPay), 120, yPosition);
                    doc.text(this.formatCurrency(person.yearlyPay), 160, yPosition);
                    yPosition += 8;
                });
                
                // Totals
                const totalBiWeekly = this.people.reduce((sum, person) => sum + person.biWeeklyPay, 0);
                const totalMonthly = this.people.reduce((sum, person) => sum + person.monthlyPay, 0);
                const totalYearly = this.people.reduce((sum, person) => sum + person.yearlyPay, 0);
                
                yPosition += 5;
                doc.line(20, yPosition, 190, yPosition);
                yPosition += 8;
                
                doc.setFont(undefined, 'bold');
                doc.text('Total Household Income:', 25, yPosition);
                doc.text(this.formatCurrency(totalBiWeekly), 80, yPosition);
                doc.text(this.formatCurrency(totalMonthly), 120, yPosition);
                doc.text(this.formatCurrency(totalYearly), 160, yPosition);
                doc.setFont(undefined, 'normal');
                
                yPosition += 20;
            }
            
            // Expenses Section
            if (this.expenses.length > 0) {
                // Check if we need a new page
                if (yPosition > 200) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                doc.setFontSize(16);
                doc.setTextColor(0, 0, 0);
                doc.text('Expenses', 20, yPosition);
                yPosition += 10;
                
                // Group by category
                const expensesByCategory = this.expenses.reduce((acc, expense) => {
                    if (!acc[expense.category]) {
                        acc[expense.category] = [];
                    }
                    acc[expense.category].push(expense);
                    return acc;
                }, {});
                
                Object.keys(expensesByCategory).forEach(category => {
                    const categoryExpenses = expensesByCategory[category];
                    const categoryTotal = categoryExpenses.reduce((sum, expense) => sum + expense.biWeeklyAmount, 0);
                    
                    // Category header
                    doc.setFontSize(12);
                    doc.setTextColor(102, 126, 234);
                    doc.text(category.charAt(0).toUpperCase() + category.slice(1), 20, yPosition);
                    doc.setTextColor(0, 0, 0);
                    doc.text(`Total: ${this.formatCurrency(categoryTotal)} bi-weekly`, 120, yPosition);
                    yPosition += 8;
                    
                    // Category expenses
                    doc.setFontSize(10);
                    categoryExpenses.forEach(expense => {
                        if (yPosition > 270) {
                            doc.addPage();
                            yPosition = 20;
                        }
                        
                        doc.text(`  • ${expense.name}`, 25, yPosition);
                        doc.text(this.formatCurrency(expense.monthlyAmount), 120, yPosition);
                        doc.text(`(${this.formatCurrency(expense.biWeeklyAmount)} bi-weekly)`, 160, yPosition);
                        yPosition += 6;
                    });
                    
                    yPosition += 5;
                });
                
                // Total expenses
                const totalBiWeeklyExpenses = this.expenses.reduce((sum, expense) => sum + expense.biWeeklyAmount, 0);
                const totalMonthlyExpenses = totalBiWeeklyExpenses * 26 / 12; // Use standard 26 bi-weekly periods
                const totalYearlyExpenses = totalBiWeeklyExpenses * 26;
                
                yPosition += 10;
                doc.line(20, yPosition, 190, yPosition);
                yPosition += 8;
                
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Total Expenses:', 20, yPosition);
                yPosition += 8;
                doc.setFontSize(10);
                doc.text(`Bi-weekly: ${this.formatCurrency(totalBiWeeklyExpenses)}`, 25, yPosition);
                yPosition += 6;
                doc.text(`Monthly: ${this.formatCurrency(totalMonthlyExpenses)}`, 25, yPosition);
                yPosition += 6;
                doc.text(`Yearly: ${this.formatCurrency(totalYearlyExpenses)}`, 25, yPosition);
                doc.setFont(undefined, 'normal');
            }
            
            // Summary section
            if (this.people.length > 0 && this.expenses.length > 0) {
                yPosition += 20;
                
                // Check if we need a new page
                if (yPosition > 220) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                doc.setFontSize(16);
                doc.setTextColor(0, 0, 0);
                doc.text('Budget Summary', 20, yPosition);
                yPosition += 15;
                
                const totalIncome = this.people.reduce((sum, person) => sum + person.biWeeklyPay, 0);
                const totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.biWeeklyAmount, 0);
                const surplus = totalIncome - totalExpenses;
                const savingsRate = totalIncome > 0 ? ((surplus / totalIncome) * 100) : 0;
                
                doc.setFontSize(12);
                doc.text(`Total Bi-weekly Income: ${this.formatCurrency(totalIncome)}`, 25, yPosition);
                yPosition += 8;
                doc.text(`Total Bi-weekly Expenses: ${this.formatCurrency(totalExpenses)}`, 25, yPosition);
                yPosition += 8;
                
                doc.setTextColor(surplus >= 0 ? 40 : 220, surplus >= 0 ? 167 : 53, surplus >= 0 ? 69 : 69);
                doc.text(`${surplus >= 0 ? 'Surplus' : 'Deficit'}: ${this.formatCurrency(Math.abs(surplus))}`, 25, yPosition);
                yPosition += 8;
                
                doc.setTextColor(0, 0, 0);
                doc.text(`Savings Rate: ${Math.max(0, savingsRate).toFixed(1)}%`, 25, yPosition);
            }
            
            // Save the PDF
            const fileName = `budget_report_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            await this.showAlert('PDF exported successfully!', 'Export Complete', 'success');
            
        } catch (error) {
            console.error('PDF export error:', error);
            await this.showAlert('Failed to export PDF. Please try again.', 'Export Error', 'error');
        }
    }

    async shareBudget() {
        try {
            // Validate that we have data to share
            if (this.people.length === 0 && this.expenses.length === 0) {
                await this.showAlert(
                    'No budget data to share. Please add people and expenses first.',
                    'Nothing to Share',
                    'info'
                );
                return;
            }

            // Category mapping for shorter encoding
            const categoryMap = {
                'bills': '1', 'savings': '2', 'emergency': '3', 'food': '4',
                'transport': '5', 'entertainment': '6', 'other': '7'
            };
            
            // Sharing method mapping
            const sharingMap = { 'percentage': 'p', 'even': 'e' };

            // Create ultra-compressed shareable data
            const shareData = {
                p: this.people.map(person => {
                    const data = [person.name, person.biWeeklyPay];
                    // Only include payPeriods if it's not the default (26)
                    if (person.payPeriods && person.payPeriods !== 26) {
                        data.push(person.payPeriods);
                    }
                    return data;
                }),
                e: this.expenses.map(expense => {
                    const data = [
                        expense.name,
                        expense.monthlyAmount,
                        categoryMap[expense.category] || '7', // Default to 'other'
                        sharingMap[expense.sharingMethod] || 'p'
                    ];
                    // Only include subCategory if it exists and isn't empty
                    if (expense.subCategory && expense.subCategory.trim() !== '') {
                        data.push(expense.subCategory);
                    }
                    return data;
                }),
                // Only include global sharing method if it's not default
                ...(this.globalSharingMethod !== 'percentage' && { g: sharingMap[this.globalSharingMethod] }),
                // Only include analytics period if it's not default
                ...(this.analyticsPeriod !== 'biweekly' && { a: this.analyticsPeriod[0] }), // 'b', 'm', 'y'
                // Include emergency fund data if set
                ...(this.currentEmergencyFund > 0 && { ef: this.currentEmergencyFund }),
                ...(this.emergencyFundTargetMonths !== 6 && { em: this.emergencyFundTargetMonths })
            };

            // Compress and encode the data
            const jsonString = JSON.stringify(shareData);
            const encodedData = btoa(jsonString);
            
            // Create shareable URL - handle file:// protocol
            let baseUrl;
            if (window.location.protocol === 'file:') {
                baseUrl = window.location.href.split('?')[0];
            } else {
                baseUrl = window.location.origin + window.location.pathname;
            }
            const shareUrl = `${baseUrl}?b=${encodedData}`;

            // Log compression stats for debugging
            const originalSize = JSON.stringify({
                people: this.people,
                expenses: this.expenses,
                globalSharingMethod: this.globalSharingMethod,
                analyticsPeriod: this.analyticsPeriod
            }).length;
            console.log(`Compression: ${originalSize} → ${jsonString.length} chars (${Math.round((1 - jsonString.length/originalSize) * 100)}% reduction)`);

            // Check if Web Share API is supported
            if (navigator.share) {
                await navigator.share({
                    title: 'Household Budget',
                    text: 'Check out this budget plan!',
                    url: shareUrl
                });
                await this.showAlert('Budget shared successfully!', 'Share Complete', 'success');
            } else {
                // Fallback to clipboard
                await navigator.clipboard.writeText(shareUrl);
                await this.showAlert(
                    'Budget link copied to clipboard! Share this URL to let others view your budget setup.',
                    'Link Copied',
                    'success'
                );
            }
        } catch (error) {
            console.error('Share error:', error);
            if (error.name === 'AbortError') {
                // User cancelled sharing, don't show error
                return;
            }
            
            await this.showAlert(
                'Unable to generate share link. Please check your browser permissions.',
                'Share Failed',
                'error'
            );
        }
    }

    // Load budget data from URL parameters
    loadSharedBudget() {
        const urlParams = new URLSearchParams(window.location.search);
        // Support both old and new parameter names for backward compatibility
        const budgetParam = urlParams.get('b') || urlParams.get('budget');
        
        if (budgetParam) {
            try {
                // Decode the shared data
                const jsonString = atob(budgetParam);
                const shareData = JSON.parse(jsonString);
                
                console.log('Loading shared budget data:', shareData);
                
                // Category mapping for decoding
                const categoryMap = {
                    '1': 'bills', '2': 'savings', '3': 'emergency', '4': 'food',
                    '5': 'transport', '6': 'entertainment', '7': 'other'
                };
                
                // Sharing method mapping for decoding
                const sharingMap = { 'p': 'percentage', 'e': 'even' };
                const periodMap = { 'b': 'biweekly', 'm': 'monthly', 'y': 'yearly' };
                
                // Check if this is the new compressed format (arrays) or old format (objects)
                const isNewFormat = Array.isArray(shareData.p?.[0]);
                
                if (isNewFormat) {
                    // New compressed format
                    this.people = shareData.p.map((p, index) => ({
                        id: Date.now() + index + 1000,
                        name: p[0],
                        biWeeklyPay: p[1],
                        payPeriods: p[2] || 26, // Default to 26 if not specified
                        monthlyPay: this.calculateMonthlyFromBiWeekly(p[1], p[2] || 26),
                        yearlyPay: p[1] * (p[2] || 26)
                    }));
                    
                    this.expenses = shareData.e.map((e, index) => ({
                        id: Date.now() + index + 2000,
                        name: e[0],
                        monthlyAmount: e[1],
                        biWeeklyAmount: this.calculateBiWeeklyFromMonthly(e[1]),
                        category: categoryMap[e[2]] || 'other',
                        subCategory: e[4] || '', // Optional 5th element
                        sharingMethod: sharingMap[e[3]] || 'percentage'
                    }));
                    
                    // Restore settings with defaults
                    this.globalSharingMethod = sharingMap[shareData.g] || 'percentage';
                    this.analyticsPeriod = periodMap[shareData.a] || 'biweekly';
                    
                    // Restore emergency fund data
                    this.currentEmergencyFund = shareData.ef || 0;
                    this.emergencyFundTargetMonths = shareData.em || 6;
                } else {
                    // Old format compatibility
                    this.people = shareData.p.map((p, index) => ({
                        id: Date.now() + index + 1000,
                        name: p.n,
                        biWeeklyPay: p.bp,
                        payPeriods: p.pp,
                        monthlyPay: this.calculateMonthlyFromBiWeekly(p.bp, p.pp),
                        yearlyPay: p.bp * p.pp
                    }));
                    
                    this.expenses = shareData.e.map((e, index) => ({
                        id: Date.now() + index + 2000,
                        name: e.n,
                        monthlyAmount: e.ma,
                        biWeeklyAmount: this.calculateBiWeeklyFromMonthly(e.ma),
                        category: e.c,
                        subCategory: e.sc,
                        sharingMethod: e.sm
                    }));
                    
                    this.globalSharingMethod = shareData.gsm || 'percentage';
                    this.analyticsPeriod = shareData.ap || 'biweekly';
                    
                    // Emergency fund data (old format may not have these)
                    this.currentEmergencyFund = shareData.ef || 0;
                    this.emergencyFundTargetMonths = shareData.em || 6;
                }
                
                // Save to localStorage
                localStorage.setItem('budgetGlobalSharingMethod', this.globalSharingMethod);
                localStorage.setItem('budgetAnalyticsPeriod', this.analyticsPeriod);
                
                console.log('Restored people:', this.people);
                console.log('Restored expenses:', this.expenses);
                
                // Show confirmation
                this.showAlert(
                    'Budget loaded successfully! You can now modify it as needed.',
                    'Shared Budget Loaded',
                    'success'
                );
                
                // Clean up URL after a short delay to allow data to load
                setTimeout(() => {
                    if (window.location.protocol === 'file:') {
                        // For file:// protocol, just remove the query params
                        const newUrl = window.location.href.split('?')[0];
                        window.history.replaceState({}, document.title, newUrl);
                    } else {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }, 1000);
                
            } catch (error) {
                console.error('Error loading shared budget:', error);
                this.showAlert(
                    'Unable to load shared budget. The link may be corrupted or invalid.',
                    'Load Error',
                    'error'
                );
            }
        }
    }
}

// Initialize the budget tool when the page loads
const budgetTool = new BudgetTool();

// Initialize Muuri grid for dynamic analytics layout
let analyticsGrid;

// Wait for Muuri library to be loaded and DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    initializeAnalyticsGrid();
});

function initializeAnalyticsGrid() {
    // Check if Muuri is available and grid element exists
    if (typeof Muuri === 'undefined' || !document.getElementById('analyticsGrid')) {
        console.warn('Muuri library not loaded or analytics grid not found');
        return;
    }

    try {
        analyticsGrid = new Muuri('#analyticsGrid', {
            items: '.grid-item',
            dragEnabled: true,
            dragHandle: '.card-drag-handle',
            dragStartPredicate: {
                distance: 0,
                delay: 0
            },
            dragSortHeuristics: {
                sortInterval: 50,
                minDragDistance: 10,
                minBounceBackAngle: 1
            },
            dragContainer: document.body,
            dragReleaseDuration: 300,
            dragReleaseEasing: 'ease-out',
            dragCssProps: {
                touchAction: 'none',
                userSelect: 'none',
                userDrag: 'none',
                tapHighlightColor: 'rgba(0, 0, 0, 0)',
                touchCallout: 'none',
                contentZooming: 'none'
            },
            dragPlaceholder: {
                enabled: true,
                duration: 300,
                createElement: function (item) {
                    const element = item.getElement();
                    const placeholder = element.cloneNode(true);
                    placeholder.classList.add('muuri-placeholder');
                    placeholder.style.opacity = '0.5';
                    placeholder.style.transform = 'scale(0.95)';
                    return placeholder;
                }
            },
            layout: {
                fillGaps: true,
                horizontal: false,
                alignRight: false,
                alignBottom: false,
                rounding: true
            },
            layoutDuration: 300,
            layoutEasing: 'ease-out',
            sortData: {
                order: function (item, element) {
                    return parseInt(element.getAttribute('data-order') || '999');
                }
            }
        });

        // Apply default order on initialization
        analyticsGrid.sort('order');

        // Save layout when items are moved
        analyticsGrid.on('move', function () {
            saveAnalyticsLayout();
        });

        // Handle drag start for smooth transitions
        analyticsGrid.on('dragStart', function (item) {
            const element = item.getElement();
            // Store original dimensions to prevent flash
            const rect = element.getBoundingClientRect();
            element.setAttribute('data-original-width', rect.width);
            element.setAttribute('data-original-height', rect.height);
        });

        // Handle drag release for smooth sizing
        analyticsGrid.on('dragReleaseStart', function (item) {
            const element = item.getElement();
            const card = element.querySelector('.analytics-card');
            
            // Ensure card maintains proper size during release
            if (card) {
                card.style.width = '100%';
                card.style.height = 'auto';
            }
        });

        // Clean up after release is complete
        analyticsGrid.on('dragReleaseEnd', function (item) {
            const element = item.getElement();
            const card = element.querySelector('.analytics-card');
            
            // Remove any temporary styles
            if (card) {
                card.style.width = '';
                card.style.height = '';
            }
            
            // Clean up data attributes
            element.removeAttribute('data-original-width');
            element.removeAttribute('data-original-height');
        });

        // Load saved layout if it exists
        loadAnalyticsLayout();

        // Add reset layout button
        addLayoutControls();

    } catch (error) {
        console.error('Error initializing analytics grid:', error);
    }
}

function saveAnalyticsLayout() {
    if (!analyticsGrid) return;
    
    const items = analyticsGrid.getItems();
    const layout = items.map((item, index) => ({
        cardType: item.getElement().querySelector('.analytics-card').getAttribute('data-card-type'),
        order: index
    }));
    
    localStorage.setItem('analyticsLayout', JSON.stringify(layout));
}

function loadAnalyticsLayout() {
    if (!analyticsGrid) return;
    
    const savedLayout = localStorage.getItem('analyticsLayout');
    
    // If no saved layout exists, use default order
    if (!savedLayout) {
        analyticsGrid.sort('order');
        return;
    }
    
    try {
        const layout = JSON.parse(savedLayout);
        const items = analyticsGrid.getItems();
        
        // Sort items according to saved layout
        const sortedItems = layout.map(layoutItem => {
            return items.find(item => {
                const cardType = item.getElement().querySelector('.analytics-card').getAttribute('data-card-type');
                return cardType === layoutItem.cardType;
            });
        }).filter(Boolean);
        
        // Only apply saved layout if we found all items, otherwise use default
        if (sortedItems.length === items.length) {
            analyticsGrid.sort(sortedItems);
        } else {
            // Fallback to default order if saved layout is incomplete
            console.log('Saved layout incomplete, using default order');
            analyticsGrid.sort('order');
        }
    } catch (error) {
        console.error('Error loading analytics layout, using default order:', error);
        analyticsGrid.sort('order');
    }
}

function resetAnalyticsLayout() {
    if (!analyticsGrid) return;
    
    // Remove saved layout
    localStorage.removeItem('analyticsLayout');
    
    // Reset to default order using data-order attributes
    analyticsGrid.sort('order');
    budgetTool.showAlert('Analytics layout has been reset to default', 'Layout Reset', 'success');
}

function addLayoutControls() {
    // Add layout control buttons to the analytics section
    const analyticsSection = document.querySelector('.analytics-section');
    if (!analyticsSection) return;
    
    // Check if controls already exist
    if (analyticsSection.querySelector('.layout-controls')) return;
    
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'layout-controls';
    controlsDiv.innerHTML = `
        <div class="layout-controls-wrapper">
            <span class="layout-help-text">💡 Drag cards by their ⋮⋮ handle to rearrange</span>
            <button id="resetLayout" class="btn btn-secondary btn-small">🔄 Reset Layout</button>
        </div>
    `;
    
    // Insert before the analytics grid
    const analyticsGrid = document.getElementById('analyticsGrid');
    if (analyticsGrid) {
        analyticsGrid.parentNode.insertBefore(controlsDiv, analyticsGrid);
        
        // Add event listener for reset button
        document.getElementById('resetLayout').addEventListener('click', resetAnalyticsLayout);
    }
}
