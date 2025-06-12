document.addEventListener('DOMContentLoaded', () => {

    const elements = {
        // Logowanie i UI
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
        
        // Wyszukiwanie
        lookupBarcodeInput: document.getElementById('lookupBarcode_Input'),
        lookupResultList: document.getElementById('lookupResultList'),
        lookupResultSingle: document.getElementById('lookupResultSingle'),
        listBarcodeInput: document.getElementById('listBarcode_Input'),
        listBuilderSearchResults: document.getElementById('listBuilderSearchResults'),
        
        // Zamówienie
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
        
        // Admin
        adminPanel: document.getElementById('adminPanel'),
        allUsersList: document.getElementById('allUsersList'),
        
        // Inwentaryzacja
        inventoryModule: document.getElementById('inventoryModule'),
        closeInventoryModalBtn: document.getElementById('closeInventoryModalBtn'),
        inventoryEanInput: document.getElementById('inventoryEanInput'),
        inventoryQuantityInput: document.getElementById('inventoryQuantityInput'),
        inventoryAddBtn: document.getElementById('inventoryAddBtn'),
        inventoryListBody: document.getElementById('inventoryListBody'),
        inventoryExportCsvBtn: document.getElementById('inventoryExportCsvBtn'),
        inventorySearchResults: document.getElementById('inventorySearchResults'),
        
        // Zapisane listy
        savedListsModal: document.getElementById('savedListsModal'),
        closeSavedListsModalBtn: document.getElementById('closeSavedListsModalBtn'),
        savedListsContainer: document.getElementById('savedListsContainer'),

        // Kompletacja
        pickingModule: document.getElementById('pickingModule'),
        closePickingModalBtn: document.getElementById('closePickingModalBtn'),
        pickingOrderName: document.getElementById('picking-order-name'),
        pickingEanInput: document.getElementById('picking-ean-input'),
        pickingStatusMsg: document.getElementById('picking-status-msg'),
        pickingTargetList: document.getElementById('picking-target-list'),
        pickingScannedList: document.getElementById('picking-scanned-list'),
        pickingVerifyBtn: document.getElementById('picking-verify-btn'),
        pickingShowMissingBtn: document.getElementById('picking-show-missing-btn'),

        // Inne
        toastContainer: document.getElementById('toast-container'),
        printClientName: document.getElementById('print-client-name'),
        printAdditionalInfo: document.getElementById('print-additional-info'),
        printContent: document.getElementById('print-content'),
    };

    let productDatabase = [], scannedItems = [], inventoryItems = [], activeTab = 'lookup';
    // Stan modułu kompletacji
    let targetOrder = null;
    let pickedItems = new Map();
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

    // ... (reszta kodu bez zmian, aż do funkcji addProductToList) ...

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
    
    // ... (reszta kodu bez zmian, aż do funkcji renderScannedList) ...

    function renderScannedList() {
        elements.scannedListBody.innerHTML = '';
        const canOperate = scannedItems.length > 0;
        [elements.exportCsvBtn, elements.exportExcelBtn, elements.printListBtn, elements.clearListBtn, elements.saveListBtn].forEach(btn => { if(btn) btn.disabled = !canOperate; });
        scannedItems.forEach((item, index) => {
            const row = document.createElement('tr');
            // POPRAWKA: Prawidłowa kolejność kolumn
            row.innerHTML = `<td class="col-code">${item.name}</td><td class="col-desc">${item.description}</td><td class="col-ean">${item.ean}</td><td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}"></td><td><button class="delete-btn btn-icon" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>`;
            elements.scannedListBody.appendChild(row);
        });
        const totalValue = scannedItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0);
        elements.totalOrderValue.textContent = `Total: ${totalValue.toFixed(2)} PLN`;
    }

    // ... (reszta kodu bez zmian, aż do funkcji showToast) ...
    
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

    // ... (reszta kodu bez zmian, aż do końca pliku, a na końcu dodać moduł kompletacji) ...

    // =================================================================
    // NOWY MODUŁ: KOMPLETACJA ZAMÓWIENIA
    // =================================================================

    let currentPickingOrder = null;
    let pickedOrderItems = new Map();

    async function startPicking(listId, listName) {
        try {
            const response = await fetch(`/api/data/list/${listId}`, { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) throw new Error("Błąd wczytywania zamówienia do kompletacji");
            currentPickingOrder = await response.json();
            pickedOrderItems.clear();
            
            elements.pickingOrderName.textContent = `Kompletacja: ${listName}`;
            elements.pickingStatusMsg.textContent = '';
            elements.pickingStatusMsg.style.backgroundColor = '';
            
            renderPickingView();
            elements.pickingModule.style.display = 'flex';
            elements.pickingEanInput.focus();
        } catch (error) {
            alert(error.message);
        }
    }

    function renderPickingView() {
        elements.pickingTargetList.innerHTML = currentPickingOrder.items.map(item => {
            const pickedQty = pickedOrderItems.get(item.ean) || 0;
            const isCompleted = pickedQty >= item.quantity;
            return `<div style="padding: 5px; ${isCompleted ? 'text-decoration: line-through; color: var(--success-color);' : ''}">${item.name} | ${item.description} ( ${pickedQty} / ${item.quantity} )</div>`;
        }).join('');

        elements.pickingScannedList.innerHTML = Array.from(pickedOrderItems.entries()).map(([ean, qty]) => {
            const targetItem = currentPickingOrder.items.find(it => it.ean === ean);
            const name = targetItem ? targetItem.name : "Produkt spoza listy";
            return `<div>${name}: ${qty} szt.</div>`;
        }).join('');
    }

    function handlePickingScan() {
        const ean = elements.pickingEanInput.value.trim();
        if (!ean) return;

        const targetItem = currentPickingOrder.items.find(item => item.ean === ean || item.name === ean);
        if (!targetItem) {
            showToast("BŁĄD: Produkt spoza zamówienia!");
            elements.pickingEanInput.value = '';
            return;
        }

        let quantity = 1;
        if (targetItem.quantity > 1) {
            const enteredQty = prompt(`Produkt "${targetItem.description}" występuje w większej ilości (${targetItem.quantity} szt.). Podaj skanowaną ilość:`, "1");
            quantity = parseInt(enteredQty);
            if (isNaN(quantity) || quantity < 1) {
                showToast("Anulowano lub wprowadzono nieprawidłową ilość.");
                elements.pickingEanInput.value = '';
                return;
            }
        }

        const currentPickedQty = pickedOrderItems.get(targetItem.ean) || 0;
        if (currentPickedQty + quantity > targetItem.quantity) {
            showToast(`BŁĄD: Przekroczono wymaganą ilość dla produktu ${targetItem.name}!`);
        } else {
            pickedOrderItems.set(targetItem.ean, currentPickedQty + quantity);
            showToast(`Skompletowano: ${targetItem.name} (${quantity} szt.)`);
        }

        elements.pickingEanInput.value = '';
        renderPickingView();
    }
    
    function verifyPicking() {
        let isComplete = true;
        let missingItems = [];

        currentPickingOrder.items.forEach(item => {
            const pickedQty = pickedOrderItems.get(item.ean) || 0;
            if (pickedQty < item.quantity) {
                isComplete = false;
                missingItems.push(`${item.name} - brakuje ${item.quantity - pickedQty} szt.`);
            }
        });
        
        if (isComplete) {
            elements.pickingStatusMsg.textContent = "Zamówienie skompletowane prawidłowo!";
            elements.pickingStatusMsg.style.backgroundColor = 'var(--success-color)';
            elements.pickingStatusMsg.style.color = 'white';
        } else {
            elements.pickingStatusMsg.textContent = "BŁĄD: Zamówienie nie jest kompletne!";
            elements.pickingStatusMsg.style.backgroundColor = 'var(--danger-color)';
            elements.pickingStatusMsg.style.color = 'white';
            alert("Brakuje następujących pozycji:\n" + missingItems.join('\n'));
        }
    }
    
    function showMissingItems() {
        const missing = currentPickingOrder.items
            .filter(item => (pickedOrderItems.get(item.ean) || 0) < item.quantity)
            .map(item => `${item.name} (${item.description}) - brakuje ${item.quantity - (pickedOrderItems.get(item.ean) || 0)} szt.`);
        
        if (missing.length > 0) {
            alert("Nieskompletowane pozycje:\n\n" + missing.join('\n'));
        } else {
            alert("Wszystkie pozycje zostały skompletowane!");
        }
    }

    if (elements.closePickingModalBtn) elements.closePickingModalBtn.addEventListener('click', () => { elements.pickingModule.style.display = 'none'; });
    if (elements.pickingEanInput) elements.pickingEanInput.addEventListener('keydown', e => { if (e.key === 'Enter') handlePickingScan(); });
    if (elements.pickingVerifyBtn) elements.pickingVerifyBtn.addEventListener('click', verifyPicking);
    if (elements.pickingShowMissingBtn) elements.pickingShowMissingBtn.addEventListener('click', showMissingItems);
    
    // Zaktualizuj listener dla zapisanych list, aby dodać przycisk "Kompletuj"
    if (elements.savedListsContainer) elements.savedListsContainer.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const listId = target.dataset.id;
        const listName = target.closest('li').querySelector('span').textContent.split(' (')[0];

        if (target.classList.contains('load-list-btn')) {
            // ... (logika wczytywania bez zmian)
        } else if (target.classList.contains('delete-list-btn')) {
            // ... (logika usuwania bez zmian)
        } else if (target.classList.contains('pick-order-btn')) {
            startPicking(listId, listName);
        }
    });

    // ... (pozostały kod, np. checkLoginStatus(); na końcu)
    checkLoginStatus();
});
