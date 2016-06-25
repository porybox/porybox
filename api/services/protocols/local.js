const crypto    = require('crypto');

/**
 * Local Authentication Protocol
 *
 * The most widely used way for websites to authenticate users is via a username
 * and/or email as well as a password. This module provides functions both for
 * registering entirely new users, assigning passwords to already registered
 * users and validating login requesting.
 *
 * For more information on local authentication in Passport.js, check out:
 * http://passportjs.org/guide/username-password/
 */

/**
 * Register a new user
 *
 * This method creates a new user from a specified email, username and password
 * and assign the newly created user a local Passport.
 *
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
exports.register = async function (req, res, next) {
  const email    = req.param('email'),
    name = req.param('name'),
    password = req.param('password');

  if (!email) {
    req.flash('error', 'Error.Passport.Email.Missing');
    return next(new Error('No email was entered.'));
  }

  if (!name) {
    req.flash('error', 'Error.Passport.Username.Missing');
    return next(new Error('No username was entered.'));
  }

  if (!password) {
    req.flash('error', 'Error.Passport.Password.Missing');
    return next(new Error('No password was entered.'));
  }
  try {
    const nameAvailable = await Validation.usernameAvailable(name);
    if (!nameAvailable) {
      req.flash('error', 'Error.Passport.Bad.Username');
      return next(new Error('That username is unavailable.'));
    }
  } catch (err) {
    return next(err);
  }
  let user, token;
  try {
    user = await User.create({name, email});
    token = crypto.randomBytes(48).toString('base64');
  } catch (err) {
    if (err.code === 'E_VALIDATION') {
      if (err.invalidAttributes.email) {
        req.flash('error', 'Error.Passport.Email.Exists');
      } else {
        req.flash('error', 'Error.Passport.User.Exists');
      }
    } else {
      req.flash('error', 'Error.Passport.User.Exists');
    }
    return next(err);
  }

  try {
    await Passport.create({
      protocol: 'local',
      password,
      user: user.name,
      accessToken: token
    });
  } catch (err) {
    if (err.code === 'E_VALIDATION') {
      req.flash('error', 'Error.Passport.Password.Invalid');
    }
    return user.destroy(function (destroyErr) {
      next(destroyErr || err);
    });
  }

  try {
    await UserPreferences.create({user});
    await Box.create({name: 'Box 1', description: '', visibility: 'listed', owner: user.name});
  } catch (err) {
    return next(err);
  }
  next(null, user);
};

/**
 * Assign local Passport to user
 *
 * This function can be used to assign a local Passport to a user who doens't
 * have one already. This would be the case if the user registered using a
 * third-party service and therefore never set a password.
 *
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
exports.connect = function (req, res, next) {
  const user     = req.user,
    password = req.param('password');

  Passport.findOne({
    protocol: 'local',
    user: user.name
  }, function (err, passport) {
    if (err) {
      return next(err);
    }

    if (!passport) {
      Passport.create({
        protocol: 'local',
        password: password,
        user: user.name
      }, function (err) {
        next(err, user);
      });
    } else {
      next(null, user);
    }
  });
};

/**
 * Validate a login request
 *
 * Looks up a user using the supplied identifier (email or username) and then
 * attempts to find a local Passport associated with the user. If a Passport is
 * found, its password is checked against the password supplied in the form.
 *
 * @param {Object}   req
 * @param {string}   identifier
 * @param {string}   password
 * @param {Function} next
 */
exports.login = function (req, username, password, next) {
  User.findOne({name: username}).then(user => {
    if (!user) {
      req.flash('error', 'Error.Passport.Username.NotFound');
      return false;
    }
    return Passport.findOne({protocol: 'local', user: user.name}).then(passport => {
      if (!passport) return false;
      return passport.validatePassword(password).then(isValid => {
        if (!isValid) {
          req.flash('error', 'Error.Passport.Password.Wrong');
          return false;
        }
        return user;
      });
    });
  }).asCallback(next);
};
