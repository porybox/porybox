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
      if (!params.name) {
        return res.badRequest('Missing box name');
      }
      let visibility;
      if (params.visibility) {
        if (!Constants.BOX_VISIBILITIES.includes(params.visibility)) {
          return res.badRequest('Invalid visibility setting');
        }
        visibility = params.visibility;
      } else {
        visibility = (await UserPreferences.findOne({user: req.user.name})).defaultBoxVisibility;
      }
      const box = await Box.create({
        name: params.name,
        owner: req.user.name,
        description: params.description,
        visibility,
        id: require('crypto').randomBytes(16).toString('hex')
      });
      return res.status(201).json(box);
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
