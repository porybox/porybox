/**
 * HomeController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = _.mapValues({
  async index (req, res) {
    const boxes = await Box.find({user: req.user.name});
    res.view('home/view', {boxes});
  },

  uploadpk6 (req, res) {
    return res.view('home/uploadpk6');
  }
}, CatchAsyncErrors);
