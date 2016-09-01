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
      visibility
    };
    Validation.verifyBoxParams(newParams);
    const box = await Box.create(newParams);
    return res.created(box);
  },

  async get (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'id');
    const box = await Box.findOne({
      id: params.id,
      _markedForDeletion: false
    });
    const safeBox = await PokemonHandler.getSafeBoxForUser(box, req.user);
    safeBox.contents = await PokemonHandler.getSafeBoxSliceForUser({
      box: safeBox,
      user: req.user,
      afterId: params.after,
      beforeId: params.before,
      sliceSize: Constants.BOX_PAGE_SIZE
    }).map(pkmn => PokemonHandler.pickPokemonFields(pkmn, params.pokemonFields));
    safeBox.totalSize = await safeBox.totalSizeForUser(req.user);
    return res.ok(safeBox);
  },

  mine (req, res) {
    return res.redirect(`/user/${req.user.name}/boxes`);
  },

  async delete (req, res) {
    const id = req.param('id');
    const box = await Box.findOne({id});
    Validation.verifyUserIsOwner(box, req.user);
    const owner = await User.findOne({name: box.owner}).populate('boxes');
    if (owner.boxes.filter(box => !box._markedForDeletion).length <= 1) {
      return res.badRequest('Refused to delete the last remaining box.');
    }
    await box.markForDeletion();
    res.send(202);
    await Promise.delay(req.param('immediately') ? 0 : Constants.BOX_DELETION_DELAY);
    const updatedBox = await Box.findOne({id});
    if (updatedBox && updatedBox._markedForDeletion) {
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
    Validation.verifyBoxParams(filteredParams);
    await Box.update({id: box.id}, filteredParams);
    return res.ok(box);
  }
}, catchAsyncErrors);
