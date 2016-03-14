module.exports = {
  async get (req, res) {
    try {
      const params = req.allParams();
      if (!params.name) {
        return res.badRequest();
      }
      const user = await User.findOne({name: params.name}).populate('preferences');
      if (!user) {
        return res.notFound();
      }
      if (req.user && (req.user.name === user.name || req.user.isAdmin)) {
        return res.ok(user);
      }
      return res.ok(user.omitPrivateInformation());
    } catch (err) {
      return res.serverError(err);
    }
  },
  async boxes (req, res) {
    try {
      const user = await User.findOne({id: req.param('name')});
      if (!user) {
        return res.notFound();
      }
      const boxes = await Box.find({
        owner: req.param('name'),
        _markedForDeletion: false
      }).populate('contents');
      if (req.user && (req.user.name === user.name || req.user.isAdmin)) {
        return res.ok(boxes);
      }
      return res.ok(
        _.reject(boxes, b => b.visibility === 'unlisted').map(b => b.omitPrivateContents())
      );
    } catch (err) {
      return res.serverError(err);
    }
  },
  me (req, res) {
    return res.redirect(`/user/${req.user.name}`);
  },
  getPreferences (req, res) {
    return UserPreferences.findOne({user: req.user.name}).then(res.ok).catch(res.serverError);
  },
  async editPreferences (req, res) {
    try {
      // Only allow users to change the preferences that have been explicitly marked as modifiable
      const filteredParams = _.pick(req.allParams(), _.keys(Constants.CHANGEABLE_PREFERENCES));
      if (_.isEmpty(filteredParams)) {
        return res.badRequest('No valid preferences specified');
      }
      for (const i of _.keys(filteredParams)) {
        if (!Constants.CHANGEABLE_PREFERENCES[i].enum.includes(filteredParams[i])) {
          return res.badRequest(`Invalid value for preference '${i}'`);
        }
      }
      const updated = await UserPreferences.update({user: req.user.name}, filteredParams);
      return res.ok(updated[0]);
    } catch (err) {
      return res.serverError(err);
    }
  },
  async grantAdminStatus (req, res) {
    try {
      const user = await User.findOne({name: req.param('name')});
      if (!user) {
        return res.notFound();
      }
      user.isAdmin = true;
      await user.save();
      return res.ok();
    } catch (err) {
      return res.serverError(err);
    }
  },
  async revokeAdminStatus (req, res) {
    try {
      const user = await User.findOne({name: req.param('name')});
      if (!user) {
        return res.notFound();
      }
      user.isAdmin = false;
      await user.save();
      return res.ok();
    } catch (err) {
      return res.serverError(err);
    }
  }
};
