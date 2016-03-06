/**
 * BoxController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = {

  async add (req, res) {
    try {
      const params = req.allParams();
      const visibilities = ['listed', 'unlisted'];
      if (!params.name || params.visibility && !_.includes(visibilities, params.visibility)) {
        return res.badRequest();
      }
      const box = await Box.create({
        name: params.name,
        owner: req.user.name,
        description: params.description,
        visibility: params.visibility,
        id: require('crypto').randomBytes(16).toString('hex')
      });
      return res.ok(box);
    } catch (err) {
      return res.serverError(err);
    }
  },

  async get (req, res) {
    try {
      const params = req.allParams();
      const box = await Box.findOne({id: params.id}).populate('contents');
      if (!box) {
        return res.notFound();
      }
      return res.ok(box.owner === req.user.name ? box : box.omitPrivateContents());
    } catch (err) {
      return res.serverError(err);
    }
  },

  mine (req, res) {
    Box.find({owner: req.user.name}).populate('contents').then(res.ok).catch(res.serverError);
  }

};
