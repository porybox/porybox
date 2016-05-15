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
      visibility = params.visibility;
    } else {
      visibility = (await UserPreferences.findOne({user: req.user.name})).defaultBoxVisibility;
    }
    const newParams = {
      name: params.name,
      owner: req.user.name,
      description: params.description,
      visibility,
      id: require('crypto').randomBytes(16).toString('hex')
    };
    Validation.verifyBoxParams(newParams);
    const box = await Box.create(newParams);
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
    box.contents = BoxOrdering.getOrderedPokemonList(box);
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
    const box = await Box.findOne({id});
    Validation.verifyUserIsOwner(box, req.user);
    await box.markForDeletion();
    res.send(202);
    await Promise.delay(req.param('immediately') ? 0 : Constants.BOX_DELETION_DELAY);
    const updatedBox = await Box.findOne({id});
    if (updatedBox._markedForDeletion) {
      await box.destroy();
    }
  },

  async undelete (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'id');
    const box = await Box.findOne({id: req.param('id')}).populate('contents');
    Validation.verifyUserIsOwner(box, req.user, {allowDeleted: true});
    await box.unmarkForDeletion();
    return res.ok();
  },

  async edit (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'id');
    const filteredParams = Validation.filterParams(params, ['name', 'description', 'visibility']);
    const box = await Box.findOne({id: params.id});
    Validation.verifyUserIsOwner(box, req.user);
    _.assign(box, filteredParams);
    Validation.verifyBoxParams(box);
    await box.save();
    return res.ok(box);
  }
}, CatchAsyncErrors);
