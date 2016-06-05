/**
 * HomeController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = _.mapValues({
  async index (req, res) {
    if (req.user && !req.user._orderedBoxIds) {
      req.user._orderedBoxIds = _.map(await Box.find({owner: req.user.name}), 'id');
      await req.user.save();
    }
    res.view('home/view', {
      boxes: req.user
        ? await User.findOne({name: req.user.name})
          .populate('boxes')
          .then(BoxOrdering.getOrderedBoxList)
        : null,
      prefs: req.user
        ? await UserPreferences.findOne({user: req.user.name})
        : null
    });
  }
}, catchAsyncErrors);
