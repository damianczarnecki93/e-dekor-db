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
        lookupBarcodeInput: document.getElementById('lookupBarcode_Input'),
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
        toastContainer: document.getElementById('toast-container'),
        printClientName: document.getElementById('print-client-name'),
        printAdditionalInfo: document.getElementById('print-additional-info'),
        printContent: document.getElementById('print-content'),
    };

    let productDatabase = [], scannedItems = [], inventoryItems = [], activeTab = 'lookup';
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

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

    if (elements.loginBtn) elements.loginBtn.addEventListener('click', attemptLogin);
    if (elements.loginPassword) elements.loginPassword.addEventListener('keydown', (event) => { if (event.key === 'Enter') attemptLogin(); });
    if (elements.registerBtn) elements.registerBtn.addEventListener('click', handleRegistration);
    if (elements.showRegister) elements.showRegister.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'none'; elements.registerForm.style.display = 'block'; });
    if (elements.showLogin) elements.showLogin.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'block'; elements.registerForm.style.display = 'none'; });

    async function loadDataFromServer() {
        console.log('Ładowanie bazy produktów...');
        function fetchAndParseCsv(filename) { return fetch(filename).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`Błąd sieci: ${r.statusText}`))).then(b => new TextDecoder("Windows-1250").decode(b)).then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: rts => res(rts.data), error: e => rej(e) }))); }
        await Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')])
            .then(([data1, data2]) => {
                const mapData = p => ({ kod_kreskowy: String(p.kod_kreskowy || "").trim(), nazwa_produktu: String(p.nazwa_produktu || "").trim(), cena: String(p.opis || "0").replace(',', '.').trim() || "0", opis: String(p.cena || "").trim() });
                productDatabase = [...data1.map(mapData), ...data2.map(mapData)];
                console.log(`Baza danych załadowana (${productDatabase.length} pozycji).`);
                [...document.querySelectorAll('input:not(#loginForm input, #registerForm input), button:not(#loginForm button, #registerForm button)')].forEach(el => el.disabled = false);
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
    
    function setDarkMode(isDark) { const iconElement = elements.darkModeToggle.querySelector('i'); if (isDark) { document.body.classList.add('dark-mode'); iconElement.classList.replace('fa-moon', 'fa-sun'); localStorage.setItem('theme', 'dark'); } else { document.body.classList.remove('dark-mode'); iconElement.classList.replace('fa-sun', 'fa-moon'); localStorage.setItem('theme', 'light'); } }
    if (elements.darkModeToggle) elements.darkModeToggle.addEventListener('click', () => setDarkMode(!document.body.classList.contains('dark-mode')));
    setDarkMode(localStorage.getItem('theme') === 'dark');

    function performSearch(searchTerm) { if (!searchTerm) return []; const term = searchTerm.toLowerCase(); return productDatabase.filter(p => (p.kod_kreskowy?.toLowerCase().includes(term)) || (p.nazwa_produktu?.toLowerCase().includes(term)) || (p.opis?.toLowerCase().includes(term))); }
    
    function addProductToList(code = null) {
        const ean = code || elements.listBarcodeInput.value.trim();
        const quantity = parseInt(elements.quantityInput.value, 10);
        if (!ean || isNaN(quantity) || quantity < 1) return alert("Podaj kod/EAN i prawidłową ilość.");
        let productData = productDatabase.find(p => p.kod_kreskowy === ean || p.nazwa_produktu === ean);
        if (!productData) productData = { kod_kreskowy: ean, nazwa_produktu: ean, opis: ean, cena: "0" };
        const existingItem = scannedItems.find(item => item.ean === productData.kod_kreskowy);
        if (existingItem) existingItem.quantity += quantity;
        else scannedItems.push({ ean: productData.kod_kreskowy, name: productData.nazwa_produktu, description: productData.opis, quantity: quantity, price: productData.cena });
        renderScannedList();
        showToast(`Dodano: ${productData.nazwa_produktu} (Ilość: ${quantity})`);
        elements.listBarcodeInput.value = '';
        elements.quantityInput.value = '1';
        elements.listBuilderSearchResults.innerHTML = '';
        elements.listBuilderSearchResults.style.display = 'none';
        elements.listBarcodeInput.focus();
    }
    
    function handleListBuilderSearch() {
        const searchTerm = elements.listBarcodeInput.value.trim();
        elements.listBuilderSearchResults.style.display = 'none';
        if (!searchTerm) return;
        
        if (isMobile) {
            const results = performSearch(searchTerm);
            const exactMatch = results.find(p => p.nazwa_produktu.toLowerCase() === searchTerm.toLowerCase() || p.kod_kreskowy === searchTerm);
            addProductToList(exactMatch ? exactMatch.kod_kreskowy : searchTerm);
            return;
        }

        const results = performSearch(searchTerm);
        if (results.length === 1) { addProductToList(results[0].kod_kreskowy); } 
        else if (results.length > 1) {
            let listHtml = '<ul>';
            results.forEach(p => { listHtml += `<li data-ean="<span class="math-inline">\{p\.kod\_kreskowy\}"\></span>{p.opis} <small>(${p.nazwa_produktu})</small></li>`; });
            listHtml += '</ul>';
            elements.listBuilderSearchResults.innerHTML = listHtml;
            elements.listBuilderSearchResults.style.display = 'block';
        } else {
             if (window.confirm(`Produkt "${searchTerm}" nie został znaleziony. Czy chcesz dodać go jako nową pozycję?`)) {
                addProductToList(searchTerm);
             }
        }
    }
    if(elements.listBarcodeInput) elements.listBarcodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleListBuilderSearch();} });
    if(elements.listBuilderSearchResults) elements.listBuilderSearchResults.addEventListener('click', (event) => { const targetLi = event.target.closest('li'); if (targetLi?.dataset.ean) addProductToList(targetLi.dataset.ean); });
    if(elements.addToListBtn) elements.addToListBtn.addEventListener('click', () => addProductToList());

    function handleLookupSearch() {
        const searchTerm = elements.lookupBarcodeInput.value.trim();
        elements.lookupResultList.innerHTML = '';
        elements.lookupResultList.style.display = 'none';
        elements.lookupResultSingle.innerHTML = '';
        elements.lookupResultSingle.style.display = 'none';
        if (!searchTerm) return;
        const results = performSearch(searchTerm);
        if (results.length === 1) {
            displaySingleProductInLookup(results[0]);
        } else if (results.length > 1) {
            displayProductListInLookup(results);
        } else {
            elements.lookupResultSingle.innerHTML = '<p>Nie znaleziono produktu.</p>';
            elements.lookupResultSingle.style.display = 'block';
        }
    }
    
    function displaySingleProductInLookup(product) {
        let html = `<div class="lookup-result-item"><h2><span class="math-inline">\{product\.opis\}</h2\><div\><strong\>Kod produktu\:</strong\> <span\></span>{product.nazwa_produktu}</span></div><div><strong>Kod EAN:
