document.addEventListener('DOMContentLoaded', () => {

    const elements = {
        loginOverlay: document.getElementById('loginOverlay'),
        loginBtn: document.getElementById('loginBtn'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        loginError: document.getElementById('loginError'),
        appContainer: document.getElementById('appContainer'),
        topBar: document.getElementById('topBar'),
        menuToggleBtn: document.getElementById('menuToggleBtn'),
        dropdownMenu: document.getElementById('dropdownMenu'),
        menuUsername: document.getElementById('menuUsername'),
        menuListBuilderBtn: document.getElementById('menuListBuilderBtn'),
        menuPickingBtn: document.getElementById('menuPickingBtn'),
        menuInventoryBtn: document.getElementById('menuInventoryBtn'),
        menuSavedLists: document.getElementById('menuSavedLists'),
        menuAdminBtn: document.getElementById('menuAdminBtn'),
        menuLogoutBtn: document.getElementById('menuLogoutBtn'),
        mainContent: document.getElementById('main-content'),
        inventoryPage: document.getElementById('inventoryPage'),
        pickingPage: document.getElementById('pickingPage'),
        adminPanel: document.getElementById('adminPanel'),
        floatingInputBar: document.getElementById('floating-input-bar'),
        floatingEanInput: document.getElementById('floating-ean-input'),
        floatingQuantityInput: document.getElementById('floating-quantity-input'),
        floatingAddBtn: document.getElementById('floating-add-btn'),
        floatingSearchResults: document.getElementById('floating-search-results'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        savedListsModal: document.getElementById('savedListsModal'),
        savedListsContainer: document.getElementById('savedListsContainer'),
        toastContainer: document.getElementById('toast-container'),
        printArea: document.getElementById('print-area'),
        printClientName: document.getElementById('print-client-name'),
        printDate: document.getElementById('print-date'),
        printTable: document.getElementById('print-table'),
        printSummary: document.getElementById('print-summary'),
    };

    let productDatabase = { primary: [], secondary: [] };
    let scannedItems = [];
    let inventoryItems = [];
    let activePage = 'listBuilder';
    let currentUser = null;

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); };
    };

    const showToast = (message, type = 'info', duration = 3000) => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, duration);
        }, 10);
    };

    const downloadFile = (content, mimeType, filename) => {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) { elements.loginOverlay.style.display = 'flex'; return; }
        try {
            const response = await fetch('/api/auth/verify', { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Token nieprawidłowy');
            currentUser = await response.json();
            showApp();
        } catch (error) {
            localStorage.removeItem('token');
            elements.loginOverlay.style.display = 'flex';
        }
    };

    const attemptLogin = async () => {
        const username = elements.loginUsername.value.trim();
        const password = elements.loginPassword.value.trim();
        if (!username || !password) { elements.loginError.textContent = 'Wszystkie pola są wymagane.'; return; }
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) { elements.loginError.textContent = data.msg || 'Błąd logowania.'; return; }
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showApp();
        } catch (error) { elements.loginError.textContent = 'Błąd połączenia z serwerem.'; }
    };

    const showApp = async () => {
        elements.loginOverlay.style.display = 'none';
        elements.appContainer.style.display = 'block';
        elements.topBar.style.display = 'flex';
        elements.menuUsername.textContent = currentUser.username;
        if (currentUser.role === 'admin') elements.menuAdminBtn.style.display = 'flex';
        await loadDataFromServer();
        switchTab('listBuilder');
    };

    const loadDataFromServer = async () => {
        const fetchAndParseCsv = (filename) => fetch(`${filename}?t=${new Date().getTime()}`)
            .then(r => r.ok ? r.arrayBuffer() : Promise.reject(`Błąd sieci: ${r.statusText}`))
            .then(b => new TextDecoder("Windows-1250").decode(b))
            .then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: r => res(r.data), error: e => rej(e) })));
        
        try {
            const [data2, data1] = await Promise.all([fetchAndParseCsv('produkty2.csv'), fetchAndParseCsv('produkty.csv')]);
            const mapData = p => ({
                ean: String(p.ean || "").trim(),
                kod_kreskowy: String(p.kod_kreskowy || "").trim(),
                kod_produktu: String(p.kod_produktu || "").trim(),
                nazwa_produktu: String(p.nazwa_produktu || "").trim(),
                cena: String(p.cena || "0").replace(',', '.').trim() || "0"
            });
            productDatabase.primary = data2.map(mapData);
            productDatabase.secondary = data1.map(mapData);
            showToast("Baza produktów zaktualizowana.", "success");
        } catch (error) {
            showToast('BŁĄD: Nie udało się załadować bazy produktów.', 'error');
        }
    };
    
    const switchTab = (page) => {
        activePage = page;
        renderCurrentPage();
        window.scrollTo(0, 0);
    };

    const renderCurrentPage = () => {
        ['mainContent', 'adminPanel', 'inventoryPage', 'pickingPage'].forEach(id => {
            if (elements[id]) elements[id].style.display = 'none';
        });

        const pageIdMap = {
            listBuilder: 'mainContent', inventory: 'inventoryPage',
            picking: 'pickingPage', admin: 'adminPanel'
        };
        const pageElement = elements[pageIdMap[activePage]];

        if (pageElement) {
            pageElement.style.display = 'block';
            elements.floatingInputBar.style.display = (activePage === 'listBuilder' || activePage === 'inventory') ? 'flex' : 'none';
        }
        
        switch(activePage) {
            case 'listBuilder': renderListBuilderPage(); break;
            case 'inventory': renderInventoryPage(); break;
            case 'picking': renderPickingPage(); break;
            case 'admin': renderAdminPage(); break;
        }
    };

    const performSearch = (term) => {
        if (!term) return [];
        const lowerTerm = term.toLowerCase();
        const searchIn = (db) => db.filter(p =>
            (p.kod_kreskowy?.toLowerCase().includes(lowerTerm)) ||
            (p.ean?.toLowerCase().includes(lowerTerm)) ||
            (p.kod_produktu?.toLowerCase().includes(lowerTerm))
        );
        const primaryResults = searchIn(productDatabase.primary);
        if (primaryResults.length > 0) return primaryResults;
        return searchIn(productDatabase.secondary);
    };

    const findProductByCode = (code) => {
        if (!code) return null;
        const search = (db) => db.find(p => p.kod_kreskowy === code || p.ean === code || p.kod_produktu === code);
        return search(productDatabase.primary) || search(productDatabase.secondary);
    };

    const handleFloatingBarAdd = () => {
        const code = elements.floatingEanInput.value.trim();
        const quantity = parseInt(elements.floatingQuantityInput.value, 10);
        if (!code || isNaN(quantity) || quantity < 1) return;

        let productData = findProductByCode(code);
        if (!productData) {
            if (confirm(`Produkt o kodzie "${code}" nie istnieje w bazie. Czy chcesz dodać go jako produkt spoza listy?`)) {
                productData = { ean: code, kod_kreskowy: code, kod_produktu: code, nazwa_produktu: "Produkt spoza bazy", cena: "0" };
            } else {
                return;
            }
        }

        if (activePage === 'listBuilder') {
            addProductToList(productData, quantity);
        } else if (activePage === 'inventory') {
            handleInventoryAdd(productData, quantity);
        }

        elements.floatingEanInput.value = '';
        elements.floatingSearchResults.style.display = 'none';
        elements.floatingEanInput.focus();
        elements.floatingQuantityInput.value = '1';
    };

    const handleFloatingBarSearch = () => {
        const searchTerm = elements.floatingEanInput.value.trim();
        const resultsDiv = elements.floatingSearchResults;
        resultsDiv.innerHTML = '';
        if (!searchTerm) { resultsDiv.style.display = 'none'; return; }
        
        const results = performSearch(searchTerm);
        if (results.length > 0) {
            const list = document.createElement('ul');
            results.slice(0, 5).forEach(p => {
                const li = document.createElement('li');
                li.dataset.code = p.ean || p.kod_kreskowy || p.kod_produktu;
                li.innerHTML = `<strong>${p.nazwa_produktu}</strong> <br> <small>${p.ean || p.kod_kreskowy}</small>`;
                list.appendChild(li);
            });
            resultsDiv.appendChild(list);
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.style.display = 'none';
        }
    };

    const renderListBuilderPage = () => {
        elements.mainContent.innerHTML = `
            <h2><i class="fa-solid fa-list-check"></i> Nowa Lista Zamówienia</h2>
            <div style="margin: 20px 0;">
                <input type="text" id="clientNameInput" placeholder="Nazwa klienta...">
            </div>
            <table id="list-builder-table">
                <thead><tr><th>Nazwa</th><th>Kod</th><th>EAN</th><th>Cena</th><th>Ilość</th><th>Akcje</th></tr></thead>
                <tbody></tbody>
            </table>
            <div style="margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end;">
                 <button id="printListBtn" class="btn"><i class="fa-solid fa-print"></i> Drukuj</button>
                 <button id="exportOptimaBtn" class="btn"><i class="fa-solid fa-file-export"></i> Eksport (Optima)</button>
                 <button id="exportExcelBtn" class="btn"><i class="fa-solid fa-file-excel"></i> Eksport (Excel)</button>
                 <button id="clearListBtn" class="btn-danger"><i class="fa-solid fa-eraser"></i> Wyczyść</button>
            </div>
        `;
        renderScannedList();
    };

    const addProductToList = (productData, quantity) => {
        const existingItem = scannedItems.find(item => (item.ean || item.kod_kreskowy) === (productData.ean || productData.kod_kreskowy));
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            scannedItems.push({ ...productData, quantity });
        }
        renderScannedList();
        showToast(`Dodano: ${productData.nazwa_produktu} (x${quantity})`, "success");
    };

    const renderScannedList = () => {
        const tableBody = document.querySelector('#list-builder-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = scannedItems.map((item, index) => `
            <tr>
                <td>${item.nazwa_produktu}</td>
                <td>${item.kod_produktu}</td>
                <td>${item.ean || item.kod_kreskowy}</td>
                <td>${parseFloat(item.cena).toFixed(2)}</td>
                <td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}" inputmode="numeric"></td>
                <td><button class="delete-btn btn-danger btn-icon" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>
            </tr>
        `).join('');
    };
    
    const exportToExcel = () => {
        if (scannedItems.length === 0) { showToast('Lista jest pusta.', 'warning'); return; }
        const clientName = document.getElementById('clientNameInput').value.trim() || 'Bez nazwy';
        let totalValue = 0;
        let csvContent = "EAN;Nazwa;Ilość;Kod produktu;Cena\n";
        scannedItems.forEach(item => {
            csvContent += `${item.ean || item.kod_kreskowy};${item.nazwa_produktu};${item.quantity};${item.kod_produktu};${item.cena}\n`;
            totalValue += (parseFloat(item.cena) || 0) * item.quantity;
        });
        csvContent += "\n;;;;\n";
        csvContent += `Klient:;${clientName};;;\n`;
        csvContent += `Suma wartości:;${totalValue.toFixed(2)} PLN;;;\n`;
        downloadFile('\uFEFF' + csvContent, 'text/csv;charset=utf-8;', `${clientName}_export_excel.csv`);
    };

    const exportToOptima = () => {
        if (scannedItems.length === 0) { showToast('Lista jest pusta.', 'warning'); return; }
        const clientName = document.getElementById('clientNameInput').value.trim() || 'Bez nazwy';
        let csvContent = "EAN;Ilosc\n";
        scannedItems.forEach(item => {
            csvContent += `${item.ean || item.kod_kreskowy};${item.quantity}\n`;
        });
        downloadFile('\uFEFF' + csvContent, 'text/csv;charset=utf-8;', `${clientName}_export_optima.csv`);
    };

    const printList = () => {
        if (scannedItems.length === 0) { showToast('Lista jest pusta.', 'warning'); return; }
        const clientName = document.getElementById('clientNameInput').value.trim() || 'Zamówienie';
        elements.printClientName.textContent = `Zamówienie dla: ${clientName}`;
        elements.printDate.textContent = new Date().toLocaleString('pl-PL');
        
        let tableHTML = `<thead><tr><th>Nazwa</th><th>Kod</th><th>Ilość</th><th>Cena</th><th>Wartość</th></tr></thead><tbody>`;
        let totalValue = 0;
        scannedItems.forEach(item => {
            const itemValue = (parseFloat(item.cena) || 0) * item.quantity;
            totalValue += itemValue;
            tableHTML += `<tr>
                <td>${item.nazwa_produktu}</td>
                <td>${item.kod_produktu}</td>
                <td>${item.quantity}</td>
                <td>${parseFloat(item.cena).toFixed(2)}</td>
                <td>${itemValue.toFixed(2)}</td>
            </tr>`;
        });
        tableHTML += `</tbody>`;
        elements.printTable.innerHTML = tableHTML;
        elements.printSummary.textContent = `Suma: ${totalValue.toFixed(2)} PLN`;

        window.print();
    };

    const renderInventoryPage = () => {
        elements.inventoryPage.innerHTML = `
            <h2><i class="fa-solid fa-clipboard-list"></i> Inwentaryzacja</h2>
            <table>
                <thead><tr><th>Nazwa</th><th>Kod</th><th>Ilość</th><th>Akcje</th></tr></thead>
                <tbody id="inventoryListBody"></tbody>
            </table>
        `;
        renderInventoryList();
    };
    
    const handleInventoryAdd = (productData, quantity) => {
        const code = productData.ean || productData.kod_kreskowy;
        const existing = inventoryItems.find(i => (i.ean || i.kod_kreskowy) === code);
        if (existing) { existing.quantity += quantity; } 
        else { inventoryItems.push({ ...productData, quantity }); }
        renderInventoryList();
        showToast(`Dodano do inwentaryzacji: ${productData.nazwa_produktu}`);
    };

    const renderInventoryList = () => {
        const body = document.getElementById('inventoryListBody');
        if(!body) return;
        body.innerHTML = inventoryItems.map((item, i) => `
            <tr>
                <td>${item.nazwa_produktu}</td>
                <td>${item.kod_produktu}</td>
                <td><span class="editable-quantity" data-index="${i}">${item.quantity}</span></td>
                <td><button class="delete-inv-item-btn btn-danger btn-icon" data-index="${i}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');
    };
    
    // --- **NAPRAWIONA/DODANA FUNKCJA** ---
    const renderPickingPage = () => {
        elements.pickingPage.innerHTML = `
            <h2><i class="fa-solid fa-box-open"></i> Kompletacja</h2>
            <p style="margin-top: 15px; color: var(--text-secondary-color);">Moduł w budowie. Wybierz zamówienie z zapisanych list, aby rozpocząć kompletację.</p>
        `;
        // Tutaj w przyszłości znajdzie się pełna logika kompletacji
    };

    const renderAdminPage = () => {
        elements.adminPanel.innerHTML = `
            <h2><i class="fa-solid fa-users-cog"></i> Panel Administratora</h2>
            <div class="admin-section">
                <h3>Zarządzanie użytkownikami</h3>
                <div id="allUsersList" style="margin-top: 15px;"><p>Ładowanie użytkowników...</p></div>
            </div>
        `;
        loadAllUsers();
    };

    const loadAllUsers = async () => {
        const userListEl = document.getElementById('allUsersList');
        try {
            const response = await fetch('/api/admin/users', { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) {
                 // Błąd serwera jest bardziej informacyjny niż generyczny komunikat
                const errorData = await response.json().catch(() => ({ msg: 'Błąd serwera: nie można odczytać odpowiedzi.' }));
                throw new Error(errorData.msg || `Błąd serwera: ${response.status}`);
            }
            const users = await response.json();
            
            if (!userListEl) return;
            if (users.length === 0) {
                userListEl.innerHTML = `<p>Brak zarejestrowanych użytkowników.</p>`;
                return;
            }

            userListEl.innerHTML = users.map(user => `
                <div class="user-item">
                    <div><strong>${user.username}</strong><br><small>Rola: ${user.role} | Status: ${user.isApproved ? 'Zatwierdzony' : 'Oczekujący'}</small></div>
                    <div class="user-actions">
                        ${!user.isApproved ? `<button class="approve-user-btn btn-primary" data-userid="${user._id}">Zatwierdź</button>` : ''}
                        <button class="delete-user-btn btn-danger" data-userid="${user._id}" data-username="${user.username}">Usuń</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            if (userListEl) userListEl.innerHTML = `<p style="color:var(--danger-color); font-weight: bold;">Nie udało się załadować użytkowników. ${error.message}</p>`;
        }
    };
    
    const handleUserAction = async (url, options) => {
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Błąd operacji');
            showToast(data.msg || 'Operacja zakończona sukcesem!', 'success');
            loadAllUsers();
        } catch (error) { showToast(`Błąd: ${error.message}`, 'error'); }
    };
    
    const setupEventListeners = () => {
        elements.loginBtn.addEventListener('click', attemptLogin);
        elements.loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });

        elements.menuToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); elements.dropdownMenu.classList.toggle('show'); });
        window.addEventListener('click', () => { if (elements.dropdownMenu.classList.contains('show')) elements.dropdownMenu.classList.remove('show'); });
        
        elements.menuListBuilderBtn.addEventListener('click', () => switchTab('listBuilder'));
        elements.menuPickingBtn.addEventListener('click', () => switchTab('picking'));
        elements.menuInventoryBtn.addEventListener('click', () => switchTab('inventory'));
        elements.menuAdminBtn.addEventListener('click', () => switchTab('admin'));
        elements.menuLogoutBtn.addEventListener('click', () => { localStorage.clear(); location.reload(); });

        elements.floatingEanInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleFloatingBarAdd(); });
        elements.floatingAddBtn.addEventListener('click', handleFloatingBarAdd);
        elements.floatingEanInput.addEventListener('input', debounce(handleFloatingBarSearch, 300));
        elements.floatingSearchResults.addEventListener('click', (e) => {
             const li = e.target.closest('li');
             if (li && li.dataset.code) {
                 elements.floatingEanInput.value = li.dataset.code;
                 elements.floatingSearchResults.style.display = 'none';
                 elements.floatingEanInput.focus();
             }
        });
        
        document.querySelector('.close-modal-btn')?.addEventListener('click', () => { elements.savedListsModal.style.display = 'none'; });

        elements.darkModeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
        
        document.body.addEventListener('click', e => {
            const target = e.target;
            const btn = target.closest('button');

            if (target.id === 'exportExcelBtn') exportToExcel();
            if (target.id === 'exportOptimaBtn') exportToOptima();
            if (target.id === 'printListBtn') printList();
            
            if (target.id === 'clearListBtn') {
                if(confirm('Czy na pewno chcesz wyczyścić bieżącą listę?')) {
                    scannedItems = [];
                    renderScannedList();
                }
            }
            if (target.closest('.delete-btn')) {
                scannedItems.splice(target.closest('.delete-btn').dataset.index, 1);
                renderScannedList();
            }
            if (target.closest('.delete-inv-item-btn')) {
                inventoryItems.splice(target.closest('.delete-inv-item-btn').dataset.index, 1);
                renderInventoryList();
            }
            if (target.classList.contains('editable-quantity')) {
                const index = target.dataset.index;
                const newQuantity = prompt("Wprowadź nową ilość:", inventoryItems[index].quantity);
                if (newQuantity !== null && !isNaN(newQuantity) && newQuantity > 0) {
                    inventoryItems[index].quantity = parseInt(newQuantity, 10);
                    renderInventoryList();
                }
            }
            
            if (btn && btn.closest('#adminPanel')) {
                const { userid, username } = btn.dataset;
                if(btn.classList.contains('approve-user-btn')) {
                    handleUserAction(`/api/admin/approve-user/${userid}`, { method: 'POST', headers: { 'x-auth-token': localStorage.getItem('token') } });
                } else if (btn.classList.contains('delete-user-btn')) {
                    if (confirm(`Na pewno usunąć użytkownika ${username}?`)) {
                        handleUserAction(`/api/admin/delete-user/${userid}`, { method: 'DELETE', headers: { 'x-auth-token': localStorage.getItem('token') } });
                    }
                }
            }
        });
        
        document.body.addEventListener('input', e => {
             if(e.target.classList.contains('quantity-in-table')) {
                const index = e.target.dataset.index;
                const newQuantity = parseInt(e.target.value, 10);
                if(scannedItems[index] && !isNaN(newQuantity) && newQuantity > 0) {
                    scannedItems[index].quantity = newQuantity;
                }
             }
        });
    };

    const init = () => {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
        }
        setupEventListeners();
        checkLoginStatus();
    };

    init();
});
