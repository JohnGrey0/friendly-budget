class BudgetTool {
    constructor() {
        this.people = JSON.parse(localStorage.getItem('budgetPeople')) || [];
        this.expenses = JSON.parse(localStorage.getItem('budgetExpenses')) || [];
        this.payPeriods = parseInt(localStorage.getItem('budgetPayPeriods')) || 26;
        this.globalSharingMethod = localStorage.getItem('budgetGlobalSharingMethod') || 'percentage';
        
        // Migrate existing expenses to have sharing method
        this.expenses.forEach(expense => {
            if (!expense.sharingMethod) {
                expense.sharingMethod = 'percentage'; // default to percentage-based sharing for existing expenses
            }
        });
        
        this.initializeEventListeners();
        this.render();
    }

    initializeEventListeners() {
        // Pay periods change
        document.getElementById('payPeriods').addEventListener('change', (e) => {
            this.payPeriods = parseInt(e.target.value);
            this.recalculatePeopleIncome();
            this.recalculateExpenseBiWeekly();
            this.saveData();
            this.render();
        });

        // Add person
        document.getElementById('addPerson').addEventListener('click', () => {
            this.addPerson();
        });

        // Add expense
        document.getElementById('addExpense').addEventListener('click', () => {
            this.addExpense();
        });

        // Apply global sharing method
        document.getElementById('setPercentageSharing').addEventListener('click', () => {
            this.setGlobalSharingMethod('percentage');
        });

        document.getElementById('setEvenSharing').addEventListener('click', () => {
            this.setGlobalSharingMethod('even');
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
    }

    addPerson() {
        const name = document.getElementById('personName').value.trim();
        const biWeeklyPay = parseFloat(document.getElementById('biWeeklyPay').value);

        if (!name || isNaN(biWeeklyPay) || biWeeklyPay <= 0) {
            alert('Please enter a valid name and bi-weekly pay amount.');
            return;
        }

        const person = {
            id: Date.now(),
            name,
            biWeeklyPay,
            monthlyPay: this.calculateMonthlyFromBiWeekly(biWeeklyPay),
            yearlyPay: biWeeklyPay * this.payPeriods
        };

        this.people.push(person);
        this.clearPersonForm();
        this.saveData();
        this.render();
    }

    addExpense() {
        const name = document.getElementById('expenseName').value.trim();
        const monthlyAmount = parseFloat(document.getElementById('monthlyAmount').value);
        const category = document.getElementById('category').value;
        const subCategory = document.getElementById('subCategory').value.trim();
        const sharingMethod = document.getElementById('sharingMethod').value;

        if (!name || isNaN(monthlyAmount) || monthlyAmount <= 0) {
            alert('Please enter a valid expense name and monthly amount.');
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

    removePerson(id) {
        this.people = this.people.filter(person => person.id !== id);
        this.saveData();
        this.render();
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
            alert('Please enter a valid name and bi-weekly pay amount.');
            return;
        }

        const person = this.people.find(p => p.id === id);
        if (person) {
            person.name = newName;
            person.biWeeklyPay = newPay;
            person.monthlyPay = this.calculateMonthlyFromBiWeekly(newPay);
            person.yearlyPay = newPay * this.payPeriods;
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

    removeExpense(id) {
        this.expenses = this.expenses.filter(expense => expense.id !== id);
        this.saveData();
        this.render();
    }

    calculateMonthlyFromBiWeekly(biWeeklyAmount) {
        return (biWeeklyAmount * this.payPeriods) / 12;
    }

    calculateBiWeeklyFromMonthly(monthlyAmount) {
        return (monthlyAmount * 12) / this.payPeriods;
    }

    recalculatePeopleIncome() {
        this.people.forEach(person => {
            person.monthlyPay = this.calculateMonthlyFromBiWeekly(person.biWeeklyPay);
            person.yearlyPay = person.biWeeklyPay * this.payPeriods;
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
    }

    clearExpenseForm() {
        document.getElementById('expenseName').value = '';
        document.getElementById('monthlyAmount').value = '';
        document.getElementById('subCategory').value = '';
        document.getElementById('sharingMethod').value = this.globalSharingMethod;
    }

    saveData() {
        localStorage.setItem('budgetPeople', JSON.stringify(this.people));
        localStorage.setItem('budgetExpenses', JSON.stringify(this.expenses));
        localStorage.setItem('budgetPayPeriods', this.payPeriods.toString());
        localStorage.setItem('budgetGlobalSharingMethod', this.globalSharingMethod);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    calculatePercentDifference(amount, total) {
        if (total === 0) return 0;
        return ((amount / total) * 100).toFixed(1);
    }

    render() {
        this.renderPayPeriods();
        this.renderSharingButtons();
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

    renderPayPeriods() {
        document.getElementById('payPeriods').value = this.payPeriods;
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

    renderExpenseForm() {
        document.getElementById('sharingMethod').value = this.globalSharingMethod;
    }

    renderPeople() {
        const peopleList = document.getElementById('peopleList');
        
        if (this.people.length === 0) {
            peopleList.innerHTML = '<div class="empty-state">No people added yet. Add someone to get started!</div>';
            return;
        }

        const totalYearly = this.people.reduce((sum, person) => sum + person.yearlyPay, 0);
        const totalMonthly = this.people.reduce((sum, person) => sum + person.monthlyPay, 0);
        const totalBiWeekly = this.people.reduce((sum, person) => sum + person.biWeeklyPay, 0);

        let html = this.people.map(person => `
            <div class="person-item" data-person-id="${person.id}">
                <div class="person-info">
                    <div class="person-name editable-person-field" data-field="name" data-type="text">${person.name}</div>
                    <div class="person-details">
                        Bi-weekly: <span class="editable-person-field" data-field="biWeeklyPay" data-type="number">${this.formatCurrency(person.biWeeklyPay)}</span> | 
                        Monthly: <span title="Automatically calculated">${this.formatCurrency(person.monthlyPay)}</span> | 
                        Yearly: <span title="Automatically calculated">${this.formatCurrency(person.yearlyPay)}</span>
                        ${this.people.length > 1 ? ` (${this.calculatePercentDifference(person.yearlyPay, totalYearly)}%)` : ''}
                    </div>
                </div>
                <div class="person-actions">
                    <button class="btn btn-danger" onclick="budgetTool.removePerson(${person.id})">Remove</button>
                </div>
            </div>
        `).join('');

        peopleList.innerHTML = html;
        
        // Setup inline editing for people
        this.setupInlinePersonEditing();
        
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
        
        const inputElement = document.createElement('input');
        inputElement.type = fieldType === 'number' ? 'number' : 'text';
        inputElement.className = 'inline-edit-input';
        
        if (fieldType === 'number') {
            inputElement.step = '0.01';
            inputElement.value = currentValue;
        } else {
            inputElement.value = currentValue || '';
        }

        field.innerHTML = '';
        field.appendChild(inputElement);
        inputElement.focus();
        
        const saveEdit = () => {
            let newValue = inputElement.value.trim();
            
            if (fieldType === 'number') {
                newValue = parseFloat(newValue);
                if (isNaN(newValue) || newValue <= 0) {
                    alert('Please enter a valid amount greater than 0.');
                    inputElement.focus();
                    return;
                }
            }
            
            if (fieldName === 'name' && !newValue) {
                alert('Please enter a person\'s name.');
                inputElement.focus();
                return;
            }

            // Update the person
            person[fieldName] = newValue;
            if (fieldName === 'biWeeklyPay') {
                person.monthlyPay = this.calculateMonthlyFromBiWeekly(newValue);
                person.yearlyPay = newValue * this.payPeriods;
            }

            this.saveData();
            this.render();
        };

        const cancelEdit = () => {
            field.classList.remove('editing');
            field.innerHTML = originalContent;
            this.setupInlinePersonEditing();
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
                    <button class="btn btn-danger" onclick="budgetTool.removeExpense(${expense.id})">Remove</button>
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
                    alert('Please enter a valid amount greater than 0.');
                    inputElement.focus();
                    return;
                }
            }
            
            if (field === 'name' && !newValue) {
                alert('Please enter an expense name.');
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
        const totalMonthlyExpenses = totalBiWeeklyExpenses * this.payPeriods / 12;
        const totalYearlyExpenses = totalBiWeeklyExpenses * this.payPeriods;

        let html = `
            <div class="comprehensive-expense-summary">
                <h3>Comprehensive Expense Breakdown</h3>
                
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
            const categoryMonthly = categoryBiWeekly * this.payPeriods / 12;
            const categoryYearly = categoryBiWeekly * this.payPeriods;
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
                    const expenseMonthly = expense.biWeeklyAmount * this.payPeriods / 12;
                    const expenseYearly = expense.biWeeklyAmount * this.payPeriods;
                    const expensePercentage = totalBiWeeklyExpenses > 0 ? (expense.biWeeklyAmount / totalBiWeeklyExpenses * 100) : 0;
                    
                    html += `
                        <tr class="subcategory-row">
                            <td class="subcategory-indent">└ ${expense.name} (${expense.subCategory})</td>
                            <td class="amount">${this.formatCurrency(expense.biWeeklyAmount)}</td>
                            <td class="amount">${this.formatCurrency(expenseMonthly)}</td>
                            <td class="amount">${this.formatCurrency(expenseYearly)}</td>
                            <td class="percentage">${expensePercentage.toFixed(1)}%</td>
                        </tr>
                    `;
                } else {
                    const expenseMonthly = expense.biWeeklyAmount * this.payPeriods / 12;
                    const expenseYearly = expense.biWeeklyAmount * this.payPeriods;
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
                    </table>
                </div>

                <!-- Personal Expense Breakdown -->
                <div class="personal-breakdown-summary">
                    <h4>Personal Expense Allocation</h4>
                    <table class="expense-summary-table">
                        <thead>
                            <tr>
                                <th>Person</th>
                                <th>Bi-weekly Share</th>
                                <th>Monthly Share</th>
                                <th>Yearly Share</th>
                                <th>% of Household</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Add personal breakdown
        const expenseBreakdown = this.getExpenseBreakdownByPerson();
        Object.values(expenseBreakdown).forEach(personData => {
            const monthlyShare = personData.totalBiWeekly * this.payPeriods / 12;
            const yearlyShare = personData.totalBiWeekly * this.payPeriods;
            const householdPercentage = totalBiWeeklyExpenses > 0 ? (personData.totalBiWeekly / totalBiWeeklyExpenses * 100) : 0;
            
            html += `
                <tr>
                    <td><strong>${personData.person.name}</strong></td>
                    <td class="amount">${this.formatCurrency(personData.totalBiWeekly)}</td>
                    <td class="amount">${this.formatCurrency(monthlyShare)}</td>
                    <td class="amount">${this.formatCurrency(yearlyShare)}</td>
                    <td class="percentage">${householdPercentage.toFixed(1)}%</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
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
                            <th>Bi-weekly Pay</th>
                            <th>Bi-weekly Expenses</th>
                            <th>Bi-weekly Excess</th>
                            <th>Monthly Excess</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.people.forEach(person => {
            const personExpenseShare = this.calculatePersonTotalExpenses(person);
            const biWeeklyExcess = person.biWeeklyPay - personExpenseShare;
            const monthlyExcess = person.monthlyPay - (personExpenseShare * this.payPeriods / 12);
            
            html += `
                <tr>
                    <td class="person-name">${person.name}</td>
                    <td class="amount">${this.formatCurrency(person.biWeeklyPay)}</td>
                    <td class="amount">${this.formatCurrency(personExpenseShare)}</td>
                    <td class="amount ${biWeeklyExcess >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(biWeeklyExcess)}
                    </td>
                    <td class="amount ${monthlyExcess >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(monthlyExcess)}
                    </td>
                </tr>
            `;
        });

        const totalBiWeeklyIncome = this.people.reduce((sum, person) => sum + person.biWeeklyPay, 0);
        const totalMonthlyIncome = this.people.reduce((sum, person) => sum + person.monthlyPay, 0);
        const totalBiWeeklyExcess = totalBiWeeklyIncome - totalBiWeeklyExpenses;
        const totalMonthlyExcess = totalMonthlyIncome - (totalBiWeeklyExpenses * this.payPeriods / 12);

        html += `
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td><strong>Household Total</strong></td>
                            <td class="amount"><strong>${this.formatCurrency(totalBiWeeklyIncome)}</strong></td>
                            <td class="amount"><strong>${this.formatCurrency(totalBiWeeklyExpenses)}</strong></td>
                            <td class="amount ${totalBiWeeklyExcess >= 0 ? 'positive' : 'negative'}">
                                <strong>${this.formatCurrency(totalBiWeeklyExcess)}</strong>
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
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    // Calculate how much each person should pay for a specific expense
    calculatePersonExpenseShare(expense, person) {
        if (this.people.length <= 1) {
            return expense.biWeeklyAmount;
        }

        if (expense.sharingMethod === 'even') {
            return expense.biWeeklyAmount / this.people.length;
        } else if (expense.sharingMethod === 'percentage') {
            const totalIncome = this.people.reduce((sum, p) => sum + p.biWeeklyPay, 0);
            const personPercentage = person.biWeeklyPay / totalIncome;
            return expense.biWeeklyAmount * personPercentage;
        }
        
        return 0;
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
        this.renderBudgetBars();
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
        
        // Group expenses by category
        const categoryTotals = {};
        this.expenses.forEach(expense => {
            const category = this.capitalizeCategory(expense.category);
            categoryTotals[category] = (categoryTotals[category] || 0) + expense.biWeeklyAmount;
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
        
        const totalBiWeeklyIncome = this.people.reduce((sum, person) => sum + person.biWeeklyPay, 0);
        const totalBiWeeklyExpenses = this.expenses.reduce((sum, expense) => sum + expense.biWeeklyAmount, 0);
        const totalBiWeeklyExcess = totalBiWeeklyIncome - totalBiWeeklyExpenses;

        const data = {
            labels: ['Income', 'Expenses', 'Excess'],
            datasets: [{
                data: [totalBiWeeklyIncome, totalBiWeeklyExpenses, Math.max(0, totalBiWeeklyExcess)],
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
        const totalBiWeeklyIncome = this.people.reduce((sum, person) => sum + person.biWeeklyPay, 0);
        const totalBiWeeklyExpenses = this.expenses.reduce((sum, expense) => sum + expense.biWeeklyAmount, 0);
        const savingsRate = totalBiWeeklyIncome > 0 ? ((totalBiWeeklyIncome - totalBiWeeklyExpenses) / totalBiWeeklyIncome * 100) : 0;
        
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

    renderBudgetBars() {
        const container = document.getElementById('budgetBars');
        const totalBiWeeklyIncome = this.people.reduce((sum, person) => sum + person.biWeeklyPay, 0);
        const totalBiWeeklyExpenses = this.expenses.reduce((sum, expense) => sum + expense.biWeeklyAmount, 0);
        const totalBiWeeklyExcess = totalBiWeeklyIncome - totalBiWeeklyExpenses;
        
        const maxValue = Math.max(totalBiWeeklyIncome, totalBiWeeklyExpenses, Math.abs(totalBiWeeklyExcess));
        
        const bars = [
            { label: 'Income', value: totalBiWeeklyIncome, type: 'income' },
            { label: 'Expenses', value: totalBiWeeklyExpenses, type: 'expenses' },
            { label: 'Excess', value: Math.abs(totalBiWeeklyExcess), type: 'excess' }
        ];

        let html = '';
        bars.forEach(bar => {
            const percentage = maxValue > 0 ? (bar.value / maxValue * 100) : 0;
            html += `
                <div class="budget-bar">
                    <div class="budget-bar-label">${bar.label}</div>
                    <div class="budget-bar-track">
                        <div class="budget-bar-fill ${bar.type}" style="width: ${percentage}%">
                            <div class="budget-bar-value">${this.formatCurrency(bar.value)}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    renderSubcategoryChart() {
        const canvas = document.getElementById('subcategoryChart');
        const ctx = canvas.getContext('2d');
        
        // Group expenses by subcategory (only those with subcategories)
        const subcategoryTotals = {};
        this.expenses.forEach(expense => {
            if (expense.subCategory && expense.subCategory.trim() !== '') {
                const subcat = expense.subCategory.trim();
                subcategoryTotals[subcat] = (subcategoryTotals[subcat] || 0) + expense.biWeeklyAmount;
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
                    existing.amount += expense.biWeeklyAmount;
                } else {
                    subcategoryData.push({
                        category: this.capitalizeCategory(expense.category),
                        subcategory: expense.subCategory,
                        amount: expense.biWeeklyAmount
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
            
            html += `
                <div class="subcategory-bar">
                    <div class="subcategory-bar-category">${item.category}</div>
                    <div class="subcategory-bar-label">${item.subcategory}</div>
                    <div class="subcategory-bar-track">
                        <div class="subcategory-bar-fill" style="width: ${percentage}%">
                            <div class="subcategory-bar-amount">${this.formatCurrency(item.amount)}</div>
                        </div>
                    </div>
                    <div class="subcategory-bar-percentage">${percentOfTotal.toFixed(1)}%</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    capitalizeCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
}

// Initialize the budget tool when the page loads
const budgetTool = new BudgetTool();
