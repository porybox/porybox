/**
 * HomeController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = _.mapValues({
  async index (req, res) {
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
  },

  faq (req, res) {
    return res.view('home/faq');
  }
}, CatchAsyncErrors);
