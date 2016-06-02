/**
 * HomeController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = _.mapValues({
  async index (req, res) {
    const boxes = await Box.find({owner: req.user.name});
    const prefs = await UserPreferences.find({user: req.user.name});
    res.view('home/view', {boxes, prefs});
  },

  faq (req, res) {
    return res.view('home/faq');
  }
}, CatchAsyncErrors);
