document.addEventListener('DOMContentLoaded', () => {
    console.log("Skaner.js załadowany.");

    // Elementy logowania
    const loginOverlay = document.getElementById('loginOverlay');
    const appContainer = document.getElementById('appContainer');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const welcomeUser = document.getElementById('welcomeUser');

    // Elementy rejestracji
    const registerUsernameInput = document.getElementById('registerUsername');
    const registerPasswordInput = document.getElementById('registerPassword');
    const registerBtn = document.getElementById('registerBtn');
    const registerError = document.getElementById('registerError');
    
    // Przełączniki formularzy
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');

    // Funkcja pokazująca aplikację po zalogowaniu
    const showApp = (userData) => {
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        if (welcomeUser) welcomeUser.textContent = userData.username;
    };

    // Logika logowania
    const attemptLogin = async () => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: loginUsernameInput.value,
                    password: loginPasswordInput.value
                })
            });
            const data = await response.json();
            if (!response.ok) {
                loginError.textContent = data.msg || 'Błąd serwera';
            } else {
                localStorage.setItem('token', data.token);
                showApp(data.user);
            }
        } catch (err) {
            loginError.textContent = 'Błąd połączenia.';
        }
    };

    // Logika rejestracji
    const handleRegistration = async () => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: registerUsernameInput.value,
                    password: registerPasswordInput.value
                })
            });
            const data = await response.json();
            if (!response.ok) {
                registerError.textContent = data.msg || 'Błąd serwera';
            } else {
                alert('Rejestracja pomyślna! Twoje konto musi zostać aktywowane.');
                showLogin.click();
            }
        } catch (err) {
            registerError.textContent = 'Błąd połączenia.';
        }
    };

    // Sprawdzenie statusu logowania przy starcie
    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: { 'x-auth-token': token }
            });
            if (response.ok) {
                showApp(await response.json());
            } else {
                localStorage.removeItem('token');
            }
        } catch (err) {
            console.error("Błąd weryfikacji tokenu:", err);
        }
    };

    // Podpięcie zdarzeń
    if (loginBtn) loginBtn.addEventListener('click', attemptLogin);
    if (registerBtn) registerBtn.addEventListener('click', handleRegistration);
    if (showRegister) showRegister.addEventListener('click', () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });
    if (showLogin) showLogin.addEventListener('click', () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Uruchomienie
    checkLoginStatus();
});
