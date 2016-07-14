/**
 * HomeController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = _.mapValues({
  async index (req, res) {

    /* NOTE: This if-block is only necessary to prevent devs from having to migrate their local database
    due to the introduction of the _orderedBoxIds property. It should never get called after the first run, and
    we should remove it at some point. */
    if (req.user && !req.user._orderedBoxIds) {
      req.user._orderedBoxIds = _.map(await Box.find({owner: req.user.name}), 'id');
      await req.user.save();
    }
    res.view('home/view');
  }
}, catchAsyncErrors);
