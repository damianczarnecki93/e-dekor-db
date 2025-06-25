document.addEventListener('DOMContentLoaded', () => {

    const elements = {
        loginOverlay: document.getElementById('loginOverlay'),
        appContainer: document.getElementById('appContainer'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        loginBtn: document.getElementById('loginBtn'),
        loginError: document.getElementById('loginError'),
        loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'),
        registerUsername: document.getElementById('registerUsername'),
        registerPassword: document.getElementById('registerPassword'),
        registerBtn: document.getElementById('registerBtn'),
        registerError: document.getElementById('registerError'),
        showRegister: document.getElementById('showRegister'),
        showLogin: document.getElementById('showLogin'),
        mainContent: document.getElementById('main-content'),
        adminPanel: document.getElementById('adminPanel'),
        inventoryPage: document.getElementById('inventoryPage'),
        pickingPage: document.getElementById('pickingPage'),
        topBar: document.getElementById('topBar'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        quickSearchBtn: document.getElementById('quickSearchBtn'),
        menuToggleBtn: document.getElementById('menuToggleBtn'),
        dropdownMenu: document.getElementById('dropdownMenu'),
        menuUsername: document.getElementById('menuUsername'),
        menuAdminBtn: document.getElementById('menuAdminBtn'),
        menuListBuilderBtn: document.getElementById('menuListBuilderBtn'),
        menuInventoryBtn: document.getElementById('menuInventoryBtn'),
        menuPickingBtn: document.getElementById('menuPickingBtn'),
        menuLogoutBtn: document.getElementById('menuLogoutBtn'),
        menuChangePassword: document.getElementById('menuChangePassword'),
        menuSavedLists: document.getElementById('menuSavedLists'),
        lookupBarcodeInput: document.getElementById('lookupBarcodeInput'),
        lookupResultList: document.getElementById('lookupResultList'),
        savedListsModal: document.getElementById('savedListsModal'),
        closeSavedListsModalBtn: document.getElementById('closeSavedListsModalBtn'),
        savedListsContainer: document.getElementById('savedListsContainer'),
        toastContainer: document.getElementById('toast-container'),
        floatingInputBar: document.getElementById('floating-input-bar'),
        floatingEanInput: document.getElementById('floating-ean-input'),
        floatingSearchResults: document.getElementById('floating-search-results'),
    };

    let productDatabase = [], scannedItems = [], inventoryItems = [];
    let activeListId = null;
    let currentPickingOrder = null;
    let pickedItems = [];
    let activePage = 'listBuilder';

    function debounce(func, delay) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); }; }

    const showApp = (userData) => {
        elements.loginOverlay.style.display = 'none';
        elements.appContainer.style.display = 'block';
        if (elements.topBar) elements.topBar.style.display = 'flex';
        initializeApp(userData);
    };

    const initializeApp = async (userData) => {
        if (!userData) { console.error("initializeApp: Otrzymano nieprawidłowe dane użytkownika."); localStorage.clear(); location.reload(); return; }
        if(elements.menuUsername) elements.menuUsername.textContent = userData.username;
        await loadDataFromServer();
        if (userData.role === 'admin') { if (elements.menuAdminBtn) elements.menuAdminBtn.style.display = 'flex'; }
        await loadActiveList();
        renderCurrentPage();
        attachAllEventListeners(); 
    };
    
    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) { attachLoginListeners(); return; }
        try {
            const response = await fetch('/api/auth/verify', { method: 'GET', headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Token verification failed');
            const userData = await response.json();
            showApp(userData);
        } catch (error) { console.error('Błąd weryfikacji tokenu:', error); localStorage.removeItem('token'); attachLoginListeners(); }
    };
    
    async function attemptLogin() {
        elements.loginError.textContent = '';
        const username = elements.loginUsername.value;
        const password = elements.loginPassword.value;
        try {
            const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const data = await response.json();
            if (!response.ok) { elements.loginError.textContent = data.msg || 'Wystąpił błąd logowania.'; return; }
            localStorage.setItem('token', data.token);
            showApp(data.user);
        } catch (error) { console.error('Błąd podczas logowania:', error); elements.loginError.textContent = 'Nie można połączyć się z serwerem lub wystąpił błąd sieci.'; }
    }

    function attachLoginListeners() {
        if (elements.loginBtn) elements.loginBtn.addEventListener('click', attemptLogin);
        if (elements.loginPassword) elements.loginPassword.addEventListener('keydown', (event) => { if (event.key === 'Enter') attemptLogin(); });
    }

    function attachAllEventListeners() {
        attachLoginListeners();
        if (elements.menuListBuilderBtn) elements.menuListBuilderBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab('listBuilder'); });
        if (elements.menuPickingBtn) elements.menuPickingBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab('picking'); });
        if (elements.menuToggleBtn) elements.menuToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); elements.dropdownMenu.classList.toggle('show'); });
        window.addEventListener('click', () => { if (elements.dropdownMenu && elements.dropdownMenu.classList.contains('show')) elements.dropdownMenu.classList.remove('show'); });
        if (elements.menuAdminBtn) elements.menuAdminBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab('admin'); });
        if (elements.menuInventoryBtn) elements.menuInventoryBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab('inventory'); });
        if (elements.menuLogoutBtn) elements.menuLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.clear(); location.reload(); });
        if (elements.menuChangePassword) elements.menuChangePassword.addEventListener('click', (e) => { e.preventDefault(); handleChangePassword(); });
        if (elements.menuSavedLists) elements.menuSavedLists.addEventListener('click', (e) => { e.preventDefault(); showSavedLists(); });
        if (elements.darkModeToggle) elements.darkModeToggle.addEventListener('click', () => setDarkMode(!document.body.classList.contains('dark-mode')));
        if(elements.quickSearchBtn) elements.quickSearchBtn.addEventListener('click', () => {
            elements.quickSearchModal.style.display = 'flex';
            elements.lookupBarcodeInput.value = '';
            elements.lookupResultList.innerHTML = '';
            elements.lookupBarcodeInput.focus();
        });
        if(elements.closeQuickSearchModalBtn) elements.closeQuickSearchModalBtn.addEventListener('click', () => { elements.quickSearchModal.style.display = 'none'; });
        if(elements.lookupBarcodeInput) elements.lookupBarcodeInput.addEventListener('input', debounce(handleLookupSearch, 300));
        if(elements.floatingEanInput) {
            elements.floatingEanInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { handleFloatingBarAdd(); }});
            elements.floatingEanInput.addEventListener('input', debounce(handleFloatingBarSearch, 300));
        }
        if (elements.closeSavedListsModalBtn) elements.closeSavedListsModalBtn.addEventListener('click', () => { elements.savedListsModal.style.display = 'none'; });
    }
    
    async function loadDataFromServer() { function fetchAndParseCsv(filename) { return fetch(`${filename}?t=${new Date().getTime()}`).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`Błąd sieci: ${r.statusText}`))).then(b => new TextDecoder("Windows-1250").decode(b)).then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: rts => res(rts.data), error: e => rej(e) }))); } try { const [data1, data2] = await Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')]); const mapData = p => ({ kod_kreskowy: String(p.kod_kreskowy || "").trim(), nazwa_produktu: String(p.nazwa_produktu || "").trim(), cena: String(p.opis || "0").replace(',', '.').trim() || "0", opis: String(p.cena || "").trim() }); productDatabase = [...data1.map(mapData), ...data2.map(mapData)]; showToast("Baza produktów została zaktualizowana.", "success"); } catch (error) { console.error('Krytyczny błąd ładowania danych:', error); alert('BŁĄD: Nie udało się załadować bazy produktów.'); } }
    function switchTab(newTab) { activePage = newTab; renderCurrentPage(); }
    function setDarkMode(isDark) { if (isDark) { document.body.classList.add('dark-mode'); } else { document.body.classList.remove('dark-mode'); } localStorage.setItem('theme', isDark ? 'dark' : 'light'); }
    function performSearch(searchTerm) { if (!searchTerm) return []; const term = searchTerm.toLowerCase(); return productDatabase.filter(p => (p.kod_kreskowy?.toLowerCase().includes(term)) || (p.nazwa_produktu?.toLowerCase().includes(term)) || (p.opis?.toLowerCase().includes(term))); }
    function showToast(message, type = 'info') { const toast = document.createElement('div'); toast.className = `toast ${type}`; if(type === 'success') toast.style.background = 'var(--success-color)'; else if(type === 'error') toast.style.background = 'var(--danger-color)'; toast.textContent = message; elements.toastContainer.appendChild(toast); setTimeout(() => { toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, 3000); }, 10); }
    function downloadFile(content, mimeType, filename) { const blob = new Blob([content], { type: mimeType }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    
    function renderCurrentPage() {
        ['mainContent', 'adminPanel', 'inventoryPage', 'pickingPage'].forEach(id => { if(elements[id]) elements[id].style.display = 'none'; });
        if(elements.floatingInputBar) elements.floatingInputBar.style.display = 'none';

        const pageElement = elements[activePage];
        if (pageElement) {
            pageElement.style.display = 'block';
            if (activePage === 'listBuilder' || activePage === 'inventory') {
                if(elements.floatingInputBar) elements.floatingInputBar.style.display = 'flex';
            }
        }
        
        switch(activePage) {
            case 'listBuilder': renderListBuilderPage(); break;
            case 'inventory': renderInventoryPage(); break;
            case 'picking': renderPickingPage(); break;
            case 'admin': renderAdminPage(); break;
        }
    }

    function handleFloatingBarAdd() {
        const ean = elements.floatingEanInput.value.trim();
        if (!ean) return;
        if (activePage === 'listBuilder') addProductToList(ean, 1);
        else if (activePage === 'inventory') handleInventoryAdd(ean, 1);
        elements.floatingEanInput.value = '';
        elements.floatingSearchResults.innerHTML = '';
        elements.floatingSearchResults.style.display = 'none';
        elements.floatingEanInput.focus();
    }

    function handleFloatingBarSearch() {
        const searchTerm = elements.floatingEanInput.value.trim();
        const resultsDiv = elements.floatingSearchResults;
        resultsDiv.innerHTML = '';
        if (!searchTerm) { resultsDiv.style.display = 'none'; return; }
        const results = performSearch(searchTerm);
        if (results.length > 0) {
            let listHtml = '<ul>';
            results.slice(0, 5).forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.opis} <small>(${p.nazwa_produktu})</small></li>`; });
            listHtml += '</ul>';
            resultsDiv.innerHTML = listHtml;
            resultsDiv.style.display = 'block';
            resultsDiv.onclick = (e) => {
                const li = e.target.closest('li');
                if (li && li.dataset.ean) {
                    elements.floatingEanInput.value = li.dataset.ean;
                    handleFloatingBarAdd();
                }
            };
        } else {
            resultsDiv.style.display = 'none';
        }
    }
    
    function handleLookupSearch() {
        const searchTerm = elements.lookupBarcodeInput.value.trim();
        elements.lookupResultList.innerHTML = '';
        if (!searchTerm) return;
        const results = performSearch(searchTerm);
        if (results.length > 0) {
            let listHtml = '<ul>';
            results.forEach(p => {
                listHtml += `<li data-product-json='${JSON.stringify(p)}' style="padding: 10px; border-bottom: 1px solid var(--border-color); cursor:pointer;">
                    <strong>${p.opis}</strong><br><small>${p.nazwa_produktu} | ${p.kod_kreskowy}</small>
                </li>`;
            });
            listHtml += '</ul>';
            elements.lookupResultList.innerHTML = listHtml;
        } else {
            elements.lookupResultList.innerHTML = '<p style="padding: 15px;">Nie znaleziono produktu.</p>';
        }
    }
    
    function renderListBuilderPage() {
        if (!elements.mainContent) return;
        elements.mainContent.innerHTML = `
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                <input type="text" id="clientNameInput" placeholder="Nazwa klienta..." style="flex-grow: 1;">
                <input type="text" id="additionalInfoInput" placeholder="Informacje dodatkowe..." style="flex-grow: 1;">
            </div>
            <table style="table-layout: fixed; width: 100%;">
                <thead><tr><th style="width: 30%;">Kod produktu</th><th style="width: 40%;">Nazwa</th><th style="width: 15%;">EAN</th><th style="width: 10%;">Ilość</th><th style="width: 5%;">Akcje</th></tr></thead>
                <tbody id="scannedListBody"></tbody>
            </table>
            <div id="totalOrderValue" style="text-align: right; font-size: 1.2em; font-weight: 600; margin-top: 20px;"></div>
            <div style="margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end;">
                 <button id="newListBtn" class="btn" style="background-color: var(--warning-color);">Nowa lista</button>
                 <button id="saveListBtn" class="btn-primary"><i class="fa-solid fa-save"></i> Zapisz</button>
                 <button id="clearListBtn" class="btn-danger"><i class="fa-solid fa-eraser"></i> Wyczyść</button>
            </div>
        `;
        renderScannedList();
    }
    
    function addProductToList(code, quantity = 1) {
        if (!code) return;
        let productData = productDatabase.find(p => p.kod_kreskowy === code || p.nazwa_produktu === code);
        if (!productData) { productData = { kod_kreskowy: code, nazwa_produktu: code, opis: code, cena: "0" }; }
        const existingItem = scannedItems.find(item => item.ean === productData.kod_kreskowy);
        if (existingItem) { existingItem.quantity += quantity; } 
        else { scannedItems.push({ ean: productData.kod_kreskowy, name: productData.nazwa_produktu, description: productData.opis, quantity, price: productData.cena }); }
        renderScannedList();
        showToast(`Dodano: ${productData.nazwa_produktu}`, "success");
    }

    function renderScannedList() {
        const tableBody = document.getElementById('scannedListBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        scannedItems.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="col-code">${item.name}</td><td>${item.description}</td><td class="col-ean">${item.ean}</td><td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}"></td><td><button class="delete-btn btn-icon" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>`;
            tableBody.appendChild(row);
        });
        const lastRow = tableBody.querySelector('tr:last-child');
        if(lastRow) lastRow.scrollIntoView({ behavior: 'smooth', block: 'end' });

        const totalValue = scannedItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0);
        document.getElementById('totalOrderValue').textContent = `Total: ${totalValue.toFixed(2)} PLN`;
    }

    function renderInventoryPage() { 
        if (!elements.inventoryPage) return;
        elements.inventoryPage.innerHTML = `
            <h2><i class="fa-solid fa-boxes-packing"></i> Inwentaryzacja</h2>
            <div style="overflow-x: auto;">
                 <table>
                     <thead><tr><th>Kod produktu</th><th>Nazwa</th><th>Ilość</th><th>Akcje</th></tr></thead>
                     <tbody id="inventoryListBody"></tbody>
                 </table>
            </div>
            <div style="text-align: right; margin-top: 20px;">
                 <button id="inventoryExportCsvBtn" class="btn btn-csv"><i class="fa-solid fa-file-csv"></i> Eksportuj CSV</button>
            </div>
        `;
        renderInventoryList();
        document.getElementById('inventoryExportCsvBtn').addEventListener('click', exportInventoryToCsv);
    }
    
    function handleInventoryAdd(ean, quantity = 1) { if (!ean) return; const existing = inventoryItems.find(i => i.ean === ean); if (existing) { existing.quantity += quantity; } else { let p = productDatabase.find(prod => prod.kod_kreskowy === ean); if (!p) p = { nazwa_produktu: 'Produkt spoza bazy', opis: ean }; inventoryItems.push({ ean: ean, name: p.nazwa_produktu, quantity }); } renderInventoryList(); showToast(`Dodano do inwentaryzacji: ${ean}`); }
    function renderInventoryList() { const body = document.getElementById('inventoryListBody'); if(!body) return; body.innerHTML = inventoryItems.map((item, i) => `<tr><td>${item.name}</td><td>${item.ean}</td><td>${item.quantity}</td><td><button class="delete-inv-item-btn btn-icon btn-danger" data-index="${i}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join(''); const lastRow = body.querySelector('tr:last-child'); if(lastRow) lastRow.scrollIntoView({ behavior: 'smooth', block: 'end' }); }
    function handleDeleteInventoryItem(e) { const btn = e.target.closest('.delete-inv-item-btn'); if (btn) { inventoryItems.splice(btn.dataset.index, 1); renderInventoryList(); } }
    function exportInventoryToCsv() { if (inventoryItems.length === 0) return; const csvContent = inventoryItems.map(item => `${item.ean};${item.quantity}`).join('\n'); downloadFile(csvContent, 'text/csv;charset=utf-8;', `inwentaryzacja_${new Date().toISOString().slice(0,10)}.csv`); }

    function renderPickingPage() {
        if (!elements.pickingPage) return;
        elements.pickingPage.innerHTML = `
            <h2><i class="fa-solid fa-box-open"></i> Kompletacja Zamówienia</h2>
            <p>Wybierz zamówienie do kompletacji z menu "Zapisane listy".</p>
            <div id="picking-content" style="display: none;">
                <h3 id="picking-order-name"></h3>
                <div class="search-container" style="margin-bottom: 15px;">
                    <input type="text" id="picking-ean-input" placeholder="Skanuj lub wyszukaj EAN i naciśnij Enter...">
                    <div id="picking-search-results" class="search-results-list"></div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div><h4>Do zebrania</h4><div id="picking-target-list" style="height: 300px; overflow-y: auto; border: 1px solid var(--border-color); padding: 5px; border-radius: 8px;"></div></div>
                    <div><h4>Skompletowano</h4><div id="picking-scanned-list" style="height: 300px; overflow-y: auto; border: 1px solid var(--border-color); padding: 5px; border-radius: 8px;"></div></div>
                </div>
                <div style="margin-top:20px; display:flex; gap:10px;"><button id="picking-verify-btn" class="btn-primary" style="flex-grow:1;">Weryfikuj</button><button id="picking-export-csv-btn" class="btn-csv" style="flex-grow:1;">Eksportuj CSV</button></div>
            </div>
        `;
    }
    
    function renderAdminPage() { loadAllUsers(); }
    async function loadAllUsers() { try { const response = await fetch('/api/admin/users', { headers: { 'x-auth-token': localStorage.getItem('token') } }); if (!response.ok) { throw new Error('Nie można załadować użytkowników'); } const users = await response.json(); const userListEl = document.getElementById('allUsersList'); userListEl.innerHTML = users.map(user => ` <div class="user-item"> <div><strong>${user.username}</strong><br><small>Rola: ${user.role} | Status: ${user.isApproved ? 'Zatwierdzony' : 'Oczekujący'}</small></div> <div class="user-actions"> ${!user.isApproved ? `<button class="approve-user-btn btn-primary" data-userid="${user._id}">Zatwierdź</button>` : ''} <button class="edit-user-btn" data-userid="${user._id}" data-username="${user.username}">Zmień hasło</button> <button class="delete-user-btn btn-danger" data-userid="${user._id}">Usuń</button> </div> </div> `).join(''); } catch (error) { document.getElementById('allUsersList').innerHTML = `<p style="color:red;">${error.message}</p>`; } }
    async function handleUserAction(url, options) { try { const response = await fetch(url, options); const data = await response.json(); if (!response.ok) throw new Error(data.msg || 'Błąd operacji'); showToast(data.msg || 'Operacja zakończona sukcesem!'); await loadAllUsers(); } catch (error) { alert(`Błąd: ${error.message}`); } }
    async function handleChangePassword() { const newPassword = prompt("Wprowadź nowe hasło:"); if (!newPassword) return; try { const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ newPassword }) }); const data = await response.json(); if (!response.ok) throw new Error(data.msg || "Błąd zmiany hasła"); alert("Hasło zostało pomyślnie zmienione."); } catch (error) { alert(`Błąd: ${error.message}`); } }
    function handleAdminAction(e) { const target = e.target.closest('button'); if (!target) return; const { userid, username, role } = target.dataset; if (target.classList.contains('approve-user-btn')) handleUserAction(`/api/admin/approve-user/${userid}`, { method: 'POST', headers: { 'x-auth-token': localStorage.getItem('token') } }); else if (target.classList.contains('edit-user-btn')) { const p = prompt(`Nowe hasło dla ${username}:`); if (p) handleUserAction(`/api/admin/edit-password/${userid}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ newPassword: p }) }); } else if (target.classList.contains('delete-user-btn')) { if (confirm(`Na pewno usunąć ${username}?`)) handleUserAction(`/api/admin/delete-user/${userid}`, { method: 'DELETE', headers: { 'x-auth-token': localStorage.getItem('token') } }); } }
    
    async function saveCurrentList() { const listId = localStorage.getItem('activeListId'); const listName = listId ? null : prompt("Podaj nazwę dla zapisywanego zamówienia:", document.getElementById('clientNameInput').value || `Zamówienie ${getSafeFilename()}`); if (!listId && !listName) return null; try { const url = listId ? `/api/data/list/${listId}` : '/api/data/savelist'; const method = listId ? 'PUT' : 'POST'; const body = { items: scannedItems, clientName: document.getElementById('clientNameInput').value }; if (listName) body.listName = listName; const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify(body) }); if (!response.ok) { const errData = await response.json(); throw new Error(errData.msg || "Błąd zapisu"); } const savedList = await response.json(); showToast(`Zamówienie zostało zapisane.`); localStorage.setItem('activeListId', savedList._id); return savedList; } catch (error) { alert(`Błąd: ${error.message}`); return null; } }
    async function loadListById(listId) { try { if(scannedItems.length > 0 && localStorage.getItem('activeListId') !== listId) { await saveCurrentList(); } const response = await fetch(`/api/data/list/${listId}`, { headers: { 'x-auth-token': localStorage.getItem('token') } }); if (!response.ok) throw new Error("Błąd wczytywania listy"); const data = await response.json(); scannedItems = data.items; activeListId = listId; localStorage.setItem('activeListId', listId); return data; } catch (error) { alert(error.message); localStorage.removeItem('activeListId'); return null; } }
    async function loadActiveList() { activeListId = localStorage.getItem('activeListId'); if (activeListId) { showToast("Wczytuję ostatnio aktywną listę..."); await loadListById(activeListId); } }
    async function showSavedLists() { elements.savedListsModal.style.display = 'flex'; const container = elements.savedListsContainer; container.innerHTML = '<p>Ładowanie...</p>'; try { const response = await fetch('/api/data/lists', { headers: { 'x-auth-token': localStorage.getItem('token') } }); if (!response.ok) throw new Error("Błąd wczytywania list"); const lists = await response.json(); const importInputId = 'importCsvInputInModal'; container.innerHTML = `<div style="padding-bottom: 15px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color);"> <button id="importCsvBtnInModal" class="btn btn-primary" style="background-color: var(--info-color); width: 100%;"> <i class="fa-solid fa-file-import"></i> Importuj zamówienie z pliku CSV </button> <input type="file" id="${importInputId}" accept=".csv" style="display: none;"> </div><h3>Zapisane listy:</h3>`; container.querySelector('#importCsvBtnInModal').addEventListener('click', () => container.querySelector(`#${importInputId}`).click()); container.querySelector(`#${importInputId}`).addEventListener('change', handleFileImport); if (lists.length === 0) { container.innerHTML += '<p>Brak zapisanych zamówień.</p>'; return; } const listContainer = document.createElement('ul'); listContainer.style.cssText = 'list-style: none; padding: 0;'; lists.forEach(list => { const li = document.createElement('li'); li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border-color); flex-wrap: wrap; gap: 10px;'; li.innerHTML = `<span>${list.listName} <small>(autor: ${list.user?.username || 'usunięty'}, ost. zapis: ${new Date(list.updatedAt).toLocaleDateString()})</small></span> <div style="display: flex; gap: 5px; flex-wrap: wrap;"> <button class="btn-primary load-list-btn" data-id="${list._id}">Wczytaj</button> <button class="pick-order-btn" data-id="${list._id}" data-name="${list.listName}" style="background-color: var(--warning-color);">Kompletuj</button> <button class="btn-danger delete-list-btn" data-id="${list._id}">Usuń</button> </div>`; listContainer.appendChild(li); }); container.appendChild(listContainer); } catch (error) { container.innerHTML = `<p style="color:var(--danger-color)">${error.message}</p>`; } }
    async function handleSavedListAction(e) { const target = e.target.closest('button'); if (!target) return; const listId = target.dataset.id; if (target.classList.contains('load-list-btn')) { const loadedList = await loadListById(listId); if (loadedList) { elements.savedListsModal.style.display = 'none'; showToast(`Wczytano listę: ${loadedList.listName}`); switchTab('listBuilder'); } } else if (target.classList.contains('delete-list-btn')) { if (!confirm("Czy na pewno usunąć tę listę?")) return; try { const response = await fetch(`/api/data/list/${listId}`, { method: 'DELETE', headers: { 'x-auth-token': localStorage.getItem('token') } }); const data = await response.json(); if (!response.ok) throw new Error(data.msg || "Błąd usuwania listy"); showToast("Lista usunięta."); await showSavedLists(); } catch (error) { alert(error.message); } } else if (target.classList.contains('pick-order-btn')) { elements.savedListsModal.style.display = 'none'; await startPicking(listId, target.dataset.name); } }
    async function handleFileImport(event) { const file = event.target.files[0]; if (!file) return; const listName = prompt("Podaj nazwę dla importowanego zamówienia:", file.name.replace(/\.csv$/i, '')); if (!listName) { event.target.value = ''; return; } Papa.parse(file, { delimiter: ";", skipEmptyLines: true, complete: async (results) => { const itemsMap = new Map(); results.data.forEach(row => { const ean = row[0]?.trim(); const quantity = parseInt(row[1]?.trim(), 10); if (ean && !isNaN(quantity) && quantity > 0) { itemsMap.set(ean, (itemsMap.get(ean) || 0) + quantity); } }); const importedItems = Array.from(itemsMap, ([ean, quantity]) => { let p = productDatabase.find(prod => prod.kod_kreskowy === ean || prod.nazwa_produktu === ean); if (!p) { p = { kod_kreskowy: ean, nazwa_produktu: ean, opis: ean, cena: "0" }; } return { ean: p.kod_kreskowy, name: p.nazwa_produktu, description: p.opis, quantity, price: p.cena }; }); try { const response = await fetch('/api/data/savelist', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ listName, items: importedItems, clientName: listName }) }); const savedList = await response.json(); if (!response.ok) throw new Error(savedList.msg || "Błąd zapisu na serwerze"); scannedItems = savedList.items; document.getElementById('clientNameInput').value = savedList.clientName || savedList.listName; renderScannedList(); showToast(`Zamówienie "${listName}" zostało zaimportowane.`); elements.savedListsModal.style.display = 'none'; switchTab('listBuilder'); } catch (error) { alert(`Błąd: ${error.message}`); } }, error: (err) => { alert(`Błąd parsowania pliku CSV: ${err.message}`); } }); event.target.value = ''; }
    
    // ... Pozostałe funkcje (bez zmian) ...

    checkLoginStatus();
});
