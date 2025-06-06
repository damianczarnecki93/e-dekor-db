// middleware/adminMiddleware.js
const User = require('../models/User');

// To middleware zakłada, że `authMiddleware` został już użyty wcześniej.
// Sprawdza, czy zalogowany użytkownik ma rolę 'admin'.
const adminMiddleware = async (req, res, next) => {
    try {
        // Zakładamy, że authMiddleware dodał już req.user
        const user = await User.findById(req.user.id);

        if (user && user.role === 'admin') {
            next(); // Użytkownik jest adminem, przejdź dalej
        } else {
            // Jeśli użytkownik nie jest adminem, zwróć błąd
            return res.status(403).json({ msg: 'Brak uprawnień administratora.' });
        }
    } catch (err) {
        res.status(500).send('Błąd serwera przy weryfikacji uprawnień.');
    }
};

module.exports = adminMiddleware;