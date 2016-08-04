module.exports = _.mapValues({
  async get (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'name');
    const user = await User.findOne({name: params.name}).populate('preferences');
    if (!user) {
      return res.notFound();
    }
    const filteredUser = _.omit(user, 'boxes');
    if (req.user && (req.user.name === filteredUser.name || req.user.isAdmin)) {
      return res.ok(filteredUser);
    }
    return res.ok(filteredUser.omitPrivateInformation());
  },
  async boxes (req, res) {
    const user = await User.findOne({id: req.param('name')}).populate('boxes');
    if (!user) {
      return res.notFound();
    }
    const orderedBoxes = BoxOrdering.getOrderedBoxList(user);
    if (req.user && (req.user.name === user.name || req.user.isAdmin)) {
      return res.ok(orderedBoxes);
    }
    return res.ok(_.reject(orderedBoxes, b => b.visibility === 'unlisted'));
  },
  me (req, res) {
    return res.redirect(`/api/v1/user/${req.user.name}`);
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
    try {
      await User.update({name: req.user.name}, filteredParams);
    } catch (err) {
      return err.code === 'E_VALIDATION' ? res.badRequest() : res.serverError(err);
    }
    return res.ok();
  },
  async grantAdminStatus (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'name');
    const user = await User.findOne({name: params.name});
    if (!user) {
      return res.notFound();
    }
    await User.update({name: params.name}, {isAdmin: true});
    return res.ok();
  },
  async revokeAdminStatus (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'name');
    const user = await User.findOne({name: params.name});
    if (!user) {
      return res.notFound();
    }
    await User.update({name: params.name}, {isAdmin: false});
    return res.ok();
  },
  async deleteAccount (req, res) {
    // (The user's password is validated before this controller function, in the passwordRequired policy)
    await req.user.deleteAccount();
    return res.ok();
  },
  async changePassword (req, res) {
    // (The old password is validated before this controller function, in the passwordRequired policy)
    const params = req.allParams();
    // Attempt to create a new Passport for the user with the new password.
    // This is done *before* deleting the old Passport; otherwise, the user will be locked out of their
    // account if there's an error creating the new Passport.
    Validation.requireParams(params, 'newPassword');
    const newPassport = await Passport.create({
      protocol: 'local',
      user: req.user.name,
      password: params.newPassword,
      accessToken: require('crypto').randomBytes(48).toString('base64')
    }).then()
      .catchThrow({code: 'E_VALIDATION'}, {statusCode: 400, message: 'Invalid new password'});
    // Once the new Passport has been created, delete all of the user's old Passports.
    await Passport.destroy({
      user: req.user.name,
      protocol: 'local',
      // Omit the newly-created Passport -- this line is necessary because the old/new passwords might be the same.
      id: {not: newPassport.id}
    });
    // Clear the user's existing sessions, excluding this one.
    await req.user.clearSessions(req.sessionStore, req.sessionID);
    return res.ok();
  },
  async changeEmail (req, res) {
    Validation.requireParams(req.body, 'email');
    Validation.sanityCheck(_.isString(req.user.name));
    await User.update({name: req.user.name}, {email: req.body.email}).then().catchThrow(
      {code: 'E_VALIDATION'},
      {statusCode: 400, message: 'Invalid email address'}
    );
    return res.ok();
  },
  async checkUsernameAvailable (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'name');
    return res.ok(await Validation.usernameAvailable(params.name));
  }
}, catchAsyncErrors);
