document.addEventListener('DOMContentLoaded', () => {

    // --- Słownik elementów DOM ---
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
        menuChangePassword: document.getElementById('menuChangePassword'),
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
        scrollTopBtn: document.getElementById('scrollTopBtn'),
        scrollBottomBtn: document.getElementById('scrollBottomBtn'),
        
        quickSearchModal: document.getElementById('quickSearchModal'),
        closeQuickSearchModalBtn: document.getElementById('closeQuickSearchModalBtn'),
        lookupBarcodeInput: document.getElementById('lookupBarcodeInput'),
        lookupResultSingle: document.getElementById('lookupResultSingle'),
        
        savedListsModal: document.getElementById('savedListsModal'),
        closeSavedListsModalBtn: document.getElementById('closeSavedListsModalBtn'),
        savedListsContainer: document.getElementById('savedListsContainer'),

        toastContainer: document.getElementById('toast-container'),
    };

    // --- Stan aplikacji ---
    let productDatabase = [];
    let scannedItems = [];
    let inventoryItems = [];
    let currentPickingOrder = null;
    let pickedItems = new Map(); // Używamy Mapy dla łatwiejszego zarządzania ilością
    let activePage = 'listBuilder';
    let currentUser = null;

    // --- Funkcje pomocnicze ---
    const debounce = (func, delay) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const showToast = (message, type = 'info', duration = 3000) => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                toast.addEventListener('transitionend', () => toast.remove());
            }, duration);
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

    // --- Logika startowa i autoryzacja ---
    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            elements.loginOverlay.style.display = 'flex';
            return;
        }
        try {
            const response = await fetch('/api/auth/verify', { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Token nieprawidłowy');
            const userData = await response.json();
            currentUser = userData;
            showApp();
        } catch (error) {
            localStorage.removeItem('token');
            elements.loginOverlay.style.display = 'flex';
            showToast('Sesja wygasła, zaloguj się ponownie.', 'error');
        }
    };

    const attemptLogin = async () => {
        const username = elements.loginUsername.value.trim();
        const password = elements.loginPassword.value.trim();
        if (!username || !password) {
            elements.loginError.textContent = 'Wszystkie pola są wymagane.';
            return;
        }
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) {
                elements.loginError.textContent = data.msg || 'Wystąpił błąd logowania.';
                return;
            }
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showApp();
        } catch (error) {
            elements.loginError.textContent = 'Błąd połączenia z serwerem.';
        }
    };

    const showApp = async () => {
        elements.loginOverlay.style.display = 'none';
        elements.appContainer.style.display = 'block';
        elements.topBar.style.display = 'flex';
        
        elements.menuUsername.textContent = currentUser.username;
        if (currentUser.role === 'admin') {
            elements.menuAdminBtn.style.display = 'flex';
        }
        
        await loadDataFromServer();
        switchTab('listBuilder');
    };

    const loadDataFromServer = async () => {
        try {
            const fetchAndParseCsv = (filename) => fetch(`${filename}?t=${new Date().getTime()}`)
                .then(r => r.ok ? r.arrayBuffer() : Promise.reject(`Błąd sieci: ${r.statusText}`))
                .then(b => new TextDecoder("Windows-1250").decode(b))
                .then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: r => res(r.data), error: e => rej(e) })));

            const [data1, data2] = await Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')]);
            const mapData = p => ({
                kod_kreskowy: String(p.kod_kreskowy || "").trim(),
                nazwa_produktu: String(p.nazwa_produktu || "").trim(),
                cena: String(p.cena || "0").replace(',', '.').trim() || "0",
                opis: String(p.opis || "").trim()
            });
            productDatabase = [...data1.map(mapData), ...data2.map(mapData)];
            showToast("Baza produktów zaktualizowana.", "success");
        } catch (error) {
            showToast('BŁĄD: Nie udało się załadować bazy produktów.', 'error');
        }
    };
    
    // --- Zarządzanie stronami/zakładkami ---
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
            listBuilder: 'mainContent',
            inventory: 'inventoryPage',
            picking: 'pickingPage',
            admin: 'adminPanel'
        };
        const pageElement = elements[pageIdMap[activePage]];

        if (pageElement) {
            pageElement.style.display = 'block';
            elements.floatingInputBar.style.display = (activePage === 'listBuilder' || activePage === 'inventory' || activePage === 'picking') ? 'flex' : 'none';
            if (activePage === 'picking') {
                elements.floatingQuantityInput.style.display = 'none';
            } else {
                elements.floatingQuantityInput.style.display = 'block';
            }
        }
        
        switch(activePage) {
            case 'listBuilder': renderListBuilderPage(); break;
            case 'inventory': renderInventoryPage(); break;
            case 'picking': renderPickingPage(); break;
            case 'admin': renderAdminPage(); break;
        }
    };

    // --- Logika dodawania produktów (dolna belka) ---
    const handleFloatingBarAdd = () => {
        const ean = elements.floatingEanInput.value.trim();
        const quantity = parseInt(elements.floatingQuantityInput.value, 10);
        if (!ean) return;

        switch(activePage) {
            case 'listBuilder':
                if (quantity > 0) addProductToList(ean, quantity);
                break;
            case 'inventory':
                if (quantity > 0) handleInventoryAdd(ean, quantity);
                break;
            case 'picking':
                handlePickingScan(ean);
                break;
        }

        elements.floatingEanInput.value = '';
        elements.floatingSearchResults.style.display = 'none';
        elements.floatingEanInput.focus();
        if(activePage !== 'picking') elements.floatingQuantityInput.value = '1';
    };

    // --- Wyszukiwanie ---
    const performSearch = (term) => {
        if (!term) return [];
        const lowerTerm = term.toLowerCase();
        return productDatabase.filter(p => 
            (p.kod_kreskowy?.toLowerCase().includes(lowerTerm)) || 
            (p.nazwa_produktu?.toLowerCase().includes(lowerTerm)) || 
            (p.opis?.toLowerCase().includes(lowerTerm))
        );
    };

    const handleFloatingBarSearch = () => {
        const searchTerm = elements.floatingEanInput.value.trim();
        const resultsDiv = elements.floatingSearchResults;
        resultsDiv.innerHTML = '';
        if (!searchTerm) {
            resultsDiv.style.display = 'none';
            return;
        }
        const results = performSearch(searchTerm);
        if (results.length > 0) {
            const list = document.createElement('ul');
            results.slice(0, 5).forEach(p => {
                const li = document.createElement('li');
                li.dataset.ean = p.kod_kreskowy;
                li.innerHTML = `<strong>${p.opis}</strong> <br> <small>${p.nazwa_produktu}</small>`;
                list.appendChild(li);
            });
            resultsDiv.appendChild(list);
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.style.display = 'none';
        }
    };
    
    const handleLookupSearch = () => {
        const searchTerm = elements.lookupBarcodeInput.value.trim();
        elements.lookupResultSingle.innerHTML = '';
        if (!searchTerm) return;
        
        const results = performSearch(searchTerm);
        if (results.length > 0) {
            const p = results[0];
            elements.lookupResultSingle.innerHTML = `
                <div class="quick-search-result-item">
                    <p><strong>Nazwa:</strong> ${p.opis}</p>
                    <p><strong>Kod produktu:</strong> ${p.nazwa_produktu}</p>
                    <p><strong>EAN:</strong> ${p.kod_kreskowy}</p>
                    <p><strong>Cena:</strong> ${parseFloat(p.cena).toFixed(2)} PLN</p>
                </div>
            `;
        } else {
            elements.lookupResultSingle.innerHTML = '<p style="margin-top: 15px;">Nie znaleziono produktu.</p>';
        }
    };

    // --- Tworzenie listy ---
    const renderListBuilderPage = () => {
        elements.mainContent.innerHTML = `
            <h2><i class="fa-solid fa-list-check"></i> Nowa Lista Zamówienia</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0;">
                <input type="text" id="clientNameInput" placeholder="Nazwa klienta..." style="flex-grow: 1;">
            </div>
            <table>
                <thead><tr><th style="width: 40%;">Nazwa</th><th style="width: 30%;">Kod Produktu</th><th style="width: 15%;">Ilość</th><th style="width: 15%;">Akcje</th></tr></thead>
                <tbody id="scannedListBody"></tbody>
            </table>
            <div style="margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end;">
                 <button id="saveListBtn" class="btn-primary"><i class="fa-solid fa-save"></i> Zapisz listę</button>
                 <button id="clearListBtn" class="btn-danger"><i class="fa-solid fa-eraser"></i> Wyczyść listę</button>
            </div>
        `;
        renderScannedList();
    };

    const addProductToList = (code, quantity) => {
        const productData = productDatabase.find(p => p.kod_kreskowy === code || p.nazwa_produktu === code);
        if (!productData) {
            showToast(`Produkt o kodzie ${code} nie istnieje w bazie.`, 'error');
            return;
        }
        const existingItem = scannedItems.find(item => item.ean === productData.kod_kreskowy);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            scannedItems.push({ ean: productData.kod_kreskowy, name: productData.nazwa_produktu, description: productData.opis, quantity });
        }
        renderScannedList();
        showToast(`Dodano: ${productData.opis} (x${quantity})`, "success");
    };

    const renderScannedList = () => {
        const tableBody = document.getElementById('scannedListBody');
        if (!tableBody) return;
        tableBody.innerHTML = scannedItems.map((item, index) => `
            <tr>
                <td>${item.description}</td>
                <td>${item.name}</td>
                <td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}"></td>
                <td><button class="delete-btn btn-danger btn-icon" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>
            </tr>
        `).join('');
    };

    // --- Inwentaryzacja ---
    const renderInventoryPage = () => {
        elements.inventoryPage.innerHTML = `
            <h2><i class="fa-solid fa-clipboard-list"></i> Inwentaryzacja</h2>
            <p style="margin: 15px 0; color: var(--text-secondary-color);">Dodawaj produkty za pomocą dolnego paska, aby zaktualizować ich stan.</p>
            <table>
                <thead><tr><th>Nazwa</th><th>Kod Produktu</th><th>Ilość</th><th>Akcje</th></tr></thead>
                <tbody id="inventoryListBody"></tbody>
            </table>
            <div style="margin-top: 20px; text-align: right;">
                 <button id="inventoryExportCsvBtn" class="btn"><i class="fa-solid fa-file-csv"></i> Eksportuj CSV</button>
            </div>
        `;
        renderInventoryList();
    };
    
    const handleInventoryAdd = (ean, quantity) => {
        const productData = productDatabase.find(p => p.kod_kreskowy === ean || p.nazwa_produktu === ean) || { kod_kreskowy: ean, nazwa_produktu: ean, opis: 'Produkt spoza bazy' };
        const existing = inventoryItems.find(i => i.ean === productData.kod_kreskowy);
        if (existing) {
            existing.quantity += quantity;
        } else {
            inventoryItems.push({ ean: productData.kod_kreskowy, name: productData.nazwa_produktu, description: productData.opis, quantity });
        }
        renderInventoryList();
        showToast(`Dodano do inwentaryzacji: ${productData.opis}`);
    };

    const renderInventoryList = () => {
        const body = document.getElementById('inventoryListBody');
        if(!body) return;
        body.innerHTML = inventoryItems.map((item, i) => `
            <tr>
                <td>${item.description}</td>
                <td>${item.name}</td>
                <td><span class="editable-quantity" data-index="${i}">${item.quantity}</span></td>
                <td><button class="delete-inv-item-btn btn-danger btn-icon" data-index="${i}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');
    };
    
    const exportInventoryToCsv = () => {
        if (inventoryItems.length === 0) {
            showToast('Lista inwentaryzacyjna jest pusta.', 'warning');
            return;
        }
        const csvContent = "EAN;Ilosc\n" + inventoryItems.map(item => `${item.ean};${item.quantity}`).join('\n');
        downloadFile(csvContent, 'text/csv;charset=utf-8;', `inwentaryzacja_${new Date().toISOString().slice(0,10)}.csv`);
    };

    // --- Kompletacja ---
    const renderPickingPage = () => {
        elements.pickingPage.innerHTML = `
            <h2><i class="fa-solid fa-box-open"></i> Kompletacja Zamówienia</h2>
            <div id="picking-order-info" style="margin-top: 20px;">
                <p>Wybierz zamówienie do kompletacji z menu <a href="#" id="showSavedListsLink">"Zapisane Listy"</a>.</p>
            </div>
            <div id="picking-content" style="display: none;">
                 <div id="picking-progress" style="margin: 20px 0;"></div>
                 <div id="picking-layout">
                    <div class="picking-column">
                        <h4>Do zebrania:</h4>
                        <div id="picking-target-list" class="picking-list"></div>
                    </div>
                     <div class="picking-column">
                        <h4>Skompletowano:</h4>
                        <div id="picking-scanned-list" class="picking-list"></div>
                    </div>
                 </div>
                 <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button id="picking-verify-btn" class="btn-primary" style="flex-grow:1;">Weryfikuj</button>
                    <button id="picking-cancel-btn" class="btn-danger" style="flex-grow:1;">Anuluj kompletację</button>
                </div>
            </div>
        `;

        if(currentPickingOrder) {
            document.getElementById('picking-order-info').innerHTML = `<h3>Kompletacja zamówienia: ${currentPickingOrder.listName}</h3>`;
            document.getElementById('picking-content').style.display = 'block';
            renderPickingView();
        }
    };
    
    const startPicking = async (listId, listName) => {
        try {
            const response = await fetch(`/api/data/list/${listId}`, { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) throw new Error("Błąd wczytywania zamówienia");
            currentPickingOrder = await response.json();
            currentPickingOrder.listName = listName;
            pickedItems.clear();
            switchTab('picking');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handlePickingScan = (ean) => {
        if (!currentPickingOrder) return;
        const targetItem = currentPickingOrder.items.find(i => i.ean === ean || i.name === ean);
        if (!targetItem) {
            showToast("Tego produktu nie ma na liście do zebrania.", 'warning');
            return;
        }

        const currentQty = pickedItems.get(targetItem.ean) || 0;
        if (currentQty >= targetItem.quantity) {
            showToast(`Zebrano już maksymalną ilość: ${targetItem.description}`, 'info');
            return;
        }
        pickedItems.set(targetItem.ean, currentQty + 1);
        showToast(`Zeskanowano: ${targetItem.description}`, 'success');
        renderPickingView();
    };

    const renderPickingView = () => {
        if (!currentPickingOrder) return;
        const targetListEl = document.getElementById('picking-target-list');
        const scannedListEl = document.getElementById('picking-scanned-list');
        const progressEl = document.getElementById('picking-progress');

        if (!targetListEl || !scannedListEl || !progressEl) return;
        
        let totalToPick = 0;
        let totalPicked = 0;
        
        targetListEl.innerHTML = currentPickingOrder.items.map(item => {
            const pickedQty = pickedItems.get(item.ean) || 0;
            const remainingQty = item.quantity - pickedQty;
            totalToPick += item.quantity;
            totalPicked += pickedQty;

            return `
                <div class="pick-item ${remainingQty <= 0 ? 'picked' : ''}">
                    <strong>${item.description}</strong><br>
                    <small>${item.name}</small>
                    <p>Do zebrania: <strong>${remainingQty}</strong> / ${item.quantity}</p>
                </div>
            `;
        }).join('');
        
        scannedListEl.innerHTML = Array.from(pickedItems.entries()).map(([ean, quantity]) => {
            const item = currentPickingOrder.items.find(i => i.ean === ean);
            return `
                 <div class="pick-item">
                    <strong>${item.description}</strong><br>
                    <small>${item.name}</small>
                    <p>Skompletowano: <strong>${quantity}</strong></p>
                </div>
            `;
        }).join('');

        const progressPercent = totalToPick > 0 ? (totalPicked / totalToPick) * 100 : 100;
        progressEl.innerHTML = `
            <h4>Postęp: ${totalPicked} / ${totalToPick}</h4>
            <div style="background: var(--border-color); border-radius: 8px; overflow:hidden;"><div style="width: ${progressPercent}%; height: 10px; background: var(--success-color); transition: width 0.3s ease;"></div></div>
        `;

        if (totalPicked === totalToPick) {
            showToast("Wszystkie produkty zostały skompletowane!", "success", 5000);
        }
    };
    
    // --- Panel Admina ---
    const renderAdminPage = () => {
        elements.adminPanel.innerHTML = `
            <h2><i class="fa-solid fa-users-cog"></i> Panel Administratora</h2>
            <div class="admin-section">
                <h3>Zarządzanie użytkownikami</h3>
                <div id="allUsersList" style="margin-top: 15px;"></div>
            </div>
            <div class="admin-section">
                 <h3>Zarządzanie bazą produktów</h3>
                 <div style="margin-top: 15px;">
                    <label for="productsFileInput1">Plik produkty.csv:</label>
                    <input type="file" id="productsFileInput1" accept=".csv" style="display: block; margin-top: 5px;">
                    <button id="uploadProducts1Btn" class="btn" style="margin-top: 10px;">Prześlij produkty.csv</button>
                 </div>
                 <div style="margin-top: 20px;">
                    <label for="productsFileInput2">Plik produkty2.csv:</label>
                    <input type="file" id="productsFileInput2" accept=".csv" style="display: block; margin-top: 5px;">
                    <button id="uploadProducts2Btn" class="btn" style="margin-top: 10px;">Prześlij produkty2.csv</button>
                 </div>
            </div>
        `;
        loadAllUsers();
    };

    const loadAllUsers = async () => {
        try {
            const response = await fetch('/api/admin/users', { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) throw new Error('Nie można załadować użytkowników');
            
            const users = await response.json();
            const userListEl = document.getElementById('allUsersList');
            if(userListEl) {
                userListEl.innerHTML = users.map(user => `
                    <div class="user-item">
                        <div>
                            <strong>${user.username}</strong><br>
                            <small>Rola: ${user.role} | Status: ${user.isApproved ? 'Zatwierdzony' : 'Oczekujący'}</small>
                        </div>
                        <div class="user-actions">
                            ${!user.isApproved ? `<button class="approve-user-btn btn-primary" data-userid="${user._id}">Zatwierdź</button>` : ''}
                            <button class="edit-user-btn btn" data-userid="${user._id}" data-username="${user.username}">Zmień hasło</button>
                            <button class="delete-user-btn btn-danger" data-userid="${user._id}" data-username="${user.username}">Usuń</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            const userListEl = document.getElementById('allUsersList');
            if (userListEl) userListEl.innerHTML = `<p style="color:var(--danger-color);">${error.message}</p>`;
        }
    };
    
    const handleUserAction = async (url, options) => {
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Błąd operacji');
            showToast(data.msg || 'Operacja zakończona sukcesem!', 'success');
            await loadAllUsers();
        } catch (error) {
            showToast(`Błąd: ${error.message}`, 'error');
        }
    };
    
    // --- Zapisane listy ---
    const showSavedLists = async () => {
        elements.savedListsModal.style.display = 'flex';
        elements.savedListsContainer.innerHTML = '<p>Ładowanie...</p>';
        try {
            const response = await fetch('/api/data/lists', { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) throw new Error("Błąd wczytywania list");
            const lists = await response.json();
            
            elements.savedListsContainer.innerHTML = `
                <div style="padding-bottom: 15px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                     <button id="importCsvBtnInModal" class="btn" style="width: 100%;">
                        <i class="fa-solid fa-file-import"></i> Importuj zamówienie z CSV
                     </button>
                     <input type="file" id="importCsvInputInModal" accept=".csv" style="display: none;">
                </div>
                <h3>Zapisane listy:</h3>
                <div id="saved-lists-items" style="margin-top:15px;"></div>
            `;
            
            const listContainer = document.getElementById('saved-lists-items');
            if (lists.length === 0) {
                listContainer.innerHTML = '<p>Brak zapisanych zamówień.</p>';
            } else {
                listContainer.innerHTML = lists.map(list => `
                    <div class="user-item">
                         <div>
                            <strong>${list.listName}</strong><br>
                            <small>Autor: ${list.user?.username || 'usunięty'} | Zapis: ${new Date(list.updatedAt).toLocaleDateString()}</small>
                        </div>
                        <div class="user-actions">
                            <button class="btn pick-order-btn btn-warning" data-id="${list._id}" data-name="${list.listName}">Kompletuj</button>
                            <button class="btn-danger delete-list-btn" data-id="${list._id}">Usuń</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            elements.savedListsContainer.innerHTML = `<p style="color:var(--danger-color)">${error.message}</p>`;
        }
    };
    
    // --- Event Listeners ---
    const setupEventListeners = () => {
        // Logowanie
        elements.loginBtn.addEventListener('click', attemptLogin);
        elements.loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });

        // Główne menu
        elements.menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.dropdownMenu.classList.toggle('show');
        });
        window.addEventListener('click', () => {
            if (elements.dropdownMenu.classList.contains('show')) elements.dropdownMenu.classList.remove('show');
        });
        
        elements.menuListBuilderBtn.addEventListener('click', () => switchTab('listBuilder'));
        elements.menuPickingBtn.addEventListener('click', () => switchTab('picking'));
        elements.menuInventoryBtn.addEventListener('click', () => switchTab('inventory'));
        elements.menuAdminBtn.addEventListener('click', () => switchTab('admin'));
        elements.menuSavedLists.addEventListener('click', showSavedLists);
        elements.menuLogoutBtn.addEventListener('click', () => {
            localStorage.clear();
            location.reload();
        });

        // Dolna belka
        elements.floatingEanInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleFloatingBarAdd(); });
        elements.floatingAddBtn.addEventListener('click', handleFloatingBarAdd);
        elements.floatingEanInput.addEventListener('input', debounce(handleFloatingBarSearch, 300));
        elements.floatingSearchResults.addEventListener('click', (e) => {
             const li = e.target.closest('li');
             if (li && li.dataset.ean) {
                 elements.floatingEanInput.value = li.dataset.ean;
                 elements.floatingSearchResults.style.display = 'none';
                 handleFloatingBarAdd();
             }
        });

        // Modale
        elements.quickSearchBtn.addEventListener('click', () => {
            elements.quickSearchModal.style.display = 'flex';
            elements.lookupBarcodeInput.value = '';
            elements.lookupResultSingle.innerHTML = '';
            elements.lookupBarcodeInput.focus();
        });
        elements.closeQuickSearchModalBtn.addEventListener('click', () => { elements.quickSearchModal.style.display = 'none'; });
        elements.lookupBarcodeInput.addEventListener('input', debounce(handleLookupSearch, 300));
        elements.closeSavedListsModalBtn.addEventListener('click', () => { elements.savedListsModal.style.display = 'none'; });

        // Dark Mode i przewijanie
        elements.darkModeToggle.addEventListener('click', () => {
            const isDark = !document.body.classList.contains('dark-mode');
            document.body.classList.toggle('dark-mode', isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
        
        window.addEventListener('scroll', () => {
            const show = window.scrollY > 200;
            elements.scrollTopBtn.style.display = show ? 'flex' : 'none';
            elements.scrollBottomBtn.style.display = show ? 'flex' : 'none';
        });
        elements.scrollTopBtn.addEventListener('click', () => window.scrollTo(0, 0));
        elements.scrollBottomBtn.addEventListener('click', () => window.scrollTo(0, document.body.scrollHeight));
        
        // --- Delegacja zdarzeń dla dynamicznych elementów ---
        document.body.addEventListener('click', e => {
            const target = e.target;

            // Zapisane listy
            if(target.closest('.pick-order-btn')) {
                const btn = target.closest('.pick-order-btn');
                startPicking(btn.dataset.id, btn.dataset.name);
                elements.savedListsModal.style.display = 'none';
            }
            if(target.closest('#showSavedListsLink')) {
                e.preventDefault();
                showSavedLists();
            }

            // Anulowanie kompletacji
            if (target.id === 'picking-cancel-btn') {
                if (confirm("Czy na pewno chcesz anulować tę kompletację? Postęp zostanie utracony.")) {
                    currentPickingOrder = null;
                    pickedItems.clear();
                    switchTab('picking');
                }
            }

            // Usuwanie z listy
            if (target.closest('.delete-btn')) {
                const index = target.closest('.delete-btn').dataset.index;
                scannedItems.splice(index, 1);
                renderScannedList();
            }
            
            // Usuwanie z inwentaryzacji
            if (target.closest('.delete-inv-item-btn')) {
                const index = target.closest('.delete-inv-item-btn').dataset.index;
                inventoryItems.splice(index, 1);
                renderInventoryList();
            }
            
            // Edycja ilości w inwentaryzacji
            if (target.classList.contains('editable-quantity')) {
                const index = target.dataset.index;
                const currentQuantity = inventoryItems[index].quantity;
                const newQuantity = prompt("Wprowadź nową ilość:", currentQuantity);
                if (newQuantity !== null && !isNaN(newQuantity) && newQuantity > 0) {
                    inventoryItems[index].quantity = parseInt(newQuantity, 10);
                    renderInventoryList();
                }
            }
            
            // Przyciski panelu admina
            const adminButton = target.closest('.user-actions button');
            if (adminButton) {
                const { userid, username } = adminButton.dataset;
                if(adminButton.classList.contains('approve-user-btn')) {
                    handleUserAction(`/api/admin/approve-user/${userid}`, { method: 'POST', headers: { 'x-auth-token': localStorage.getItem('token') } });
                } else if (adminButton.classList.contains('edit-user-btn')) {
                    const p = prompt(`Nowe hasło dla ${username}:`);
                    if (p) handleUserAction(`/api/admin/edit-password/${userid}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ newPassword: p }) });
                } else if (adminButton.classList.contains('delete-user-btn')) {
                    if (confirm(`Na pewno usunąć użytkownika ${username}?`)) {
                        handleUserAction(`/api/admin/delete-user/${userid}`, { method: 'DELETE', headers: { 'x-auth-token': localStorage.getItem('token') } });
                    }
                }
            }
            
            // Zapisz/Wyczyść listę
            if(target.id === 'saveListBtn') {
                // Implementacja zapisu
            }
            if(target.id === 'clearListBtn') {
                if(confirm('Czy na pewno chcesz wyczyścić bieżącą listę?')) {
                    scannedItems = [];
                    renderScannedList();
                }
            }
        });
    };

    // --- Inicjalizacja ---
    const init = () => {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
        }
        setupEventListeners();
        checkLoginStatus();
    };

    init();
});
