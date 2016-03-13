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
      return res.created(box);
    } catch (err) {
      return res.serverError(err);
    }
  },

  async get (req, res) {
    try {
      const params = req.allParams();
      const box = await Box.findOne({
        id: params.id,
        _markedForDeletion: false
      }).populate('contents');
      if (!box) {
        return res.notFound();
      }
      if (req.user && box.owner === req.user.name) {
        return res.ok(box.omitDeletedContents());
      }
      return res.ok(box.omitPrivateContents());
    } catch (err) {
      return res.serverError(err);
    }
  },

  mine (req, res) {
    return res.redirect(`/user/${req.user.name}/boxes`);
  },

  async delete (req, res) {
    try {
      const id = req.param('id');
      let box = await Box.findOne({id});
      if (!box || box._markedForDeletion) {
        return res.notFound();
      }
      if (box.owner !== req.user.name) {
        return res.forbidden();
      }
      await box.markForDeletion();
      res.send(202);
      await Promise.delay(req.param('immediately') ? 0 : Constants.BOX_DELETION_DELAY);
      box = await Box.findOne({id});
      if (box._markedForDeletion) {
        await box.destroy();
      }
    } catch (err) {
      if (res.finished) {
        sails.log.error(err);
      } else {
        return res.serverError(err);
      }
    }
  },

  async undelete (req, res) {
    try {
      const box = await Box.findOne({id: req.param('id')}).populate('contents');
      if (!box) {
        return res.notFound();
      }
      if (box.owner !== req.user.name) {
        /* If anyone other than the owner tries to undelete the box, return a 404 error.
        That way, the server doesn't leak information on whether a box with the given ID ever existed. */
        return box._markedForDeletion ? res.notFound() : res.forbidden();
      }
      await box.unmarkForDeletion();
      return res.ok();
    } catch (err) {
      return res.serverError(err);
    }
  }
};
