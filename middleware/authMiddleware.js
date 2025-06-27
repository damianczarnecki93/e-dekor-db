const jwt = require('jsonwebtoken');

console.log('[DIAGNOSTYKA-MIDDLEWARE] Plik authMiddleware.js został załadowany.');

module.exports = function(req, res, next) {
    console.log(`[DIAGNOSTYKA-MIDDLEWARE] Uruchomiono middleware dla trasy: ${req.originalUrl}`);
    
    // Pobranie tokenu z nagłówka
    const token = req.header('x-auth-token');
    console.log(`[DIAGNOSTYKA-MIDDLEWARE] Szukam tokenu w nagłówku 'x-auth-token'. Otrzymano: ${token ? 'TAK' : 'NIE'}`);

    // Sprawdzenie, czy token istnieje
    if (!token) {
        console.log('[DIAGNOSTYKA-MIDDLEWARE] Brak tokenu, odrzucanie z kodem 401.');
        return res.status(401).json({ msg: 'Brak tokenu, autoryzacja odrzucona' });
    }

    try {
        console.log('[DIAGNOSTYKA-MIDDLEWARE] Próba weryfikacji tokenu...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        console.log('[DIAGNOSTYKA-MIDDLEWARE] Token zweryfikowany pomyślnie. ID użytkownika:', req.user.id);
        next(); // Przekazanie do następnej funkcji (właściwej trasy)
    } catch (err) {
        console.error('[DIAGNOSTYKA-MIDDLEWARE] Token nie jest prawidłowy. Błąd:', err.message);
        res.status(401).json({ msg: 'Token jest nieprawidłowy' });
    }
};
