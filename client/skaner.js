document.addEventListener('DOMContentLoaded', () => {
    // Ta linijka jest najważniejsza. Jeśli ją zobaczysz, to znaczy, że plik jest ładowany.
    console.log("Plik skaner.js został ZAŁADOWANY i rozpoczęto jego wykonywanie.");

    // Definicja tylko niezbędnych elementów
    const loginOverlay = document.getElementById('loginOverlay');
    const appContainer = document.getElementById('appContainer');
    const loginUsername = document.getElementById('loginUsername');
    const loginPassword = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const welcomeUser = document.getElementById('welcomeUser');
    const testOutput = document.getElementById('test-output');

    // Funkcja, która pokazuje aplikację po udanym logowaniu
    const showApp = (userData) => {
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        if (welcomeUser) welcomeUser.textContent = userData.username;
    };

    // Funkcja próby logowania
    const attemptLogin = async () => {
        loginError.textContent = '';
        console.log("Próba logowania...");
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUsername.value, password: loginPassword.value })
            });
            
            console.log("Otrzymano odpowiedź od serwera, status:", response.status);
            const data = await response.json();

            if (!response.ok) {
                loginError.textContent = data.msg || 'Wystąpił błąd serwera';
                return;
            }
            
            localStorage.setItem('token', data.token);
            showApp(data.user);
            console.log("Logowanie pomyślne!");

        } catch (error) {
            console.error('KRYTYCZNY BŁĄD w attemptLogin:', error);
            loginError.textContent = 'Błąd krytyczny. Sprawdź konsolę (F12).';
        }
    };

    // Główne podpięcie zdarzeń
    if (loginBtn) {
        loginBtn.addEventListener('click', attemptLogin);
        console.log("Event listener dla przycisku logowania został podpięty.");
    } else {
        console.error("BŁĄD KRYTYCZNY: Nie znaleziono przycisku logowania #loginBtn.");
    }
    
    // Zmiana napisu, aby potwierdzić, że skrypt doszedł do końca
    if(testOutput) {
        testOutput.textContent = "SUKCES! Skrypt 'skaner.js' został wykonany poprawnie.";
        testOutput.style.color = 'green';
        testOutput.style.fontWeight = 'bold';
    }
});
