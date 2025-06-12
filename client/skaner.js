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
        scrollTopBtn: document.getElementById('scrollTopBtn'),
        scrollBottomBtn: document.getElementById('scrollBottomBtn'),
        lookupBarcodeInput: document.getElementById('lookupBarcode_Input'),
        lookupResultDiv: document.getElementById('lookupResult'),
        listBarcodeInput: document.getElementById('listBarcode_Input'),
        listBuilderSearchResults: document.getElementById('listBuilderSearchResults'),
        quantityInput: document.getElementById('quantityInput'),
        addToListBtn: document.getElementById('addToListBtn'),
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
        toastContainer: document.getElementById('toast-container'),
        printTableBody: document.getElementById('print-table-body'),
    };

    let productDatabase = [], scannedItems = [], inventoryItems = [], activeTab = 'lookup';

    const showApp = (userData) => {
        elements.loginOverlay.style.display = 'none';
        elements.appContainer.style.display = 'block';
        if (elements.topBar) elements.topBar.style.display = 'flex';
        if (elements.bottomBar) elements.bottomBar.style.display = 'flex';
        initializeApp(userData);
    };

    const initializeApp = (userData) => {
        if(elements.menuUsername) elements.menuUsername.textContent = userData.username;
        loadDataFromServer();
        loadUserDataFromServer();
        if (userData.role === 'admin') {
            if (elements.menuAdminBtn) elements.menuAdminBtn.style.display = 'flex';
        }
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

    async function loadUserDataFromServer() {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const headers = { 'x-auth-token': token };
            const [productListResponse, inventoryResponse] = await Promise.all([ fetch('/api/data/productlist', { headers }), fetch('/api/data/inventory', { headers }) ]);
            const productListData = await productListResponse.json();
            scannedItems = productListData.items || [];
            if (elements.clientNameInput) elements.clientNameInput.value = productListData.clientName || '';
            renderScannedList();
            const inventoryData = await inventoryResponse.json();
            inventoryItems = inventoryData.items || [];
            renderInventoryList();
        } catch (error) { console.error('Nie udało się wczytać danych użytkownika:', error); }
    }

    async function saveDataToServer() {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const headers = { 'Content-Type': 'application/json', 'x-auth-token': token };
            await Promise.all([ fetch('/api/data/productlist', { method: 'POST', headers, body: JSON.stringify({ clientName: elements.clientNameInput.value, items: scannedItems }) }), fetch('/api/data/inventory', { method: 'POST', headers, body: JSON.stringify({ items: inventoryItems }) }) ]);
        } catch (error) { console.error('Błąd zapisu danych na serwerze:', error); }
    }
    
    function loadDataFromServer() {
        console.log('Ładowanie bazy produktów...');
        function fetchAndParseCsv(filename) { return fetch(filename).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`Błąd sieci: ${r.statusText}`))).then(b => new TextDecoder("Windows-1250").decode(b)).then(t => new Promise((res, rej) => Papa.parse(t, { header: true, skipEmptyLines: true, complete: rts => res(rts.data), error: e => rej(e) }))); }
        Promise.all([fetchAndParseCsv('produkty.csv'), fetchAndParseCsv('produkty2.csv')])
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
    if (elements.menuLogoutBtn) elements.menuLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('token'); location.reload(); });
    if (elements.menuChangePassword) elements.menuChangePassword.addEventListener('click', (e) => { e.preventDefault(); handleChangePassword(); });
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
        saveDataToServer();
        showToast(`Dodano: ${productData.opis || productData.nazwa_produktu} (Ilość: ${quantity})`);
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
        const results = performSearch(searchTerm);
        const exactMatch = results.find(p => p.nazwa_produktu === searchTerm || p.kod_kreskowy === searchTerm);

        if (exactMatch) { addProductToList(exactMatch.kod_kreskowy); } 
        else if (results.length > 0) {
            let listHtml = '<ul>';
            results.forEach(p => { listHtml += `<li data-ean="${p.kod_kreskowy}">${p.opis} <small>(${p.nazwa_produktu})</small></li>`; });
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
        elements.lookupResultDiv.innerHTML = '';
        elements.lookupResultDiv.style.display = 'none';
        if (!searchTerm) return;
        const results = performSearch(searchTerm);
        if (results.length === 1) {
            displaySingleProductInLookup(results[0]);
        } else if (results.length > 1) {
            displayProductListInLookup(results);
        } else {
            elements.lookupResultDiv.innerHTML = '<li>Brak wyników</li>';
            elements.lookupResultDiv.style.display = 'block';
        }
    }
    
    function displaySingleProductInLookup(product) {
        let html = `<div class="lookup-result-item"><h2>${product.opis}</h2><div><strong>Kod produktu:</strong> <span>${product.nazwa_produktu}</span></div><div><strong>Kod EAN:</strong> <span>${product.kod_kreskowy}</span></div><div><strong>Cena:</strong> <span style="font-weight: bold; color: var(--success-color);">${parseFloat(product.cena).toFixed(2)} PLN</span></div></div>`;
        elements.lookupResultDiv.innerHTML = html;
        elements.lookupResultDiv.style.display = 'block';
    }

    function displayProductListInLookup(products) {
        let listHtml = '';
        products.forEach(p => { listHtml += `<li data-product-json='${JSON.stringify(p)}'>${p.opis} <small>(${p.nazwa_produktu})</small></li>`; });
        elements.lookupResultDiv.innerHTML = listHtml;
        elements.lookupResultDiv.style.display = 'block';
    }

    if(elements.lookupBarcodeInput) elements.lookupBarcodeInput.addEventListener('keydown', e => { if(e.key === 'Enter') handleLookupSearch(); });
    if(elements.lookupResultDiv) elements.lookupResultDiv.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li?.dataset.productJson) { displaySingleProductInLookup(JSON.parse(li.dataset.productJson)); }});
    
    function renderScannedList() {
        elements.scannedListBody.innerHTML = '';
        const canOperate = scannedItems.length > 0;
        [elements.exportCsvBtn, elements.exportExcelBtn, elements.printListBtn, elements.clearListBtn].forEach(btn => { if(btn) btn.disabled = !canOperate; });
        scannedItems.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="col-code">${item.name}</td><td class="col-desc">${item.description}</td><td class="col-ean">${item.ean}</td><td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}"></td><td><button class="delete-btn btn-icon" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>`;
            elements.scannedListBody.appendChild(row);
        });
        const totalValue = scannedItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0);
        elements.totalOrderValue.textContent = `Total: ${totalValue.toFixed(2)} PLN`;
    }
    
    const handleQuantityFocus = (event) => { event.target.select(); };
    if(elements.quantityInput) elements.quantityInput.addEventListener('focus', handleQuantityFocus);
    if(elements.scannedListBody) {
        elements.scannedListBody.addEventListener('focusin', e => { if (e.target.classList.contains('quantity-in-table')) handleQuantityFocus(e); });
        elements.scannedListBody.addEventListener('change', e => { if (e.target.classList.contains('quantity-in-table')) { const index = e.target.dataset.index; const newQuantity = parseInt(e.target.value, 10); if (newQuantity > 0) { scannedItems[index].quantity = newQuantity; renderScannedList(); saveDataToServer(); } else { e.target.value = scannedItems[index].quantity; } } });
        elements.scannedListBody.addEventListener('click', e => { const deleteButton = e.target.closest('.delete-btn'); if (deleteButton) { scannedItems.splice(deleteButton.dataset.index, 1); renderScannedList(); saveDataToServer(); } });
    }

    function getSafeFilename() { const clientName = elements.clientNameInput.value.trim().replace(/[<>:"/\\|?* ]+/g, '_') || 'zamowienie'; const date = new Date().toISOString().slice(0, 10); return `${clientName}_${date}`; }
    function exportToCsvOptima() { if (scannedItems.length === 0) return; const csvContent = scannedItems.map(item => `${item.ean};${item.quantity}`).join('\n'); downloadFile(csvContent, 'text/csv;charset=utf-8;', `${getSafeFilename()}_optima.csv`); }
    if(elements.exportCsvBtn) elements.exportCsvBtn.addEventListener('click', exportToCsvOptima);
    function exportToExcelDetailed() { if (scannedItems.length === 0) return; const headers = '"Kod produktu";"Nazwa";"EAN";"Ilość";"Cena Jednostkowa"'; const rows = scannedItems.map(item => { const priceFormatted = (parseFloat(item.price) || 0).toFixed(2).replace('.', ','); return `"${item.name || ''}";"${(item.description || '').replace(/"/g, '""')}";"${item.ean || ''}";"${item.quantity || 0}";"${priceFormatted}"`; }); const csvContent = `\uFEFF${headers}\n${rows.join('\n')}`; downloadFile(csvContent, 'text/csv;charset=utf-8;', `${getSafeFilename()}_szczegoly.csv`); }
    if(elements.exportExcelBtn) elements.exportExcelBtn.addEventListener('click', exportToExcelDetailed);
    function downloadFile(content, mimeType, filename) { const blob = new Blob([content], { type: mimeType }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    
    function prepareForPrint() {
        if (!elements.printTableBody) return;
        elements.printTableBody.innerHTML = '';
        if (scannedItems.length === 0) return;
        scannedItems.forEach(item => {
            const row = elements.printTableBody.insertRow();
            row.insertCell().textContent = item.name || '';
            row.insertCell().textContent = item.description || '';
            row.insertCell().textContent = item.ean || '';
            row.insertCell().textContent = item.quantity;
        });
    }

    if (elements.printListBtn) elements.printListBtn.addEventListener('click', () => { prepareForPrint(); window.print(); });
    if (elements.clearListBtn) elements.clearListBtn.addEventListener('click', () => { if (scannedItems.length > 0 && confirm('Czy na pewno chcesz wyczyścić zamówienie?')) { scannedItems = []; elements.clientNameInput.value = ''; elements.additionalInfoInput.value = ''; renderScannedList(); saveDataToServer(); } });
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                toast.addEventListener('transitionend', () => toast.remove());
            }, 3000);
        }, 10);
    }

    async function loadAllUsers() {
        const userListDiv = elements.allUsersList;
        if(!userListDiv) return;
        userListDiv.innerHTML = '<p>Ładowanie...</p>';
        try {
            const response = await fetch('/api/admin/users', { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if(!response.ok) throw new Error('Nie udało się pobrać użytkowników.');
            const users = await response.json();
            userListDiv.innerHTML = users.length === 0 ? '<p>Brak użytkowników.</p>' : '';
            users.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.className = 'user-item';
                let actions = `<button class="btn-primary edit-user-btn" data-userid="${user._id}" data-username="${user.username}">Zmień hasło</button>`;
                const newRole = user.role === 'admin' ? 'user' : 'admin';
                actions += `<button class="change-role-btn" data-userid="${user._id}" data-username="${user.username}" data-role="${newRole}">Zmień na ${newRole}</button>`;
                if (user.status === 'pending') actions = `<button class="approve-user-btn" data-userid="${user._id}">Akceptuj</button>` + actions;
                if (user.role !== 'admin') actions += `<button class="delete-user-btn" data-userid="${user._id}" data-username="${user.username}">Usuń</button>`;
                
                userDiv.innerHTML = `<div class="user-info"><strong>${user.username}</strong><span class="status">Status: ${user.status} | Rola: ${user.role}</span></div><div class="user-actions">${actions}</div>`;
                userListDiv.appendChild(userDiv);
            });
        } catch (error) { userListDiv.innerHTML = `<p style="color:var(--danger-color);">${error.message}</p>`; }
    }
    
    async function handleUserAction(url, options, successMsg) {
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            if(!response.ok) throw new Error(data.msg || 'Wystąpił błąd.');
            alert(successMsg || data.msg);
            loadAllUsers();
        } catch (error) { alert(`Błąd: ${error.message}`); }
    }

    async function handleChangePassword() {
        const oldPassword = prompt("Wprowadź swoje stare hasło:");
        if (!oldPassword) return;
        const newPassword = prompt("Wprowadź nowe hasło (min. 4 znaki):");
        if (!newPassword) return;
        await handleUserAction('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ oldPassword, newPassword }) });
    }

    if(elements.allUsersList) elements.allUsersList.addEventListener('click', e => { 
        const target = e.target.closest('button'); 
        if (!target) return;
        const { userid, username, role } = target.dataset;

        if (target.classList.contains('approve-user-btn')) handleUserAction(`/api/admin/approve-user/${userid}`, { method: 'POST', headers: { 'x-auth-token': localStorage.getItem('token') } });
        else if (target.classList.contains('edit-user-btn')) { const p = prompt(`Nowe hasło dla ${username}:`); if (p) handleUserAction(`/api/admin/edit-password/${userid}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ newPassword: p }) }); }
        else if (target.classList.contains('delete-user-btn')) { if (confirm(`Na pewno usunąć ${username}?`)) handleUserAction(`/api/admin/delete-user/${userid}`, { method: 'DELETE', headers: { 'x-auth-token': localStorage.getItem('token') } }); }
        else if (target.classList.contains('change-role-btn')) { if (confirm(`Zmienić rolę ${username} na ${role}?`)) handleUserAction(`/api/admin/change-role/${userid}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ newRole: role }) }); }
    });

    if (elements.closeInventoryModalBtn) elements.closeInventoryModalBtn.addEventListener('click', () => { elements.inventoryModule.style.display = 'none'; });
    
    checkLoginStatus();
});
