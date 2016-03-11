module.exports = {
  async boxes (req, res) {
    try {
      const user = await User.findOne({id: req.param('name')}).populate('boxes');
      if (!user) {
        return res.notFound();
      }
      const boxes = _.filter(user.boxes, box => !box._markedForDeletion);
      if (req.user && req.user.name === user.name) {
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
    return User.findOne({name: req.user.name}).then(res.ok).catch(res.serverError);
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
      const updated = await UserPreferences.update({user: req.user.name}, filteredParams);
      return res.ok(updated[0]);
    } catch (err) {
      return res.serverError(err);
    }
  }
};
