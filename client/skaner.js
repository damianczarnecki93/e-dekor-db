document.addEventListener('DOMContentLoaded', () => {

    const elements = {
        loginOverlay: document.getElementById('loginOverlay'),
        loginForm: document.getElementById('loginForm'),
        loginBtn: document.getElementById('loginBtn'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        loginError: document.getElementById('loginError'),
        registerForm: document.getElementById('registerForm'),
        registerBtn: document.getElementById('registerBtn'),
        registerUsername: document.getElementById('registerUsername'),
        registerPassword: document.getElementById('registerPassword'),
        registerError: document.getElementById('registerError'),
        showLogin: document.getElementById('showLogin'),
        showRegister: document.getElementById('showRegister'),
        
        appContainer: document.getElementById('appContainer'),
        topBar: document.getElementById('topBar'),
        menuToggleBtn: document.getElementById('menuToggleBtn'),
        dropdownMenu: document.getElementById('dropdownMenu'),
        menuUsername: document.getElementById('menuUsername'),
        menuDashboardBtn: document.getElementById('menuDashboardBtn'),
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
        quickSearchBtn: document.getElementById('quickSearchBtn'),
        
        quickSearchModal: document.getElementById('quickSearchModal'),
        lookupBarcodeInput: document.getElementById('lookupBarcodeInput'),
        lookupResultSingle: document.getElementById('lookupResultSingle'),
        
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
    let activeListId = null;
    let activePage = 'dashboard';
    let currentUser = null;
    let autoSaveInterval = null;
    let currentPickingOrder = null;

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); };
    };

    const showToast = (message, type = 'info', duration = 3000) => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        if (type === 'success') toast.style.backgroundColor = 'var(--success-color)';
        if (type === 'error') toast.style.backgroundColor = 'var(--danger-color)';
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
            const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const data = await response.json();
            if (!response.ok) { elements.loginError.textContent = data.msg || 'Błąd logowania.'; return; }
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showApp();
        } catch (error) { elements.loginError.textContent = 'Błąd połączenia z serwerem.'; }
    };
    
    const attemptRegister = async () => {
        const username = elements.registerUsername.value.trim();
        const password = elements.registerPassword.value.trim();
        if (!username || !password) { elements.registerError.textContent = 'Wszystkie pola są wymagane.'; return; }
        if (password.length < 6) { elements.registerError.textContent = 'Hasło musi mieć co najmniej 6 znaków.'; return; }
        try {
            const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const data = await response.json();
            if (!response.ok) { elements.registerError.textContent = data.msg || 'Błąd rejestracji.'; return; }
            showToast('Rejestracja pomyślna! Poczekaj na zatwierdzenie konta.', 'success', 5000);
            elements.registerForm.style.display = 'none';
            elements.loginForm.style.display = 'block';
        } catch (error) { elements.registerError.textContent = 'Błąd połączenia z serwerem.'; }
    };

    const showApp = async () => {
        elements.loginOverlay.style.display = 'none';
        elements.appContainer.style.display = 'block';
        elements.topBar.style.display = 'flex';
        elements.menuUsername.textContent = currentUser.username;
        if (currentUser.role === 'admin') elements.menuAdminBtn.style.display = 'flex';
        await loadDataFromServer();
        switchTab('dashboard');
    };

    const loadDataFromServer = async () => {
        const fetchAndParseCsv = (filename) => fetch(`${filename}?t=${new Date().getTime()}`)
            .then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`Błąd sieci: ${r.statusText}`)))
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
        if (autoSaveInterval) clearInterval(autoSaveInterval);
        if (page === 'listBuilder') autoSaveInterval = setInterval(() => saveCurrentList(false), 60000);
        renderCurrentPage();
    };

    const renderCurrentPage = () => {
        ['mainContent', 'adminPanel', 'inventoryPage', 'pickingPage'].forEach(id => {
            if (elements[id]) elements[id].style.display = 'none';
        });
        const pageIdMap = {
            dashboard: 'mainContent', listBuilder: 'mainContent', 
            inventory: 'inventoryPage', picking: 'pickingPage', admin: 'adminPanel'
        };
        const pageElement = elements[pageIdMap[activePage]];
        if (pageElement) pageElement.style.display = 'block';
        elements.floatingInputBar.style.display = ['listBuilder', 'inventory'].includes(activePage) ? 'flex' : 'none';
        
        switch(activePage) {
            case 'dashboard': renderHomePage(); break;
            case 'listBuilder': renderListBuilderPage(); break;
            case 'inventory': renderInventoryPage(); break;
            case 'picking': renderPickingPage(); break;
            case 'admin': renderAdminPage(); break;
        }
    };

    const findProductByCode = (code) => {
        const search = (db) => db.find(p => p.kod_kreskowy === code || p.ean === code || p.kod_produktu === code);
        return search(productDatabase.primary) || search(productDatabase.secondary);
    };

    const performSearch = (term) => {
        if (!term || term.length < 2) return [];
        const lowerTerm = term.toLowerCase();
        const terms = lowerTerm.split(' ').filter(t => t);
        const searchIn = (db) => db.filter(p => {
            const productText = `${p.kod_kreskowy || ''} ${p.ean || ''} ${p.kod_produktu || ''} ${p.nazwa_produktu || ''}`.toLowerCase();
            return terms.every(t => productText.includes(t));
        });
        const primaryResults = searchIn(productDatabase.primary);
        return primaryResults.length > 0 ? primaryResults : searchIn(productDatabase.secondary);
    };

    const handleFloatingBarAction = (productDataFromSearch = null) => {
        const code = elements.floatingEanInput.value.trim();
        const quantity = parseInt(elements.floatingQuantityInput.value, 10) || 1;
        
        let productData = productDataFromSearch || findProductByCode(code);

        if (!productData) {
            if (code && confirm(`Produkt o kodzie "${code}" nie istnieje. Dodać jako produkt spoza bazy?`)) {
                productData = { ean: code, kod_kreskowy: code, kod_produktu: code, nazwa_produktu: `Produkt spoza bazy (${code})`, cena: "0" };
            } else {
                elements.floatingEanInput.value = '';
                return;
            }
        }

        if (activePage === 'listBuilder') addProductToList(productData, quantity);
        else if (activePage === 'inventory') handleInventoryAdd(productData, quantity);
        
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
                li.innerHTML = `<strong>${p.nazwa_produktu}</strong> <br> <small>${li.dataset.code}</small>`;
                list.appendChild(li);
            });
            resultsDiv.appendChild(list);
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.style.display = 'none';
        }
    };
    
    function renderHomePage() { /* ... bez zmian ... */ }
    async function updateDashboard() { /* ... bez zmian ... */ }
    
    function renderListBuilderPage() {
        elements.mainContent.innerHTML = `
            <h2><i class="fa-solid fa-list-check"></i> Nowa Lista Zamówienia</h2>
            <div style="margin: 20px 0;">
                <input type="text" id="clientNameInput" placeholder="Nazwa klienta..." value="${localStorage.getItem('clientName') || ''}">
            </div>
            <table id="list-builder-table">
                <thead><tr><th>Nazwa</th><th>Kod</th><th>EAN</th><th>Cena</th><th>Ilość</th><th>Akcje</th></tr></thead>
                <tbody></tbody>
            </table>
            <div style="margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end;">
                 <button id="saveListBtn" class="btn btn-primary"><i class="fa-solid fa-save"></i> Zapisz listę</button>
                 <button id="printListBtn" class="btn"><i class="fa-solid fa-print"></i> Drukuj</button>
                 <button id="exportOptimaBtn" class="btn"><i class="fa-solid fa-file-export"></i> Eksport (Optima)</button>
                 <button id="exportExcelBtn" class="btn"><i class="fa-solid fa-file-excel"></i> Eksport (Excel)</button>
                 <button id="clearListBtn" class="btn-danger"><i class="fa-solid fa-eraser"></i> Wyczyść</button>
            </div>
        `;
        renderScannedList();
    }
    
    function addProductToList(productData, quantity) {
        const code = productData.ean || productData.kod_kreskowy;
        const existingItem = scannedItems.find(item => (item.ean || item.kod_kreskowy) === code);
        if (existingItem) {
            existingItem.quantity = parseInt(existingItem.quantity) + quantity;
        } else {
            scannedItems.push({ ...productData, quantity });
        }
        renderScannedList();
        showToast(`Dodano: ${productData.nazwa_produktu} (x${quantity})`, "success");
    }

    function renderScannedList() {
        const tableBody = document.querySelector('#list-builder-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = scannedItems.map((item, index) => `
            <tr>
                <td>${item.nazwa_produktu}</td><td>${item.kod_produktu}</td><td>${item.ean || item.kod_kreskowy}</td>
                <td>${parseFloat(item.cena).toFixed(2)}</td>
                <td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}" inputmode="numeric"></td>
                <td><button class="delete-btn btn-icon-danger" data-index="${index}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`).join('');
    }

    async function saveCurrentList(showSuccessToast = true) {
        const clientName = document.getElementById('clientNameInput')?.value.trim() || 'Bez nazwy';
        localStorage.setItem('clientName', clientName);
        if (scannedItems.length === 0) {
            if (showSuccessToast) showToast('Lista jest pusta, nie ma czego zapisywać.', 'info');
            return;
        }
        try {
            const url = activeListId ? `/api/data/list/${activeListId}` : '/api/data/savelist';
            const method = activeListId ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
                body: JSON.stringify({ listName: clientName, clientName, items: scannedItems, listId: activeListId })
            });
            if (!response.ok) throw new Error('Błąd zapisu listy na serwerze.');
            const savedList = await response.json();
            activeListId = savedList._id;
            localStorage.setItem('activeListId', activeListId);
            if (showSuccessToast) showToast(`Lista "${clientName}" została pomyślnie zapisana!`, 'success');
        } catch (error) {
            if (showSuccessToast) showToast(`Błąd zapisu: ${error.message}`, 'error');
        }
    }
    
    function exportToExcel() { /* ... bez zmian ... */ }
    function exportToOptima() { /* ... bez zmian ... */ }
    function printList() { /* ... bez zmian ... */ }
    
    function renderInventoryPage() {
        elements.inventoryPage.innerHTML = `
            <h2><i class="fa-solid fa-clipboard-list"></i> Inwentaryzacja</h2>
            <p style="margin: 15px 0;">Skanuj produkty lub dodaj je ręcznie. Kliknij na ilość, aby ją edytować.</p>
            <table>
                <thead><tr><th>Nazwa</th><th>Kod</th><th>Ilość</th><th>Akcje</th></tr></thead>
                <tbody id="inventoryListBody"></tbody>
            </table>
            <div style="margin-top: 20px; text-align: right;">
                 <button id="inventorySaveBtn" class="btn btn-primary"><i class="fa-solid fa-save"></i> Zapisz inwentaryzację</button>
                 <button id="inventoryExportCsvBtn" class="btn"><i class="fa-solid fa-file-csv"></i> Eksportuj CSV</button>
            </div>
        `;
        renderInventoryList();
    }
    
    function handleInventoryAdd(productData, quantity) {
        const code = productData.ean || productData.kod_kreskowy;
        const existing = inventoryItems.find(i => (i.ean || i.kod_kreskowy) === code);
        if (existing) existing.quantity = parseInt(existing.quantity) + quantity;
        else inventoryItems.push({ ...productData, quantity });
        renderInventoryList();
        showToast(`Dodano do inwentaryzacji: ${productData.nazwa_produktu}`);
    }

    function renderInventoryList() {
        const body = document.getElementById('inventoryListBody');
        if(!body) return;
        body.innerHTML = inventoryItems.map((item, i) => `
            <tr>
                <td>${item.nazwa_produktu}</td>
                <td>${item.kod_produktu}</td>
                <td><span class="editable-quantity" data-index="${i}">${item.quantity}</span></td>
                <td><button class="delete-inv-item-btn btn-icon-danger" data-index="${i}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`).join('');
    }

    function exportInventoryToCsv() {
        if (inventoryItems.length === 0) { showToast('Lista inwentaryzacyjna jest pusta.', 'warning'); return; }
        const csvContent = "EAN;Ilość;Nazwa\n" + inventoryItems.map(item => `${item.ean || item.kod_kreskowy};${item.quantity};${item.nazwa_produktu}`).join('\n');
        downloadFile('\uFEFF' + csvContent, 'text/csv;charset=utf-8;', `inwentaryzacja_${new Date().toISOString().slice(0,10)}.csv`);
    }

    async function saveInventory() {
        if (inventoryItems.length === 0) { showToast('Inwentaryzacja jest pusta.', 'warning'); return; }
        const inventoryName = prompt('Podaj nazwę dla zapisu inwentaryzacji:', `Inwentaryzacja ${new Date().toLocaleDateString()}`);
        if (!inventoryName) return;
        
        try {
            const response = await fetch('/api/data/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
                body: JSON.stringify({ inventoryName, items: inventoryItems })
            });
            if (!response.ok) throw new Error('Błąd zapisu inwentaryzacji.');
            showToast('Inwentaryzacja została zapisana!', 'success');
            inventoryItems = [];
            renderInventoryList();
        } catch (error) {
            showToast(`Błąd: ${error.message}`, 'error');
        }
    }

    function renderPickingPage() {
        elements.pickingPage.innerHTML = `<h2><i class="fa-solid fa-box-open"></i> Kompletacja Zamówienia</h2><div id="picking-lists-container"></div>`;
        loadListsForPicking();
    }
    
    async function loadListsForPicking() {
        const container = document.getElementById('picking-lists-container');
        container.innerHTML = '<p>Ładowanie list...</p>';
        try {
            const response = await fetch('/api/data/lists', { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) throw new Error('Błąd wczytywania list do kompletacji');
            const lists = await response.json();
            if (lists.length === 0) {
                container.innerHTML = '<p>Brak zapisanych zamówień do kompletacji.</p>';
            } else {
                container.innerHTML = '<h3>Wybierz zamówienie do kompletacji:</h3>' + lists.map(list => `
                    <div class="list-item">
                        <span>${list.listName} <small>(Utworzono: ${new Date(list.createdAt).toLocaleDateString()})</small></span>
                        <button class="btn btn-primary pick-order-btn" data-id="${list._id}">Rozpocznij</button>
                    </div>`).join('');
            }
        } catch (error) {
            container.innerHTML = `<p style="color:var(--danger-color);">${error.message}</p>`;
        }
    }
    
    async function showSavedLists() {
        elements.savedListsModal.style.display = 'flex';
        const container = elements.savedListsContainer;
        container.innerHTML = '<p>Ładowanie...</p>';
        try {
            const response = await fetch('/api/data/lists', { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) throw new Error("Błąd wczytywania list");
            const lists = await response.json();
            
            container.innerHTML = `
                <div style="margin-bottom: 15px; display:flex; gap:10px;">
                     <button class="btn" id="newListFromSavedBtn"><i class="fa-solid fa-plus"></i> Nowa lista</button>
                     <button class="btn" id="importListFromCsvBtn"><i class="fa-solid fa-file-import"></i> Importuj z CSV</button>
                     <input type="file" id="importCsvInput" accept=".csv" style="display: none;">
                </div>
                <h3>Zapisane listy:</h3><div id="saved-lists-items-container"></div>`;

            const listContainer = document.getElementById('saved-lists-items-container');
            if (lists.length === 0) {
                listContainer.innerHTML = '<p>Brak zapisanych zamówień.</p>';
            } else {
                listContainer.innerHTML = lists.map(list => `
                    <div class="user-item">
                        <div><strong>${list.listName}</strong><br><small>Autor: ${list.user?.username || 'usunięty'}</small></div>
                        <div class="user-actions">
                            <button class="btn btn-primary load-list-btn" data-id="${list._id}">Wczytaj</button>
                            <button class="btn-danger delete-list-btn" data-id="${list._id}"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>`).join('');
            }
        } catch (error) {
            container.innerHTML = `<p style="color:var(--danger-color)">${error.message}</p>`;
        }
    }

    function renderAdminPage() {
        elements.adminPanel.innerHTML = `
            <h2><i class="fa-solid fa-users-cog"></i> Panel Administratora</h2>
            <div class="admin-section">
                <h3>Zarządzanie użytkownikami</h3>
                <div id="allUsersList"><p>Ładowanie...</p></div>
            </div>
            <div class="admin-section">
                <h3>Zarządzanie bazą produktów</h3>
                <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
                    <div>
                        <button class="btn btn-import" data-target="importProducts1"><i class="fa-solid fa-upload"></i> Importuj produkty.csv</button>
                        <input type="file" id="importProducts1" class="import-input" data-filename="produkty.csv" style="display:none;">
                    </div>
                    <div>
                        <button class="btn btn-import" data-target="importProducts2"><i class="fa-solid fa-upload"></i> Importuj produkty2.csv</button>
                        <input type="file" id="importProducts2" class="import-input" data-filename="produkty2.csv" style="display:none;">
                    </div>
                </div>
            </div>
        `;
        loadAllUsers();
    }

    const loadAllUsers = async () => { /* ... bez zmian ... */ };
    const handleUserAction = async (url, options) => { /* ... bez zmian ... */ };
    const importProductDatabase = async (file, filename) => { /* ... bez zmian ... */ };
    
    // --- GŁÓWNA FUNKCJA PODPINANIA ZDARZEŃ ---
    const initEventListeners = () => {
        elements.loginBtn.addEventListener('click', attemptLogin);
        elements.registerBtn.addEventListener('click', attemptRegister);
        elements.showRegister.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'none'; elements.registerForm.style.display = 'block'; });
        elements.showLogin.addEventListener('click', (e) => { e.preventDefault(); elements.registerForm.style.display = 'none'; elements.loginForm.style.display = 'block'; });

        elements.menuToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); elements.dropdownMenu.classList.toggle('show'); });
        window.addEventListener('click', () => { if (elements.dropdownMenu.classList.contains('show')) elements.dropdownMenu.classList.remove('show'); });
        
        elements.menuDashboardBtn.addEventListener('click', () => switchTab('dashboard'));
        elements.menuListBuilderBtn.addEventListener('click', () => switchTab('listBuilder'));
        elements.menuPickingBtn.addEventListener('click', () => switchTab('picking'));
        elements.menuInventoryBtn.addEventListener('click', () => switchTab('inventory'));
        elements.menuAdminBtn.addEventListener('click', () => switchTab('admin'));
        elements.menuSavedLists.addEventListener('click', showSavedLists);
        elements.menuLogoutBtn.addEventListener('click', () => { localStorage.clear(); location.reload(); });
        
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', (e) => e.target.closest('.modal').style.display = 'none'));
        elements.quickSearchBtn.addEventListener('click', () => { elements.quickSearchModal.style.display = 'flex'; elements.lookupBarcodeInput.value = ''; elements.lookupResultSingle.innerHTML = ''; elements.lookupBarcodeInput.focus(); });
        elements.lookupBarcodeInput.addEventListener('input', debounce(() => {
            const results = performSearch(elements.lookupBarcodeInput.value);
            elements.lookupResultSingle.innerHTML = results.length > 0 ? `<strong>${results[0].nazwa_produktu}</strong><br><small>EAN: ${results[0].ean || results[0].kod_kreskowy}, Kod: ${results[0].kod_produktu}</small>` : `<p>Nie znaleziono</p>`;
        }, 300));
        
        elements.darkModeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });

        elements.floatingEanInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleFloatingBarAction(); });
        elements.floatingAddBtn.addEventListener('click', () => handleFloatingBarAction());
        elements.floatingEanInput.addEventListener('input', debounce(handleFloatingBarSearch, 300));
        elements.floatingSearchResults.addEventListener('click', (e) => {
             const li = e.target.closest('li');
             if (li && li.dataset.code) {
                 const product = findProductByCode(li.dataset.code);
                 if (product) handleFloatingBarAction(product);
             }
        });

        document.body.addEventListener('click', async e => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            if (btn.id === 'saveListBtn') saveCurrentList(true);
            if (btn.id === 'printListBtn') printList();
            if (btn.id === 'exportExcelBtn') exportToExcel();
            if (btn.id === 'exportOptimaBtn') exportToOptima();
            if (btn.id === 'inventoryExportCsvBtn') exportInventoryToCsv();
            if (btn.id === 'inventorySaveBtn') saveInventory();
            if (btn.id === 'importListFromCsvBtn') document.getElementById('importCsvInput').click();
            
            if(btn.id === 'newListFromSavedBtn') {
                if(scannedItems.length > 0) {
                    if(confirm("Masz niezapisaną listę. Zapisać przed utworzeniem nowej?")) {
                       await saveCurrentList(true);
                    }
                }
                scannedItems = []; activeListId = null;
                localStorage.removeItem('activeListId');
                localStorage.removeItem('clientName');
                switchTab('listBuilder');
                elements.savedListsModal.style.display = 'none';
            }
            
            if (btn.classList.contains('load-list-btn')) { /* ... bez zmian ... */ }
            if (btn.classList.contains('delete-list-btn')) { /* ... bez zmian ... */ }
            if (btn.classList.contains('btn-import')) { document.getElementById(btn.dataset.target).click(); }
            if (btn.closest('#adminPanel')) { /* ... bez zmian ... */ }
        });
        
        document.body.addEventListener('input', e => {
             if(e.target.classList.contains('quantity-in-table')) { /* ... bez zmian ... */ }
             if (e.target.id === 'importCsvInput') {
                const file = e.target.files[0];
                if (file) {
                     // Logika importu listy z CSV
                }
             }
             if (e.target.classList.contains('import-input')) {
                const file = e.target.files[0];
                if (file) importProductDatabase(file, e.target.dataset.filename);
             }
        });
    };

    initEventListeners();
    checkLoginStatus();
});
