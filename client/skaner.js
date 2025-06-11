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
        // NOWE ELEMENTY DLA PANELU ADMINA
        tabAdminBtn: document.getElementById('tabAdminBtn'),
        adminPanel: document.getElementById('adminPanel'),
        pendingUsersList: document.getElementById('pendingUsersList'),
        // NOWE ELEMENTY
        logoutBtn: document.getElementById('logoutBtn'),
        fabScrollTopBtn: document.getElementById('fabScrollTopBtn'),
        scrollToBottomBtn: document.getElementById('scrollToBottomBtn'),
        scannedListTable: document.querySelector('#listBuilderMode table') // Dodajemy dla przewijania
    };

    // =================================================================
    // NOWA SEKCJA - SPRAWDZENIE LOGOWANIA PRZY STARCIE
    // =================================================================
    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            // Jeśli nie ma tokenu, nic nie robimy, użytkownik musi się zalogować.
            return;
        }

        try {
            // Ten endpoint /api/auth/verify musisz stworzyć na swoim serwerze.
            // Powinien on zweryfikować token i zwrócić dane użytkownika, np. { username: 'admin', role: 'admin' }
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: { 'x-auth-token': token }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Automatyczne logowanie pomyślne dla:', userData.username);
                // Ukrywamy ekran logowania i pokazujemy aplikację
                loginOverlay.style.display = 'none';
                appContainer.style.display = 'block';
                if (fabInventoryBtn) fabInventoryBtn.style.display = 'flex';
                
                // Inicjalizacja aplikacji po zalogowaniu
                initializeApp(userData);
            } else {
                // Token jest nieprawidłowy lub wygasł
                localStorage.removeItem('token');
                loginError.textContent = 'Sesja wygasła, zaloguj się ponownie.';
            }
        } catch (error) {
            console.error('Błąd weryfikacji tokenu:', error);
            loginError.textContent = 'Błąd połączenia. Nie można zweryfikować sesji.';
        }
    };
    
    // =================================================================
    // NOWA SEKCJA - INICJALIZACJA APLIKACJI
    // =================================================================
    let initializeApp = (userData) => { // Zmieniamy na let, żeby móc ją nadpisać
        // Ta funkcja jest teraz wywoływana po udanym logowaniu (ręcznym lub automatycznym)
        loadDataFromServer(); // Ładuje bazę produktów
        loadUserDataFromServer(); // Ładuje listy i inwentaryzacje użytkownika
        
        // Sprawdzamy, czy użytkownik jest adminem
        if (userData && userData.role === 'admin') {
            if(elements.tabAdminBtn) elements.tabAdminBtn.style.display = 'block';
        }
    };


    // === SEKCJA LOGOWANIA I REJESTRACJI ===
    // MODYFIKACJA - Przełączanie formularzy
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            loginError.textContent = '';
            registerError.textContent = '';
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            loginError.textContent = '';
            registerError.textContent = '';
        });
    }

    // MODYFIKACJA - Logika rejestracji
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
                // MODYFIKACJA: Informujemy o konieczności akceptacji przez admina
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

    // MODYFIKACJA - Logika logowania
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
                // MODYFIKACJA: Obsługa błędu "konto niezatwierdzone"
                loginError.textContent = data.msg || 'Wystąpił błąd';
                return;
            }
            
            // Zapisujemy token
            localStorage.setItem('token', data.token);

            // Ukrywamy overlay i pokazujemy apkę
            loginOverlay.style.display = 'none';
            appContainer.style.display = 'block';
            if (fabInventoryBtn) fabInventoryBtn.style.display = 'flex';
            
            // Wywołujemy nową funkcję inicjalizującą
            initializeApp(data.user); // Zakładamy, że serwer zwraca { token: '...', user: { username: '...', role: '...' } }

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
        if (!token) {
            console.log("Brak tokena, nie można wczytać danych użytkownika.");
            return;
        }
        try {
            const headers = { 'x-auth-token': token };
            const productListResponse = await fetch('/api/data/productlist', { headers });
            const productListData = await productListResponse.json();
            
            scannedItems = productListData.items || [];
            if (elements.clientNameInput) elements.clientNameInput.value = productListData.clientName || '';
            
            renderScannedList();

            const inventoryResponse = await fetch('/api/data/inventory', { headers });
            const inventoryData = await inventoryResponse.json();

            inventoryItems = inventoryData.items || [];
            renderInventoryList();
        } catch (error) {
            console.error('Nie udało się wczytać danych użytkownika z serwera:', error);
            alert("Wystąpił błąd podczas wczytywania Twoich list.");
        }
    }

    async function saveDataToServer() {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const headers = {
                'Content-Type': 'application/json',
                'x-auth-token': token
            };
            await fetch('/api/data/productlist', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    clientName: elements.clientNameInput.value,
                    items: scannedItems
                })
            });
            await fetch('/api/data/inventory', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ items: inventoryItems })
            });
            console.log("Dane zapisane na serwerze.");
        } catch (error) {
            console.error('Błąd zapisu danych na serwerze:', error);
        }
    }
    
    // MODYFIKACJA: Ta funkcja powinna w przyszłości pobierać dane z API, a nie z CSV
    function loadDataFromServer() {
        if (!elements.statusP) { console.error("Element #status nie istnieje!"); return; }
        elements.statusP.textContent = 'Ładowanie bazy produktów...'; elements.statusP.style.color = 'var(--warning-color)'; elements.statusP.style.display = 'block';
        
        // DOCELOWO: Zamiast poniższego kodu, powinno być zapytanie do API serwera
        // np. fetch('/api/products').then(res => res.json()).then(data => { ... })
        function fetchAndParseCsv(filename) { return fetch(filename).then(r => { if (!r.ok) throw new Error(`Błąd sieci dla ${filename}: ${r.status} ${r.statusText}`); return r.arrayBuffer(); }).then(b => new TextDecoder("Windows-1250").decode(b)).then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: rts => res(rts.data), error: err => rej(new Error(`Błąd parsowania ${filename}`)) }))); }
        Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')])
            .then(([data1, data2]) => {
                const mapData = p => ({ kod_kreskowy: String(p.kod_kreskowy || "").trim(), nazwa_produktu: String(p.nazwa_produktu || "").trim(), cena: isNaN(parseFloat(String(p.opis || "0").replace(',', '.'))) ? "0" : String(p.opis || "0").replace(',', '.').trim(), opis: String(p.cena || "").trim() });
                productDatabase = data1.map(mapData).concat(data2.map(mapData));
                elements.statusP.textContent = `Baza danych załadowana (${productDatabase.length} pozycji). Gotowy do pracy.`;
                elements.statusP.style.color = 'var(--success-color)';
                setTimeout(() => { if (elements.statusP) elements.statusP.textContent = ''; }, STATUS_MESSAGE_TIMEOUT);
                const toEnable = [elements.lookupBarcodeInput, elements.listBarcodeInput, elements.quantityInput, elements.addToListBtn, elements.startCameraBtn, elements.clientNameInput, elements.additionalInfoInput, elements.inventoryEanInput, elements.inventoryQuantityInput, elements.inventoryAddBtn];
                toEnable.forEach(el => { if (el) el.disabled = false; });
                if (elements.lookupBarcodeInput) elements.lookupBarcodeInput.focus();
            }).catch(error => {
                console.error('Krytyczny błąd ładowania danych:', error);
                if (elements.statusP) { elements.statusP.textContent = `BŁĄD: ${error.message}. Sprawdź pliki CSV.`; elements.statusP.style.color = 'var(--danger-color)'; }
            });
    }

    // MODYFIKACJA - Przełączanie zakładek
    function switchTab(newTab) {
        activeTab = newTab;
        // Ukryj wszystkie zakładki
        [elements.lookupMode, elements.listBuilderMode, elements.adminPanel].forEach(el => el.classList.remove('active'));
        // Ukryj wszystkie przyciski zakładek
        [elements.tabLookupBtn, elements.tabListBuilderBtn, elements.tabAdminBtn].forEach(el => el.classList.remove('active'));

        // Pokaż wybraną zakładkę i aktywuj jej przycisk
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
            loadPendingUsers(); // Funkcja do załadowania użytkowników
        }

        // Czyszczenie wyników wyszukiwania przy zmianie zakładki
        if (elements.listBuilderSearchResults) elements.listBuilderSearchResults.innerHTML = '';
        if (elements.lookupResultDiv) { elements.lookupResultDiv.innerHTML = ''; elements.lookupResultDiv.style.display = 'none'; }
    }
    if(elements.tabLookupBtn) elements.tabLookupBtn.addEventListener('click', () => switchTab('lookup'));
    if(elements.tabListBuilderBtn) elements.tabListBuilderBtn.addEventListener('click', () => switchTab('listBuilder'));
    if(elements.tabAdminBtn) elements.tabAdminBtn.addEventListener('click', () => switchTab('admin'));

    
    // =================================================================
    // NOWA SEKCJA - LOGIKA PANELU ADMINISTRATORA
    // =================================================================
    async function loadPendingUsers() {
        if(!elements.pendingUsersList) return;
        elements.pendingUsersList.innerHTML = '<p>Ładowanie użytkowników...</p>';
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/pending-users', {
                headers: { 'x-auth-token': token }
            });

            if(!response.ok) {
                throw new Error('Nie udało się pobrać użytkowników.');
            }

            const users = await response.json();
            elements.pendingUsersList.innerHTML = '';

            if(users.length === 0) {
                elements.pendingUsersList.innerHTML = '<p>Brak użytkowników oczekujących na akceptację.</p>';
                return;
            }

            users.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.innerHTML = `
                    <span>${user.username}</span>
                    <button class="approve-user-btn" data-userid="${user._id}">Akceptuj</button>
                    <button class="reject-user-btn" data-userid="${user._id}">Odrzuć</button>
                `;
                elements.pendingUsersList.appendChild(userDiv);
            });

        } catch (error) {
            elements.pendingUsersList.innerHTML = `<p style="color:var(--danger-color);">${error.message}</p>`;
        }
    }
    
    async function handleUserApproval(userId, action) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/${action}-user/${userId}`, {
                method: 'POST',
                headers: { 'x-auth-token': token }
            });

            if(response.ok) {
                alert(`Użytkownik został ${action === 'approve' ? 'zaakceptowany' : 'odrzucony'}.`);
                loadPendingUsers(); // Odśwież listę
            } else {
                const data = await response.json();
                throw new Error(data.msg || 'Wystąpił błąd.');
            }
        } catch (error) {
            alert(`Błąd: ${error.message}`);
        }
    }

    if(elements.pendingUsersList) {
        elements.pendingUsersList.addEventListener('click', e => {
            if(e.target.classList.contains('approve-user-btn')) {
                handleUserApproval(e.target.dataset.userid, 'approve');
            } else if (e.target.classList.contains('reject-user-btn')) {
                handleUserApproval(e.target.dataset.userid, 'reject');
            }
        });
    }

    // --- Reszta kodu bez większych zmian ---
    // (funkcje skanera, wyszukiwania, list, inwentaryzacji itp.)
    
    function onScanSuccess(decodedText) { let processedCode = decodedText; if (processedCode.length === 13 && processedCode.startsWith('0')) processedCode = processedCode.substring(1); if (elements.inventoryModule && elements.inventoryModule.style.display === 'flex') { if(elements.inventoryEanInput) elements.inventoryEanInput.value = processedCode; handleInventorySearch(true); } else if (activeTab === 'lookup') { if(elements.lookupBarcodeInput) elements.lookupBarcodeInput.value = processedCode; handleLookupSearch(); } else { if(elements.listBarcodeInput) elements.listBarcodeInput.value = processedCode; handleListBuilderSearch(); } stopCamera(); }
    function startCamera() { if (!html5QrCode) { if (typeof Html5Qrcode !== 'undefined') html5QrCode = new Html5Qrcode("camera-reader"); else { alert("Brak biblioteki skanera."); return; }} if(elements.cameraScannerSection) elements.cameraScannerSection.style.display = 'block'; else return; const config = { fps: 10, qrbox: { width: 300, height: 150 }, formatsToSupport: [ Html5QrcodeSupportedFormats.EAN_13 ]}; html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {}).catch((err) => alert("Błąd kamery. Sprawdź pozwolenia i HTTPS.")); }
    function stopCamera() { if (html5QrCode && html5QrCode.isScanning) { html5QrCode.stop().catch(err => console.error("Błąd kamery:", err)); } if (elements.cameraScannerSection) elements.cameraScannerSection.style.display = 'none'; }
    if(elements.startCameraBtn) elements.startCameraBtn.addEventListener('click', startCamera);
    if(elements.stopCameraBtn) elements.stopCameraBtn.addEventListener('click', stopCamera);
    
    function displaySingleProductInLookup(product) { if (!elements.lookupResultDiv) return; elements.lookupResultDiv.innerHTML = `<h2>${product.nazwa_produktu}</h2><div class="info-row"><strong>Kod EAN:</strong> <span>${product.kod_kreskowy}</span></div><div class="info-row"><strong>Opis:</strong> <span>${product.opis}</span></div> <div class="info-row"><strong>Cena:</strong> <span id="lookupPrice">${parseFloat(product.cena).toFixed(2)} PLN</span></div>`; elements.lookupResultDiv.style.display = 'block'; }
    function displayProductListInLookup(products) { if (!elements.lookupResultDiv) return; let listHtml = `<h2>Znaleziono ${products.length} produktów:</h2><ul>`; products.forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.nazwa_produktu} <small>(EAN: ${p.kod_kreskowy}, Opis: ${p.opis}, Cena: ${parseFloat(p.cena).toFixed(2)} PLN)</small></li>`; }); listHtml += '</ul>'; elements.lookupResultDiv.innerHTML = listHtml; elements.lookupResultDiv.style.display = 'block'; }
    function handleLookupSearch() { if (!elements.lookupBarcodeInput || !elements.lookupResultDiv) return; const searchTerm = elements.lookupBarcodeInput.value.trim().toLowerCase(); elements.lookupResultDiv.innerHTML = ''; elements.lookupResultDiv.style.display = 'none'; if (!searchTerm || productDatabase.length === 0) { if(productDatabase.length === 0 && searchTerm && elements.lookupResultDiv) {elements.lookupResultDiv.innerHTML = '<p>Baza jest pusta.</p>'; elements.lookupResultDiv.style.display = 'block';} return; } const productByEAN = productDatabase.find(p => p.kod_kreskowy.toLowerCase() === searchTerm); if (productByEAN) { displaySingleProductInLookup(productByEAN); if(elements.lookupBarcodeInput) elements.lookupBarcodeInput.value = ''; return; } const foundProducts = productDatabase.filter(p => (p.nazwa_produktu && p.nazwa_produktu.toLowerCase().includes(searchTerm)) || (p.opis && p.opis.toLowerCase().includes(searchTerm))); if (foundProducts.length === 1) displaySingleProductInLookup(foundProducts[0]); else if (foundProducts.length > 0) displayProductListInLookup(foundProducts); else { if(elements.lookupResultDiv){ elements.lookupResultDiv.innerHTML = '<p>Nie znaleziono.</p>'; elements.lookupResultDiv.style.display = 'block'; }} if(elements.lookupBarcodeInput) elements.lookupBarcodeInput.value = ''; }
    if(elements.lookupBarcodeInput) elements.lookupBarcodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLookupSearch(); });
    if(elements.lookupResultDiv) elements.lookupResultDiv.addEventListener('click', (event) => { const targetLi = event.target.closest('li'); if (targetLi && targetLi.dataset.ean && activeTab === 'lookup') { const productToDisplay = productDatabase.find(p => p.kod_kreskowy === targetLi.dataset.ean); if (productToDisplay) displaySingleProductInLookup(productToDisplay); } });
    
    function addProductToList(eanFromSearch = null) {
        if (!elements.listBarcodeInput || !elements.quantityInput) return;
        const ean = eanFromSearch || elements.listBarcodeInput.value.trim();
        const quantity = parseInt(elements.quantityInput.value, 10);
        if (!ean || isNaN(quantity) || quantity < 1) {
            alert("Podaj EAN i ilość.");
            return;
        }

        let productFromDb = productDatabase.find(p => p.kod_kreskowy === ean);

        // MODYFIKACJA: Jeśli produkt nie istnieje w bazie, utwórz tymczasowy obiekt
        if (!productFromDb) {
            // Sprawdzamy, czy EAN to poprawny numer, aby uniknąć dodawania śmieci
            if (!/^\d+$/.test(ean) || ean.length < 5) { 
                 alert(`"${ean}" to niepoprawny kod produktu lub EAN.`);
                 elements.listBarcodeInput.value = '';
                 elements.listBarcodeInput.focus();
                 return;
            }
            productFromDb = {
                kod_kreskowy: ean,
                nazwa_produktu: `PRODUKT NIEZNANY`,
                opis: '---', // Opis będzie pusty
                cena: "0" // Cena będzie 0
            };
        }

        const existingItem = scannedItems.find(item => item.ean === ean);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            scannedItems.push({
                ean: productFromDb.kod_kreskowy,
                name: productFromDb.nazwa_produktu,
                description: productFromDb.opis,
                quantity: quantity,
                price: productFromDb.cena
            });
        }
        renderScannedList();
        saveDataToServer();
        elements.listBarcodeInput.value = '';
        elements.quantityInput.value = '1';
        if (elements.listBuilderSearchResults) {
            elements.listBuilderSearchResults.innerHTML = '';
            elements.listBuilderSearchResults.style.display = 'none';
        }
        if (elements.listBarcodeInput) elements.listBarcodeInput.focus();
    }
    if(elements.addToListBtn) elements.addToListBtn.addEventListener('click', () => addProductToList());
    function handleListBuilderSearch() { if (!elements.listBarcodeInput || !elements.listBuilderSearchResults) return; const searchTerm = elements.listBarcodeInput.value.trim().toLowerCase(); elements.listBuilderSearchResults.innerHTML = ''; elements.listBuilderSearchResults.style.display = 'none'; if (!searchTerm || productDatabase.length === 0) { if(productDatabase.length === 0 && searchTerm && elements.listBuilderSearchResults) {elements.listBuilderSearchResults.innerHTML = '<p>Baza jest pusta.</p>'; elements.listBuilderSearchResults.style.display = 'block';} return; } const productByEAN = productDatabase.find(p => p.kod_kreskowy.toLowerCase() === searchTerm); if (productByEAN) { addProductToList(productByEAN.kod_kreskowy); return; } const productByExactName = productDatabase.find(p => p.nazwa_produktu && p.nazwa_produktu.toLowerCase() === searchTerm); if (productByExactName) { addProductToList(productByExactName.kod_kreskowy); return; } const foundProducts = productDatabase.filter(p => (p.nazwa_produktu && p.nazwa_produktu.toLowerCase().includes(searchTerm)) || (p.opis && p.opis.toLowerCase().includes(searchTerm))); if (foundProducts.length > 0) { let listHtml = '<ul>'; foundProducts.forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.nazwa_produktu} <small>(Opis: ${p.opis}, Cena: ${parseFloat(p.cena).toFixed(2)} PLN)</small></li>`; }); listHtml += '</ul>'; elements.listBuilderSearchResults.innerHTML = listHtml; elements.listBuilderSearchResults.style.display = 'block'; } else { if(elements.listBuilderSearchResults){ elements.listBuilderSearchResults.innerHTML = '<p>Brak wyników.</p>'; elements.listBuilderSearchResults.style.display = 'block'; }} if(elements.listBarcodeInput) elements.listBarcodeInput.value = '';  }
    if(elements.listBarcodeInput) elements.listBarcodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleListBuilderSearch();} });
    if(elements.listBuilderSearchResults) elements.listBuilderSearchResults.addEventListener('click', (event) => { const targetLi = event.target.closest('li'); if (targetLi && targetLi.dataset.ean) addProductToList(targetLi.dataset.ean); });
    
    function calculateAndDisplayTotalValue() { if (!elements.totalOrderValue) return; let totalValue = 0; scannedItems.forEach(item => totalValue += (parseFloat(item.price || 0) || 0) * item.quantity); elements.totalOrderValue.textContent = `Wartość sumaryczna: ${totalValue.toFixed(2)} PLN`; }
    function renderScannedList() {
        if(!elements.scannedListBody){ return; }
        elements.scannedListBody.innerHTML = '';
        const canOperate = scannedItems.length > 0;
        if(elements.exportCsvBtn) elements.exportCsvBtn.disabled = !canOperate;
        if(elements.sendEmailBtn) elements.sendEmailBtn.disabled = !canOperate;
        if(elements.exportExcelBtn) elements.exportExcelBtn.disabled = !canOperate;
        if(elements.printListBtn) elements.printListBtn.disabled = !canOperate;
        if(elements.clearListBtn) elements.clearListBtn.disabled = !canOperate;
        scannedItems.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.name || 'Brak kodu'}</td><td>${item.description || 'Brak opisu'}</td><td>${item.ean}</td><td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}" inputmode="numeric"></td><td><button class="delete-btn" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>`;
            elements.scannedListBody.appendChild(row);
        });
        calculateAndDisplayTotalValue();
    }
    
    if(elements.scannedListBody) {
        elements.scannedListBody.addEventListener('input', e => {
            if (e.target.classList.contains('quantity-in-table')) {
                const index = e.target.dataset.index;
                const newQuantity = parseInt(e.target.value, 10);
                if (newQuantity > 0) {
                    scannedItems[index].quantity = newQuantity;
                    calculateAndDisplayTotalValue();
                    saveDataToServer();
                }
            }
        });
        elements.scannedListBody.addEventListener('click', e => {
            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                scannedItems.splice(deleteButton.dataset.index, 1);
                renderScannedList();
                saveDataToServer();
            }
        });
    }
    
    function exportToCsvOptima() { if (scannedItems.length === 0) {alert("Lista pusta."); return;} const headers = '[TwrKOD];[Ilosc]'; const rows = scannedItems.map(item => `${item.ean};${item.quantity}`); const csvContent = `${headers}\n${rows.join('\n')}`; try { const blob = new Blob([csvContent],{type:'text/csv;charset=utf-8;'}); const link=document.createElement("a"); const url=URL.createObjectURL(blob); const filename=`inwentaryzacja_optima_${new Date().toLocaleDateString('pl-PL').replace(/\./g,'-')}`; link.setAttribute("href",url);link.setAttribute("download",`${filename}.csv`); document.body.appendChild(link);link.click();document.body.removeChild(link); URL.revokeObjectURL(url); } catch(e){console.error("Błąd eksportu CSV Optima:", e); alert("Błąd eksportu CSV Optima.");}}
    if(elements.exportCsvBtn) elements.exportCsvBtn.addEventListener('click', exportToCsvOptima);

    function exportToExcelDetailed() { if (scannedItems.length === 0) { alert("Lista pusta."); return; } const headers = '"EAN";"Kod Produktu";"Nazwa Produktu";"Ilość";"Cena Jednostkowa"'; const rows = scannedItems.map(item => { const priceFormatted = parseFloat(item.price || 0).toFixed(2).replace('.', ','); return `"${item.ean || ''}";"${(item.name || '').replace(/"/g, '""')}";"${(item.description || '').replace(/"/g, '""')}";"${item.quantity || 0}";"${priceFormatted}"`; }); const csvContent = `\uFEFF${headers}\n${rows.join('\n')}`; try {const blob = new Blob([csvContent],{type:'text/csv;charset=utf-8;'}); const link=document.createElement("a"); const url=URL.createObjectURL(blob); const filename=`lista_szczegolowa_${new Date().toLocaleDateString('pl-PL').replace(/\./g,'-')}`; link.setAttribute("href",url);link.setAttribute("download",`${filename}.csv`); document.body.appendChild(link);link.click();document.body.removeChild(link); URL.revokeObjectURL(url); } catch(e){console.error("Błąd eksportu Excel:", e); alert("Błąd eksportu Excel.");}}
    if(elements.exportExcelBtn) elements.exportExcelBtn.addEventListener('click', exportToExcelDetailed);

    function sendEmail() { 
        if (scannedItems.length === 0) { alert("Lista jest pusta."); return; }
        const recipient = "biuro@e-dekor.pl";
        const clientName = elements.clientNameInput ? elements.clientNameInput.value.trim() : "Brak klienta";
        const additionalInfo = elements.additionalInfoInput ? elements.additionalInfoInput.value.trim() : "";
        const date = new Date().toLocaleString('pl-PL');
        let totalValueNum = 0;
        scannedItems.forEach(item => { totalValueNum += (parseFloat(item.price || 0) || 0) * item.quantity; });
        const totalValueStr = totalValueNum.toFixed(2) + " PLN";
        const subject = `Zamówienie/Lista dla: ${clientName} - ${date}`;
        let body = `Klient: ${clientName}\nData: ${date}\nWartość: ${totalValueStr}\n`;
        if (additionalInfo) {
            body += `Informacje dodatkowe: ${additionalInfo}\n`;
        }
        body += `\nPozycje:\n=====================================\n`;
        scannedItems.forEach(item => {
            const itemPrice = parseFloat(item.price||0);
            const itemTotalValue = itemPrice*item.quantity;
            body += `Kod Produktu: ${item.name||''}\nNazwa: ${item.description||''}\nEAN: ${item.ean||''}\nIlość: ${item.quantity}\nCena jedn.: ${itemPrice.toFixed(2)} PLN\nWartość: ${itemTotalValue.toFixed(2)} PLN\n-------------------------------------\n`;
        });
        body += "\n\nUwaga: Plik CSV dla Optima dołącz ręcznie.";
        const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        if (mailtoLink.length > MAILTO_LENGTH_LIMIT) { alert(`Lista jest zbyt długa, aby wysłać ją e-mailem.`); return; }
        try { window.location.href = mailtoLink; } catch(e) { console.error("Błąd wysyłki:",e); alert("Błąd wysyłki."); }
    }
    if(elements.sendEmailBtn) elements.sendEmailBtn.addEventListener('click', sendEmail);
    
    function prepareForPrint() {
        const printClientName = document.getElementById('print-client-name');
        const printAdditionalInfo = document.getElementById('print-additional-info');
        const printTableBody = document.getElementById('print-table-body');
        const printTotalValue = document.getElementById('print-total-value');
        const clientName = elements.clientNameInput.value.trim();
        const additionalInfo = elements.additionalInfoInput.value.trim();

        printClientName.textContent = clientName ? `Zamówienie dla: ${clientName}` : 'Zamówienie';
        if (additionalInfo) {
            printAdditionalInfo.textContent = `Informacje dodatkowe: ${additionalInfo}`;
            printAdditionalInfo.style.display = 'block';
        } else {
            printAdditionalInfo.style.display = 'none';
        }
        printTotalValue.textContent = elements.totalOrderValue.textContent;
        printTableBody.innerHTML = '';
        scannedItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name || 'Brak kodu'}</td>
                <td>${item.description || 'Brak opisu'}</td>
                <td>${item.ean || ''}</td>
                <td>${item.quantity}</td>
            `;
            printTableBody.appendChild(row);
        });
    }

    if (elements.printListBtn) {
        elements.printListBtn.addEventListener('click', () => {
            prepareForPrint();
            window.print();
        });
    }

    if (elements.clearListBtn) {
        elements.clearListBtn.addEventListener('click', () => {
            if (scannedItems.length > 0 && confirm('Czy na pewno chcesz wyczyścić całe zamówienie? Tej operacji nie można cofnąć.')) {
                scannedItems = [];
                if (elements.clientNameInput) elements.clientNameInput.value = '';
                if (elements.additionalInfoInput) elements.additionalInfoInput.value = '';
                renderScannedList();
                saveDataToServer();
            }
        });
    }

    // --- LOGIKA MODUŁU INWENTARYZACJI ---
    function openInventoryModule() { if (elements.inventoryModule) elements.inventoryModule.style.display = 'flex'; if(elements.inventoryEanInput && !elements.inventoryEanInput.disabled) elements.inventoryEanInput.focus(); }
    function closeInventoryModule() { if (elements.inventoryModule) { elements.inventoryModule.style.display = 'none'; if(elements.inventorySearchResults) elements.inventorySearchResults.innerHTML = '';}}
    if(fabInventoryBtn) fabInventoryBtn.addEventListener('click', openInventoryModule);
    if(elements.closeInventoryModalBtn) elements.closeInventoryModalBtn.addEventListener('click', closeInventoryModule);
    if(elements.closeInventoryModalBtnBottom) elements.closeInventoryModalBtnBottom.addEventListener('click', closeInventoryModule);

    function addInventoryItem(ean) {
        if (!elements.inventoryEanInput || !elements.inventoryQuantityInput) return;
        const t = ean || elements.inventoryEanInput.value.trim();
        const n = parseInt(elements.inventoryQuantityInput.value, 10);
        if (!t || isNaN(n) || n < 1) {
            alert("Podaj EAN i ilość.");
            return;
        }
        const o = inventoryItems.find(e => e.ean === t);
        if (o) {
            o.quantity += n;
        } else {
            const e = productDatabase.find(e => e.kod_kreskowy === t);
            inventoryItems.push({ ean: t, name: e ? (e.opis || e.nazwa_produktu) : 'EAN spoza bazy', quantity: n });
        }
        renderInventoryList();
        saveDataToServer();
        elements.inventoryEanInput.value = '';
        elements.inventoryQuantityInput.value = '1';
        elements.inventoryEanInput.focus();
    }
    if(elements.inventoryAddBtn) elements.inventoryAddBtn.addEventListener('click',()=>addInventoryItem());
    function handleInventorySearch(e=!1){if(!elements.inventoryEanInput||!elements.inventorySearchResults)return;const t=elements.inventoryEanInput.value.trim().toLowerCase();if(!t&&!e){elements.inventorySearchResults.innerHTML='';elements.inventorySearchResults.style.display='none';return;}if(!t&&e)return;if(productDatabase.length===0&&t){if(t.length>5)addInventoryItem(elements.inventoryEanInput.value.trim());else if(elements.inventorySearchResults){elements.inventorySearchResults.innerHTML='<p>Baza jest pusta.</p>';elements.inventorySearchResults.style.display='block';}return;}const n=productDatabase.find(e=>e.kod_kreskowy.toLowerCase()===t);if(n){if(e||elements.inventoryQuantityInput.value==="1")addInventoryItem(n.kod_kreskowy);else{elements.inventoryEanInput.value=n.kod_kreskowy;if(elements.inventoryQuantityInput)elements.inventoryQuantityInput.focus();if(elements.inventorySearchResults){elements.inventorySearchResults.innerHTML='';elements.inventorySearchResults.style.display='none';}}return;}const o=productDatabase.find(e=>e.nazwa_produktu&&e.nazwa_produktu.toLowerCase()===t);if(o){if(e||elements.inventoryQuantityInput.value==="1")addInventoryItem(o.kod_kreskowy);else{elements.inventoryEanInput.value=o.kod_kreskowy;if(elements.inventoryQuantityInput)elements.inventoryQuantityInput.focus();if(elements.inventorySearchResults){elements.inventorySearchResults.innerHTML='';elements.inventorySearchResults.style.display='none';}}return;}if(e){addInventoryItem(elements.inventoryEanInput.value.trim());return;}const r=productDatabase.filter(e=>(e.nazwa_produktu&&e.nazwa_produktu.toLowerCase().includes(t))||(e.opis&&e.opis.toLowerCase().includes(t)));if(elements.inventorySearchResults){elements.inventorySearchResults.innerHTML='';if(r.length>0){let e='<ul>';r.forEach(t=>{e+=`<li data-ean="${t.kod_kreskowy}">${t.nazwa_produktu} <small>(Opis: ${t.opis})</small></li>`;});e+='</ul>';elements.inventorySearchResults.innerHTML=e;}else elements.inventorySearchResults.innerHTML='<p>Brak wyników.</p>';elements.inventorySearchResults.style.display='block';}}
    if(elements.inventoryEanInput)elements.inventoryEanInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();handleInventorySearch();}});
    if(elements.inventoryQuantityInput)elements.inventoryQuantityInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(elements.inventoryEanInput&&elements.inventoryEanInput.value.trim()!=="")addInventoryItem(elements.inventoryEanInput.value.trim());else{alert("Wprowadź EAN.");elements.inventoryEanInput.focus();}}});
    if(elements.inventorySearchResults)elements.inventorySearchResults.addEventListener('click',e=>{const t=e.target.closest('li');if(t&&t.dataset.ean){if(elements.inventoryEanInput)elements.inventoryEanInput.value=t.dataset.ean;if(elements.inventoryQuantityInput)elements.inventoryQuantityInput.focus();elements.inventorySearchResults.innerHTML='';elements.inventorySearchResults.style.display='none';}});

    function renderInventoryList(){
        if (!elements.inventoryListBody || !elements.inventoryExportCsvBtn) { return; }
        elements.inventoryListBody.innerHTML = '';
        const e = inventoryItems.length > 0;
        elements.inventoryExportCsvBtn.disabled = !e;
        inventoryItems.forEach((t, n) => {
            const o = document.createElement('tr');
            o.innerHTML = `<td>${t.name}</td><td>${t.ean}</td><td><input type="number" class="quantity-in-table" value="${t.quantity}" min="1" data-inv-index="${n}" inputmode="numeric"></td><td><button class="delete-btn" data-inv-index="${n}"><i class="fa-solid fa-trash-can"></i></button></td>`;
            elements.inventoryListBody.appendChild(o);
        });
    }

    if(elements.inventoryListBody){
        elements.inventoryListBody.addEventListener('input', e => {
            if (e.target.classList.contains('quantity-in-table') && e.target.dataset.invIndex !== undefined) {
                const t = parseInt(e.target.dataset.invIndex, 10);
                const n = parseInt(e.target.value, 10);
                if (n > 0) {
                    inventoryItems[t].quantity = n;
                    saveDataToServer();
                }
            }
        });
        elements.inventoryListBody.addEventListener('click', e => {
            const t = e.target.closest('.delete-btn');
            if (t && t.dataset.invIndex !== undefined) {
                inventoryItems.splice(parseInt(t.dataset.invIndex, 10), 1);
                renderInventoryList();
                saveDataToServer();
            }
        });
    }

    function exportInventoryToCsv(){if(inventoryItems.length===0){alert("Lista pusta.");return;}const e=inventoryItems.map(e=>`${e.ean};${e.quantity}`);const t=e.join('\n');try{const e=new Blob([t],{type:'text/csv;charset=utf-8;'});const n=document.createElement("a");const o=URL.createObjectURL(e);const r=`inwentaryzacja_prosta_${new Date().toLocaleDateString('pl-PL').replace(/\./g,'-')}`;n.setAttribute("href",o);n.setAttribute("download",`${r}.csv`);document.body.appendChild(n);n.click();document.body.removeChild(n);URL.revokeObjectURL(o);}catch(e){console.error("Błąd eksportu CSV Inwentaryzacji:",e);alert("Błąd eksportu CSV Inwentaryzacji.");}}
    if(elements.inventoryExportCsvBtn)elements.inventoryExportCsvBtn.addEventListener('click',exportInventoryToCsv);

    // =================================================================
    // NOWA SEKCJA - LOGIKA WYLOGOWANIA I PRZEWIJANIA
    // =================================================================

    // --- Logika wylogowania ---
    function handleLogout() {
        localStorage.removeItem('token');
        location.reload(); // Najprostszy sposób na powrót do ekranu logowania
    }
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Pokaż przycisk wylogowania po inicjalizacji aplikacji
    const originalInitializeApp = initializeApp;
    initializeApp = (userData) => {
        originalInitializeApp(userData);
        if (elements.logoutBtn) {
            elements.logoutBtn.style.display = 'block';
        }
    };


    // --- Logika przycisków przewijania ---
    if (elements.fabScrollTopBtn) {
        // Pokaż/ukryj przycisk "do góry" w zależności od pozycji przewinięcia
        window.addEventListener('scroll', () => {
            if (window.scrollY > 200) {
                elements.fabScrollTopBtn.style.display = 'flex';
            } else {
                elements.fabScrollTopBtn.style.display = 'none';
            }
        });
        // Obsługa kliknięcia
        elements.fabScrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (elements.scrollToBottomBtn && elements.scannedListTable) {
        elements.scrollToBottomBtn.addEventListener('click', () => {
            elements.scannedListTable.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
    }

    // =================================================================
    // NOWA SEKCJA - USPRAWNIENIE PÓL "ILOŚĆ"
    // =================================================================
    
    // Zaznaczanie zawartości pola po kliknięciu
    const handleQuantityFocus = (event) => {
        event.target.select();
    };

    if (elements.quantityInput) {
        elements.quantityInput.addEventListener('focus', handleQuantityFocus);
        // Dodawanie produktu enterem z pola ilości
        elements.quantityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Zapobiega domyślnej akcji
                addProductToList();
            }
        });
    }
    
    if (elements.scannedListBody) {
        // Delegacja zdarzeń dla pól ilości w tabeli
        elements.scannedListBody.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('quantity-in-table')) {
                handleQuantityFocus(e);
            }
        });
        // Zatwierdzanie zmiany ilości w tabeli enterem
        elements.scannedListBody.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('quantity-in-table')) {
                e.preventDefault();
                e.target.blur(); // Usunięcie focusa zatwierdzi zmianę
            }
        });
    }

    // =================================================================
    // OSTATECZNE WYWOŁANIE PRZY STARCIE
    // =================================================================
    checkLoginStatus();

});