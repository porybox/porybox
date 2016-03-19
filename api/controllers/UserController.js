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
    }).populate('contents');
    if (req.user && (req.user.name === user.name || req.user.isAdmin)) {
      return res.ok(boxes);
    }
    return res.ok(
      _.reject(boxes, b => b.visibility === 'unlisted').map(b => b.omitPrivateContents())
    );
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
  }
}, CatchAsyncErrors);
