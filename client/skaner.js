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

    const showApp = (userData) => {
        elements.loginOverlay.style.display = 'none';
        elements.appContainer.style.display = 'block';
        if (elements.topBar) elements.topBar.style.display = 'flex';
        if (elements.bottomBar) elements.bottomBar.style.display = 'flex';
        initializeApp(userData);
    };

    const initializeApp = async (userData) => {
        if (!userData) {
            console.error("initializeApp: Otrzymano nieprawidłowe dane użytkownika.");
            localStorage.clear();
            location.reload();
            return;
        }
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
        if (!token) {
            attachLoginListeners();
            return;
        }
        try {
            const response = await fetch('/api/auth/verify', { method: 'GET', headers: { 'x-auth-token': token } });
            const userData = await response.json();
            if (response.ok) {
                showApp(userData);
            } else {
                localStorage.removeItem('token');
                attachLoginListeners();
            }
        } catch (error) { 
            console.error('Błąd weryfikacji tokenu:', error); 
            attachLoginListeners();
        }
    };
    
    async function attemptLogin() {
        elements.loginError.textContent = '';
        const username = elements.loginUsername.value;
        const password = elements.loginPassword.value;
        
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
            showApp(data.user);

        } catch (error) { 
            console.error('Błąd podczas logowania:', error);
            elements.loginError.textContent = 'Nie można połączyć się z serwerem lub wystąpił błąd sieci.'; 
        }
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
        if (elements.loginBtn) {
            elements.loginBtn.addEventListener('click', attemptLogin);
        }
        if (elements.loginPassword) {
            elements.loginPassword.addEventListener('keydown', (event) => { if (event.key === 'Enter') attemptLogin(); });
        }
        if (elements.registerBtn) elements.registerBtn.addEventListener('click', handleRegistration);
        if (elements.showRegister) elements.showRegister.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'none'; elements.registerForm.style.display = 'block'; });
        if (elements.showLogin) elements.showLogin.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'block'; elements.registerForm.style.display = 'none'; });
    }

    function attachAllEventListeners() {
        attachLoginListeners(); // Podpinamy na wszelki wypadek
        if(elements.tabLookupBtn) elements.tabLookupBtn.addEventListener('click', () => switchTab('lookup'));
        if(elements.tabListBuilderBtn) elements.tabListBuilderBtn.addEventListener('click', () => switchTab('listBuilder'));
        if (elements.menuToggleBtn) elements.menuToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); elements.dropdownMenu.classList.toggle('show'); });
        window.addEventListener('click', () => { if (elements.dropdownMenu && elements.dropdownMenu.classList.contains('show')) elements.dropdownMenu.classList.remove('show'); });
        if (elements.menuAdminBtn) elements.menuAdminBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab('admin'); loadAllUsers(); });
        if (elements.menuInventoryBtn) elements.menuInventoryBtn.addEventListener('click', (e) => { e.preventDefault(); elements.inventoryModule.style.display = 'flex'; });
        if (elements.menuLogoutBtn) elements.menuLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.clear(); location.reload(); });
        if (elements.menuChangePassword) elements.menuChangePassword.addEventListener('click', (e) => { e.preventDefault(); handleChangePassword(); });
        if (elements.menuSavedLists) elements.menuSavedLists.addEventListener('click', (e) => { e.preventDefault(); showSavedLists(); });
        if (elements.scrollTopBtn) elements.scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        if (elements.scrollBottomBtn) elements.scrollBottomBtn.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
        if (elements.darkModeToggle) elements.darkModeToggle.addEventListener('click', () => setDarkMode(!document.body.classList.contains('dark-mode')));
        if(elements.listBarcodeInput) elements.listBarcodeInput.addEventListener('input', handleListBuilderSearch);
        if(elements.listBuilderSearchResults) elements.listBuilderSearchResults.addEventListener('click', (event) => { const targetLi = event.target.closest('li'); if (targetLi?.dataset.ean) { addProductToList(targetLi.dataset.ean); } });
        if(elements.addToListBtn) elements.addToListBtn.addEventListener('click', () => addProductToList());
        if(elements.quickSearchBtn) elements.quickSearchBtn.addEventListener('click', () => { elements.quickSearchModal.style.display = 'flex'; elements.lookupBarcodeInput.focus(); });
        if(elements.closeQuickSearchModalBtn) elements.closeQuickSearchModalBtn.addEventListener('click', () => { elements.quickSearchModal.style.display = 'none'; });
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
    }
    
    async function loadDataFromServer() { function fetchAndParseCsv(filename) { return fetch(filename).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`Błąd sieci: ${r.statusText}`))).then(b => new TextDecoder("Windows-1250").decode(b)).then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: rts => res(rts.data), error: e => rej(e) }))); } await Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')]) .then(([data1, data2]) => { const mapData = p => ({ kod_kreskowy: String(p.kod_kreskowy || "").trim(), nazwa_produktu: String(p.nazwa_produktu || "").trim(), cena: String(p.opis || "0").replace(',', '.').trim() || "0", opis: String(p.cena || "").trim() }); productDatabase = [...data1.map(mapData), ...data2.map(mapData)]; }).catch(error => { console.error('Krytyczny błąd ładowania danych:', error); alert('BŁĄD: Nie udało się załadować bazy produktów.'); }); }
    function switchTab(newTab) { /* ... bez zmian ... */ }
    function setDarkMode(isDark) { /* ... bez zmian ... */ }
    function performSearch(searchTerm) { /* ... bez zmian ... */ }
    function showToast(message) { /* ... bez zmian ... */ }
    function addProductToList(code = null, quantity = null) { /* ... bez zmian ... */ }
    function handleListBuilderSearch(event) { /* ... bez zmian ... */ }
    function handleLookupSearch(event) { /* ... bez zmian ... */ }
    function displaySingleProductInLookup(product) { /* ... bez zmian ... */ }
    function displayProductListInLookup(products) { /* ... bez zmian ... */ }
    function renderScannedList() { /* ... bez zmian ... */ }
    function getSafeFilename() { /* ... bez zmian ... */ }
    function exportToCsvOptima() { /* ... bez zmian ... */ }
    function exportToExcelDetailed() { /* ... bez zmian ... */ }
    function downloadFile(content, mimeType, filename) { /* ... bez zmian ... */ }
    function prepareForPrint() { /* ... bez zmian ... */ }
    function clearCurrentList(askConfirm = true) { /* ... bez zmian ... */ }
    async function saveCurrentList() { /* ... bez zmian ... */ }
    async function loadListById(listId) { /* ... bez zmian ... */ }
    async function loadActiveList() { /* ... bez zmian ... */ }
    async function showSavedLists() { /* ... bez zmian ... */ }
    async function handleSavedListAction(e) { /* ... bez zmian ... */ }
    async function handleFileImport(event) { /* ... bez zmian ... */ }
    async function loadAllUsers() { /* ... bez zmian ... */ }
    async function handleUserAction(url, options) { /* ... bez zmian ... */ }
    async function handleChangePassword() { /* ... bez zmian ... */ }
    function handleAdminAction(e) { /* ... bez zmian ... */ }
    function handleDeleteInventoryItem(e) { /* ... bez zmian ... */ }
    function handleInventoryAdd() { /* ... bez zmian ... */ }
    function handleInventorySearch(event) { /* ... bez zmian ... */ }
    function renderInventoryList() { /* ... bez zmian ... */ }
    async function startPicking(listId, listName) { /* ... bez zmian ... */ }
    function renderPickingView() { /* ... bez zmian ... */ }
    function pickItemFromList(ean) { /* ... bez zmian ... */ }
    function moveItemToPicked(item, quantity) { /* ... bez zmian ... */ }
    function handlePickedItemClick(e) { /* ... bez zmian ... */ }
    function handlePickingSearch(event) { /* ... bez zmian ... */ }
    function verifyPicking() { /* ... bez zmian ... */ }
    function displayPickingSummary(summary) { /* ... bez zmian ... */ }
    function exportPickedToCsv() { /* ... bez zmian ... */ }
    function attachNumpadListeners() { /* ... bez zmian ... */ }
    function openNumpad(targetInput, callback) { /* ... bez zmian ... */ }
    
    // Inicjalizacja Aplikacji
    checkLoginStatus();
});

