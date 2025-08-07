class BudgetTool {
    constructor() {
        this.people = JSON.parse(localStorage.getItem('budgetPeople')) || [];
        this.expenses = JSON.parse(localStorage.getItem('budgetExpenses')) || [];
        this.payPeriods = parseInt(localStorage.getItem('budgetPayPeriods')) || 26;
        this.globalSharingMethod = localStorage.getItem('budgetGlobalSharingMethod') || 'percentage';
        this.analyticsPeriod = localStorage.getItem('budgetAnalyticsPeriod') || 'biweekly';
        
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
            this.showAlert('Please enter a valid name and bi-weekly pay amount.', 'Invalid Input', 'error');
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
                        <label for="editPay_${id}">Bi-weekly Pay:</label>
                        <input type="number" id="editPay_${id}" value="${person.biWeeklyPay}" placeholder="Bi-weekly pay" step="0.01">
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
            this.showAlert('Please enter a valid name and bi-weekly pay amount.', 'Invalid Input', 'error');
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
                        </div>
                        <button class="person-toggle-btn collapsed" data-person-id="${person.id}">
                            Details
                        </button>
                    </div>
                    
                    <div class="income-bar" style="margin-top: 15px;">
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
                        
                        <div class="person-actions">
                            <button class="btn btn-danger btn-small remove-person-btn" data-person-id="${person.id}" title="Remove ${person.name}">
                                <span class="btn-icon">🗑️</span> Remove
                            </button>
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

        tbody.innerHTML = this.expenses.map(expense => `
            <tr data-expense-id="${expense.id}">
                <td class="editable-cell" data-field="name" data-type="text">${expense.name}</td>
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
                    <span class="sharing-badge">${expense.sharingMethod === 'even' ? 'Even Split' : 'By Income %'}</span>
                </td>
                <td>
                    <button class="btn btn-danger remove-expense-btn" data-expense-id="${expense.id}">Remove</button>
                </td>
            </tr>
        `).join('');

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
                    <option value="even" ${expense.sharingMethod === 'even' ? 'selected' : ''}>Even Split</option>
                    <option value="percentage" ${expense.sharingMethod === 'percentage' ? 'selected' : ''}>By Income %</option>
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
                <!-- Summary Totals Table -->
                <div class="summary-totals">
                    <table class="expense-summary-table">
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th>Total Expenses</th>
                                <th>Per Person Average</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="bi-weekly-row">
                                <td><strong>Bi-weekly</strong></td>
                                <td class="amount"><strong>${this.formatCurrency(totalBiWeeklyExpenses)}</strong></td>
                                <td class="amount">${this.formatCurrency(totalBiWeeklyExpenses / this.people.length)}</td>
                            </tr>
                            <tr class="monthly-row">
                                <td><strong>Monthly</strong></td>
                                <td class="amount"><strong>${this.formatCurrency(totalMonthlyExpenses)}</strong></td>
                                <td class="amount">${this.formatCurrency(totalMonthlyExpenses / this.people.length)}</td>
                            </tr>
                            <tr class="yearly-row">
                                <td><strong>Yearly</strong></td>
                                <td class="amount"><strong>${this.formatCurrency(totalYearlyExpenses)}</strong></td>
                                <td class="amount">${this.formatCurrency(totalYearlyExpenses / this.people.length)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

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
            
            html += `
                <tr>
                    <td><strong>${this.capitalizeCategory(category)}</strong></td>
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
                    
                    html += `
                        <tr class="subcategory-row">
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
                        <tr class="subcategory-row">
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
                            <th>Pay Period Income</th>
                            <th>Pay Period Expenses</th>
                            <th>Pay Period Excess</th>
                            <th>Monthly Excess</th>
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
                    <td class="amount">${this.formatCurrency(personPayPeriodIncome)}</td>
                    <td class="amount">${this.formatCurrency(personExpenseShare)}</td>
                    <td class="amount ${payPeriodExcess >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(payPeriodExcess)}
                    </td>
                    <td class="amount ${monthlyExcess >= 0 ? 'positive' : 'negative'}">
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
                            <td class="amount"><strong>${this.formatCurrency(totalPayPeriodIncome)}</strong></td>
                            <td class="amount"><strong>${this.formatCurrency(totalPayPeriodExpenses)}</strong></td>
                            <td class="amount ${totalPayPeriodExcess >= 0 ? 'positive' : 'negative'}">
                                <strong>${this.formatCurrency(totalPayPeriodExcess)}</strong>
                            </td>
                            <td class="amount ${totalMonthlyExcess >= 0 ? 'positive' : 'negative'}">
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
            'health': 'gym'
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
        this.renderIncomeExpenseChart();
        this.renderSavingsRate();
        this.renderSubcategoryChart();
        this.renderSubcategoryBars();
    }

    clearAnalytics() {
        // Clear charts if no data
        const charts = ['expensePieChart', 'incomeExpenseChart', 'subcategoryChart'];
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
        const canvas = document.getElementById('expensePieChart');
        const ctx = canvas.getContext('2d');
        
        // Group expenses by category using analytics period
        const categoryTotals = {};
        this.expenses.forEach(expense => {
            const category = this.capitalizeCategory(expense.category);
            categoryTotals[category] = (categoryTotals[category] || 0) + this.getAnalyticsAmount(expense.biWeeklyAmount);
        });

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

        if (this.expensePieChart) {
            this.expensePieChart.destroy();
        }

        this.expensePieChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${this.getAnalyticsLabel()} Expense Distribution`
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    renderIncomeExpenseChart() {
        const canvas = document.getElementById('incomeExpenseChart');
        const ctx = canvas.getContext('2d');
        
        const totalIncome = this.people.reduce((sum, person) => sum + this.getPersonAnalyticsAmount(person), 0);
        const totalExpenses = this.expenses.reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
        const totalExcess = totalIncome - totalExpenses;

        const data = {
            labels: ['Income', 'Expenses', 'Excess'],
            datasets: [{
                data: [totalIncome, totalExpenses, Math.max(0, totalExcess)],
                backgroundColor: ['#28a745', '#dc3545', '#007bff'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        if (this.incomeExpenseChart) {
            this.incomeExpenseChart.destroy();
        }

        this.incomeExpenseChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${this.getAnalyticsLabel()} Income vs Expenses`
                    },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    renderSavingsRate() {
        const totalIncome = this.people.reduce((sum, person) => sum + this.getPersonAnalyticsAmount(person), 0);
        const totalExpenses = this.expenses.reduce((sum, expense) => sum + this.getAnalyticsAmount(expense.biWeeklyAmount), 0);
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;
        
        document.getElementById('savingsRate').textContent = Math.max(0, savingsRate).toFixed(1) + '%';
        
        // Update circle color based on savings rate
        const circle = document.querySelector('.metric-circle');
        if (savingsRate >= 20) {
            circle.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        } else if (savingsRate >= 10) {
            circle.style.background = 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)';
        } else {
            circle.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        }
    }

    renderSubcategoryChart() {
        const canvas = document.getElementById('subcategoryChart');
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

        if (this.subcategoryChart) {
            this.subcategoryChart.destroy();
        }

        this.subcategoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 8,
                            font: { size: 10 }
                        }
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
            return;
        }

        // Sort by amount (highest first) and take top 8
        subcategoryData.sort((a, b) => b.amount - a.amount);
        const topSubcategories = subcategoryData.slice(0, 8);
        
        const maxAmount = Math.max(...topSubcategories.map(item => item.amount));
        const totalSubcategoryAmount = subcategoryData.reduce((sum, item) => sum + item.amount, 0);

        let html = '';
        topSubcategories.forEach(item => {
            const percentage = maxAmount > 0 ? (item.amount / maxAmount * 100) : 0;
            const percentOfTotal = totalSubcategoryAmount > 0 ? (item.amount / totalSubcategoryAmount * 100) : 0;
            
            // Determine if the bar is too small for text inside (less than 25% width)
            const isSmallBar = percentage < 25;
            const amountClass = isSmallBar ? 'subcategory-bar-amount-outside' : 'subcategory-bar-amount';
            
            html += `
                <div class="subcategory-bar">
                    <div class="subcategory-bar-category">${item.category}</div>
                    <div class="subcategory-bar-label">${item.subcategory}</div>
                    <div class="subcategory-bar-track">
                        <div class="subcategory-bar-fill" style="width: ${percentage}%">
                            ${!isSmallBar ? `<div class="subcategory-bar-amount">${this.formatCurrency(item.amount)}</div>` : ''}
                        </div>
                        ${isSmallBar ? `<div class="subcategory-bar-amount-outside">${this.formatCurrency(item.amount)}</div>` : ''}
                    </div>
                    <div class="subcategory-bar-percentage">${percentOfTotal.toFixed(1)}%</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }    capitalizeCategory(category) {
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
                okButton.removeEventListener('click', handleOk);
                resolve(true);
            };

            okButton.addEventListener('click', handleOk);
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
            alertMessage.textContent = message;
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

            const cleanup = () => {
                okButton.removeEventListener('click', handleOk);
                cancelButton.removeEventListener('click', handleCancel);
                okButton.textContent = 'OK';
            };

            okButton.addEventListener('click', handleOk);
            cancelButton.addEventListener('click', handleCancel);
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
            // Create a shareable budget summary
            const budgetData = {
                people: this.people.map(person => ({
                    name: person.name,
                    biWeeklyPay: person.biWeeklyPay,
                    monthlyPay: person.monthlyPay
                })),
                expenses: this.expenses.map(expense => ({
                    name: expense.name,
                    monthlyAmount: expense.monthlyAmount,
                    category: expense.category,
                    subCategory: expense.subCategory,
                    sharingMethod: expense.sharingMethod
                })),
                payPeriods: this.payPeriods,
                globalSharingMethod: this.globalSharingMethod,
                createdDate: new Date().toLocaleDateString()
            };

            // Create a human-readable summary
            const totalIncome = this.people.reduce((sum, person) => sum + person.monthlyPay, 0);
            const totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.monthlyAmount, 0);
            const surplus = totalIncome - totalExpenses;

            const summary = `🏠 Household Budget Summary (${budgetData.createdDate})

👥 People & Income:
${this.people.map(person => `• ${person.name}: ${this.formatCurrency(person.monthlyPay)}/month`).join('\n')}

💰 Total Monthly Income: ${this.formatCurrency(totalIncome)}

💸 Monthly Expenses:
${this.expenses.map(expense => `• ${expense.name} (${this.capitalizeCategory(expense.category)}): ${this.formatCurrency(expense.monthlyAmount)}`).join('\n')}

💰 Total Monthly Expenses: ${this.formatCurrency(totalExpenses)}

📊 Monthly ${surplus >= 0 ? 'Surplus' : 'Deficit'}: ${this.formatCurrency(Math.abs(surplus))}

⚙️ Settings:
• Pay Periods: ${this.payPeriods} per year
• Sharing Method: ${this.globalSharingMethod === 'percentage' ? 'By Income %' : 'Even Split'}

Generated by Budget Tool`;

            // Check if Web Share API is supported
            if (navigator.share) {
                await navigator.share({
                    title: 'Household Budget Summary',
                    text: summary,
                });
                await this.showAlert('Budget shared successfully!', 'Share Complete', 'success');
            } else {
                // Fallback to clipboard
                await navigator.clipboard.writeText(summary);
                await this.showAlert('Budget summary copied to clipboard! You can now paste it anywhere to share.', 'Copied to Clipboard', 'success');
            }
        } catch (error) {
            console.error('Share error:', error);
            if (error.name === 'AbortError') {
                // User cancelled sharing, don't show error
                return;
            }
            // Fallback: try to copy to clipboard
            try {
                const budgetData = {
                    people: this.people.map(person => ({
                        name: person.name,
                        biWeeklyPay: person.biWeeklyPay,
                        monthlyPay: person.monthlyPay
                    })),
                    expenses: this.expenses.map(expense => ({
                        name: expense.name,
                        monthlyAmount: expense.monthlyAmount,
                        category: expense.category,
                        subCategory: expense.subCategory,
                        sharingMethod: expense.sharingMethod
                    })),
                    payPeriods: this.payPeriods,
                    globalSharingMethod: this.globalSharingMethod,
                    createdDate: new Date().toLocaleDateString()
                };

                await navigator.clipboard.writeText(JSON.stringify(budgetData, null, 2));
                await this.showAlert('Budget data copied to clipboard as JSON. You can share this with others to import.', 'Copied to Clipboard', 'info');
            } catch (clipboardError) {
                console.error('Clipboard error:', clipboardError);
                await this.showAlert('Unable to share budget. Please try again or use the PDF export feature.', 'Share Failed', 'error');
            }
        }
    }
}

// Initialize the budget tool when the page loads
const budgetTool = new BudgetTool();
