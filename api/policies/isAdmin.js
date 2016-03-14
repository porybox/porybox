module.exports = (req, res, next) => req.user && req.user.isAdmin ? next() : res.forbidden();
