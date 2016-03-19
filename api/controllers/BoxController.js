/**
 * BoxController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = _.mapValues({

  async add (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'name');
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
  },

  async get (req, res) {
    const params = req.allParams();
    const box = await Box.findOne({
      id: params.id,
      _markedForDeletion: false
    }).populate('contents');
    if (!box) {
      return res.notFound();
    }
    if (req.user && (box.owner === req.user.name || req.user.isAdmin)) {
      return res.ok(box.omitDeletedContents());
    }
    return res.ok(box.omitPrivateContents());
  },

  mine (req, res) {
    return res.redirect(`/user/${req.user.name}/boxes`);
  },

  async delete (req, res) {
    const id = req.param('id');
    let box = await Validation.verifyUserIsBoxOwner({user: req.user, id});
    await box.markForDeletion();
    res.send(202);
    await Promise.delay(req.param('immediately') ? 0 : Constants.BOX_DELETION_DELAY);
    box = await Box.findOne({id});
    if (box._markedForDeletion) {
      await box.destroy();
    }
  },

  async undelete (req, res) {
    const box = await Validation.verifyUserIsBoxOwner({
      id: req.param('id'),
      user: req.user,
      allowDeleted: true,
      populate: ['contents']
    });
    await box.unmarkForDeletion();
    return res.ok();
  },

  async edit (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'id');
    const filteredParams = Validation.filterParams(params, ['name', 'description', 'visibility']);
    const box = await Validation.verifyUserIsBoxOwner({user: req.user, id: params.id});
    _.assign(box, filteredParams);
    await box.save();
    return res.ok(box);
  }
}, CatchAsyncErrors);
