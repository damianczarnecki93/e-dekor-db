document.addEventListener('DOMContentLoaded', () => {
    console.log('[DIAGNOSTYKA] Krok 1: DOMContentLoaded - Skrypt został uruchomiony.');

    // Definicja wszystkich elementów DOM w jednym miejscu
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
        toastContainer: document.getElementById('toast-container'),
        printArea: document.getElementById('print-area'),
        printClientName: document.getElementById('print-client-name'),
        printAdditionalInfo: document.getElementById('print-additional-info'),
        printTableBody: document.getElementById('print-table-body'),
    };

    let productDatabase = [], scannedItems = [], inventoryItems = [];
    
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
    // GŁÓWNA FUNKCJA PODPINANIA LISTENERS
    // =================================================================
    function attachAllEventListeners() {
        console.log("[DIAGNOSTYKA] Krok 3: Rozpoczynam podpinanie event listenerów.");
        
        if (elements.loginBtn) elements.loginBtn.addEventListener('click', attemptLogin);
        if (elements.loginPassword) elements.loginPassword.addEventListener('keydown', (event) => { if (event.key === 'Enter') attemptLogin(); });
        if (elements.registerBtn) elements.registerBtn.addEventListener('click', handleRegistration);
        if (elements.showRegister) elements.showRegister.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'none'; elements.registerForm.style.display = 'block'; });
        if (elements.showLogin) elements.showLogin.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'block'; elements.registerForm.style.display = 'none'; });
        
        if (elements.menuLogoutBtn) elements.menuLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.clear(); location.reload(); });
        
        console.log("[DIAGNOSTYKA] Krok 4: Podpinanie listenerów zakończone pomyślnie.");
    }
    
    // =================================================================
    // ŁADOWANIE DANYCH
    // =================================================================
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

    // =================================================================
    // WYWOŁANIE STARTOWE
    // =================================================================
    console.log("[DIAGNOSTYKA] Krok 2: Definicje funkcji zakończone. Uruchamiam sprawdzanie statusu logowania...");
    checkLoginStatus();

});
```

### Krok 2: Weryfikacja

Po podmianie tego pliku i wdrożeniu go na serwer:
1.  **Wykonaj twarde odświeżenie** w przeglądarce (`Ctrl+Shift+R` lub `Cmd+Shift+R`).
2.  **Otwórz konsolę deweloperską (F12).**
3.  Spróbuj się zalogować.

Tym razem logowanie musi zadziałać. Jeśli z jakiegoś powodu problem będzie nadal występował, proszę, wklej mi **całą zawartość konsoli deweloperskiej**. Nowy kod zawiera komunikaty diagnostyczne, które pomogą nam precyzyjnie zlokalizować probl
