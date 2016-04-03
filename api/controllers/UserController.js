module.exports = _.mapValues({
  async get (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'name');
    const user = await User.findOne({name: params.name}).populate('preferences');
    if (!user) {
      return res.notFound();
    }
    if (req.user && (req.user.name === user.name || req.user.isAdmin)) {
      return res.ok(user);
    }
    return res.ok(user.omitPrivateInformation());
  },
  async boxes (req, res) {
    const user = await User.findOne({id: req.param('name')});
    if (!user) {
      return res.notFound();
    }
    const boxes = await Box.find({
      owner: req.param('name'),
      _markedForDeletion: false
    });
    if (req.user && (req.user.name === user.name || req.user.isAdmin)) {
      return res.ok(boxes);
    }
    return res.ok(_.reject(boxes, b => b.visibility === 'unlisted'));
  },
  me (req, res) {
    return res.redirect(`/user/${req.user.name}`);
  },
  getPreferences (req, res) {
    return UserPreferences.findOne({user: req.user.name}).then(res.ok).catch(res.serverError);
  },
  async editPreferences (req, res) {
    // Only allow users to change the preferences that have been explicitly marked as modifiable
    const params = req.allParams();
    const filteredParams = Validation.filterParams(params, Constants.CHANGEABLE_PREFERENCES);
    for (const i of _.keys(filteredParams)) {
      if (!Constants.CHANGEABLE_PREFERENCES[i].enum.includes(filteredParams[i])) {
        return res.badRequest(`Invalid value for preference '${i}'`);
      }
    }
    const updated = await UserPreferences.update({user: req.user.name}, filteredParams);
    return res.ok(updated[0]);
  },
  /* Each user will probably have sufficiently few FCs/IGNs/TSVs that it's easier to have a single endpoint to set all of the
  FCs than to make a different request to add/delete each FC.
  */
  async editAccountInfo (req, res) {
    const changeableKeys = ['inGameNames', 'friendCodes', 'trainerShinyValues'];
    const filteredParams = Validation.filterParams(req.allParams(), changeableKeys);
    Validation.assert(_.every(filteredParams, _.isArray), 'Parameters must be arrays');
    const hasNoDupes = arr => _.uniq(arr).length === arr.length;
    Validation.assert(_.every(filteredParams, hasNoDupes), 'Arrays must not have duplicate values');
    _.assign(req.user, filteredParams);
    try {
      await req.user.save();
    } catch (err) {
      return err.code === 'E_VALIDATION' ? res.badRequest() : res.serverError(err);
    }
    return res.ok();
  },
  async grantAdminStatus (req, res) {
    const user = await User.findOne({name: req.param('name')});
    if (!user) {
      return res.notFound();
    }
    user.isAdmin = true;
    await user.save();
    return res.ok();
  },
  async revokeAdminStatus (req, res) {
    const user = await User.findOne({name: req.param('name')});
    if (!user) {
      return res.notFound();
    }
    user.isAdmin = false;
    await user.save();
    return res.ok();
  },
  async deleteAccount (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'password');
    const userPassport = await Passport.findOne({user: req.user.name, protocol: 'local'});
    const validate = userPassport.validatePassword.bind(userPassport);
    const isValid = await Promise.promisify(validate)(params.password);
    if (!isValid) {
      return res.forbidden('Incorrect password');
    }
    await req.user.deleteAccount();
    return res.redirect('/');
  },
  async changePassword (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, ['oldPassword', 'newPassword']);
    const oldPassport = await Passport.findOne({user: req.user.name, protocol: 'local'});
    const validate = oldPassport.validatePassword.bind(oldPassport);
    const isValid = await Promise.promisify(validate)(params.oldPassword);
    if (!isValid) {
      // If the provided oldPassword is incorrect, stop immediately.
      return res.forbidden('Incorrect password');
    }
    // Otherwise, attempt to create a new Passport for the user with the new password.
    // This is done *before* deleting the old Passport; otherwise, the user will be locked out of their
    // account if there's an error creating the new Passport.
    const newPassport = await Passport.create({
      protocol: 'local',
      user: req.user.name,
      password: params.newPassword,
      accessToken: require('crypto').randomBytes(48).toString('base64')
    }).catch(err => {
      // If an error occurs creating the new Passport, throw it and abort the process.
      // (Usually this will occur when the user's new passwords is invalid, e.g. too short.)
      throw err.code === 'E_VALIDATION' ? {statusCode: 400, message: 'Invalid new password'} : err;
    });
    // Once the new Passport has been created, delete all of the user's old Passports. This has the effect
    // of clearing the user's sessions.
    await Passport.destroy({
      user: req.user.name,
      protocol: 'local',
      password: oldPassport.password,
      // Omit the newly-created Passport -- this line is necessary because the old/new passwords might be the same.
      id: {not: newPassport.id}
    });
    return res.ok();
  },
  async checkUsernameAvailable (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'name');
    return res.ok(await Validation.usernameAvailable(params.name));
  }
}, CatchAsyncErrors);
