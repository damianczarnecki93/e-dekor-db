document.addEventListener('DOMContentLoaded', () => {

    // --- SŁOWNIK ELEMENTÓW DOM ---
    // Zbiera wszystkie elementy interfejsu w jednym miejscu dla łatwego dostępu.
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

    // --- STAN APLIKACJI ---
    let productDatabase = { primary: [], secondary: [] };
    let scannedItems = [];
    let inventoryItems = [];
    let currentPickingOrder = null;
    let pickedItems = new Map();
    let activePage = 'listBuilder';
    let currentUser = null;

    // --- FUNKCJE POMOCNICZE ---

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

    // --- LOGIKA STARTOWA I UWIERZYTELNIANIE ---

    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            elements.loginOverlay.style.display = 'flex';
            return;
        }
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

    const attemptRegister = async () => {
        const username = elements.registerUsername.value.trim();
        const password = elements.registerPassword.value.trim();
        if (!username || !password) { elements.registerError.textContent = 'Wszystkie pola są wymagane.'; return; }
        if (password.length < 6) { elements.registerError.textContent = 'Hasło musi mieć co najmniej 6 znaków.'; return; }
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) { elements.registerError.textContent = data.msg || 'Błąd rejestracji.'; return; }
            showToast('Rejestracja pomyślna! Poczekaj na zatwierdzenie konta przez administratora.', 'success', 5000);
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

    // --- NAWIGACJA I RENDEROWANIE STRON ---
    const switchTab = (page) => {
        activePage = page;
        renderCurrentPage();
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

    // --- WYSZUKIWANIE I DODAWANIE ---
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

    const findProductByCode = (code) => {
        const search = (db) => db.find(p => p.kod_kreskowy === code || p.ean === code || p.kod_produktu === code);
        return search(productDatabase.primary) || search(productDatabase.secondary);
    };
    
    const handleFloatingBarAction = (productData) => {
        const code = elements.floatingEanInput.value.trim();
        const quantity = parseInt(elements.floatingQuantityInput.value, 10);
        if (isNaN(quantity) || quantity < 1) return;

        if (productData) { // Jeśli produkt został wybrany z listy
             if (activePage === 'listBuilder') addProductToList(productData, quantity);
             else if (activePage === 'inventory') handleInventoryAdd(productData, quantity);
        } else if (code) { // Jeśli wpisano kod ręcznie
             let foundProduct = findProductByCode(code);
             if (!foundProduct) {
                 if (confirm(`Produkt o kodzie "${code}" nie istnieje w bazie. Czy chcesz go dodać jako produkt spoza listy?`)) {
                     foundProduct = { ean: code, kod_kreskowy: code, kod_produktu: code, nazwa_produktu: `Produkt spoza bazy (${code})`, cena: "0" };
                     if (activePage === 'listBuilder') addProductToList(foundProduct, quantity);
                     else if (activePage === 'inventory') handleInventoryAdd(foundProduct, quantity);
                 }
             } else {
                 if (activePage === 'listBuilder') addProductToList(foundProduct, quantity);
                 else if (activePage === 'inventory') handleInventoryAdd(foundProduct, quantity);
             }
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
                li.innerHTML = `<strong>${p.nazwa_produktu}</strong> <br> <small>${li.dataset.code}</small>`;
                list.appendChild(li);
            });
            resultsDiv.appendChild(list);
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.style.display = 'none';
        }
    };
    
    // --- MODUŁY APLIKACJI ---

    // 1. TWORZENIE LISTY
    function renderListBuilderPage() {
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
    }

    function addProductToList(productData, quantity) {
        const code = productData.ean || productData.kod_kreskowy;
        const existingItem = scannedItems.find(item => (item.ean || item.kod_kreskowy) === code);
        if (existingItem) {
            existingItem.quantity += quantity;
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
                <td>${item.nazwa_produktu}</td>
                <td>${item.kod_produktu}</td>
                <td>${item.ean || item.kod_kreskowy}</td>
                <td>${parseFloat(item.cena).toFixed(2)}</td>
                <td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}" inputmode="numeric"></td>
                <td><button class="delete-btn btn-icon-danger" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>
            </tr>
        `).join('');
    }

    function exportToExcel() {
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
        csvContent += `Suma wartości:;${totalValue.toFixed(2).replace('.', ',')} PLN;;;\n`;
        downloadFile('\uFEFF' + csvContent, 'text/csv;charset=utf-8;', `${clientName}_export_excel.csv`);
    }

    function exportToOptima() {
        if (scannedItems.length === 0) { showToast('Lista jest pusta.', 'warning'); return; }
        const clientName = document.getElementById('clientNameInput').value.trim() || 'Bez nazwy';
        const csvContent = scannedItems.map(item => `${item.ean || item.kod_kreskowy};${item.quantity}`).join('\n');
        downloadFile(csvContent, 'text/plain;charset=utf-8;', `${clientName}_optima.csv`);
    }

    function printList() {
        if (scannedItems.length === 0) { showToast('Lista jest pusta.', 'warning'); return; }
        const clientName = document.getElementById('clientNameInput').value.trim() || 'Zamówienie';
        elements.printClientName.textContent = `Zamówienie dla: ${clientName}`;
        elements.printDate.textContent = new Date().toLocaleString('pl-PL');
        
        let tableHTML = `<thead><tr><th>Nazwa</th><th>Kod</th><th>Ilość</th><th>Cena</th><th>Wartość</th></tr></thead><tbody>`;
        let totalValue = 0;
        scannedItems.forEach(item => {
            const itemValue = (parseFloat(item.cena) || 0) * item.quantity;
            totalValue += itemValue;
            tableHTML += `<tr><td>${item.nazwa_produktu}</td><td>${item.kod_produktu}</td><td>${item.quantity}</td><td>${parseFloat(item.cena).toFixed(2)}</td><td>${itemValue.toFixed(2)}</td></tr>`;
        });
        tableHTML += `</tbody>`;
        elements.printTable.innerHTML = tableHTML;
        elements.printSummary.textContent = `Suma: ${totalValue.toFixed(2)} PLN`;
        window.print();
    }

    // 2. INWENTARYZACJA
    function renderInventoryPage() {
        elements.inventoryPage.innerHTML = `
            <h2><i class="fa-solid fa-clipboard-list"></i> Inwentaryzacja</h2>
            <p style="margin: 15px 0; color: var(--text-secondary-color);">Skanuj produkty, aby dodać je do listy inwentaryzacyjnej. Kliknij na ilość, aby ją edytować.</p>
            <table>
                <thead><tr><th>Nazwa</th><th>Kod</th><th>Ilość</th><th>Akcje</th></tr></thead>
                <tbody id="inventoryListBody"></tbody>
            </table>
        `;
        renderInventoryList();
    }
    
    function handleInventoryAdd(productData, quantity) {
        const code = productData.ean || productData.kod_kreskowy;
        const existing = inventoryItems.find(i => (i.ean || i.kod_kreskowy) === code);
        if (existing) { existing.quantity += quantity; } 
        else { inventoryItems.push({ ...productData, quantity }); }
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
            </tr>
        `).join('');
    }

    // 3. KOMPLETACJA i ZAPISANE LISTY
    function renderPickingPage() {
        elements.pickingPage.innerHTML = `<h2><i class="fa-solid fa-box-open"></i> Kompletacja</h2><p>Moduł w budowie. Wybierz zamówienie z zapisanych list, aby rozpocząć.</p>`;
    }
    
    async function showSavedLists() {
        elements.savedListsModal.style.display = 'flex';
        elements.savedListsContainer.innerHTML = '<p>Ładowanie...</p>';
        try {
            const response = await fetch('/api/data/lists', { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) throw new Error("Błąd wczytywania list");
            const lists = await response.json();
            if (lists.length === 0) {
                elements.savedListsContainer.innerHTML = '<p>Brak zapisanych zamówień.</p>';
            } else {
                elements.savedListsContainer.innerHTML = lists.map(list => `
                    <div class="user-item">
                        <div><strong>${list.listName}</strong><br><small>Autor: ${list.user?.username || 'usunięty'}</small></div>
                        <div class="user-actions">
                            <button class="btn pick-order-btn" data-id="${list._id}">Kompletuj</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            elements.savedListsContainer.innerHTML = `<p style="color:var(--danger-color)">${error.message}</p>`;
        }
    }

    // 4. PANEL ADMINA
    const renderAdminPage = () => {
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
    };

    const loadAllUsers = async () => {
        const userListEl = document.getElementById('allUsersList');
        try {
            const response = await fetch('/api/admin/users', { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) {
                const err = await response.json().catch(() => ({ msg: `Błąd serwera (${response.status})`}));
                throw new Error(err.msg);
            }
            const users = await response.json();
            if(!userListEl) return;
            userListEl.innerHTML = users.length > 0 ? users.map(user => `
                <div class="user-item">
                    <div><strong>${user.username}</strong><br><small>Rola: ${user.role} | ${user.isApproved ? 'Zatwierdzony' : 'Oczekujący'}</small></div>
                    <div class="user-actions">
                        ${!user.isApproved ? `<button class="approve-user-btn btn btn-primary" data-userid="${user._id}">Zatwierdź</button>` : ''}
                        <button class="delete-user-btn btn-danger" data-userid="${user._id}" data-username="${user.username}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`).join('') : '<p>Brak użytkowników.</p>';
        } catch (error) {
            if (userListEl) userListEl.innerHTML = `<p style="color:var(--danger-color);">${error.message}</p>`;
        }
    };

    const handleUserAction = async (url, options) => {
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Błąd operacji');
            showToast(data.msg || 'Operacja zakończona pomyślnie!', 'success');
            loadAllUsers();
        } catch (error) { showToast(`Błąd: ${error.message}`, 'error'); }
    };

    const importProductDatabase = async (file, filename) => {
        const formData = new FormData();
        formData.append('productsFile', file);
        formData.append('filename', filename);
        try {
            const response = await fetch('/api/admin/upload-products', {
                method: 'POST', headers: { 'x-auth-token': localStorage.getItem('token') }, body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Błąd przesyłania pliku');
            showToast(data.msg, 'success');
            await loadDataFromServer();
        } catch (error) {
            showToast(`Błąd importu: ${error.message}`, 'error');
        }
    };
    
    // --- GŁÓWNA FUNKCJA PODPINANIA ZDARZEŃ ---

    const initEventListeners = () => {
        // Logowanie i Rejestracja
        elements.loginBtn.addEventListener('click', attemptLogin);
        elements.loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });
        elements.registerBtn.addEventListener('click', attemptRegister);
        elements.showRegister.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'none'; elements.registerForm.style.display = 'block'; });
        elements.showLogin.addEventListener('click', (e) => { e.preventDefault(); elements.registerForm.style.display = 'none'; elements.loginForm.style.display = 'block'; });

        // Menu główne
        elements.menuToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); elements.dropdownMenu.classList.toggle('show'); });
        window.addEventListener('click', () => { if (elements.dropdownMenu.classList.contains('show')) elements.dropdownMenu.classList.remove('show'); });
        elements.menuListBuilderBtn.addEventListener('click', () => switchTab('listBuilder'));
        elements.menuPickingBtn.addEventListener('click', () => switchTab('picking'));
        elements.menuInventoryBtn.addEventListener('click', () => switchTab('inventory'));
        elements.menuAdminBtn.addEventListener('click', () => switchTab('admin'));
        elements.menuSavedLists.addEventListener('click', showSavedLists);
        elements.menuLogoutBtn.addEventListener('click', () => { localStorage.clear(); location.reload(); });
        
        // Modale
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        }));
        elements.quickSearchBtn.addEventListener('click', () => { elements.quickSearchModal.style.display = 'flex'; });

        // Dolna belka
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

        // Delegacja zdarzeń dla dynamicznie tworzonych elementów
        document.body.addEventListener('click', e => {
            const target = e.target;
            const btn = target.closest('button');

            if(btn && btn.id === 'printListBtn') printList();
            if(btn && btn.id === 'exportExcelBtn') exportToExcel();
            if(btn && btn.id === 'exportOptimaBtn') exportToOptima();
            if(btn && btn.id === 'clearListBtn') {
                if(confirm('Czy na pewno wyczyścić listę?')) { scannedItems = []; renderScannedList(); }
            }
            if (btn && btn.classList.contains('delete-btn')) {
                scannedItems.splice(btn.dataset.index, 1);
                renderScannedList();
            }
            if (btn && btn.classList.contains('delete-inv-item-btn')) {
                inventoryItems.splice(btn.dataset.index, 1);
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
                if(btn.classList.contains('approve-user-btn')) handleUserAction(`/api/admin/approve-user/${btn.dataset.userid}`, { method: 'POST', headers: { 'x-auth-token': localStorage.getItem('token') } });
                if(btn.classList.contains('delete-user-btn')) if(confirm(`Na pewno usunąć użytkownika ${btn.dataset.username}?`)) handleUserAction(`/api/admin/delete-user/${btn.dataset.userid}`, { method: 'DELETE', headers: { 'x-auth-token': localStorage.getItem('token') } });
            }
            if (btn && btn.classList.contains('btn-import')) {
                document.getElementById(btn.dataset.target).click();
            }
        });
        
        document.body.addEventListener('change', e => {
             if(e.target.classList.contains('quantity-in-table')) {
                const index = e.target.dataset.index;
                const newQuantity = parseInt(e.target.value, 10);
                if(scannedItems[index] && !isNaN(newQuantity) && newQuantity > 0) {
                    scannedItems[index].quantity = newQuantity;
                }
             }
             if (e.target.classList.contains('import-input')) {
                const file = e.target.files[0];
                if (file) importProductDatabase(file, e.target.dataset.filename);
             }
        });
    };

    const init = () => {
        if (localStorage.getItem('theme') === 'dark') {
            elements.darkModeToggle.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
        }
        initEventListeners();
        checkLoginStatus();
    };

    init();
});
