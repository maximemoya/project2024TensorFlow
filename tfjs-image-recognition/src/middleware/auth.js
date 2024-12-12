const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Non authentifié' });
};

const isNotAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return next();
    }
    res.status(400).json({ error: 'Déjà authentifié' });
};

module.exports = { isAuthenticated, isNotAuthenticated };
