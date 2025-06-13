document.addEventListener('DOMContentLoaded', () => {

    const elements = {
        // ... (wszystkie poprzednie elementy)
        importCsvInput: document.getElementById('importCsvInput'),
        // NOWE ELEMENTY KLAWIATURY
        numpadModal: document.getElementById('numpad-modal'),
        numpadDisplay: document.getElementById('numpad-display'),
        numpadOk: document.getElementById('numpad-ok'),
        numpadClear: document.getElementById('numpad-clear'),
        numpadBackspace: document.getElementById('numpad-backspace'),
        numpadKeys: document.querySelectorAll('.numpad-key'),
    };

    // ... (reszta kodu bez zmian, aż do funkcji initializeApp)

    const initializeApp = async (userData) => {
        if(elements.menuUsername) elements.menuUsername.textContent = userData.username;
        await loadDataFromServer();
        if (userData.role === 'admin') {
            if (elements.menuAdminBtn) elements.menuAdminBtn.style.display = 'flex';
        }
        await loadActiveList();
        // POPRAWKA: Upewniamy się, że event listenery dla klawiatury są dodane po inicjalizacji
        attachNumpadListeners();
    };

    // ... (reszta kodu bez zmian, aż do funkcji handleLookupSearch)

    // POPRAWKA: Całkowicie naprawiona funkcja wyszukiwania
    function handleLookupSearch() {
        const searchTerm = elements.lookupBarcodeInput.value.trim();
        const listDiv = elements.lookupResultList;
        const singleDiv = elements.lookupResultSingle;

        listDiv.innerHTML = '';
        listDiv.style.display = 'none';
        singleDiv.innerHTML = '';
        singleDiv.style.display = 'none';

        if (!searchTerm) return;
        const results = performSearch(searchTerm);

        if (results.length === 1) {
            displaySingleProductInLookup(results[0]);
        } else if (results.length > 1) {
            displayProductListInLookup(results);
        } else {
            singleDiv.innerHTML = '<p style="padding: 15px;">Nie znaleziono produktu.</p>';
            singleDiv.style.display = 'block';
        }
    }

    // ... (reszta kodu bez zmian, aż do funkcji renderScannedList)

    function renderScannedList() {
        elements.scannedListBody.innerHTML = '';
        const canOperate = scannedItems.length > 0;
        [elements.exportCsvBtn, elements.exportExcelBtn, elements.printListBtn, elements.clearListBtn, elements.saveListBtn].forEach(btn => { if(btn) btn.disabled = !canOperate; });
        scannedItems.forEach((item, index) => {
            const row = document.createElement('tr');
            // POPRAWKA: Ostateczna, prawidłowa kolejność kolumn
            row.innerHTML = `<td class="col-code">${item.name}</td><td class="col-desc">${item.description}</td><td class="col-ean">${item.ean}</td><td><input type="number" class="quantity-in-table" value="${item.quantity}" min="1" data-index="${index}" readonly></td><td><button class="delete-btn btn-icon" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>`;
            elements.scannedListBody.appendChild(row);
        });
        const totalValue = scannedItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0);
        elements.totalOrderValue.textContent = `Total: ${totalValue.toFixed(2)} PLN`;
    }

    // ... (reszta kodu bez zmian, aż do listenera importu)
    
    // POPRAWKA: Naprawiony moduł importu
    if (elements.importCsvInput) elements.importCsvInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const listName = prompt("Podaj nazwę dla importowanego zamówienia:", file.name.replace(/\.csv$/i, ''));
        if (!listName) {
            event.target.value = ''; // Resetuj input jeśli użytkownik anuluje
            return;
        }

        Papa.parse(file, {
            delimiter: ";", skipEmptyLines: true,
            complete: async (results) => {
                const itemsMap = new Map();
                results.data.forEach(row => {
                    const ean = row[0]?.trim();
                    const quantity = parseInt(row[1]?.trim(), 10);
                    if (ean && !isNaN(quantity) && quantity > 0) {
                        itemsMap.set(ean, (itemsMap.get(ean) || 0) + quantity);
                    }
                });
                const importedItems = Array.from(itemsMap, ([ean, quantity]) => {
                    let p = productDatabase.find(prod => prod.kod_kreskowy === ean || prod.nazwa_produktu === ean);
                    if (!p) p = { kod_kreskowy: ean, nazwa_produktu: ean, opis: ean, cena: "0" };
                    return { ean: p.kod_kreskowy, name: p.nazwa_produktu, description: p.opis, quantity, price: p.cena };
                });
                
                try {
                    const response = await fetch('/api/data/savelist', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') }, body: JSON.stringify({ listName, items: importedItems }) });
                    if (!response.ok) { const errData = await response.json(); throw new Error(errData.msg || "Błąd zapisu"); }
                    showToast(`Zamówienie "${listName}" zostało zaimportowane i zapisane.`);
                    await showSavedLists(); // Odśwież widok zapisanych list
                } catch (error) { alert(`Błąd: ${error.message}`); }
            },
            error: (err) => { alert(`Błąd parsowania pliku CSV: ${err.message}`); }
        });
        event.target.value = '';
    });
    
    // ... (reszta kodu bez zmian, aż do modułu kompletacji)
    
    // =================================================================
    // NOWY MODUŁ: Klawiatura numeryczna
    // =================================================================
    let numpadTarget = null;
    let numpadCallback = null;

    function openNumpad(targetElement, callback) {
        numpadTarget = targetElement;
        numpadCallback = callback;
        elements.numpadDisplay.textContent = targetElement.value || '0';
        elements.numpadModal.style.display = 'flex';
    }

    function closeNumpad() {
        elements.numpadModal.style.display = 'none';
    }

    function handleNumpadOK() {
        const value = parseInt(elements.numpadDisplay.textContent) || 0;
        if (numpadTarget) {
            numpadTarget.value = value;
            // Ręczne wywołanie zdarzenia 'change'
            numpadTarget.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (numpadCallback) {
            numpadCallback(value);
        }
        closeNumpad();
    }
    
    function attachNumpadListeners() {
        elements.numpadKeys.forEach(key => key.addEventListener('click', () => {
            const display = elements.numpadDisplay;
            if (display.textContent === '0') display.textContent = '';
            display.textContent += key.dataset.key;
        }));
        elements.numpadClear.addEventListener('click', () => { elements.numpadDisplay.textContent = '0'; });
        elements.numpadBackspace.addEventListener('click', () => {
            const display = elements.numpadDisplay;
            display.textContent = display.textContent.slice(0, -1) || '0';
        });
        elements.numpadOk.addEventListener('click', handleNumpadOK);
        
        // Podpięcie klawiatury do głównych pól ilości
        elements.quantityInput.addEventListener('click', (e) => { e.preventDefault(); openNumpad(e.target); });
        elements.inventoryQuantityInput.addEventListener('click', (e) => { e.preventDefault(); openNumpad(e.target); });

        // Delegacja dla pól w tabelach
        elements.scannedListBody.addEventListener('click', e => {
            if (e.target.classList.contains('quantity-in-table')) {
                e.preventDefault();
                openNumpad(e.target);
            }
        });
    }


    // =================================================================
    // PRZEBUDOWANY MODUŁ KOMPLETACJI
    // =================================================================
    async function startPicking(listId, listName) {
        try {
            const response = await fetch(`/api/data/list/${listId}`, { headers: { 'x-auth-token': localStorage.getItem('token') } });
            if (!response.ok) throw new Error("Błąd wczytywania zamówienia do kompletacji");
            currentPickingOrder = await response.json();
            pickedItems = [];
            elements.pickingOrderName.textContent = `Kompletacja: ${listName}`;
            renderPickingView();
            elements.pickingModule.style.display = 'flex';
        } catch (error) { alert(error.message); }
    }

    function renderPickingView() {
        if(!currentPickingOrder) return;
        
        const toPickItems = currentPickingOrder.items.filter(item => !pickedItems.some(p => p.ean === item.ean));
        elements.pickingTargetList.innerHTML = toPickItems.map(item => 
            `<div class="pick-item" data-ean="${item.ean}" style="padding: 8px; cursor: pointer; border-bottom: 1px solid var(--border-color);">
                <strong>${item.name}</strong><br><small>${item.description}</small> (ilość: ${item.quantity})
            </div>`
        ).join('');

        elements.pickingScannedList.innerHTML = pickedItems.map((item, index) => 
            `<div class="picked-item" style="display: flex; justify-content: space-between; align-items: center; padding: 5px;">
                <span>${item.name} | ${item.description}</span>
                <div>
                    <input type="number" value="${item.quantity}" class="picked-quantity-input" data-index="${index}" style="width: 60px; text-align: center;">
                    <button class="unpick-item-btn btn-icon" data-index="${index}" style="background: none; color: var(--danger-color);"><i class="fa-solid fa-arrow-left"></i></button>
                </div>
            </div>`
        ).join('');
    }

    function moveItemToPicked(ean, quantity) {
        const itemToMoveIndex = currentPickingOrder.items.findIndex(item => item.ean === ean);
        if (itemToMoveIndex > -1) {
            const originalItem = currentPickingOrder.items[itemToMoveIndex];
            pickedItems.push({ ...originalItem, quantity: quantity });
            renderPickingView();
        }
    }

    function moveItemToTarget(index) {
        pickedItems.splice(index, 1);
        renderPickingView();
    }
    
    // ... (reszta kodu)

    if (elements.closePickingModalBtn) elements.closePickingModalBtn.addEventListener('click', () => { elements.pickingModule.style.display = 'none'; });
    if (elements.pickingTargetList) elements.pickingTargetList.addEventListener('click', e => {
        const itemDiv = e.target.closest('.pick-item');
        if (itemDiv?.dataset.ean) {
            const item = currentPickingOrder.items.find(i => i.ean === itemDiv.dataset.ean);
            openNumpad(itemDiv, (quantity) => {
                moveItemToPicked(item.ean, quantity);
            });
        }
    });

    if (elements.pickingScannedList) {
        elements.pickingScannedList.addEventListener('click', e => {
            const target = e.target.closest('button.unpick-item-btn, input.picked-quantity-input');
            if (!target) return;
            const index = target.dataset.index;
            if (target.classList.contains('unpick-item-btn')) {
                moveItemToTarget(index);
            } else if (target.classList.contains('picked-quantity-input')) {
                e.preventDefault();
                openNumpad(target, (newQuantity) => {
                    pickedItems[index].quantity = newQuantity;
                    renderPickingView();
                });
            }
        });
    }

    // Inicjalizacja
    checkLoginStatus();
});
