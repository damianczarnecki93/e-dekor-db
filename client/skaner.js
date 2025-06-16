document.addEventListener('DOMContentLoaded', () => {
    console.log("[DIAGNOSTYKA] Krok 1: DOMContentLoaded - Skrypt został uruchomiony.");

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
        allUsersList: document.getElementById('allUsersList'),
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
        quickSearchModal: document.getElementById('quickSearchModal'),
        closeQuickSearchModalBtn: document.getElementById('closeQuickSearchModalBtn'),
        lookupBarcodeInput: document.getElementById('lookupBarcodeInput'),
        lookupResultList: document.getElementById('lookupResultList'),
        lookupResultSingle: document.getElementById('lookupResultSingle'),
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
        pickingEanInput: document.getElementById('pickingEanInput'),
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
        numpadModal: document.getElementById('numpad-modal'),
        numpadDisplay: document.getElementById('numpad-display'),
        numpadOk: document.getElementById('numpad-ok'),
        numpadClear: document.getElementById('numpad-clear'),
        numpadBackspace: document.getElementById('numpad-backspace'),
        numpadKeys: document.querySelectorAll('.numpad-key'),
    };

    let productDatabase = [], scannedItems = [], inventoryItems = [];
    let currentPickingOrder = null;
    let pickedItems = [];
    let numpadTarget = null;
    let numpadCallback = null;
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

    // =================================================================
    // GŁÓWNA STRUKTURA APLIKACJI
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
    
    async function loadDataFromServer() {
        console.log('Ładowanie bazy produktów...');
        try {
            const fetchAndParseCsv = (filename) => fetch(filename)
                .then(r => { if (!r.ok) throw new Error(`Błąd sieci: ${r.statusText}`); return r.arrayBuffer(); })
                .then(b => new TextDecoder("Windows-1250").decode(b))
                .then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: rts => res(rts.data), error: e => rej(e) })));
            
            const [data1, data2] = await Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')]);
            const mapData = p => ({ kod_kreskowy: String(p.kod_kreskowy || "").trim(), nazwa_produktu: String(p.nazwa_produktu || "").trim(), cena: String(p.opis || "0").replace(',', '.').trim() || "0", opis: String(p.cena || "").trim() });
            productDatabase = [...data1.map(mapData), ...data2.map(mapData)];
            console.log(`Baza danych załadowana (${productDatabase.length} pozycji).`);
        } catch(error) {
            console.error('Krytyczny błąd ładowania danych:', error);
            alert('BŁĄD: Nie udało się załadować bazy produktów.');
        }
    }

    function attachAllEventListeners() {
        console.log("[DIAGNOSTYKA] Podpinanie wszystkich event listenerów aplikacji.");
        
        // Logowanie i Rejestracja - już podpięte przed `showApp`
        elements.loginBtn.addEventListener('click', attemptLogin);
        elements.loginPassword.addEventListener('keydown', (event) => { if (event.key === 'Enter') attemptLogin(); });
        elements.registerBtn.addEventListener('click', handleRegistration);
        elements.showRegister.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'none'; elements.registerForm.style.display = 'block'; });
        elements.showLogin.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'block'; elements.registerForm.style.display = 'none'; });
        
        // Główne UI i Nawigacja
        elements.menuToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); elements.dropdownMenu.classList.toggle('show'); });
        window.addEventListener('click', () => { if (elements.dropdownMenu.classList.contains('show')) elements.dropdownMenu.classList.remove('show'); });
        elements.menuAdminBtn.addEventListener('click', (e) => { e.preventDefault(); showAdminPanel(); });
        elements.menuInventoryBtn.addEventListener('click', (e) => { e.preventDefault(); elements.inventoryModule.style.display = 'flex'; });
        elements.menuLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.clear(); location.reload(); });
        elements.menuChangePassword.addEventListener('click', (e) => { e.preventDefault(); handleChangePassword(); });
        elements.menuSavedLists.addEventListener('click', (e) => { e.preventDefault(); showSavedLists(); });
        elements.scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        elements.scrollBottomBtn.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
        elements.darkModeToggle.addEventListener('click', () => setDarkMode(!document.body.classList.contains('dark-mode')));
        
        // Główne Zamówienie
        elements.listBarcodeInput.addEventListener('input', handleListBuilderSearch);
        elements.listBuilderSearchResults.addEventListener('click', (event) => { const targetLi = event.target.closest('li'); if (targetLi?.dataset.ean) { addProductToList(targetLi.dataset.ean); } });
        elements.addToListBtn.addEventListener('click', () => addProductToList());
        elements.scannedListBody.addEventListener('click', handleScannedListClick);
        elements.saveListBtn.addEventListener('click', saveCurrentList);
        elements.newListBtn.addEventListener('click', async () => { if (scannedItems.length > 0) { if (confirm("Czy chcesz zapisać bieżące zamówienie przed utworzeniem nowego?")) { await saveCurrentList(); } } clearCurrentList(false); });
        elements.printListBtn.addEventListener('click', () => { prepareForPrint(); window.print(); });
        elements.clearListBtn.addEventListener('click', () => clearCurrentList(true));
        elements.exportCsvBtn.addEventListener('click', exportToCsvOptima);
        elements.exportExcelBtn.addEventListener('click', exportToExcelDetailed);
        
        // Szybkie Wyszukiwanie (Modal)
        elements.quickSearchBtn.addEventListener('click', () => { elements.quickSearchModal.style.display = 'flex'; elements.lookupBarcodeInput.focus(); });
        elements.closeQuickSearchModalBtn.addEventListener('click', () => { elements.quickSearchModal.style.display = 'none'; });
        elements.lookupBarcodeInput.addEventListener('input', handleLookupSearch);
        elements.lookupResultList.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li?.dataset.productJson) { displaySingleProductInLookup(JSON.parse(li.dataset.productJson)); }});
        
        // Panel Admina
        elements.allUsersList.addEventListener('click', handleAdminAction);
        
        // Inwentaryzacja
        elements.closeInventoryModalBtn.addEventListener('click', () => { elements.inventoryModule.style.display = 'none'; });
        elements.inventoryAddBtn.addEventListener('click', handleInventoryAdd);
        elements.inventoryEanInput.addEventListener('input', handleInventorySearch);
        elements.inventorySearchResults.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li?.dataset.ean) { elements.inventoryEanInput.value = li.dataset.ean; elements.inventorySearchResults.style.display = 'none'; }});
        elements.inventoryListBody.addEventListener('click', handleDeleteInventoryItem);
        
        // Zapisane Listy i Import
        elements.closeSavedListsModalBtn.addEventListener('click', () => { elements.savedListsModal.style.display = 'none'; });
        elements.savedListsContainer.addEventListener('click', handleSavedListAction);
        
        // Kompletacja
        elements.closePickingModalBtn.addEventListener('click', () => { elements.pickingModule.style.display = 'none'; });
        elements.pickingEanInput.addEventListener('input', handlePickingSearch);
        elements.pickingSearchResults.addEventListener('click', e => { const li = e.target.closest('li'); if(li?.dataset.ean) { pickItemFromList(li.dataset.ean); } });
        elements.pickingTargetList.addEventListener('click', e => { const itemDiv = e.target.closest('.pick-item'); if(itemDiv?.dataset.ean) { pickItemFromList(itemDiv.dataset.ean); } });
        elements.pickingScannedList.addEventListener('click', handlePickedItemClick);
        elements.pickingVerifyBtn.addEventListener('click', verifyPicking);

        attachNumpadListeners();
    }

    // =================================================================
    // Pozostałe funkcje...
    // =================================================================
    
    function showAdminPanel() { /* ... */ }
    function setDarkMode(isDark) { /* ... */ }
    function showToast(message) { /* ... */ }
    function performSearch(searchTerm) { /* ... */ }
    function addProductToList(code, quantity) { /* ... */ }
    function handleListBuilderSearch(event) { /* ... */ }
    function handleLookupSearch(event) { /* ... */ }
    function displaySingleProductInLookup(product) { /* ... */ }
    function displayProductListInLookup(products) { /* ... */ }
    function renderScannedList() { /* ... */ }
    function handleScannedListClick(e) { /* ... */ }
    function getSafeFilename() { /* ... */ }
    function exportToCsvOptima() { /* ... */ }
    function exportToExcelDetailed() { /* ... */ }
    function downloadFile(content, mimeType, filename) { /* ... */ }
    function prepareForPrint() { /* ... */ }
    function clearCurrentList(askConfirm) { /* ... */ }
    async function saveCurrentList() { /* ... */ }
    async function loadListById(listId) { /* ... */ }
    async function loadActiveList() { /* ... */ }
    async function showSavedLists() { /* ... */ }
    async function handleSavedListAction(e) { /* ... */ }
    async function handleFileImport(event) { /* ... */ }
    async function loadAllUsers() { /* ... */ }
    async function handleUserAction(url, options, successMsg) { /* ... */ }
    async function handleChangePassword() { /* ... */ }
    function handleAdminAction(e) { /* ... */ }
    function handleInventoryAdd() { /* ... */ }
    function handleInventorySearch(event) { /* ... */ }
    function handleDeleteInventoryItem(e) { /* ... */ }
    function renderInventoryList() { /* ... */ }
    function openNumpad(targetElement, callbackOnOk) { /* ... */ }
    function handleNumpadOK() { /* ... */ }
    function attachNumpadListeners() { /* ... */ }
    async function startPicking(listId, listName) { /* ... */ }
    function renderPickingView() { /* ... */ }
    function pickItemFromList(ean) { /* ... */ }
    function moveItemToPicked(item, quantity) { /* ... */ }
    function handlePickedItemClick(e) { /* ... */ }
    function handlePickingSearch(event) { /* ... */ }
    function verifyPicking() { /* ... */ }
    function exportPickedToCsv() { /* ... */ }

    // Uruchomienie aplikacji
    checkLoginStatus();
});
