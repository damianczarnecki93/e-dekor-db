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
        topBar: document.getElementById('topBar'),
        bottomBar: document.getElementById('bottomBar'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        quickSearchBtn: document.getElementById('quickSearchBtn'),
        menuToggleBtn: document.getElementById('menuToggleBtn'),
        dropdownMenu: document.getElementById('dropdownMenu'),
        menuUsername: document.getElementById('menuUsername'),
        menuAdminBtn: document.getElementById('menuAdminBtn'),
        menuListBuilderBtn: document.getElementById('menuListBuilderBtn'),
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
        allUsersList: document.getElementById('allUsersList'),
        inventoryEanInput: document.getElementById('inventoryEanInput'),
        inventoryQuantityInput: document.getElementById('inventoryQuantityInput'),
        inventoryAddBtn: document.getElementById('inventoryAddBtn'),
        inventoryListBody: document.getElementById('inventoryListBody'),
        inventorySearchResults: document.getElementById('inventorySearchResults'),
        savedListsModal: document.getElementById('savedListsModal'),
        closeSavedListsModalBtn: document.getElementById('closeSavedListsModalBtn'),
        savedListsContainer: document.getElementById('savedListsContainer'),
        pickingModule: document.getElementById('pickingModule'),
        closePickingModalBtn: document.getElementById('closePickingModalBtn'),
        pickingOrderName: document.getElementById('picking-order-name'),
        pickingEanInput: document.getElementById('picking-ean-input'),
        pickingSearchResults: document.getElementById('picking-search-results'),
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
        uploadProduktyCsv: document.getElementById('uploadProduktyCsv'),
        produktyCsvUpload: document.getElementById('produktyCsvUpload'),
        uploadProdukty2Csv: document.getElementById('uploadProdukty2Csv'),
        produkty2CsvUpload: document.getElementById('produkty2CsvUpload'),
    };

    let productDatabase = [], scannedItems = [], inventoryItems = [];
    let currentPickingOrder = null;
    let pickedItems = [];

    const showApp = (userData) => {
        elements.loginOverlay.style.display = 'none';
        elements.appContainer.style.display = 'block';
        if (elements.topBar) elements.topBar.style.display = 'flex';
        if (elements.bottomBar) elements.bottomBar.style.display = 'flex';
        initializeApp(userData);
    };

    const initializeApp = async (userData) => {
        if (!userData) { console.error("initializeApp: Otrzymano nieprawidłowe dane użytkownika."); localStorage.clear(); location.reload(); return; }
        if(elements.menuUsername) elements.menuUsername.textContent = userData.username;
        await loadDataFromServer();
        if (userData.role === 'admin') { if (elements.menuAdminBtn) elements.menuAdminBtn.style.display = 'flex'; }
        await loadActiveList();
        attachAllEventListeners(); 
        switchTab('listBuilder');
    };
    
    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) { attachLoginListeners(); return; }
        try {
            const response = await fetch('/api/auth/verify', { method: 'GET', headers: { 'x-auth-token': token } });
            const userData = await response.json();
            if (response.ok) { showApp(userData); } else { localStorage.removeItem('token'); attachLoginListeners(); }
        } catch (error) { console.error('Błąd weryfikacji tokenu:', error); attachLoginListeners(); }
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
    
    function attachLoginListeners() {
        if (elements.loginBtn) elements.loginBtn.addEventListener('click', attemptLogin);
        if (elements.loginPassword) elements.loginPassword.addEventListener('keydown', (event) => { if (event.key === 'Enter') attemptLogin(); });
        if (elements.registerBtn) elements.registerBtn.addEventListener('click', handleRegistration);
        if (elements.showRegister) elements.showRegister.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'none'; elements.registerForm.style.display = 'block'; });
        if (elements.showLogin) elements.showLogin.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'block'; elements.registerForm.style.display = 'none'; });
    }

    function attachAllEventListeners() {
        attachLoginListeners();
        
        if (elements.menuListBuilderBtn) elements.menuListBuilderBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab('listBuilder'); });
        if (elements.menuToggleBtn) elements.menuToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); elements.dropdownMenu.classList.toggle('show'); });
        window.addEventListener('click', () => { if (elements.dropdownMenu && elements.dropdownMenu.classList.contains('show')) elements.dropdownMenu.classList.remove('show'); });
        
        if (elements.menuAdminBtn) elements.menuAdminBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab('admin'); });
        if (elements.menuInventoryBtn) elements.menuInventoryBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab('inventory'); });
        if (elements.menuLogoutBtn) elements.menuLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.clear(); location.reload(); });
        if (elements.menuChangePassword) elements.menuChangePassword.addEventListener('click', (e) => { e.preventDefault(); handleChangePassword(); });
        if (elements.menuSavedLists) elements.menuSavedLists.addEventListener('click', (e) => { e.preventDefault(); showSavedLists(); });
        if (elements.scrollTopBtn) elements.scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        if (elements.scrollBottomBtn) elements.scrollBottomBtn.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
        
        if (elements.darkModeToggle) elements.darkModeToggle.addEventListener('click', () => setDarkMode(!document.body.classList.contains('dark-mode')));
        
        if(elements.listBarcodeInput) elements.listBarcodeInput.addEventListener('input', handleListBuilderSearch);
        if(elements.listBuilderSearchResults) elements.listBuilderSearchResults.addEventListener('click', (event) => { const targetLi = event.target.closest('li'); if (targetLi?.dataset.ean) { addProductToList(targetLi.dataset.ean); } });
        if(elements.addToListBtn) elements.addToListBtn.addEventListener('click', () => addProductToList(elements.listBarcodeInput.value));
        if(elements.scannedListBody) elements.scannedListBody.addEventListener('click', (e) => { if(e.target.closest('.delete-btn')) { const index = e.target.closest('.delete-btn').dataset.index; scannedItems.splice(index, 1); renderScannedList(); }});
        
        if(elements.quickSearchBtn) elements.quickSearchBtn.addEventListener('click', () => { elements.quickSearchModal.style.display = 'flex'; elements.lookupBarcodeInput.focus(); });
        if(elements.closeQuickSearchModalBtn) elements.closeQuickSearchModalBtn.addEventListener('click', () => { elements.quickSearchModal.style.display = 'none'; });
        if(elements.lookupBarcodeInput) elements.lookupBarcodeInput.addEventListener('input', handleLookupSearch);
        if(elements.lookupResultList) elements.lookupResultList.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li?.dataset.productJson) { displaySingleProductInLookup(JSON.parse(li.dataset.productJson)); }});
        
        if (elements.printListBtn) elements.printListBtn.addEventListener('click', () => { prepareForPrint(); window.print(); });
        if (elements.clearListBtn) elements.clearListBtn.addEventListener('click', () => clearCurrentList(true));
        if (elements.saveListBtn) elements.saveListBtn.addEventListener('click', saveCurrentList);
        if (elements.newListBtn) elements.newListBtn.addEventListener('click', async () => { if (scannedItems.length > 0) { await saveCurrentList(); } clearCurrentList(false); });
        
        const importBtnInModal = document.getElementById('importCsvBtn');
        const importInputInModal = document.getElementById('importCsvInput');
        if(importBtnInModal) importBtnInModal.addEventListener('click', () => importInputInModal.click());
        if(importInputInModal) importInputInModal.addEventListener('change', handleFileImport);
        
        if(elements.allUsersList) elements.allUsersList.addEventListener('click', handleAdminAction);
        if(elements.uploadProduktyCsv) elements.uploadProduktyCsv.addEventListener('click', () => uploadProductFile('produkty.csv', elements.produktyCsvUpload));
        if(elements.uploadProdukty2Csv) elements.uploadProdukty2Csv.addEventListener('click', () => uploadProductFile('produkty2.csv', elements.produkty2CsvUpload));
        
        if(elements.inventoryAddBtn) elements.inventoryAddBtn.addEventListener('click', handleInventoryAdd);
        if(elements.inventoryEanInput) elements.inventoryEanInput.addEventListener('input', handleInventorySearch);
        if(elements.inventorySearchResults) elements.inventorySearchResults.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li?.dataset.ean) { elements.inventoryEanInput.value = li.dataset.ean; elements.inventorySearchResults.innerHTML = ''; elements.inventorySearchResults.style.display = 'none'; }});
        if(elements.inventoryListBody) elements.inventoryListBody.addEventListener('click', handleDeleteInventoryItem);
        
        if (elements.closeSavedListsModalBtn) elements.closeSavedListsModalBtn.addEventListener('click', () => { elements.savedListsModal.style.display = 'none'; });
        if (elements.savedListsContainer) elements.savedListsContainer.addEventListener('click', handleSavedListAction);

        if (elements.closePickingModalBtn) elements.closePickingModalBtn.addEventListener('click', () => { elements.pickingModule.style.display = 'none'; });
        if (elements.pickingEanInput) elements.pickingEanInput.addEventListener('input', handlePickingSearch);
        if (elements.pickingSearchResults) elements.pickingSearchResults.addEventListener('click', e => { const li = e.target.closest('li'); if(li?.dataset.ean) { pickItemFromList(li.dataset.ean); elements.pickingEanInput.value = ''; elements.pickingSearchResults.style.display = 'none'; } });
        if (elements.pickingTargetList) elements.pickingTargetList.addEventListener('click', e => { const itemDiv = e.target.closest('.pick-item'); if(itemDiv?.dataset.ean) { pickItemFromList(itemDiv.dataset.ean); } });
        if (elements.pickingScannedList) elements.pickingScannedList.addEventListener('click', handlePickedItemClick);
        if (elements.pickingVerifyBtn) elements.pickingVerifyBtn.addEventListener('click', verifyPicking);
        if (elements.closePickingSummaryModalBtn) elements.closePickingSummaryModalBtn.addEventListener('click', () => elements.pickingSummaryModal.style.display = 'none');
        if (elements.pickingAcceptBtn) elements.pickingAcceptBtn.addEventListener('click', () => { elements.pickingSummaryModal.style.display = 'none'; showToast('Zmiany zaakceptowane.', 'success'); });
        if (elements.pickingExportCsvBtn) elements.pickingExportCsvBtn.addEventListener('click', exportPickedToCsv);
    }
    
    async function loadDataFromServer() { function fetchAndParseCsv(filename) { return fetch(`${filename}?t=${new Date().getTime()}`).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`Błąd sieci: ${r.statusText}`))).then(b => new TextDecoder("Windows-1250").decode(b)).then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: rts => res(rts.data), error: e => rej(e) }))); } try { const [data1, data2] = await Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')]); const mapData = p => ({ kod_kreskowy: String(p.kod_kreskowy || "").trim(), nazwa_produktu: String(p.nazwa_produktu || "").trim(), cena: String(p.opis || "0").replace(',', '.').trim() || "0", opis: String(p.cena || "").trim() }); productDatabase = [...data1.map(mapData), ...data2.map(mapData)]; showToast("Baza produktów została zaktualizowana.", "success"); } catch (error) { console.error('Krytyczny błąd ładowania danych:', error); alert('BŁĄD: Nie udało się załadować bazy produktów.'); } }
    function switchTab(newTab) { if(elements.mainContent) elements.mainContent.style.display = 'none'; if(elements.adminPanel) elements.adminPanel.style.display = 'none'; if(elements.inventoryPage) elements.inventoryPage.style.display = 'none'; if (newTab === 'listBuilder') { if(elements.mainContent) elements.mainContent.style.display = 'block'; } else if (newTab === 'admin') { if(elements.adminPanel) { elements.adminPanel.style.display = 'block'; loadAllUsers(); } } else if (newTab === 'inventory') { if(elements.inventoryPage) elements.inventoryPage.style.display = 'block'; } }
    function setDarkMode(isDark) { const iconElement = elements.darkModeToggle.querySelector('i'); if (isDark) { document.body.classList.add('dark-mode'); iconElement.classList.replace('fa-moon', 'fa-sun'); localStorage.setItem('theme', 'dark'); } else { document.body.classList.remove('dark-mode'); iconElement.classList.replace('fa-sun', 'fa-moon'); localStorage.setItem('theme', 'light'); } }
    function performSearch(searchTerm) { if (!searchTerm) return []; const term = searchTerm.toLowerCase(); return productDatabase.filter(p => (p.kod_kreskowy?.toLowerCase().includes(term)) || (p.nazwa_produktu?.toLowerCase().includes(term)) || (p.opis?.toLowerCase().includes(term))); }
    function showToast(message, type = 'info') { const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; elements.toastContainer.appendChild(toast); setTimeout(() => { toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, 3000); }, 10); }
    function addProductToList(code = null, quantity = 1) { const ean = code || elements.listBarcodeInput.value.trim(); const qty = quantity || parseInt(elements.quantityInput.value, 10); if (!ean || isNaN(qty) || qty < 1) { return; } let productData = productDatabase.find(p => p.kod_kreskowy === ean || p.nazwa_produktu === ean); if (!productData) { productData = { kod_kreskowy: ean, nazwa_produktu: ean, opis: ean, cena: "0" }; } const existingItem = scannedItems.find(item => item.ean === productData.kod_kreskowy); if (existingItem) { existingItem.quantity += qty; } else { scannedItems.push({ ean: productData.kod_kreskowy, name: productData.nazwa_produktu, description: productData.opis, quantity: qty, price: productData.cena }); } renderScannedList(); showToast(`Dodano: ${productData.nazwa_produktu} (Ilość: ${qty})`); elements.listBarcodeInput.value = ''; elements.quantityInput.value = '1'; elements.listBuilderSearchResults.innerHTML = ''; elements.listBuilderSearchResults.style.display = 'none'; elements.listBarcodeInput.focus(); }
    function handleListBuilderSearch(event) { const searchTerm = event.target.value.trim(); elements.listBuilderSearchResults.style.display = 'none'; if (!searchTerm) return; const results = performSearch(searchTerm); if (results.length > 0) { let listHtml = '<ul>'; results.forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.opis} <small>(${p.nazwa_produktu})</small></li>`; }); listHtml += `<li class="add-unknown-item" data-ean="${searchTerm}"><i class="fa fa-plus"></i> Dodaj "${searchTerm}" jako nową pozycję</li>`; listHtml += '</ul>'; elements.listBuilderSearchResults.innerHTML = listHtml; elements.listBuilderSearchResults.style.display = 'block'; } }
    function handleLookupSearch(event) { const searchTerm = event.target.value.trim(); elements.lookupResultList.innerHTML = ''; elements.lookupResultList.style.display = 'none'; elements.lookupResultSingle.innerHTML = ''; if (!searchTerm) return; const results = performSearch(searchTerm); if (results.length === 1) { displaySingleProductInLookup(results[0]); } else if (results.length > 1) { displayProductListInLookup(results); } else { elements.lookupResultSingle.innerHTML = '<p style="padding: 15px;">Nie znaleziono produktu.</p>'; elements.lookupResultSingle.style.display = 'block'; } }
    function displaySingleProductInLookup(product) { let html = `<div class="lookup-result-item"><h2>${product.opis}</h2><div><strong>Kod produktu:</strong> <span>${product.nazwa_produktu}</span></div><div><strong>Kod EAN:</strong> <span>${product.kod_kreskowy}</span></div><div><strong>Cena:</strong> <span style="font-weight: bold; color: var(--success-color);">${parseFloat(product.cena).toFixed(2)} PLN</span></div></div>`; elements.lookupResultSingle.innerHTML = html; elements.lookupResultList.style.display = 'none'; }
    function displayProductListInLookup(products) { let listHtml = '<ul>'; products.forEach(p => { listHtml += `<li data-product-json='${JSON.stringify(p)}'>${p.opis} <small>(${p.nazwa_produktu})</small></li>`; }); listHtml += '</ul>'; elements.lookupResultList.innerHTML = listHtml; elements.lookupResultList.style.display = 'block'; elements.lookupResultSingle.style.display = 'none'; }
    function renderScannedList() { elements.scannedListBody.innerHTML = ''; const canOperate = scannedItems.length > 0; [elements.exportCsvBtn, elements.exportExcelBtn, elements.printListBtn, elements.clearListBtn, elements.saveListBtn].forEach(btn => { if(btn) btn.disabled = !canOperate; }); scannedItems.forEach((item, index) => { const row = document.createElement('tr'); row.innerHTML = `<td class="col-code">${item.name}</td><td class="col-desc">${item.description}</td><td class="col-ean">${item.ean}</td><td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}"></td><td><button class="delete-btn btn-icon" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>`; elements.scannedListBody.appendChild(row); }); const totalValue = scannedItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0); elements.totalOrderValue.textContent = `Total: ${totalValue.toFixed(2)} PLN`; }
    function getSafeFilename() { const clientName = elements.clientNameInput.value.trim().replace(/[<>:"/\\|?* ]+/g, '_') || 'zamowienie'; const date = new Date().toISOString().slice(0, 10); return `${clientName}_${date}`; }
    function exportToCsvOptima() { if (scannedItems.length === 0) return; const csvContent = scannedItems.map(item => `${item.ean};${item.quantity}`).join('\n'); downloadFile(csvContent, 'text/csv;charset=utf-8;', `${getSafeFilename()}_optima.csv`); }
    function exportToExcelDetailed() { if (scannedItems.length === 0) return; const headers = '"Kod produktu";"Nazwa";"EAN";"Ilość";"Cena Jednostkowa"'; const rows = scannedItems.map(item => { const priceFormatted = (parseFloat(item.price) || 0).toFixed(2).replace('.', ','); return `"${item.name || ''}";"${(item.description || '').replace(/"/g, '""')}";"${item.ean || ''}";"${item.quantity || 0}";"${priceFormatted}"`; }); const csvContent = `\uFEFF${headers}\n${rows.join('\n')}`; downloadFile(csvContent, 'text/csv;charset=utf-8;', `${getSafeFilename()}_szczegoly.csv`); }
    function downloadFile(content, mimeType, filename) { const blob = new Blob([content], { type: mimeType }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    function prepareForPrint() { if (!elements.printTableBody) return; elements.printTableBody.innerHTML = ''; if (scannedItems.length === 0) return; elements.printClientName.textContent = `Klient: ${elements.clientNameInput.value.trim() || 'Nie podano'}`; elements.printAdditionalInfo.textContent = `Info: ${elements.additionalInfoInput.value.trim() || 'Brak'}`; scannedItems.forEach(item => { const row = elements.printTableBody.insertRow(); row.insertCell().textContent = item.name || ''; row.insertCell().textContent = item.description || ''; row.insertCell().textContent = item.quantity; }); }
    function clearCurrentList(askConfirm = true) { if (askConfirm && scannedItems.length > 0 && !confirm('Czy na pewno chcesz wyczyścić bieżące zamówienie?')) { return; } scannedItems = []; elements.clientNameInput.value = ''; elements.additionalInfoInput.value = ''; localStorage.removeItem('activeListId'); renderScannedList(); showToast("Utworzono nową, czystą listę."); }
    async function saveCurrentList() { const listId = localStorage.getItem('activeListId'); const listName = listId ? null : prompt("Podaj nazwę dla zapisywanego zamówienia:", elements.clientNameInput.value || `Zamówienie ${getSafeFilename()}`); if (!listId && !listName) return null; try { const url = listId ? `/api/data/list/${listId}` : '/api/data/savelist'; const method = listId ? 'PUT' : 'POST'; const body = { items: scannedItems, clientName: elements.clientNameInput.value }; if (listName) body.listName = listName; const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify(body) }); if (!response.ok) { const errData = await response.json(); throw new Error(errData.msg || "Błąd zapisu"); } const savedList = await response.json(); showToast(`Zamówienie zostało zapisane.`); localStorage.setItem('activeListId', savedList._id); return savedList; } catch (error) { alert(`Błąd: ${error.message}`); return null; } }
    async function loadListById(listId) { try { if(scannedItems.length > 0 && localStorage.getItem('activeListId') !== listId) { await saveCurrentList(); } const response = await fetch(`/api/data/list/${listId}`, { headers: { 'x-auth-token': localStorage.getItem('token') } }); if (!response.ok) throw new Error("Błąd wczytywania listy"); const data = await response.json(); scannedItems = data.items; elements.clientNameInput.value = data.clientName || data.listName; renderScannedList(); localStorage.setItem('activeListId', listId); return data; } catch (error) { alert(error.message); localStorage.removeItem('activeListId'); return null; } }
    async function loadActiveList() { const activeListId = localStorage.getItem('activeListId'); if (activeListId) { showToast("Wczytuję ostatnio aktywną listę..."); await loadListById(activeListId); } }
    async function showSavedLists() { elements.savedListsModal.style.display = 'flex'; const container = elements.savedListsContainer; container.innerHTML = '<p>Ładowanie...</p>'; try { const response = await fetch('/api/data/lists', { headers: { 'x-auth-token': localStorage.getItem('token') } }); if (!response.ok) throw new Error("Błąd wczytywania list"); const lists = await response.json(); const importInputId = 'importCsvInputInModal'; container.innerHTML = `<div style="padding-bottom: 15px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color);"> <button id="importCsvBtnInModal" class="btn btn-primary" style="background-color: var(--info-color); width: 100%;"> <i class="fa-solid fa-file-import"></i> Importuj zamówienie z pliku CSV </button> <input type="file" id="${importInputId}" accept=".csv" style="display: none;"> </div><h3>Zapisane listy:</h3>`; container.querySelector('#importCsvBtnInModal').addEventListener('click', () => container.querySelector(`#${importInputId}`).click()); container.querySelector(`#${importInputId}`).addEventListener('change', handleFileImport); if (lists.length === 0) { container.innerHTML += '<p>Brak zapisanych zamówień.</p>'; return; } const listContainer = document.createElement('ul'); listContainer.style.cssText = 'list-style: none; padding: 0;'; lists.forEach(list => { const li = document.createElement('li'); li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border-color); flex-wrap: wrap; gap: 10px;'; li.innerHTML = `<span>${list.listName} <small>(autor: ${list.user?.username || 'usunięty'}, ost. zapis: ${new Date(list.updatedAt).toLocaleDateString()})</small></span> <div style="display: flex; gap: 5px; flex-wrap: wrap;"> <button class="btn-primary load-list-btn" data-id="${list._id}">Wczytaj</button> <button class="pick-order-btn" data-id="${list._id}" data-name="${list.listName}" style="background-color: var(--warning-color);">Kompletuj</button> <button class="btn-danger delete-list-btn" data-id="${list._id}">Usuń</button> </div>`; listContainer.appendChild(li); }); container.appendChild(listContainer); } catch (error) { container.innerHTML = `<p style="color:var(--danger-color)">${error.message}</p>`; } }
    async function handleSavedListAction(e) { const target = e.target.closest('button'); if (!target) return; const listId = target.dataset.id; if (target.classList.contains('load-list-btn')) { const loadedList = await loadListById(listId); if (loadedList) { elements.savedListsModal.style.display = 'none'; showToast(`Wczytano listę: ${loadedList.listName}`); switchTab('listBuilder'); } } else if (target.classList.contains('delete-list-btn')) { if (!confirm("Czy na pewno usunąć tę listę?")) return; try { const response = await fetch(`/api/data/list/${listId}`, { method: 'DELETE', headers: { 'x-auth-token': localStorage.getItem('token') } }); const data = await response.json(); if (!response.ok) throw new Error(data.msg || "Błąd usuwania listy"); showToast("Lista usunięta."); await showSavedLists(); } catch (error) { alert(error.message); } } else if (target.classList.contains('pick-order-btn')) { elements.savedListsModal.style.display = 'none'; await startPicking(listId, target.dataset.name); } }
    async function handleFileImport(event) { const file = event.target.files[0]; if (!file) return; const listName = prompt("Podaj nazwę dla importowanego zamówienia:", file.name.replace(/\.csv$/i, '')); if (!listName) { event.target.value = ''; return; } Papa.parse(file, { delimiter: ";", skipEmptyLines: true, complete: async (results) => { const itemsMap = new Map(); results.data.forEach(row => { const ean = row[0]?.trim(); const quantity = parseInt(row[1]?.trim(), 10); if (ean && !isNaN(quantity) && quantity > 0) { itemsMap.set(ean, (itemsMap.get(ean) || 0) + quantity); } }); const importedItems = Array.from(itemsMap, ([ean, quantity]) => { let p = productDatabase.find(prod => prod.kod_kreskowy === ean || prod.nazwa_produktu === ean); if (!p) { p = { kod_kreskowy: ean, nazwa_produktu: ean, opis: ean, cena: "0" }; } return { ean: p.kod_kreskowy, name: p.nazwa_produktu, description: p.opis, quantity, price: p.cena }; }); try { const response = await fetch('/api/data/savelist', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ listName, items: importedItems, clientName: listName }) }); const savedList = await response.json(); if (!response.ok) throw new Error(savedList.msg || "Błąd zapisu na serwerze"); scannedItems = savedList.items; elements.clientNameInput.value = savedList.clientName || savedList.listName; renderScannedList(); showToast(`Zamówienie "${listName}" zostało zaimportowane.`); elements.savedListsModal.style.display = 'none'; switchTab('listBuilder'); } catch (error) { alert(`Błąd: ${error.message}`); } }, error: (err) => { alert(`Błąd parsowania pliku CSV: ${err.message}`); } }); event.target.value = ''; }
    async function loadAllUsers() { try { const response = await fetch('/api/admin/users', { headers: { 'x-auth-token': localStorage.getItem('token') } }); if (!response.ok) { throw new Error('Nie można załadować użytkowników'); } const users = await response.json(); elements.allUsersList.innerHTML = users.map(user => ` <div class="user-item"> <div class="user-info"> <strong>${user.username}</strong> <span class="status">Rola: ${user.role} | Status: ${user.isApproved ? 'Zatwierdzony' : 'Oczekujący'}</span> </div> <div class="user-actions"> ${!user.isApproved ? `<button class="approve-user-btn btn-primary" data-userid="${user._id}" data-username="${user.username}">Zatwierdź</button>` : ''} <button class="edit-user-btn" data-userid="${user._id}" data-username="${user.username}">Zmień hasło</button> <button class="change-role-btn" data-userid="${user._id}" data-username="${user.username}" data-role="${user.role === 'admin' ? 'user' : 'admin'}">Zmień na ${user.role === 'admin' ? 'User' : 'Admin'}</button> <button class="delete-user-btn btn-danger" data-userid="${user._id}" data-username="${user.username}">Usuń</button> </div> </div> `).join(''); } catch (error) { elements.allUsersList.innerHTML = `<p style="color:red;">${error.message}</p>`; } }
    async function handleUserAction(url, options) { try { const response = await fetch(url, options); const data = await response.json(); if (!response.ok) throw new Error(data.msg || 'Błąd operacji'); showToast(data.msg || 'Operacja zakończona sukcesem!'); await loadAllUsers(); } catch (error) { alert(`Błąd: ${error.message}`); } }
    async function handleChangePassword() { const newPassword = prompt("Wprowadź nowe hasło:"); if (!newPassword) return; try { const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ newPassword }) }); const data = await response.json(); if (!response.ok) throw new Error(data.msg || "Błąd zmiany hasła"); alert("Hasło zostało pomyślnie zmienione."); } catch (error) { alert(`Błąd: ${error.message}`); } }
    function handleAdminAction(e) { const target = e.target.closest('button'); if (!target) return; const { userid, username, role } = target.dataset; if (target.classList.contains('approve-user-btn')) handleUserAction(`/api/admin/approve-user/${userid}`, { method: 'POST', headers: { 'x-auth-token': localStorage.getItem('token') } }); else if (target.classList.contains('edit-user-btn')) { const p = prompt(`Nowe hasło dla ${username}:`); if (p) handleUserAction(`/api/admin/edit-password/${userid}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ newPassword: p }) }); } else if (target.classList.contains('delete-user-btn')) { if (confirm(`Na pewno usunąć ${username}?`)) handleUserAction(`/api/admin/delete-user/${userid}`, { method: 'DELETE', headers: { 'x-auth-token': localStorage.getItem('token') } }); } else if (target.classList.contains('change-role-btn')) { if (confirm(`Zmienić rolę ${username} na ${role}?`)) handleUserAction(`/api/admin/change-role/${userid}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ newRole: role }) }); } }
    function handleDeleteInventoryItem(e) { const btn = e.target.closest('.delete-inv-item-btn'); if (btn) { inventoryItems.splice(btn.dataset.index, 1); renderInventoryList(); } }
    function handleInventoryAdd() { const ean = elements.inventoryEanInput.value.trim(); const quantity = parseInt(elements.inventoryQuantityInput.value, 10); if (!ean || !quantity) return; const existing = inventoryItems.find(i => i.ean === ean); if (existing) { existing.quantity += quantity; } else { let productData = productDatabase.find(p => p.kod_kreskowy === ean); if (!productData) productData = { nazwa_produktu: 'Produkt spoza bazy', opis: ean }; inventoryItems.push({ ean: ean, name: productData.nazwa_produktu, quantity: quantity }); } renderInventoryList(); elements.inventoryEanInput.value = ''; elements.inventoryQuantityInput.value = '1'; }
    function handleInventorySearch(event) { const searchTerm = event.target.value.trim(); const resultsDiv = elements.inventorySearchResults; resultsDiv.style.display = 'none'; resultsDiv.innerHTML = ''; if(!searchTerm) return; const results = performSearch(searchTerm); if(results.length > 0) { let listHtml = '<ul>'; results.forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.opis} <small>(${p.nazwa_produktu})</small></li>`; }); listHtml += '</ul>'; resultsDiv.innerHTML = listHtml; resultsDiv.style.display = 'block'; } }
    function renderInventoryList() { if (elements.inventoryListBody) { elements.inventoryListBody.innerHTML = inventoryItems.map((item, i) => `<tr><td>${item.name}</td><td>${item.ean}</td><td>${item.quantity}</td><td><button class="delete-inv-item-btn btn-icon btn-danger" data-index="${i}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join(''); } }
    async function startPicking(listId, listName) { try { const response = await fetch(`/api/data/list/${listId}`, { headers: { 'x-auth-token': localStorage.getItem('token') } }); if (!response.ok) throw new Error("Błąd wczytywania zamówienia do kompletacji"); currentPickingOrder = await response.json(); pickedItems = []; if (elements.pickingOrderName) elements.pickingOrderName.textContent = `Kompletacja: ${listName}`; renderPickingView(); if (elements.pickingModule) elements.pickingModule.style.display = 'flex'; } catch (error) { alert(error.message); } }
    function renderPickingView() { if(!currentPickingOrder) return; const toPickItems = currentPickingOrder.items.filter(item => !pickedItems.some(p => p.ean === item.ean)); if (elements.pickingTargetList) elements.pickingTargetList.innerHTML = toPickItems.map(item => `<div class="pick-item" data-ean="${item.ean}" style="padding: 8px; cursor: pointer; border-bottom: 1px solid var(--border-color);"><strong>${item.name}</strong><br><small>${item.description}</small> (ilość: ${item.quantity})</div>`).join('') || "<p>Wszystko zebrane!</p>"; if (elements.pickingScannedList) elements.pickingScannedList.innerHTML = pickedItems.map((item, index) => `<div class="picked-item" style="display: flex; justify-content: space-between; align-items: center; padding: 5px;"><span>${item.name} | ${item.description}</span><div><input type="number" value="${item.quantity}" class="picked-quantity-input" data-index="${index}" style="width: 60px; text-align: center;" readonly><button class="unpick-item-btn btn-icon" data-index="${index}" style="background: none; color: var(--danger-color);"><i class="fa-solid fa-arrow-left"></i></button></div></div>`).join(''); }
    function pickItemFromList(ean) { const itemToPick = currentPickingOrder.items.find(i => i.ean === ean); if (!itemToPick) return; const existingPicked = pickedItems.find(i => i.ean === ean); if (existingPicked) { existingPicked.quantity += 1; } else { pickedItems.push({ ...itemToPick, quantity: 1 }); } renderPickingView(); }
    function handlePickedItemClick(e) { const target = e.target.closest('button.unpick-item-btn, input.picked-quantity-input'); if (!target) return; const index = target.dataset.index; if (target.classList.contains('unpick-item-btn')) { pickedItems.splice(index, 1); renderPickingView(); } else if (target.classList.contains('picked-quantity-input')) { const newQuantity = parseInt(prompt("Zmień ilość:", target.value), 10); if(!isNaN(newQuantity)) { if (newQuantity <= 0) { pickedItems.splice(index, 1); } else { pickedItems[index].quantity = newQuantity; } renderPickingView(); } } }
    function handlePickingSearch(event) { const searchTerm = event.target.value.trim(); const resultsDiv = elements.pickingSearchResults; resultsDiv.innerHTML = ''; resultsDiv.style.display = 'none'; if(!searchTerm) return; const results = performSearch(searchTerm).filter(p => currentPickingOrder.items.some(pi => pi.ean === p.kod_kreskowy)); if(results.length > 0) { let listHtml = '<ul>'; results.forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.opis} <small>(${p.nazwa_produktu})</small></li>`; }); listHtml += '</ul>'; resultsDiv.innerHTML = listHtml; resultsDiv.style.display = 'block'; } }
    function verifyPicking() { if (!currentPickingOrder) return; const summary = { missing: [], extra: [], incorrectQuantity: [] }; const targetMap = new Map(currentPickingOrder.items.map(item => [item.ean, item.quantity])); const pickedMap = new Map(pickedItems.map(item => [item.ean, item.quantity])); for (const [ean, quantity] of targetMap.entries()) { if (!pickedMap.has(ean)) { summary.missing.push({ ...currentPickingOrder.items.find(i=>i.ean===ean), expected: quantity }); } else if (pickedMap.get(ean) !== quantity) { summary.incorrectQuantity.push({ ...currentPickingOrder.items.find(i=>i.ean===ean), expected: quantity, actual: pickedMap.get(ean) }); } } for (const [ean, quantity] of pickedMap.entries()) { if (!targetMap.has(ean)) { summary.extra.push({ ...pickedItems.find(i=>i.ean===ean), actual: quantity }); } } displayPickingSummary(summary); }
    function displayPickingSummary(summary) { let html = '<h4>Podsumowanie kompletacji</h4>'; if (summary.missing.length === 0 && summary.extra.length === 0 && summary.incorrectQuantity.length === 0) { html += '<p style="color: var(--success-color);">Wszystkie pozycje zgodne!</p>'; } else { if (summary.missing.length > 0) { html += '<h5>Brakujące produkty:</h5><ul>'; summary.missing.forEach(item => { html += `<li>${item.name} | ${item.description} (oczekiwano: ${item.expected})</li>`; }); html += '</ul>'; } if (summary.incorrectQuantity.length > 0) { html += '<h5>Niezgodne ilości:</h5><ul>'; summary.incorrectQuantity.forEach(item => { html += `<li>${item.name} | ${item.description} (oczekiwano: ${item.expected}, skompletowano: ${item.actual})</li>`; }); html += '</ul>'; } if (summary.extra.length > 0) { html += '<h5>Dodatkowe produkty:</h5><ul>'; summary.extra.forEach(item => { html += `<li>${item.name} | ${item.description} (skompletowano: ${item.actual})</li>`; }); html += '</ul>'; } } elements.pickingSummaryBody.innerHTML = html; elements.pickingSummaryModal.style.display = 'flex'; }
    function exportPickedToCsv() { if (pickedItems.length === 0) return; const csvContent = pickedItems.map(item => `${item.ean};${item.quantity}`).join('\n'); downloadFile(csvContent, 'text/csv;charset=utf-8;', `${currentPickingOrder.listName}_skompletowane.csv`); }
    async function uploadProductFile(fileName, fileInput) { const file = fileInput.files[0]; if (!file) { alert("Proszę wybrać plik."); return; } const formData = new FormData(); formData.append('productsFile', file, fileName); try { const response = await fetch('/api/admin/upload-products', { method: 'POST', headers: { 'x-auth-token': localStorage.getItem('token') }, body: formData }); const data = await response.json(); if (!response.ok) throw new Error(data.msg || 'Błąd przesyłania pliku.'); showToast(`Plik ${fileName} został zaktualizowany.`, 'success'); await loadDataFromServer(); } catch (error) { alert(`Błąd: ${error.message}`); } }
    
    checkLoginStatus();
});
