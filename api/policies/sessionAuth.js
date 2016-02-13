/**
 * sessionAuth
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user
 *                 Assumes that your login action in one of your controllers sets `req.session.authenticated = true;`
 * @docs        :: http://sailsjs.org/#!/documentation/concepts/Policies
 *
 */
module.exports = function(req, res, next) {

  // User is allowed, proceed to the next policy,
  // or if this is the last policy, the controller
  if (req.session.authenticated) {
    return next();
  }
  if (req.isSocket) {
    return res.status(403).json({status: 403, redirectTo: '/login'});
  }
  return res.redirect(
    '/login' + (req.url !== '/' ? '?redirect=' + encodeURIComponent(req.url) : '')
  );
};
