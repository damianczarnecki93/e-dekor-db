const User = require('../models/User');

module.exports = async function(req, res, next) {
    try {
        const user = await User.findById(req.user.id);
        if (user && user.role === 'admin') {
            next();
        } else {
            return res.status(403).json({ msg: 'Brak uprawnień administratora' });
        }
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
};
