document.addEventListener('DOMContentLoaded', () => {

    // === Konfiguracja ===
    const STATUS_MESSAGE_TIMEOUT = 5000;

    // === ELEMENTY HTML ===
    const elements = {
        // Logowanie i rejestracja
        loginOverlay: document.getElementById('loginOverlay'),
        appContainer: document.getElementById('appContainer'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        loginBtn: document.getElementById('loginBtn'),
        loginError: document.getElementById('loginError'),
        registerForm: document.getElementById('registerForm'),
        showRegister: document.getElementById('showRegister'),
        showLogin: document.getElementById('showLogin'),
        
        // Główne UI
        statusP: document.getElementById('status'),
        tabLookupBtn: document.getElementById('tabLookupBtn'),
        tabListBuilderBtn: document.getElementById('tabListBuilderBtn'),
        lookupMode: document.getElementById('lookupMode'),
        listBuilderMode: document.getElementById('listBuilderMode'),
        
        // ZMIANA: Nowe menu i paski
        topBar: document.getElementById('topBar'),
        bottomBar: document.getElementById('bottomBar'),
        menuToggleBtn: document.getElementById('menuToggleBtn'),
        dropdownMenu: document.getElementById('dropdownMenu'),
        menuInventoryBtn: document.getElementById('menuInventoryBtn'),
        menuLogoutBtn: document.getElementById('menuLogoutBtn'),
        scrollTopBtn: document.getElementById('scrollTopBtn'),
        scrollBottomBtn: document.getElementById('scrollBottomBtn'),
        
        // Skaner
        startCameraBtn: document.getElementById('startCameraBtn'),
        cameraScannerSection: document.getElementById('cameraScannerSection'),
        cameraReader: document.getElementById('camera-reader'),
        stopCameraBtn: document.getElementById('stopCameraBtn'),
        
        // Wyszukiwarka
        lookupBarcodeInput: document.getElementById('lookupBarcode_Input'),
        lookupResultDiv: document.getElementById('lookupResult'),
        
        // Lista zamówień
        listBarcodeInput: document.getElementById('listBarcode_Input'),
        listBuilderSearchResults: document.getElementById('listBuilderSearchResults'),
        quantityInput: document.getElementById('quantityInput'),
        addToListBtn: document.getElementById('addToListBtn'),
        scannedListBody: document.getElementById('scannedListBody'),
        clientNameInput: document.getElementById('clientNameInput'),
        additionalInfoInput: document.getElementById('additionalInfoInput'),
        totalOrderValue: document.getElementById('totalOrderValue'),
        scannedListTable: document.querySelector('#listBuilderMode table'),
        
        // Eksport
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        exportExcelBtn: document.getElementById('exportExcelBtn'),
        printListBtn: document.getElementById('printListBtn'),
        clearListBtn: document.getElementById('clearListBtn'),
        
        // Admin
        tabAdminBtn: document.getElementById('tabAdminBtn'),
        adminPanel: document.getElementById('adminPanel'),
        pendingUsersList: document.getElementById('pendingUsersList'),
        
        // Inwentaryzacja
        inventoryModule: document.getElementById('inventoryModule'),
        closeInventoryModalBtn: document.getElementById('closeInventoryModalBtn'),
        inventoryEanInput: document.getElementById('inventoryEanInput'),
        inventoryQuantityInput: document.getElementById('inventoryQuantityInput'),
        inventoryAddBtn: document.getElementById('inventoryAddBtn'),
        inventoryListBody: document.getElementById('inventoryListBody'),
        inventoryExportCsvBtn: document.getElementById('inventoryExportCsvBtn'),
        inventorySearchResults: document.getElementById('inventorySearchResults'),

        // Wydruk
        printTableBody: document.getElementById('print-table-body'),
    };

    // === GŁÓWNA LOGIKA APLIKACJI ===
    let productDatabase = [];
    let scannedItems = [];
    let inventoryItems = [];
    let html5QrCode = null;
    let activeTab = 'lookup';

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

    const initializeApp = (userData) => {
        loadDataFromServer();
        loadUserDataFromServer();
        if (userData && userData.role === 'admin') {
            if(elements.tabAdminBtn) elements.tabAdminBtn.style.display = 'block';
        }
    };
    
    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const response = await fetch('/api/auth/verify', { method: 'GET', headers: { 'x-auth-token': token } });
            if (response.ok) {
                const userData = await response.json();
                showApp(userData);
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Błąd weryfikacji tokenu:', error);
        }
    };
    
    async function attemptLogin() {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: elements.loginUsername.value, password: elements.loginPassword.value }),
            });
            const data = await response.json();
            if (!response.ok) {
                elements.loginError.textContent = data.msg || 'Wystąpił błąd';
                return;
            }
            localStorage.setItem('token', data.token);
            showApp(data.user);
        } catch (error) {
            elements.loginError.textContent = 'Nie można połączyć się z serwerem.';
        }
    }

    if (elements.loginBtn) elements.loginBtn.addEventListener('click', attemptLogin);
    if (elements.loginPassword) elements.loginPassword.addEventListener('keydown', (event) => { if (event.key === 'Enter') attemptLogin(); });
    
    // === PRZEŁĄCZANIE FORMULARZY LOGOWANIA/REJESTRACJI ===
    if (elements.showRegister) elements.showRegister.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'none'; elements.registerForm.style.display = 'block'; });
    if (elements.showLogin) elements.showLogin.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.style.display = 'block'; elements.registerForm.style.display = 'none'; });

    // =================================================================
    // ŁADOWANIE DANYCH
    // =================================================================
    async function loadUserDataFromServer() {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const headers = { 'x-auth-token': token };
            const [productListResponse, inventoryResponse] = await Promise.all([
                fetch('/api/data/productlist', { headers }),
                fetch('/api/data/inventory', { headers })
            ]);
            const productListData = await productListResponse.json();
            scannedItems = productListData.items || [];
            if (elements.clientNameInput) elements.clientNameInput.value = productListData.clientName || '';
            renderScannedList();
            const inventoryData = await inventoryResponse.json();
            inventoryItems = inventoryData.items || [];
            renderInventoryList();
        } catch (error) {
            console.error('Nie udało się wczytać danych użytkownika:', error);
        }
    }

    async function saveDataToServer() {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const headers = { 'Content-Type': 'application/json', 'x-auth-token': token };
            await Promise.all([
                fetch('/api/data/productlist', { method: 'POST', headers, body: JSON.stringify({ clientName: elements.clientNameInput.value, items: scannedItems }) }),
                fetch('/api/data/inventory', { method: 'POST', headers, body: JSON.stringify({ items: inventoryItems }) })
            ]);
        } catch (error) {
            console.error('Błąd zapisu danych na serwerze:', error);
        }
    }
    
    function loadDataFromServer() {
        elements.statusP.textContent = 'Ładowanie bazy produktów...';
        elements.statusP.style.display = 'block';
        
        function fetchAndParseCsv(filename) { return fetch(filename).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`Błąd sieci: ${r.statusText}`))).then(b => new TextDecoder("Windows-1250").decode(b)).then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: rts => res(rts.data), error: e => rej(e) }))); }
        
        Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')])
            .then(([data1, data2]) => {
                const mapData = p => ({ kod_kreskowy: String(p.kod_kreskowy || "").trim(), nazwa_produktu: String(p.nazwa_produktu || "").trim(), cena: String(p.opis || "0").replace(',', '.').trim() || "0", opis: String(p.cena || "").trim() });
                productDatabase = [...data1.map(mapData), ...data2.map(mapData)];
                elements.statusP.textContent = `Baza danych załadowana (${productDatabase.length} pozycji).`;
                setTimeout(() => { if (elements.statusP) elements.statusP.style.display = 'none'; }, STATUS_MESSAGE_TIMEOUT);
                [elements.lookupBarcodeInput, elements.listBarcodeInput, elements.quantityInput, elements.addToListBtn, elements.startCameraBtn, elements.clientNameInput, elements.additionalInfoInput, elements.inventoryEanInput, elements.inventoryQuantityInput, elements.inventoryAddBtn].forEach(el => { if (el) el.disabled = false; });
                if (elements.lookupBarcodeInput) elements.lookupBarcodeInput.focus();
            }).catch(error => {
                elements.statusP.textContent = `BŁĄD ładowania bazy danych. Sprawdź pliki CSV.`;
                console.error('Krytyczny błąd ładowania danych:', error);
            });
    }

    // =================================================================
    // NAWIGACJA I UI
    // =================================================================
    function switchTab(newTab) {
        activeTab = newTab;
        [elements.lookupMode, elements.listBuilderMode, elements.adminPanel].forEach(el => el.style.display = 'none');
        [elements.tabLookupBtn, elements.tabListBuilderBtn, elements.tabAdminBtn].forEach(el => el.classList.remove('active'));
        if (newTab === 'lookup') {
            elements.lookupMode.style.display = 'block';
            elements.tabLookupBtn.classList.add('active');
        } else if (newTab === 'listBuilder') {
            elements.listBuilderMode.style.display = 'block';
            elements.tabListBuilderBtn.classList.add('active');
        } else if (newTab === 'admin') {
            elements.adminPanel.style.display = 'block';
            elements.tabAdminBtn.classList.add('active');
        }
    }
    if(elements.tabLookupBtn) elements.tabLookupBtn.addEventListener('click', () => switchTab('lookup'));
    if(elements.tabListBuilderBtn) elements.tabListBuilderBtn.addEventListener('click', () => switchTab('listBuilder'));
    if(elements.tabAdminBtn) elements.tabAdminBtn.addEventListener('click', () => switchTab('admin'));

    // ZMIANA: Logika rozwijanego menu
    if (elements.menuToggleBtn) {
        elements.menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.dropdownMenu.classList.toggle('show');
        });
    }
    window.addEventListener('click', (e) => {
        if (elements.dropdownMenu.classList.contains('show') && !e.target.closest('.dropdown')) {
            elements.dropdownMenu.classList.remove('show');
        }
    });

    if (elements.menuInventoryBtn) elements.menuInventoryBtn.addEventListener('click', () => { elements.inventoryModule.style.display = 'flex'; });
    if (elements.menuLogoutBtn) elements.menuLogoutBtn.addEventListener('click', () => { localStorage.removeItem('token'); location.reload(); });
    if (elements.scrollTopBtn) elements.scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    if (elements.scrollBottomBtn) elements.scrollBottomBtn.addEventListener('click', () => elements.scannedListTable.scrollIntoView({ behavior: 'smooth', block: 'end' }));

    // =================================================================
    // WYSZUKIWANIE I DODAWANIE PRODUKTÓW
    // =================================================================
    function performSearch(searchTerm) {
        if (!searchTerm) return [];
        const term = searchTerm.toLowerCase();
        return productDatabase.filter(p =>
            (p.kod_kreskowy && p.kod_kreskowy.toLowerCase().includes(term)) ||
            (p.nazwa_produktu && p.nazwa_produktu.toLowerCase().includes(term)) ||
            (p.opis && p.opis.toLowerCase().includes(term))
        );
    }
    
    function addProductToList(eanCode = null) {
        const ean = eanCode || elements.listBarcodeInput.value.trim();
        const quantity = parseInt(elements.quantityInput.value, 10);
        if (!ean || isNaN(quantity) || quantity < 1) {
            alert("Podaj kod/EAN i prawidłową ilość.");
            return;
        }
        let productData = productDatabase.find(p => p.kod_kreskowy === ean || p.nazwa_produktu === ean);
        // ZMIANA: Uproszczone dodawanie nieznanego produktu
        if (!productData) {
            productData = { kod_kreskowy: ean, nazwa_produktu: `PRODUKT NIEZNANY`, opis: '---', cena: "0" };
        }
        const existingItem = scannedItems.find(item => item.ean === productData.kod_kreskowy);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            scannedItems.push({ ean: productData.kod_kreskowy, name: productData.nazwa_produktu, description: productData.opis, quantity: quantity, price: productData.cena });
        }
        renderScannedList();
        saveDataToServer();
        elements.listBarcodeInput.value = '';
        elements.quantityInput.value = '1';
        if (elements.listBuilderSearchResults) elements.listBuilderSearchResults.style.display = 'none';
        elements.listBarcodeInput.focus();
    }
    
    function handleListBuilderSearch() {
        const searchTerm = elements.listBarcodeInput.value.trim();
        elements.listBuilderSearchResults.style.display = 'none';
        if (!searchTerm) return;
        
        const results = performSearch(searchTerm);
        if (results.length > 0) {
            let listHtml = '<ul>';
            results.forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.nazwa_produktu} <small>(EAN: ${p.kod_kreskowy}, Opis: ${p.opis})</small></li>`; });
            listHtml += '</ul>';
            elements.listBuilderSearchResults.innerHTML = listHtml;
            elements.listBuilderSearchResults.style.display = 'block';
        } else {
             // ZMIANA: Automatyczne dodawanie nieznanego produktu po naciśnięciu Enter
             addProductToList(searchTerm);
        }
    }
    if(elements.listBarcodeInput) elements.listBarcodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleListBuilderSearch(); } });
    if(elements.listBuilderSearchResults) elements.listBuilderSearchResults.addEventListener('click', (event) => { const targetLi = event.target.closest('li'); if (targetLi && targetLi.dataset.ean) addProductToList(targetLi.dataset.ean); });
    if(elements.addToListBtn) elements.addToListBtn.addEventListener('click', () => addProductToList());

    // =================================================================
    // RENDEROWANIE LISTY I EKSPORT
    // =================================================================
    function renderScannedList() {
        elements.scannedListBody.innerHTML = '';
        const canOperate = scannedItems.length > 0;
        [elements.exportCsvBtn, elements.exportExcelBtn, elements.printListBtn, elements.clearListBtn].forEach(btn => { if(btn) btn.disabled = !canOperate; });
        scannedItems.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.name}</td><td>${item.description}</td><td>${item.ean}</td><td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}" inputmode="numeric"></td><td><button class="delete-btn" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>`;
            elements.scannedListBody.appendChild(row);
        });
        const totalValue = scannedItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0);
        elements.totalOrderValue.textContent = `Wartość sumaryczna: ${totalValue.toFixed(2)} PLN`;
    }
    
    if(elements.scannedListBody) {
        elements.scannedListBody.addEventListener('input', e => { if (e.target.classList.contains('quantity-in-table')) { const index = e.target.dataset.index; const newQuantity = parseInt(e.target.value, 10); if (newQuantity > 0) { scannedItems[index].quantity = newQuantity; renderScannedList(); saveDataToServer(); } } });
        elements.scannedListBody.addEventListener('click', e => { const deleteButton = e.target.closest('.delete-btn'); if (deleteButton) { scannedItems.splice(deleteButton.dataset.index, 1); renderScannedList(); saveDataToServer(); } });
    }

    function getSafeFilename() {
        const clientName = elements.clientNameInput.value.trim().replace(/[^a-z0-9]/gi, '_') || 'zamowienie';
        const date = new Date().toLocaleDateString('sv').slice(0, 10); // Format YYYY-MM-DD
        return `${clientName}_${date}`;
    }

    // ZMIANA: Usunięto nagłówki, dynamiczna nazwa pliku
    function exportToCsvOptima() {
        if (scannedItems.length === 0) return;
        const rows = scannedItems.map(item => `${item.ean};${item.quantity}`);
        const csvContent = rows.join('\n');
        downloadFile(csvContent, 'text/csv;charset=utf-8;', `${getSafeFilename()}_optima.csv`);
    }
    if(elements.exportCsvBtn) elements.exportCsvBtn.addEventListener('click', exportToCsvOptima);

    // ZMIANA: Dynamiczna nazwa pliku
    function exportToExcelDetailed() {
        if (scannedItems.length === 0) return;
        const headers = '"EAN";"Kod Produktu";"Nazwa Produktu";"Ilość";"Cena Jednostkowa"';
        const rows = scannedItems.map(item => { const priceFormatted = (parseFloat(item.price) || 0).toFixed(2).replace('.', ','); return `"${item.ean || ''}";"${(item.name || '').replace(/"/g, '""')}";"${(item.description || '').replace(/"/g, '""')}";"${item.quantity || 0}";"${priceFormatted}"`; });
        const csvContent = `\uFEFF${headers}\n${rows.join('\n')}`;
        downloadFile(csvContent, 'text/csv;charset=utf-8;', `${getSafeFilename()}_szczegoly.csv`);
    }
    if(elements.exportExcelBtn) elements.exportExcelBtn.addEventListener('click', exportToExcelDetailed);
    
    function downloadFile(content, mimeType, filename) {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // ZMIANA: Uproszczona funkcja przygotowania do druku
    function prepareForPrint() {
        elements.printTableBody.innerHTML = '';
        scannedItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.name}</td><td>${item.description}</td><td>${item.ean}</td><td>${item.quantity}</td>`;
            elements.printTableBody.appendChild(row);
        });
    }

    if (elements.printListBtn) elements.printListBtn.addEventListener('click', () => { prepareForPrint(); window.print(); });
    if (elements.clearListBtn) elements.clearListBtn.addEventListener('click', () => { if (scannedItems.length > 0 && confirm('Czy na pewno chcesz wyczyścić zamówienie?')) { scannedItems = []; elements.clientNameInput.value = ''; elements.additionalInfoInput.value = ''; renderScannedList(); saveDataToServer(); } });
    
    // Inicjalizacja
    checkLoginStatus();
});
