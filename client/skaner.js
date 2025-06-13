document.addEventListener('DOMContentLoaded', () => {

    // Krok 1: Definicja niezbędnych elementów
    const elements = {
        loginOverlay: document.getElementById('loginOverlay'),
        appContainer: document.getElementById('appContainer'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        loginBtn: document.getElementById('loginBtn'),
        loginError: document.getElementById('loginError'),
        welcomeUser: document.getElementById('welcomeUser'),
        logoutBtn: document.getElementById('logoutBtn')
    };

    // Krok 2: Funkcja, która uruchamia aplikację po udanym logowaniu
    const showApp = (userData) => {
        elements.loginOverlay.style.display = 'none';
        elements.appContainer.style.display = 'block';
        elements.welcomeUser.textContent = userData.username;
    };

    // Krok 3: Funkcja próbująca zalogować się po kliknięciu przycisku
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

    // Krok 4: Funkcja sprawdzająca, czy użytkownik jest już zalogowany (po odświeżeniu)
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
                showApp(userData);
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Błąd weryfikacji tokenu:', error);
        }
    };

    // Krok 5: Funkcja do wylogowania
    const logout = () => {
        localStorage.removeItem('token');
        location.reload();
    };

    // Krok 6: Podpięcie wszystkich zdarzeń
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

    // Krok 7: Uruchomienie aplikacji
    checkLoginStatus();
});
