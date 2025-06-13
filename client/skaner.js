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
        tabLookupBtn: document.getElementById('tabLookupBtn'),
        tabListBuilderBtn: document.getElementById('tabListBuilderBtn'),
        lookupMode: document.getElementById('lookupMode'),
        listBuilderMode: document.getElementById('listBuilderMode'),
        topBar: document.getElementById('topBar'),
        bottomBar: document.getElementById('bottomBar'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        quickSearchBtn: document.getElementById('quickSearchBtn'),
        menuToggleBtn: document.getElementById('menuToggleBtn'),
        dropdownMenu: document.getElementById('dropdownMenu'),
        menuUsername: document.getElementById('menuUsername'),
        menuAdminBtn: document.getElementById('menuAdminBtn'),
        menuInventoryBtn: document.getElementById('menuInventoryBtn'),
        menuLogoutBtn: document.getElementById('menuLogoutBtn'),
        menuChangePassword: document.getElementById('menuChangePassword'),
        menuSavedLists: document.getElementById('menuSavedLists'),
        scrollTopBtn: document.getElementById('scrollTopBtn'),
        scrollBottomBtn: document.getElementById('scrollBottomBtn'),
        lookupBarcodeInput: document.getElementById('lookupBarcodeInput'),
        lookupResultList: document.getElementById('lookupResultList'),
        lookupResultSingle: document.getElementById('lookupResultSingle'),
        quickSearchModal: document.getElementById('quickSearchModal'),
        closeQuickSearchModalBtn: document.getElementById('closeQuickSearchModalBtn'),
        listBarcodeInput: document.getElementById('listBarcode_Input'),
        listBuilderSearchResults: document.getElementById('listBuilderSearchResults'),
        quantityInput: document.getElementById('quantityInput'),
        addToListBtn: document.getElementById('addToListBtn'),
        saveListBtn: document.getElementById('saveListBtn'),
        newListBtn: document.getElementById('newListBtn'),
        scannedListBody: document.getElementById('scannedListBody'),
        clientNameInput: document.getElementById('clientNameInput'),
        additionalInfoInput: document.getElementById('additionalInfoInput'),
        totalOrderValue: document.getElementById('totalOrderValue'),
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        exportExcelBtn: document.getElementById('exportExcelBtn'),
        printListBtn: document.getElementById('printListBtn'),
        clearListBtn: document.getElementById('clearListBtn'),
        importCsvInput: document.getElementById('importCsvInput'),
        importCsvBtn: document.getElementById('importCsvBtn'),
        adminPanel: document.getElementById('adminPanel'),
        allUsersList: document.getElementById('allUsersList'),
        inventoryModule: document.getElementById('inventoryModule'),
        closeInventoryModalBtn: document.getElementById('closeInventoryModalBtn'),
        inventoryEanInput: document.getElementById('inventoryEanInput'),
        inventoryQuantityInput: document.getElementById('inventoryQuantityInput'),
        inventoryAddBtn: document.getElementById('inventoryAddBtn'),
        inventoryListBody: document.getElementById('inventoryListBody'),
        inventoryExportCsvBtn: document.getElementById('inventoryExportCsvBtn'),
        inventorySearchResults: document.getElementById('inventorySearchResults'),
        savedListsModal: document.getElementById('savedListsModal'),
        closeSavedListsModalBtn: document.getElementById('closeSavedListsModalBtn'),
        savedListsContainer: document.getElementById('savedListsContainer'),
        pickingModule: document.getElementById('pickingModule'),
        closePickingModalBtn: document.getElementById('closePickingModalBtn'),
        pickingOrderName: document.getElementById('picking-order-name'),
        pickingEanInput: document.getElementById('picking-ean-input'),
        pickingSearchResults: document.getElementById('picking-search-results'),
        pickingStatusMsg: document.getElementById('picking-status-msg'),
        pickingTargetList: document.getElementById('picking-target-list'),
        pickingScannedList: document.getElementById('picking-scanned-list'),
        pickingVerifyBtn: document.getElementById('picking-verify-btn'),
        pickingSummaryModal: document.getElementById('pickingSummaryModal'),
        closePickingSummaryModalBtn: document.getElementById('closePickingSummaryModalBtn'),
        pickingSummaryBody: document.getElementById('pickingSummaryBody'),
        pickingAcceptBtn: document.getElementById('picking-accept-btn'),
        pickingExportCsvBtn: document.getElementById('picking-export-csv-btn'),
        toastContainer: document.getElementById('toast-container'),
        printArea: document.getElementById('print-area'),
        printClientName: document.getElementById('print-client-name'),
        printAdditionalInfo: document.getElementById('print-additional-info'),
        printTableBody: document.getElementById('print-table-body'),
        numpadModal: document.getElementById('numpad-modal'),
        numpadDisplay: document.getElementById('numpad-display'),
        numpadOk: document.getElementById('numpad-ok'),
        numpadClear: document.getElementById('numpad-clear'),
        numpadBackspace: document.getElementById('numpad-backspace'),
        numpadKeys: document.querySelectorAll('.numpad-key'),
    };

    let productDatabase = [], scannedItems = [], inventoryItems = [], activeTab = 'lookup';
    let currentPickingOrder = null;
    let pickedItems = [];
    let numpadTarget = null;
    let numpadCallback = null;
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

    // =================================================================
    // INICJALIZACJA I LOGOWANIE
    // =================================================================
    const showApp = (userData) => {
        elements.loginOverlay.style.display = 'none';
        elements.appContainer.style.display = 'block';
        if (elements.topBar) elements.topBar.style.display = 'flex';
        if (elements.bottomBar) elements.bottomBar.style.display = 'flex';
        initializeApp(userData);
    };

    const initializeApp = async (userData) => {
        if(elements.menuUsername) elements.menuUsername.textContent = userData.username;
        await loadDataFromServer();
        if (userData.role === 'admin') {
            if (elements.menuAdminBtn) elements.menuAdminBtn.style.display = 'flex';
        }
        await loadActiveList();
        attachAllEventListeners();
    };
    
    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const response = await fetch('/api/auth/verify', { method: 'GET', headers: { 'x-auth-token': token } });
            if (response.ok) showApp(await response.json());
            else localStorage.removeItem('token');
        } catch (error) { console.error('Błąd weryfikacji tokenu:', error); }
    };
    
    async function attemptLogin() {
        try {
            const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: elements.loginUsername.value, password: elements.loginPassword.value }) });
            const data = await response.json();
            if (!response.ok) { elements.loginError.textContent = data.msg || 'Wystąpił błąd'; return; }
            localStorage.setItem('token', data.token);
            showApp(data.user);
        } catch (error) { elements.loginError.textContent = 'Nie można połączyć się z serwerem.'; }
    }

    async function handleRegistration() {
        const { registerUsername, registerPassword, registerError, showLogin, loginUsername } = elements;
        const username = registerUsername.value.trim();
        const password = registerPassword.value.trim();
        if (!username || !password) { registerError.textContent = 'Login i hasło są wymagane.'; return; }
        try {
            const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const data = await response.json();
            if (!response.ok) { registerError.textContent = data.msg || 'Wystąpił błąd serwera.'; } 
            else { alert('Rejestracja pomyślna! Konto oczekuje na aktywację.'); showLogin.click(); loginUsername.value = username; elements.loginPassword.value = ''; }
        } catch (error) { registerError.textContent = 'Nie można połączyć się z serwerem.'; }
    }

    // =================================================================
    // GŁÓWNA FUNKCJA PODPINANIA LISTENERÓW
    // =================================================================
    function attachAllEventListeners() {
        if (elements.loginBtn) elements.loginBtn.addEventListener('click', attemptLogin);
        if (elements.loginPassword) elements.loginPassword.addEventListener('keydown', (event) => { if (event.key === 'Enter') attemptLogin(); });
        if (elements.registerBtn) elements.registerBtn.addEventListener('click', handleRegistration);
        if (elements.showRegister) elements.showRegister.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'none'; elements.registerForm.style.display = 'block'; });
        if (elements.showLogin) elements.showLogin.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'block'; elements.registerForm.style.display = 'none'; });
        if(elements.tabLookupBtn) elements.tabLookupBtn.addEventListener('click', () => switchTab('lookup'));
        if(elements.tabListBuilderBtn) elements.tabListBuilderBtn.addEventListener('click', () => switchTab('listBuilder'));
        if (elements.menuToggleBtn) elements.menuToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); elements.dropdownMenu.classList.toggle('show'); });
        window.addEventListener('click', () => { if (elements.dropdownMenu.classList.contains('show')) elements.dropdownMenu.classList.remove('show'); });
        if (elements.menuAdminBtn) elements.menuAdminBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab('admin'); loadAllUsers(); });
        if (elements.menuInventoryBtn) elements.menuInventoryBtn.addEventListener('click', (e) => { e.preventDefault(); elements.inventoryModule.style.display = 'flex'; });
        if (elements.menuLogoutBtn) elements.menuLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.clear(); location.reload(); });
        if (elements.menuChangePassword) elements.menuChangePassword.addEventListener('click', (e) => { e.preventDefault(); handleChangePassword(); });
        if (elements.menuSavedLists) elements.menuSavedLists.addEventListener('click', (e) => { e.preventDefault(); showSavedLists(); });
        if (elements.scrollTopBtn) elements.scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0 }));
        if (elements.scrollBottomBtn) elements.scrollBottomBtn.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight }));
        if (elements.darkModeToggle) elements.darkModeToggle.addEventListener('click', () => setDarkMode(!document.body.classList.contains('dark-mode')));
        if(elements.listBarcodeInput) elements.listBarcodeInput.addEventListener('input', handleListBuilderSearch);
        if(elements.listBuilderSearchResults) elements.listBuilderSearchResults.addEventListener('click', (event) => { const targetLi = event.target.closest('li'); if (targetLi?.dataset.ean) { addProductToList(targetLi.dataset.ean); } });
        if(elements.addToListBtn) elements.addToListBtn.addEventListener('click', () => addProductToList());
        if(elements.lookupBarcodeInput) elements.lookupBarcodeInput.addEventListener('input', handleLookupSearch);
        if(elements.lookupResultList) elements.lookupResultList.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li?.dataset.productJson) { displaySingleProductInLookup(JSON.parse(li.dataset.productJson)); }});
        if (elements.printListBtn) elements.printListBtn.addEventListener('click', () => { prepareForPrint(); window.print(); });
        if (elements.clearListBtn) elements.clearListBtn.addEventListener('click', () => clearCurrentList(true));
        if (elements.saveListBtn) elements.saveListBtn.addEventListener('click', saveCurrentList);
        if (elements.newListBtn) elements.newListBtn.addEventListener('click', async () => { if (scannedItems.length > 0) { if (confirm("Czy chcesz zapisać bieżące zamówienie przed utworzeniem nowego?")) { await saveCurrentList(); } } clearCurrentList(false); });
        if(elements.importCsvBtn) elements.importCsvBtn.addEventListener('click', () => elements.importCsvInput.click());
        if(elements.importCsvInput) elements.importCsvInput.addEventListener('change', handleFileImport);
        if(elements.allUsersList) elements.allUsersList.addEventListener('click', handleAdminAction);
        if (elements.closeInventoryModalBtn) elements.closeInventoryModalBtn.addEventListener('click', () => { elements.inventoryModule.style.display = 'none'; });
        if(elements.inventoryAddBtn) elements.inventoryAddBtn.addEventListener('click', handleInventoryAdd);
        if(elements.inventoryEanInput) elements.inventoryEanInput.addEventListener('input', handleInventorySearch);
        if(elements.inventorySearchResults) elements.inventorySearchResults.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li?.dataset.ean) { elements.inventoryEanInput.value = li.dataset.ean; elements.inventorySearchResults.style.display = 'none'; }});
        if(elements.inventoryListBody) elements.inventoryListBody.addEventListener('click', handleDeleteInventoryItem);
        if (elements.closeSavedListsModalBtn) elements.closeSavedListsModalBtn.addEventListener('click', () => { elements.savedListsModal.style.display = 'none'; });
        if (elements.savedListsContainer) elements.savedListsContainer.addEventListener('click', handleSavedListAction);
        if (elements.closePickingModalBtn) elements.closePickingModalBtn.addEventListener('click', () => { elements.pickingModule.style.display = 'none'; });
        if (elements.pickingEanInput) elements.pickingEanInput.addEventListener('input', handlePickingSearch);
        if (elements.pickingSearchResults) elements.pickingSearchResults.addEventListener('click', e => { const li = e.target.closest('li'); if(li?.dataset.ean) { pickItemFromList(li.dataset.ean); } });
        if (elements.pickingTargetList) elements.pickingTargetList.addEventListener('click', e => { const itemDiv = e.target.closest('.pick-item'); if(itemDiv?.dataset.ean) { pickItemFromList(itemDiv.dataset.ean); } });
        if (elements.pickingScannedList) elements.pickingScannedList.addEventListener('click', handlePickedItemClick);
        if (elements.pickingVerifyBtn) elements.pickingVerifyBtn.addEventListener('click', verifyPicking);
        if (elements.closePickingSummaryModalBtn) elements.closePickingSummaryModalBtn.addEventListener('click', () => elements.pickingSummaryModal.style.display = 'none');
        if (elements.pickingAcceptBtn) elements.pickingAcceptBtn.addEventListener('click', () => { elements.pickingSummaryModal.style.display = 'none'; showToast('Zmiany zaakceptowane.'); });
        if (elements.pickingExportCsvBtn) elements.pickingExportCsvBtn.addEventListener('click', exportPickedToCsv);
        attachNumpadListeners();
    }
    
    // ... reszta funkcji ...
    async function loadDataFromServer() {
        console.log('Ładowanie bazy produktów...');
        function fetchAndParseCsv(filename) { return fetch(filename).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`Błąd sieci: ${r.statusText}`))).then(b => new TextDecoder("Windows-1250").decode(b)).then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: rts => res(rts.data), error: e => rej(e) }))); }
        await Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')])
            .then(([data1, data2]) => {
                const mapData = p => ({ kod_kreskowy: String(p.kod_kreskowy || "").trim(), nazwa_produktu: String(p.nazwa_produktu || "").trim(), cena: String(p.opis || "0").replace(',', '.').trim() || "0", opis: String(p.cena || "").trim() });
                productDatabase = [...data1.map(mapData), ...data2.map(mapData)];
                console.log(`Baza danych załadowana (${productDatabase.length} pozycji).`);
            }).catch(error => { console.error('Krytyczny błąd ładowania danych:', error); alert('BŁĄD: Nie udało się załadować bazy produktów.'); });
    }

    function switchTab(newTab) {
        activeTab = newTab;
        [elements.lookupMode, elements.listBuilderMode, elements.adminPanel].forEach(el => el.classList.remove('active'));
        [elements.tabLookupBtn, elements.tabListBuilderBtn].forEach(el => el.classList.remove('active'));
        if (newTab === 'lookup') { elements.lookupMode.classList.add('active'); elements.tabLookupBtn.classList.add('active'); } 
        else if (newTab === 'listBuilder') { elements.listBuilderMode.classList.add('active'); elements.tabListBuilderBtn.classList.add('active'); } 
        else if (newTab === 'admin') { elements.adminPanel.classList.add('active'); }
    }
    
    function setDarkMode(isDark) { const iconElement = elements.darkModeToggle.querySelector('i'); if (isDark) { document.body.classList.add('dark-mode'); iconElement.classList.replace('fa-moon', 'fa-sun'); localStorage.setItem('theme', 'dark'); } else { document.body.classList.remove('dark-mode'); iconElement.classList.replace('fa-sun', 'fa-moon'); localStorage.setItem('theme', 'light'); } }
    
    function performSearch(searchTerm) { if (!searchTerm) return []; const term = searchTerm.toLowerCase(); return productDatabase.filter(p => (p.kod_kreskowy?.toLowerCase().includes(term)) || (p.nazwa_produktu?.toLowerCase().includes(term)) || (p.opis?.toLowerCase().includes(term))); }
    
    function showToast(message) { const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; elements.toastContainer.appendChild(toast); setTimeout(() => { toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, 3000); }, 10); }

    function addProductToList(code = null, quantity = null) {
        const ean = code || elements.listBarcodeInput.value.trim();
        const qty = quantity || parseInt(elements.quantityInput.value, 10);
        if (!ean || isNaN(qty) || qty < 1) return alert("Podaj kod/EAN i prawidłową ilość.");
        let productData = productDatabase.find(p => p.kod_kreskowy === ean || p.nazwa_produktu === ean);
        if (!productData) productData = { kod_kreskowy: ean, nazwa_produktu: ean, opis: ean, cena: "0" };
        const existingItem = scannedItems.find(item => item.ean === productData.kod_kreskowy);
        if (existingItem) existingItem.quantity += qty;
        else scannedItems.push({ ean: productData.kod_kreskowy, name: productData.nazwa_produktu, description: productData.opis, quantity: qty, price: productData.cena });
        renderScannedList();
        showToast(`Dodano: ${productData.nazwa_produktu} (Ilość: ${qty})`);
        elements.listBarcodeInput.value = '';
        elements.quantityInput.value = '1';
        elements.listBuilderSearchResults.innerHTML = '';
        elements.listBuilderSearchResults.style.display = 'none';
        elements.listBarcodeInput.focus();
    }
    
    function handleListBuilderSearch(event) {
        const searchTerm = event.target.value.trim();
        elements.listBuilderSearchResults.style.display = 'none';
        if (!searchTerm) return;
        const results = performSearch(searchTerm);
        if (results.length > 0) {
            let listHtml = '<ul>';
            results.forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.opis} <small>(${p.nazwa_produktu})</small></li>`; });
            listHtml += `<li class="add-unknown-item" data-ean="${searchTerm}"><i class="fa fa-plus"></i> Dodaj "${searchTerm}" jako nową pozycję</li>`;
            listHtml += '</ul>';
            elements.listBuilderSearchResults.innerHTML = listHtml;
            elements.listBuilderSearchResults.style.display = 'block';
        }
    }
    
    function handleLookupSearch(event) {
        const searchTerm = event.target.value.trim();
        elements.lookupResultList.innerHTML = '';
        elements.lookupResultList.style.display = 'none';
        elements.lookupResultSingle.innerHTML = '';
        if (!searchTerm) return;
        const results = performSearch(searchTerm);
        if (results.length === 1) {
            displaySingleProductInLookup(results[0]);
        } else if (results.length > 1) {
            displayProductListInLookup(results);
        } else {
            elements.lookupResultSingle.innerHTML = '<p style="padding: 15px;">Nie znaleziono produktu.</p>';
            elements.lookupResultSingle.style.display = 'block';
        }
    }
    
    function displaySingleProductInLookup(product) {
        let html = `<div class="lookup-result-item"><h2>${product.opis}</h2><div><strong>Kod produktu:</strong> <span>${product.nazwa_produktu}</span></div><div><strong>Kod EAN:</strong> <span>${product.kod_kreskowy}</span></div><div><strong>Cena:</strong> <span style="font-weight: bold; color: var(--success-color);">${parseFloat(product.cena).toFixed(2)} PLN</span></div></div>`;
        elements.lookupResultSingle.innerHTML = html;
        elements.lookupResultList.style.display = 'none';
    }

    function displayProductListInLookup(products) {
        let listHtml = '<ul>';
        products.forEach(p => { listHtml += `<li data-product-json='${JSON.stringify(p)}'>${p.opis} <small>(${p.nazwa_produktu})</small></li>`; });
        listHtml += '</ul>';
        elements.lookupResultList.innerHTML = listHtml;
        elements.lookupResultList.style.display = 'block';
        elements.lookupResultSingle.style.display = 'none';
    }
    
    function renderScannedList() {
        elements.scannedListBody.innerHTML = '';
        const canOperate = scannedItems.length > 0;
        [elements.exportCsvBtn, elements.exportExcelBtn, elements.printListBtn, elements.clearListBtn, elements.saveListBtn].forEach(btn => { if(btn) btn.disabled = !canOperate; });
        scannedItems.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="col-code">${item.name}</td><td class="col-desc">${item.description}</td><td class="col-ean">${item.ean}</td><td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}" readonly></td><td><button class="delete-btn btn-icon" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>`;
            elements.scannedListBody.appendChild(row);
        });
        const totalValue = scannedItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0);
        elements.totalOrderValue.textContent = `Total: ${totalValue.toFixed(2)} PLN`;
    }
    
    function getSafeFilename() { const clientName = elements.clientNameInput.value.trim().replace(/[<>:"/\\|?* ]+/g, '_') || 'zamowienie'; const date = new Date().toISOString().slice(0, 10); return `${clientName}_${date}`; }
    function exportToCsvOptima() { if (scannedItems.length === 0) return; const csvContent = scannedItems.map(item => `${item.ean};${item.quantity}`).join('\n'); downloadFile(csvContent, 'text/csv;charset=utf-8;', `${getSafeFilename()}_optima.csv`); }
    function exportToExcelDetailed() { if (scannedItems.length === 0) return; const headers = '"Kod produktu";"Nazwa";"EAN";"Ilość";"Cena Jednostkowa"'; const rows = scannedItems.map(item => { const priceFormatted = (parseFloat(item.price) || 0).toFixed(2).replace('.', ','); return `"${item.name || ''}";"${(item.description || '').replace(/"/g, '""')}";"${item.ean || ''}";"${item.quantity || 0}";"${priceFormatted}"`; }); const csvContent = `\uFEFF${headers}\n${rows.join('\n')}`; downloadFile(csvContent, 'text/csv;charset=utf-8;', `${getSafeFilename()}_szczegoly.csv`); }
    function downloadFile(content, mimeType, filename) { const blob = new Blob([content], { type: mimeType }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    
    function prepareForPrint() {
        if (!elements.printTableBody) return;
        elements.printTableBody.innerHTML = '';
        if (scannedItems.length === 0) return;
        elements.printClientName.textContent = `Klient: ${elements.clientNameInput.value.trim() || 'Nie podano'}`;
        elements.printAdditionalInfo.textContent = `Info: ${elements.additionalInfoInput.value.trim() || 'Brak'}`;
        scannedItems.forEach(item => {
            const row = elements.printTableBody.insertRow();
            row.insertCell().textContent = item.name || '';
            row.insertCell().textContent = item.description || '';
            row.insertCell().textContent = item.quantity;
        });
    }
    
    function clearCurrentList(askConfirm = true) {
        if (askConfirm && scannedItems.length > 0 && !confirm('Czy na pewno chcesz wyczyścić bieżące zamówienie? Ta operacja usunie również aktywną, zapamiętaną listę.')) { return; }
        scannedItems = [];
        elements.clientNameInput.value = '';
        elements.additionalInfoInput.value = '';
        localStorage.removeItem('activeListId');
        renderScannedList();
        showToast("Utworzono nową, czystą listę.");
    }
    
    async function saveCurrentList() {
        const listName = prompt("Podaj nazwę dla zapisywanego zamówienia:", elements.clientNameInput.value || `Zamówienie ${getSafeFilename()}`);
        if (!listName) return null;
        try {
            const response = await fetch('/api/data/savelist', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ listName, items: scannedItems, clientName: elements.clientNameInput.value }) });
            if (!response.ok) { const errData = await response.json(); throw new Error(errData.msg || "Błąd zapisu"); }
            const savedList = await response.json();
            showToast(`Zamówienie "${listName}" zostało zapisane.`);
            localStorage.setItem('activeListId', savedList._id);
            return savedList;
        } catch (error) { alert(`Błąd: ${error.message}`); return null; }
    }
    
    async function loadListById(listId) {
        try {
            const response = await fetch(`/api/data/list/${listId}`, { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) throw new Error("Błąd wczytywania listy");
            const data = await response.json();
            scannedItems = data.items;
            elements.clientNameInput.value = data.clientName || data.listName;
            renderScannedList();
            localStorage.setItem('activeListId', listId);
            return data;
        } catch (error) { alert(error.message); localStorage.removeItem('activeListId'); return null; }
    }
    
    async function loadActiveList() {
        const activeListId = localStorage.getItem('activeListId');
        if (activeListId) { showToast("Wczytuję ostatnio aktywną listę..."); await loadListById(activeListId); }
    }

    async function showSavedLists() {
        elements.savedListsModal.style.display = 'flex';
        const container = elements.savedListsContainer;
        container.innerHTML = '<p>Ładowanie...</p>';
        try {
            const response = await fetch('/api/data/lists', { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) throw new Error("Błąd wczytywania list");
            const lists = await response.json();
            container.innerHTML = `<div style="padding-bottom: 15px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                                     <button id="importCsvBtn" class="btn btn-primary" style="background-color: var(--info-color); width: 100%;">
                                         <i class="fa-solid fa-file-import"></i> Importuj zamówienie z pliku CSV
                                     </button>
                                     <input type="file" id="importCsvInput" accept=".csv" style="display: none;">
                                   </div><h3>Zapisane listy:</h3>`;
            
            container.querySelector('#importCsvBtn').addEventListener('click', () => container.querySelector('#importCsvInput').click());
            container.querySelector('#importCsvInput').addEventListener('change', handleFileImport);

            if (lists.length === 0) { container.innerHTML += '<p>Brak zapisanych zamówień.</p>'; return; }
            const listContainer = document.createElement('ul');
            listContainer.style.cssText = 'list-style: none; padding: 0;';
            lists.forEach(list => {
                const li = document.createElement('li');
                li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border-color); flex-wrap: wrap; gap: 10px;';
                li.innerHTML = `<span>${list.listName} <small>(autor: ${list.user?.username || 'usunięty'}, ost. zapis: ${new Date(list.updatedAt).toLocaleDateString()})</small></span>
                                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                    <button class="btn-primary load-list-btn" data-id="${list._id}">Wczytaj</button>
                                    <button class="pick-order-btn" data-id="${list._id}" data-name="${list.listName}" style="background-color: var(--warning-color);">Kompletuj</button>
                                    <button class="btn-danger delete-list-btn" data-id="${list._id}">Usuń</button>
                                </div>`;
                listContainer.appendChild(li);
            });
            container.appendChild(listContainer);
        } catch (error) { container.innerHTML = `<p style="color:var(--danger-color)">${error.message}</p>`; }
    }
    
    async function handleSavedListAction(e) {
        const target = e.target.closest('button');
        if (!target) return;
        const listId = target.dataset.id;
        if (target.classList.contains('load-list-btn')) {
            if (!confirm("Czy na pewno wczytać listę? Obecne zamówienie zostanie nadpisane.")) return;
            const loadedList = await loadListById(listId);
            if (loadedList) { elements.savedListsModal.style.display = 'none'; showToast(`Wczytano listę: ${loadedList.listName}`); }
        } else if (target.classList.contains('delete-list-btn')) {
            if (!confirm("Czy na pewno usunąć tę listę?")) return;
            try {
                const response = await fetch(`/api/data/list/${listId}`, { method: 'DELETE', headers: { 'x-auth-token': localStorage.getItem('token') } });
                const data = await response.json();
                if (!response.ok) throw new Error(data.msg || "Błąd usuwania listy");
                showToast("Lista usunięta.");
                await showSavedLists();
            } catch (error) { alert(error.message); }
        } else if (target.classList.contains('pick-order-btn')) {
             elements.savedListsModal.style.display = 'none';
             await startPicking(listId, target.dataset.name);
        }
    }

    async function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const listName = prompt("Podaj nazwę dla importowanego zamówienia:", file.name.replace(/\.csv$/i, ''));
        if (!listName) { event.target.value = ''; return; }
        Papa.parse(file, {
            delimiter: ";", skipEmptyLines: true,
            complete: async (results) => {
                const itemsMap = new Map();
                results.data.forEach(row => {
                    const ean = row[0]?.trim();
                    const quantity = parseInt(row[1]?.trim(), 10);
                    if (ean && !isNaN(quantity) && quantity > 0) itemsMap.set(ean, (itemsMap.get(ean) || 0) + quantity);
                });
                const importedItems = Array.from(itemsMap, ([ean, quantity]) => {
                    let p = productDatabase.find(prod => prod.kod_kreskowy === ean || prod.nazwa_produktu === ean);
                    if (!p) p = { kod_kreskowy: ean, nazwa_produktu: ean, opis: ean, cena: "0" };
                    return { ean: p.kod_kreskowy, name: p.nazwa_produktu, description: p.opis, quantity, price: p.cena };
                });
                try {
                    const response = await fetch('/api/data/savelist', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ listName, items: importedItems, clientName: listName }) });
                    if (!response.ok) { const errData = await response.json(); throw new Error(errData.msg || "Błąd zapisu"); }
                    showToast(`Zamówienie "${listName}" zostało zaimportowane i zapisane.`);
                    await showSavedLists();
                } catch (error) { alert(`Błąd: ${error.message}`); }
            },
            error: (err) => { alert(`Błąd parsowania pliku CSV: ${err.message}`); }
        });
        event.target.value = '';
    }
    
    async function loadAllUsers() { /*... kod z poprzedniej odpowiedzi ...*/ }
    async function handleUserAction(url, options, successMsg) { /*... kod z poprzedniej odpowiedzi ...*/ }
    async function handleChangePassword() { /*... kod z poprzedniej odpowiedzi ...*/ }
    
    // ... (reszta kodu jest w następnym bloku)
});
