// Czekaj na pełne załadowanie dokumentu HTML
document.addEventListener('DOMContentLoaded', () => {
    // Pobranie referencji do elementów DOM
    const loginForm = document.getElementById('login-form');
    const authContainer = document.getElementById('auth-container');
    const scannerContainer = document.getElementById('scanner-container');
    const productInfo = document.getElementById('product-info');
    const video = document.getElementById('preview');
    let scanner; // Zmienna do przechowywania instancji skanera

    /**
     * Inicjalizuje i uruchamia skaner kodów QR.
     */
    function initScanner() {
        // Utworzenie nowej instancji skanera z biblioteki Instascan
        scanner = new Instascan.Scanner({ video: video });

        // Dodanie nasłuchu na zdarzenie skanowania
        scanner.addListener('scan', function (content) {
            console.log('Zeskanowano kod:', content);
            fetchProductInfo(content); // Pobranie informacji o produkcie po zeskanowaniu
        });

        // Pobranie dostępnych kamer i uruchomienie skanera z pierwszą z nich
        Instascan.Camera.getCameras().then(function (cameras) {
            if (cameras.length > 0) {
                scanner.start(cameras[0]);
            } else {
                console.error('Nie znaleziono kamer.');
                alert('Nie znaleziono kamer.');
            }
        }).catch(function (e) {
            console.error('Błąd inicjalizacji kamery:', e);
            alert(`Błąd kamery: ${e.message}`);
        });
    }

    /**
     * Pobiera informacje o produkcie z serwera na podstawie kodu EAN.
     * @param {string} ean - Zeskanowany kod EAN produktu.
     */
    async function fetchProductInfo(ean) {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Brak autoryzacji. Zaloguj się ponownie.');
            return;
        }

        try {
            // Wysłanie zapytania do API w celu pobrania danych produktu
            const response = await fetch(`/api/data/product/${ean}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const product = await response.json();
                // Wyświetlenie informacji o produkcie
                productInfo.innerHTML = `
                    <h3>${product.name}</h3>
                    <p>EAN: ${product.ean}</p>
                    <p>Ilość: ${product.quantity}</p>
                    <p>Cena: ${product.price} zł</p>
                `;
            } else {
                // Obsługa błędu, gdy produkt nie zostanie znaleziony
                const errorData = await response.json();
                productInfo.innerHTML = `<p style="color: red;">${errorData.message || 'Nie znaleziono produktu.'}</p>`;
                console.error('Błąd pobierania danych produktu:', errorData);
            }
        } catch (error) {
            // Obsługa błędów sieciowych
            console.error('Błąd sieci:', error);
            productInfo.innerHTML = `<p style="color: red;">Błąd sieci. Sprawdź połączenie.</p>`;
        }
    }

    // Dodanie nasłuchu na zdarzenie wysłania formularza logowania
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Zapobieganie domyślnej akcji formularza
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                // Wysłanie zapytania logowania do serwera
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                // Sprawdzenie, czy odpowiedź serwera jest pomyślna (status 2xx)
                if (response.ok) {
                    const { token } = await response.json();
                    localStorage.setItem('token', token); // Zapisanie tokenu w localStorage
                    authContainer.style.display = 'none'; // Ukrycie formularza logowania
                    scannerContainer.style.display = 'block'; // Pokazanie interfejsu skanera
                    initScanner(); // Uruchomienie skanera
                } else {
                    // **ZMODYFIKOWANY BLOK OBSŁUGI BŁĘDÓW**
                    // W przypadku błędu (np. 401, 500), spróbuj odczytać i wyświetlić odpowiedź serwera
                    let errorData = { message: `Status błędu: ${response.status}` };
                    try {
                         // Próba sparsowania odpowiedzi jako JSON
                        errorData = await response.json();
                    } catch (jsonError) {
                        // Jeśli odpowiedź nie jest w formacie JSON, spróbuj odczytać ją jako tekst
                        const errorText = await response.text();
                        console.error('Odpowiedź serwera nie jest w formacie JSON:', errorText);
                        errorData.message = errorText || `Błąd serwera: ${response.status}`;
                    }
                    // Wyświetlenie szczegółów błędu w konsoli i w alercie
                    console.error('Błąd logowania - odpowiedź serwera:', response.status, errorData);
                    alert(`Błąd logowania: ${errorData.message || 'Nieprawidłowe dane uwierzytelniające.'}`);
                }
            } catch (error) {
                // Obsługa krytycznych błędów (np. problem z siecią)
                console.error('Krytyczny błąd podczas próby logowania:', error);
                alert('Wystąpił błąd sieciowy. Sprawdź połączenie z internetem i spróbuj ponownie.');
            }
        });
    } else {
        console.error('Nie można odnaleźć formularza logowania o ID "login-form".');
    }
});
