/**
 * HomeController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = _.mapValues({
  async index (req, res) {
    let boxes = null;
    let prefs = null;
    if (req.user) {
      [boxes, prefs] = await Promise.all([
        Box.find({owner: req.user.name}),
        UserPreferences.find({user: req.user.name})
      ]);
    }
    res.view('home/view', {boxes, prefs});
  },

  faq (req, res) {
    return res.view('home/faq');
  }
}, CatchAsyncErrors);
