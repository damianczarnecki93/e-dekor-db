document.addEventListener('DOMContentLoaded', () => {

    // Definicja wszystkich elementów DOM dla łatwego dostępu i unikania błędów
    const elements = {
        loginOverlay: document.getElementById('loginOverlay'),
        appContainer: document.getElementById('appContainer'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        loginBtn: document.getElementById('loginBtn'),
        loginError: document.getElementById('loginError'),
        welcomeUser: document.getElementById('welcomeUser'),
        logoutBtn: document.getElementById('logoutBtn'),
        // Klawiatura numeryczna
        numpadModal: document.getElementById('numpad-modal'),
        numpadDisplay: document.getElementById('numpad-display'),
        numpadOk: document.getElementById('numpad-ok'),
        numpadClear: document.getElementById('numpad-clear'),
        numpadBackspace: document.getElementById('numpad-backspace'),
        numpadKeys: document.querySelectorAll('.numpad-key'),
        // Przykładowe pole do testowania klawiatury
        quantityInputs: document.querySelectorAll('.quantity-input'),
    };

    // Globalne zmienne stanu
    let numpadTarget = null;
    let numpadCallback = null;

    // =================================================================
    // INICJALIZACJA I LOGOWANIE
    // =================================================================
    const showApp = (userData) => {
        elements.loginOverlay.style.display = 'none';
        elements.appContainer.style.display = 'block';
        if (elements.welcomeUser) {
            elements.welcomeUser.textContent = userData.username;
        }
        attachAllEventListeners();
    };

    const attemptLogin = async () => {
        elements.loginError.textContent = '';
        const username = elements.loginUsername.value;
        const password = elements.loginPassword.value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                elements.loginError.textContent = data.msg || 'Wystąpił błąd';
                return;
            }
            
            localStorage.setItem('token', data.token);
            showApp(data.user);

        } catch (error) {
            console.error('Błąd logowania:', error);
            elements.loginError.textContent = 'Błąd połączenia z serwerem.';
        }
    };

    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log("Brak tokena, wyświetlam ekran logowania.");
            return;
        }

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: { 'x-auth-token': token }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log("Token ważny, automatyczne logowanie.");
                showApp(userData);
            } else {
                console.log("Token nieważny, usuwam.");
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Błąd weryfikacji tokenu:', error);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        location.reload();
    };

    // =================================================================
    // NOWA FUNKCJA: Klawiatura numeryczna
    // =================================================================
    function openNumpad(targetElement, callbackOnOk) {
        numpadTarget = targetElement;
        numpadCallback = callbackOnOk;
        elements.numpadDisplay.textContent = targetElement.value || '1';
        elements.numpadModal.style.display = 'flex';
    }

    function handleNumpadOK() {
        const value = parseInt(elements.numpadDisplay.textContent, 10) || 0;
        if (numpadTarget) {
            numpadTarget.value = value;
            // Ręczne wywołanie zdarzenia 'change', aby inne części aplikacji mogły zareagować
            numpadTarget.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (numpadCallback) {
            numpadCallback(value);
        }
        elements.numpadModal.style.display = 'none';
    }

    // =================================================================
    // GŁÓWNA FUNKCJA PODPINANIA LISTENERÓW
    // =================================================================
    function attachAllEventListeners() {
        if (elements.loginBtn) {
            elements.loginBtn.addEventListener('click', attemptLogin);
        }
        if (elements.loginPassword) {
            elements.loginPassword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    attemptLogin();
                }
            });
        }
        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', logout);
        }

        // Podpięcie klawiatury do przycisków
        elements.numpadKeys.forEach(key => key.addEventListener('click', () => {
            const display = elements.numpadDisplay;
            // Jeśli wyświetlacz pokazuje '0' lub nie jest liczbą, zresetuj go
            if (display.textContent === '0' || !/^\d+$/.test(display.textContent)) {
                display.textContent = '';
            }
            display.textContent += key.dataset.key;
        }));
        elements.numpadClear.addEventListener('click', () => { elements.numpadDisplay.textContent = '0'; });
        elements.numpadBackspace.addEventListener('click', () => {
            const display = elements.numpadDisplay;
            display.textContent = display.textContent.slice(0, -1) || '0';
        });
        elements.numpadOk.addEventListener('click', handleNumpadOK);

        // Podpięcie klawiatury do pól ilości
        elements.quantityInputs.forEach(input => {
            input.addEventListener('click', (e) => {
                e.preventDefault();
                openNumpad(e.target, (newValue) => {
                    console.log(`Pole zaktualizowane na: ${newValue}`);
                });
            });
        });
    }

    // Uruchomienie aplikacji
    checkLoginStatus();
});
