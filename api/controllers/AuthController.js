/**
 * Authentication Controller
 *
 * This is merely meant as an example of how your Authentication controller
 * should look. It currently includes the minimum amount of functionality for
 * the basics of Passport.js to work.
 */
module.exports = {
  /**
   * Log out a user and return them to the homepage
   *
   * Passport exposes a logout() function on req (also aliased as logOut()) that
   * can be called from any route handler which needs to terminate a login
   * session. Invoking logout() will remove the req.user property and clear the
   * login session (if any).
   *
   * For more information on logging out users in Passport.js, check out:
   * http://passportjs.org/guide/logout/
   *
   * @param {Object} req
   * @param {Object} res
   */
  logout: function (req, res) {
    req.session.destroy();
    return res.ok();
  },

  /**
   * Create a third-party authentication endpoint
   *
   * @param {Object} req
   * @param {Object} res
   */
  provider: function (req, res) {
    passport.endpoint(req, res);
  },

  /**
   * Create a authentication callback endpoint
   *
   * This endpoint handles everything related to creating and verifying Pass-
   * ports and users, both locally and from third-aprty providers.
   *
   * Passport exposes a login() function on req (also aliased as logIn()) that
   * can be used to establish a login session. When the login operation
   * completes, user will be assigned to req.user.
   *
   * For more information on logging in users in Passport.js, check out:
   * http://passportjs.org/guide/login/
   *
   * @param {Object} req
   * @param {Object} res
   */
  callback: function (req, res) {
    function tryAgain () {

      // Only certain error messages are returned via req.flash('error', someError)
      // because we shouldn't expose internal authorization errors to the user.
      // We do return a generic error and the original request body.
      const flashError = req.flash('error')[0];
      return res.status(401).json(flashError || 'Error.Passport.Generic');
    }

    passport.callback(req, res, function (err, user, challenges) {
      if (err || !user) {
        return tryAgain(challenges);
      }

      req.login(user, function (err) {
        if (err) {
          return tryAgain(err);
        }

        // Mark the session as authenticated to work with default Sails sessionAuth.js policy
        req.session.authenticated = true;
        res.ok();
      });
    });
  },

  /**
   * Disconnect a passport from a user
   *
   * @param {Object} req
   * @param {Object} res
   */
  disconnect: function (req, res) {
    passport.disconnect(req, res);
  }
};
