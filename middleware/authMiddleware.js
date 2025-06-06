// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Pobierz token z nagłówka x-auth-token
    const token = req.header('x-auth-token');

    // Sprawdź, czy token istnieje
    if (!token) {
        return res.status(401).json({ msg: 'Brak tokenu, autoryzacja odrzucona.' });
    }

    // Zweryfikuj token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Dodaj zdekodowane dane użytkownika do obiektu zapytania
        next(); // Przejdź do następnego middleware lub funkcji kontrolera
    } catch (err) {
        res.status(401).json({ msg: 'Token jest nieprawidłowy.' });
    }
};