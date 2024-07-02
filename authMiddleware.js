const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    const tokenString = token.split(' ')[1];
    try {
        const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).send({ message: 'Invalid token' });
    }
};

module.exports = authMiddleware;
