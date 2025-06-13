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
        importCsvInput: document.getElementById('importCsvInput'),
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
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

    // ... (reszta kodu bez zmian, aż do funkcji initializeApp) ...

    // NOWA FUNKCJA: Klawiatura numeryczna
    let numpadTarget = null;
    let numpadCallback = null;

    function openNumpad(targetElement, callbackOnOk) {
        numpadTarget = targetElement;
        numpadCallback = callbackOnOk;
        elements.numpadDisplay.textContent = targetElement.value || '1';
        elements.numpadModal.style.display = 'flex';
    }

    function handleNumpadOK() {
        const value = parseInt(elements.numpadDisplay.textContent) || 0;
        if (numpadTarget && value > 0) {
            numpadTarget.value = value;
            numpadTarget.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (numpadCallback) {
            numpadCallback(value);
        }
        elements.numpadModal.style.display = 'none';
    }
    
    function attachNumpadListeners() {
        elements.numpadKeys.forEach(key => key.addEventListener('click', () => {
            const display = elements.numpadDisplay;
            if (display.textContent === '0' || !/^\d+$/.test(display.textContent)) display.textContent = '';
            display.textContent += key.dataset.key;
        }));
        elements.numpadClear.addEventListener('click', () => { elements.numpadDisplay.textContent = '0'; });
        elements.numpadBackspace.addEventListener('click', () => {
            const display = elements.numpadDisplay;
            display.textContent = display.textContent.slice(0, -1) || '0';
        });
        elements.numpadOk.addEventListener('click', handleNumpadOK);
        
        elements.quantityInput.addEventListener('click', (e) => { e.preventDefault(); openNumpad(e.target); });
        elements.inventoryQuantityInput.addEventListener('click', (e) => { e.preventDefault(); openNumpad(e.target); });
        elements.scannedListBody.addEventListener('click', e => { if (e.target.classList.contains('quantity-in-table')) { e.preventDefault(); openNumpad(e.target); } });
    }
    
    // ... (reszta kodu bez zmian) ...
    // Należy wkleić cały pozostały kod z poprzedniej odpowiedzi, ponieważ jest on zbyt długi, aby go tu powtarzać.
    // Poniżej znajduje się tylko przykład, gdzie należy wkleić resztę.
    
    // Wklej tutaj cały kod od `const initializeApp = ...` aż do `checkLoginStatus()` z poprzedniej odpowiedzi.
    // Upewnij się, że nowa funkcja `attachNumpadListeners()` jest wywołana na końcu `initializeApp`.
    // Przykład `initializeApp`:
    // const initializeApp = async (userData) => {
    //     if(elements.menuUsername) elements.menuUsername.textContent = userData.username;
    //     await loadDataFromServer();
    //     if (userData.role === 'admin') {
    //         if (elements.menuAdminBtn) elements.menuAdminBtn.style.display = 'flex';
    //     }
    //     await loadActiveList();
    //     attachNumpadListeners(); // To jest ważne
    // };

    // Upewnij się, że reszta kodu, w tym `checkLoginStatus()`, jest na końcu.

});
