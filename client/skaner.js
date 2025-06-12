document.addEventListener('DOMContentLoaded', () => {

    // === Wykrywanie urządzeń mobilnych i pokazanie przycisku kamery ===
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0);
    const startCameraBtn = document.getElementById('startCameraBtn');

    if (isMobile && startCameraBtn) {
        startCameraBtn.style.display = 'flex';
    }
    // =================================================================

    // === Konfiguracja ===
    const MAILTO_LENGTH_LIMIT = 3000;
    const STATUS_MESSAGE_TIMEOUT = 5000;

    // === ELEMENTY HTML ===
    const loginOverlay = document.getElementById('loginOverlay');
    const appContainer = document.getElementById('appContainer');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const registerUsernameInput = document.getElementById('registerUsername');
    const registerPasswordInput = document.getElementById('registerPassword');
    const registerBtn = document.getElementById('registerBtn');
    const registerError = document.getElementById('registerError');

    const fabInventoryBtn = document.getElementById('fabInventoryBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const moonClass = "fa-moon";
    const sunClass = "fa-sun";

    const elements = {
        statusP: document.getElementById('status'),
        tabLookupBtn: document.getElementById('tabLookupBtn'),
        tabListBuilderBtn: document.getElementById('tabListBuilderBtn'),
        lookupMode: document.getElementById('lookupMode'),
        listBuilderMode: document.getElementById('listBuilderMode'),
        startCameraBtn: document.getElementById('startCameraBtn'),
        cameraScannerSection: document.getElementById('cameraScannerSection'),
        cameraReader: document.getElementById('camera-reader'),
        stopCameraBtn: document.getElementById('stopCameraBtn'),
        lookupBarcodeInput: document.getElementById('lookupBarcode_Input'),
        lookupResultDiv: document.getElementById('lookupResult'),
        listBarcodeInput: document.getElementById('listBarcode_Input'),
        listBuilderSearchResults: document.getElementById('listBuilderSearchResults'),
        quantityInput: document.getElementById('quantityInput'),
        addToListBtn: document.getElementById('addToListBtn'),
        scannedListBody: document.getElementById('scannedListBody'),
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        exportExcelBtn: document.getElementById('exportExcelBtn'),
        printListBtn: document.getElementById('printListBtn'),
        clearListBtn: document.getElementById('clearListBtn'),
        sendEmailBtn: document.getElementById('sendEmailBtn'),
        clientNameInput: document.getElementById('clientNameInput'),
        additionalInfoInput: document.getElementById('additionalInfoInput'),
        totalOrderValue: document.getElementById('totalOrderValue'),
        inventoryModule: document.getElementById('inventoryModule'),
        closeInventoryModalBtn: document.getElementById('closeInventoryModalBtn'),
        closeInventoryModalBtnBottom: document.getElementById('closeInventoryModalBtnBottom'),
        inventoryEanInput: document.getElementById('inventoryEanInput'),
        inventoryQuantityInput: document.getElementById('inventoryQuantityInput'),
        inventoryAddBtn: document.getElementById('inventoryAddBtn'),
        inventoryListBody: document.getElementById('inventoryListBody'),
        inventoryExportCsvBtn: document.getElementById('inventoryExportCsvBtn'),
        inventorySearchResults: document.getElementById('inventorySearchResults'),
        tabAdminBtn: document.getElementById('tabAdminBtn'),
        adminPanel: document.getElementById('adminPanel'),
        pendingUsersList: document.getElementById('pendingUsersList'),
        // Pływające przyciski
        floatingControls: document.getElementById('floatingControls'),
        logoutBtn: document.getElementById('logoutBtn'),
        scrollTopBtn: document.getElementById('scrollTopBtn'),
        scrollBottomBtn: document.getElementById('scrollBottomBtn'),
        scannedListTable: document.querySelector('#listBuilderMode table')
    };

    // =================================================================
    // SPRAWDZENIE LOGOWANIA PRZY STARCIE
    // =================================================================
    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: { 'x-auth-token': token }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Automatyczne logowanie pomyślne dla:', userData.username);
                showApp(userData);
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Błąd weryfikacji tokenu:', error);
        }
    };
    
    // =================================================================
    // FUNKCJE POMOCNICZE UI
    // =================================================================
    const showApp = (userData) => {
        loginOverlay.style.display = 'none';
        appContainer.style.display = 'block';
        if (fabInventoryBtn) fabInventoryBtn.style.display = 'flex';
        // ZMIANA: Pokazanie pływających przycisków
        if (elements.floatingControls) elements.floatingControls.style.display = 'flex';
        initializeApp(userData);
    };

    const initializeApp = (userData) => {
        loadDataFromServer();
        loadUserDataFromServer();
        if (userData && userData.role === 'admin') {
            if(elements.tabAdminBtn) elements.tabAdminBtn.style.display = 'block';
        }
    };

    // === SEKCJA LOGOWANIA I REJESTRACJI ===
    if (showRegister) showRegister.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; loginError.textContent = ''; registerError.textContent = ''; });
    if (showLogin) showLogin.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'block'; registerForm.style.display = 'none'; loginError.textContent = ''; registerError.textContent = ''; });

    async function handleRegistration() {
        const username = registerUsernameInput.value.trim();
        const password = registerPasswordInput.value.trim();
        if (!username || !password) {
            registerError.textContent = 'Login i hasło są wymagane.';
            return;
        }
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) {
                registerError.textContent = data.msg || 'Wystąpił błąd serwera.';
            } else {
                alert('Rejestracja pomyślna! Twoje konto musi zostać aktywowane przez administratora.');
                showLogin.click();
                loginUsernameInput.value = username;
                loginPasswordInput.value = '';
            }
        } catch (error) {
            console.error('Błąd rejestracji:', error);
            registerError.textContent = 'Nie można połączyć się z serwerem.';
        }
    }

    async function attemptLogin() {
        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                loginError.textContent = data.msg || 'Wystąpił błąd';
                return;
            }
            localStorage.setItem('token', data.token);
            showApp(data.user);
        } catch (error) {
            console.error('Błąd logowania:', error);
            loginError.textContent = 'Nie można połączyć się z serwerem.';
        }
    }

    if (registerBtn) registerBtn.addEventListener('click', handleRegistration);
    if (loginBtn) loginBtn.addEventListener('click', attemptLogin);
    if (loginPasswordInput) loginPasswordInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') attemptLogin(); });
    if (loginUsernameInput) loginUsernameInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && loginPasswordInput) loginPasswordInput.focus(); });

    // === TRYB CIEMNY ===
    function setDarkMode(isDark) { const iconElement = darkModeToggle ? darkModeToggle.querySelector('i') : null; if (iconElement) { if (isDark) { document.body.classList.add('dark-mode'); iconElement.classList.remove(moonClass); iconElement.classList.add(sunClass); localStorage.setItem('theme', 'dark'); } else { document.body.classList.remove('dark-mode'); iconElement.classList.remove(sunClass); iconElement.classList.add(moonClass); localStorage.setItem('theme', 'light'); } } try { const pColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(); if (pColor) { const rgb = pColor.startsWith('#') ? hexToRgb(pColor) : parseRgb(pColor); if (rgb) document.documentElement.style.setProperty('--primary-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`); } } catch (e) {} }
    function hexToRgb(hex) { const s = /^#?([a-f\d])([a-f\d])([a-f\d])$/i; hex = hex.replace(s, (m, r, g, b) => r + r + g + g + b + b); const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return res ? { r: parseInt(res[1], 16), g: parseInt(res[2], 16), b: parseInt(res[3], 16) } : null; }
    function parseRgb(rgbString) { const res = /rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)/.exec(rgbString); return res ? { r: parseInt(res[1]), g: parseInt(res[2]), b: parseInt(res[3]) } : null; }
    if (darkModeToggle) darkModeToggle.addEventListener('click', () => setDarkMode(!document.body.classList.contains('dark-mode')));
    setDarkMode(localStorage.getItem('theme') === 'dark');

    // === GŁÓWNA LOGIKA APLIKACJI ===
    let productDatabase = [];
    let scannedItems = [];
    let inventoryItems = [];
    let html5QrCode = null;
    let activeTab = 'lookup';

    // FUNKCJE DO OBSŁUGI DANYCH Z SERWERA
    async function loadUserDataFromServer() {
        const token = localStorage.getItem('token');
        if (!token) { console.log("Brak tokena."); return; }
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
            alert("Wystąpił błąd podczas wczytywania Twoich list.");
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
            console.log("Dane zapisane na serwerze.");
        } catch (error) {
            console.error('Błąd zapisu danych na serwerze:', error);
        }
    }
    
    function loadDataFromServer() {
        if (!elements.statusP) return;
        elements.statusP.textContent = 'Ładowanie bazy produktów...';
        elements.statusP.style.color = 'var(--warning-color)';
        elements.statusP.style.display = 'block';
        
        function fetchAndParseCsv(filename) { return fetch(filename).then(r => r.ok ? r.arrayBuffer() : Promise.reject(`Błąd sieci dla ${filename}`)).then(b => new TextDecoder("Windows-1250").decode(b)).then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: rts => res(rts.data), error: () => rej(`Błąd parsowania ${filename}`) }))); }
        Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')])
            .then(([data1, data2]) => {
                const mapData = p => ({
                    kod_kreskowy: String(p.kod_kreskowy || "").trim(),
                    nazwa_produktu: String(p.nazwa_produktu || "").trim(),
                    cena: String(p.opis || "0").replace(',', '.').trim() || "0",
                    opis: String(p.cena || "").trim()
                });
                productDatabase = [...data1.map(mapData), ...data2.map(mapData)];
                elements.statusP.textContent = `Baza danych załadowana (${productDatabase.length} pozycji). Gotowy do pracy.`;
                elements.statusP.style.color = 'var(--success-color)';
                setTimeout(() => { if (elements.statusP) elements.statusP.style.display = 'none'; }, STATUS_MESSAGE_TIMEOUT);
                [elements.lookupBarcodeInput, elements.listBarcodeInput, elements.quantityInput, elements.addToListBtn, elements.startCameraBtn, elements.clientNameInput, elements.additionalInfoInput, elements.inventoryEanInput, elements.inventoryQuantityInput, elements.inventoryAddBtn].forEach(el => { if (el) el.disabled = false; });
                if (elements.lookupBarcodeInput) elements.lookupBarcodeInput.focus();
            }).catch(error => {
                console.error('Krytyczny błąd ładowania danych:', error);
                if (elements.statusP) { elements.statusP.textContent = `BŁĄD: ${error}. Sprawdź pliki CSV.`; elements.statusP.style.color = 'var(--danger-color)'; }
            });
    }

    function switchTab(newTab) {
        activeTab = newTab;
        [elements.lookupMode, elements.listBuilderMode, elements.adminPanel].forEach(el => el.classList.remove('active'));
        [elements.tabLookupBtn, elements.tabListBuilderBtn, elements.tabAdminBtn].forEach(el => el.classList.remove('active'));
        if (newTab === 'lookup') {
            elements.lookupMode.classList.add('active');
            elements.tabLookupBtn.classList.add('active');
            if (elements.lookupBarcodeInput && !elements.lookupBarcodeInput.disabled) elements.lookupBarcodeInput.focus();
        } else if (newTab === 'listBuilder') {
            elements.listBuilderMode.classList.add('active');
            elements.tabListBuilderBtn.classList.add('active');
            if (elements.listBarcodeInput && !elements.listBarcodeInput.disabled) elements.listBarcodeInput.focus();
        } else if (newTab === 'admin') {
            elements.adminPanel.classList.add('active');
            elements.tabAdminBtn.classList.add('active');
            loadPendingUsers();
        }
        if (elements.listBuilderSearchResults) elements.listBuilderSearchResults.innerHTML = '';
        if (elements.lookupResultDiv) { elements.lookupResultDiv.innerHTML = ''; elements.lookupResultDiv.style.display = 'none'; }
    }
    if(elements.tabLookupBtn) elements.tabLookupBtn.addEventListener('click', () => switchTab('lookup'));
    if(elements.tabListBuilderBtn) elements.tabListBuilderBtn.addEventListener('click', () => switchTab('listBuilder'));
    if(elements.tabAdminBtn) elements.tabAdminBtn.addEventListener('click', () => switchTab('admin'));

    
    // === LOGIKA PANELU ADMINA ===
    async function loadPendingUsers() {
        if(!elements.pendingUsersList) return;
        elements.pendingUsersList.innerHTML = '<p>Ładowanie...</p>';
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/pending-users', { headers: { 'x-auth-token': token } });
            if(!response.ok) throw new Error('Nie udało się pobrać użytkowników.');
            const users = await response.json();
            elements.pendingUsersList.innerHTML = users.length === 0 ? '<p>Brak użytkowników do akceptacji.</p>' : '';
            users.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.innerHTML = `<span>${user.username}</span><div><button class="approve-user-btn" data-userid="${user._id}">Akceptuj</button><button class="reject-user-btn" data-userid="${user._id}">Odrzuć</button></div>`;
                elements.pendingUsersList.appendChild(userDiv);
            });
        } catch (error) {
            elements.pendingUsersList.innerHTML = `<p style="color:var(--danger-color);">${error.message}</p>`;
        }
    }
    
    async function handleUserApproval(userId, action) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/${action}-user/${userId}`, { method: 'POST', headers: { 'x-auth-token': token } });
            if(!response.ok) { const data = await response.json(); throw new Error(data.msg || 'Wystąpił błąd.'); }
            alert(`Użytkownik został ${action === 'approve' ? 'zaakceptowany' : 'odrzucony'}.`);
            loadPendingUsers();
        } catch (error) {
            alert(`Błąd: ${error.message}`);
        }
    }
    if(elements.pendingUsersList) elements.pendingUsersList.addEventListener('click', e => { const target = e.target; if (target.classList.contains('approve-user-btn')) handleUserApproval(target.dataset.userid, 'approve'); else if (target.classList.contains('reject-user-btn')) handleUserApproval(target.dataset.userid, 'reject'); });

    // === SKANER I WYSZUKIWANIE ===
    function onScanSuccess(decodedText) { let processedCode = (decodedText.length === 13 && decodedText.startsWith('0')) ? decodedText.substring(1) : decodedText; if (elements.inventoryModule.style.display === 'flex') { if(elements.inventoryEanInput) elements.inventoryEanInput.value = processedCode; handleInventorySearch(true); } else if (activeTab === 'lookup') { if(elements.lookupBarcodeInput) elements.lookupBarcodeInput.value = processedCode; handleLookupSearch(); } else { if(elements.listBarcodeInput) elements.listBarcodeInput.value = processedCode; handleListBuilderSearch(); } stopCamera(); }
    function startCamera() { if (!html5QrCode) { if (typeof Html5Qrcode === 'undefined') { alert("Błąd: Biblioteka skanera niezaładowana."); return; } html5QrCode = new Html5Qrcode("camera-reader"); } if (elements.cameraScannerSection) elements.cameraScannerSection.style.display = 'block'; const config = { fps: 10, qrbox: { width: 250, height: 150 }, formatsToSupport: [ Html5QrcodeSupportedFormats.EAN_13 ]}; html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {}).catch(() => alert("Błąd kamery. Sprawdź pozwolenia przeglądarki i użyj HTTPS.")); }
    function stopCamera() { if (html5QrCode && html5QrCode.isScanning) { html5QrCode.stop().catch(err => console.error("Błąd zatrzymania kamery:", err)); } if (elements.cameraScannerSection) elements.cameraScannerSection.style.display = 'none'; }
    if(elements.startCameraBtn) elements.startCameraBtn.addEventListener('click', startCamera);
    if(elements.stopCameraBtn) elements.stopCameraBtn.addEventListener('click', stopCamera);
    
    function performSearch(searchTerm) {
        if (!searchTerm) return [];
        const term = searchTerm.toLowerCase();
        return productDatabase.filter(p =>
            (p.kod_kreskowy && p.kod_kreskowy.toLowerCase().includes(term)) ||
            (p.nazwa_produktu && p.nazwa_produktu.toLowerCase().includes(term)) ||
            (p.opis && p.opis.toLowerCase().includes(term))
        );
    }
    
    function handleLookupSearch() { const searchTerm = elements.lookupBarcodeInput.value.trim(); elements.lookupResultDiv.innerHTML = ''; elements.lookupResultDiv.style.display = 'none'; if (!searchTerm) return; const foundProducts = performSearch(searchTerm); if (foundProducts.length === 1) { displaySingleProductInLookup(foundProducts[0]); } else if (foundProducts.length > 0) { displayProductListInLookup(foundProducts); } else { elements.lookupResultDiv.innerHTML = '<p>Nie znaleziono produktu.</p>'; elements.lookupResultDiv.style.display = 'block'; } }
    if(elements.lookupBarcodeInput) elements.lookupBarcodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLookupSearch(); });

    function displaySingleProductInLookup(product) { if (!elements.lookupResultDiv) return; elements.lookupResultDiv.innerHTML = `<h2>${product.nazwa_produktu}</h2><div class="info-row"><strong>Kod EAN:</strong> <span>${product.kod_kreskowy}</span></div><div class="info-row"><strong>Opis:</strong> <span>${product.opis}</span></div> <div class="info-row"><strong>Cena:</strong> <span id="lookupPrice">${parseFloat(product.cena).toFixed(2)} PLN</span></div>`; elements.lookupResultDiv.style.display = 'block'; }
    function displayProductListInLookup(products) { if (!elements.lookupResultDiv) return; let listHtml = `<h2>Znaleziono ${products.length} produktów:</h2><ul>`; products.forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.nazwa_produktu} <small>(EAN: ${p.kod_kreskowy}, Opis: ${p.opis})</small></li>`; }); listHtml += '</ul>'; elements.lookupResultDiv.innerHTML = listHtml; elements.lookupResultDiv.style.display = 'block'; }
    if(elements.lookupResultDiv) elements.lookupResultDiv.addEventListener('click', (event) => { const targetLi = event.target.closest('li'); if (targetLi && targetLi.dataset.ean) { const product = productDatabase.find(p => p.kod_kreskowy === targetLi.dataset.ean); if (product) displaySingleProductInLookup(product); } });

    // ZMIANA: Usunięto walidację, aby akceptować dowolny tekst
    function addProductToList(eanCode = null) {
        const ean = eanCode || elements.listBarcodeInput.value.trim();
        const quantity = parseInt(elements.quantityInput.value, 10);
        if (!ean || isNaN(quantity) || quantity < 1) {
            alert("Podaj kod/EAN i prawidłową ilość.");
            return;
        }
        let productData = productDatabase.find(p => p.kod_kreskowy === ean);
        if (!productData) {
            productData = { kod_kreskowy: ean, nazwa_produktu: `PRODUKT NIEZNANY`, opis: '---', cena: "0" };
        }
        const existingItem = scannedItems.find(item => item.ean === ean);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            scannedItems.push({ ean: productData.kod_kreskowy, name: productData.nazwa_produktu, description: productData.opis, quantity: quantity, price: productData.cena });
        }
        renderScannedList();
        saveDataToServer();
        elements.listBarcodeInput.value = '';
        elements.quantityInput.value = '1';
        if (elements.listBuilderSearchResults) {
            elements.listBuilderSearchResults.innerHTML = '';
            elements.listBuilderSearchResults.style.display = 'none';
        }
        elements.listBarcodeInput.focus();
    }
    if(elements.addToListBtn) elements.addToListBtn.addEventListener('click', () => addProductToList());

    // ZMIANA: Uproszczona logika wyszukiwania, która od razu dodaje nieznany produkt
    function handleListBuilderSearch() {
        const searchTerm = elements.listBarcodeInput.value.trim();
        elements.listBuilderSearchResults.innerHTML = '';
        elements.listBuilderSearchResults.style.display = 'none';
        if (!searchTerm) return;
        
        const results = performSearch(searchTerm);

        if (results.length === 1 && (results[0].kod_kreskowy === searchTerm || results[0].nazwa_produktu === searchTerm)) {
             addProductToList(results[0].kod_kreskowy);
        } else if (results.length > 0) {
            let listHtml = '<ul>';
            results.forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.nazwa_produktu} <small>(EAN: ${p.kod_kreskowy}, Opis: ${p.opis})</small></li>`; });
            listHtml += '</ul>';
            elements.listBuilderSearchResults.innerHTML = listHtml;
            elements.listBuilderSearchResults.style.display = 'block';
        } else {
             // Jeśli nic nie znaleziono, od razu dodaj jako produkt nieznany
             addProductToList(searchTerm);
        }
    }
    if(elements.listBarcodeInput) elements.listBarcodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleListBuilderSearch();} });
    if(elements.listBuilderSearchResults) elements.listBuilderSearchResults.addEventListener('click', (event) => { const targetLi = event.target.closest('li'); if (targetLi && targetLi.dataset.ean) addProductToList(targetLi.dataset.ean); });
    
    function calculateAndDisplayTotalValue() { if (!elements.totalOrderValue) return; let totalValue = scannedItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0); elements.totalOrderValue.textContent = `Wartość sumaryczna: ${totalValue.toFixed(2)} PLN`; }
    function renderScannedList() { if(!elements.scannedListBody) return; elements.scannedListBody.innerHTML = ''; const canOperate = scannedItems.length > 0; [elements.exportCsvBtn, elements.sendEmailBtn, elements.exportExcelBtn, elements.printListBtn, elements.clearListBtn].forEach(btn => { if(btn) btn.disabled = !canOperate; }); scannedItems.forEach((item, index) => { const row = document.createElement('tr'); row.innerHTML = `<td>${item.name}</td><td>${item.description}</td><td>${item.ean}</td><td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}" inputmode="numeric"></td><td><button class="delete-btn" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>`; elements.scannedListBody.appendChild(row); }); calculateAndDisplayTotalValue(); }
    if(elements.scannedListBody) { elements.scannedListBody.addEventListener('input', e => { if (e.target.classList.contains('quantity-in-table')) { const index = e.target.dataset.index; const newQuantity = parseInt(e.target.value, 10); if (newQuantity > 0) { scannedItems[index].quantity = newQuantity; calculateAndDisplayTotalValue(); saveDataToServer(); } } }); elements.scannedListBody.addEventListener('click', e => { const deleteButton = e.target.closest('.delete-btn'); if (deleteButton) { scannedItems.splice(deleteButton.dataset.index, 1); renderScannedList(); saveDataToServer(); } }); }
    
    function exportToCsvOptima() { if (scannedItems.length === 0) return; const headers = '[TwrKOD];[Ilosc]'; const rows = scannedItems.map(item => `${item.ean};${item.quantity}`); const csvContent = `${headers}\n${rows.join('\n')}`; downloadFile(csvContent, 'text/csv;charset=utf-8;', `inwentaryzacja_optima_${new Date().toLocaleDateString('pl-PL').replace(/\./g,'-')}.csv`); }
    if(elements.exportCsvBtn) elements.exportCsvBtn.addEventListener('click', exportToCsvOptima);
    function exportToExcelDetailed() { if (scannedItems.length === 0) return; const headers = '"EAN";"Kod Produktu";"Nazwa Produktu";"Ilość";"Cena Jednostkowa"'; const rows = scannedItems.map(item => { const priceFormatted = (parseFloat(item.price) || 0).toFixed(2).replace('.', ','); return `"${item.ean || ''}";"${(item.name || '').replace(/"/g, '""')}";"${(item.description || '').replace(/"/g, '""')}";"${item.quantity || 0}";"${priceFormatted}"`; }); const csvContent = `\uFEFF${headers}\n${rows.join('\n')}`; downloadFile(csvContent, 'text/csv;charset=utf-8;', `lista_szczegolowa_${new Date().toLocaleDateString('pl-PL').replace(/\./g,'-')}.csv`); }
    if(elements.exportExcelBtn) elements.exportExcelBtn.addEventListener('click', exportToExcelDetailed);
    function downloadFile(content, mimeType, filename) { const blob = new Blob([content], { type: mimeType }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); }
    function sendEmail() { if (scannedItems.length === 0) { alert("Lista jest pusta."); return; } const recipient = "biuro@e-dekor.pl"; const clientName = elements.clientNameInput.value.trim() || "Brak klienta"; const additionalInfo = elements.additionalInfoInput.value.trim(); const date = new Date().toLocaleString('pl-PL'); const totalValueStr = scannedItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0).toFixed(2) + " PLN"; let body = `Klient: ${clientName}\nData: ${date}\nWartość: ${totalValueStr}\n`; if (additionalInfo) body += `Informacje dodatkowe: ${additionalInfo}\n`; body += `\nPozycje:\n=====================================\n`; scannedItems.forEach(item => { const itemPrice = parseFloat(item.price||0); const itemTotalValue = itemPrice*item.quantity; body += `Kod Produktu: ${item.name||''}\nNazwa: ${item.description||''}\nEAN: ${item.ean||''}\nIlość: ${item.quantity}\nCena jedn.: ${itemPrice.toFixed(2)} PLN\nWartość: ${itemTotalValue.toFixed(2)} PLN\n-------------------------------------\n`; }); body += "\nUwaga: Plik CSV dla Optima dołącz ręcznie."; const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(`Zamówienie: ${clientName}`)}&body=${encodeURIComponent(body)}`; if (mailtoLink.length > MAILTO_LENGTH_LIMIT) { alert(`Lista jest zbyt długa, aby wysłać ją e-mailem.`); return; } window.location.href = mailtoLink; }
    if(elements.sendEmailBtn) elements.sendEmailBtn.addEventListener('click', sendEmail);
    function prepareForPrint() { document.getElementById('print-client-name').textContent = elements.clientNameInput.value.trim() ? `Zamówienie dla: ${elements.clientNameInput.value.trim()}` : 'Zamówienie'; const printAdditionalInfo = document.getElementById('print-additional-info'); printAdditionalInfo.textContent = elements.additionalInfoInput.value.trim() ? `Informacje dodatkowe: ${elements.additionalInfoInput.value.trim()}` : ''; printAdditionalInfo.style.display = elements.additionalInfoInput.value.trim() ? 'block' : 'none'; document.getElementById('print-total-value').textContent = elements.totalOrderValue.textContent; const printTableBody = document.getElementById('print-table-body'); printTableBody.innerHTML = ''; scannedItems.forEach(item => { const row = document.createElement('tr'); row.innerHTML = `<td>${item.name}</td><td>${item.description}</td><td>${item.ean}</td><td>${item.quantity}</td>`; printTableBody.appendChild(row); }); }
    if (elements.printListBtn) elements.printListBtn.addEventListener('click', () => { prepareForPrint(); window.print(); });
    if (elements.clearListBtn) elements.clearListBtn.addEventListener('click', () => { if (scannedItems.length > 0 && confirm('Czy na pewno chcesz wyczyścić zamówienie?')) { scannedItems = []; if (elements.clientNameInput) elements.clientNameInput.value = ''; if (elements.additionalInfoInput) elements.additionalInfoInput.value = ''; renderScannedList(); saveDataToServer(); } });

    // === MODUŁ INWENTARYZACJI ===
    function openInventoryModule() { if (elements.inventoryModule) elements.inventoryModule.style.display = 'flex'; if(elements.inventoryEanInput && !elements.inventoryEanInput.disabled) elements.inventoryEanInput.focus(); }
    function closeInventoryModule() { if (elements.inventoryModule) { elements.inventoryModule.style.display = 'none'; if(elements.inventorySearchResults) elements.inventorySearchResults.innerHTML = '';}}
    if(fabInventoryBtn) fabInventoryBtn.addEventListener('click', openInventoryModule);
    if(elements.closeInventoryModalBtn) elements.closeInventoryModalBtn.addEventListener('click', closeInventoryModule);
    if(elements.closeInventoryModalBtnBottom) elements.closeInventoryModalBtnBottom.addEventListener('click', closeInventoryModule);
    function addInventoryItem(ean) { const eanCode = ean || elements.inventoryEanInput.value.trim(); const quantity = parseInt(elements.inventoryQuantityInput.value, 10); if (!eanCode || isNaN(quantity) || quantity < 1) { alert("Podaj EAN i ilość."); return; } const existing = inventoryItems.find(i => i.ean === eanCode); if (existing) { existing.quantity += quantity; } else { const product = productDatabase.find(p => p.kod_kreskowy === eanCode); inventoryItems.push({ ean: eanCode, name: product ? (product.opis || product.nazwa_produktu) : 'EAN spoza bazy', quantity }); } renderInventoryList(); saveDataToServer(); elements.inventoryEanInput.value = ''; elements.inventoryQuantityInput.value = '1'; elements.inventoryEanInput.focus(); }
    if(elements.inventoryAddBtn) elements.inventoryAddBtn.addEventListener('click',()=>addInventoryItem());
    function handleInventorySearch(fromScan = false){ if(!elements.inventoryEanInput || !elements.inventorySearchResults)return; const searchTerm = elements.inventoryEanInput.value.trim(); if(!searchTerm) { elements.inventorySearchResults.style.display='none'; return; } const results = performSearch(searchTerm); if(results.length === 1 && (fromScan || results[0].kod_kreskowy === searchTerm)) { addInventoryItem(results[0].kod_kreskowy); } else if (results.length > 0) { let list = '<ul>'; results.forEach(p => { list += `<li data-ean="${p.kod_kreskowy}">${p.nazwa_produktu} <small>(${p.opis})</small></li>`; }); list += '</ul>'; elements.inventorySearchResults.innerHTML = list; elements.inventorySearchResults.style.display = 'block'; } else { addInventoryItem(searchTerm); } }
    if(elements.inventoryEanInput) elements.inventoryEanInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); handleInventorySearch(); }});
    if(elements.inventoryQuantityInput) elements.inventoryQuantityInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); addInventoryItem(); }});
    if(elements.inventorySearchResults) elements.inventorySearchResults.addEventListener('click', e => { const li = e.target.closest('li'); if(li && li.dataset.ean) { elements.inventoryEanInput.value = li.dataset.ean; elements.inventoryQuantityInput.focus(); elements.inventorySearchResults.style.display = 'none'; }});
    function renderInventoryList(){ if (!elements.inventoryListBody || !elements.inventoryExportCsvBtn) return; elements.inventoryListBody.innerHTML = ''; elements.inventoryExportCsvBtn.disabled = inventoryItems.length === 0; inventoryItems.forEach((item, index) => { const row = document.createElement('tr'); row.innerHTML = `<td>${item.name}</td><td>${item.ean}</td><td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-inv-index="${index}" inputmode="numeric"></td><td><button class="delete-btn" data-inv-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>`; elements.inventoryListBody.appendChild(row); }); }
    if(elements.inventoryListBody){ elements.inventoryListBody.addEventListener('input', e => { if (e.target.classList.contains('quantity-in-table') && e.target.dataset.invIndex) { const index = parseInt(e.target.dataset.invIndex); const quantity = parseInt(e.target.value); if (quantity > 0) { inventoryItems[index].quantity = quantity; saveDataToServer(); } } }); elements.inventoryListBody.addEventListener('click', e => { const btn = e.target.closest('.delete-btn'); if (btn && btn.dataset.invIndex) { inventoryItems.splice(parseInt(btn.dataset.invIndex), 1); renderInventoryList(); saveDataToServer(); } }); }
    function exportInventoryToCsv(){ if(inventoryItems.length===0) return; const content = inventoryItems.map(i => `${i.ean};${i.quantity}`).join('\n'); downloadFile(content, 'text/csv;charset=utf-8;', `inwentaryzacja_${new Date().toLocaleDateString('pl-PL').replace(/\./g,'-')}.csv`); }
    if(elements.inventoryExportCsvBtn)elements.inventoryExportCsvBtn.addEventListener('click',exportInventoryToCsv);

    // === LOGIKA PŁYWAJĄCYCH PRZYCISKÓW ===
    function handleLogout() { localStorage.removeItem('token'); location.reload(); }
    if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', handleLogout);
    if (elements.scrollTopBtn) elements.scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    if (elements.scrollBottomBtn && elements.scannedListTable) elements.scrollBottomBtn.addEventListener('click', () => elements.scannedListTable.scrollIntoView({ behavior: 'smooth', block: 'end' }));

    // === USPRAWNIENIE PÓL "ILOŚĆ" ===
    const handleQuantityFocus = (event) => { event.target.select(); };
    if (elements.quantityInput) { elements.quantityInput.addEventListener('focus', handleQuantityFocus); elements.quantityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addProductToList(); } }); }
    if (elements.scannedListBody) { elements.scannedListBody.addEventListener('focusin', (e) => { if (e.target.classList.contains('quantity-in-table')) handleQuantityFocus(e); }); elements.scannedListBody.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('quantity-in-table')) { e.preventDefault(); e.target.blur(); } }); }

    // =================================================================
    // OSTATECZNE WYWOŁANIE PRZY STARCIE
    // =================================================================
    checkLoginStatus();
});
