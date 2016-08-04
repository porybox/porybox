module.exports = _.mapValues({
  async create (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'name');
    const user = await User.findOne({name: params.name});
    if (!user) return res.notFound();
    res.send(202);
    const resetRequest = await PasswordReset.create({owner: user.name});
    const emailText = await Email.renderTemplate('passwordResetLink', {
      recipientName: user.name,
      token: resetRequest.id
    });
    await Email.send({
      to: user.email,
      subject: '[Porybox] Your password reset request',
      body: emailText
    });
    sails.log.info(`A password reset email was sent for ${user.name} (requested from IP ${req.headers['x-forwarded-for'] || req.ip})`);
  },

  async get (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'token');
    const resetRequest = await PasswordReset.findOne({id: params.token});
    if (!resetRequest || resetRequest.isExpired()) return res.notFound();
    return res.ok();
  },

  async delete (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, ['token', 'newPassword']);
    const resetRequest = await PasswordReset.findOne({id: params.token});
    if (!resetRequest) {
      sails.log.info(`A password reset was attempted from IP ${req.headers['x-forwarded-for'] || req.ip} with an invalid token ${params.token}`);
      return res.notFound();
    }
    if (resetRequest.isExpired()) {
      sails.log.info(`A password reset was attempted from IP ${req.headers['x-forwarded-for'] || req.ip} with an expired token ${params.token}`);
      return res.notFound();
    }

    // Create the new passport before destroying the reset request.
    // This prevents destruction of the reset request if the user's new password is invalid.
    const newPassport = await Passport.create({
      protocol: 'local',
      user: resetRequest.owner,
      password: params.newPassword,
      accessToken: require('crypto').randomBytes(48).toString('base64')
    }).then()
      .catchThrow({code: 'E_VALIDATION'}, {statusCode: 400, message: 'Invalid new password'});

    // Destroy the user's other Passports
    await Passport.destroy({
      user: resetRequest.owner,
      protocol: 'local',
      id: {not: newPassport.id}
    });

    await PasswordReset.destroy({owner: resetRequest.owner});

    const user = await User.findOne({name: resetRequest.owner});
    await Promise.promisify(req.login.bind(req))(user);
    req.session.authenticated = true;
    await user.clearSessions(req.sessionStore, req.sessionID);
    res.ok();
    sails.log.info(`The user ${user.name} successfully reset their password from IP ${req.headers['x-forwarded-for'] || req.ip}`);
  }
}, catchAsyncErrors);
