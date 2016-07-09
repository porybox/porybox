// polyfill lodash.keyBy, which was introduced in lodash 4, since sails only exposes lodash 3.
const keyBy = (collection, iteratee) => _.mapValues(_.groupBy(collection, iteratee), 0);

function _getOrderedItemList (parent, contentsKey, orderedIdsKey) {
  const mapById = keyBy(parent[contentsKey], 'id');
  const uniqList = _.uniq(parent[orderedIdsKey]);
  const id = contentsKey === 'contents' ? parent.id : parent.name;
  const missingIds = _.difference(Object.keys(mapById), uniqList);
  if (missingIds.length) {
    // should not happen, but might due to database issues
    sails.log.warn(`The following ${orderedIdsKey} are missing from the item with id ${id
    }: ${missingIds}. They will be added to the end of the list.`);
    if (contentsKey === 'contents') BoxOrdering.addPkmnIdsToBox(parent.id, missingIds);
    else BoxOrdering.addBoxIdsToUser(parent.name, missingIds);
  }
  return uniqList
    .filter(id => _.has(mapById, id) && !mapById[id]._markedForDeletion)
    .map(id => mapById[id]);
}
module.exports = {
  getOrderedPokemonList: _.partial(_getOrderedItemList, _, 'contents', '_orderedIds'),
  getOrderedBoxList: _.partial(_getOrderedItemList, _, 'boxes', '_orderedBoxIds'),
  addPkmnIdsToBox (boxId, pkmnIds, position) {
    return Promise.fromCallback(Box.native.bind(Box)).then(collection => {
      const query = {
        $push: {_orderedIds: {$each: pkmnIds}},
        $set: {updatedAt: new Date().toISOString()}
      };
      if (_.isNumber(position)) {
        query.$push._orderedIds.$position = position;
      }
      return collection.update({_id: boxId}, query);
    });
  },

  removePkmnIdFromBox (boxId, pkmnId) {
    return Promise.fromCallback(Box.native.bind(Box)).then(collection => {
      return collection.update({_id: boxId}, {
        $pull: {_orderedIds: pkmnId},
        $set: {updatedAt: new Date().toISOString()}
      });
    });
  },

  addBoxIdsToUser (username, boxIds, position) {
    return Promise.fromCallback(User.native.bind(User)).then(collection => {
      const query = {
        $push: {_orderedBoxIds: {$each: boxIds}},
        $set: {updatedAt: new Date().toISOString()}
      };
      if (_.isNumber(position)) {
        query.$push._orderedBoxIds.$position = position;
      }
      return collection.update({_id: username}, query);
    });
  },

  removeBoxIdFromUser (username, boxId) {
    return Promise.fromCallback(User.native.bind(User)).then(collection => {
      return collection.update({_id: username}, {
        $pull: {_orderedBoxIds: boxId},
        $set: {updatedAt: new Date().toISOString()}
      });
    });
  }
};
