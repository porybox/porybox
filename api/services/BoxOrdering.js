// polyfill lodash.keyBy, which was introduced in lodash 4, since sails only exposes lodash 3.
const keyBy = (collection, iteratee) => _.mapValues(_.groupBy(collection, iteratee), 0);

function _getOrderedItemList (parent, contentsKey, orderedIdsKey) {
  const mapById = keyBy(parent[contentsKey], 'id');
  return parent[orderedIdsKey]
    .filter(id => _.has(mapById, id) && !mapById[id]._markedForDeletion)
    .map(id => mapById[id]);
}
module.exports = {
  getOrderedPokemonList: _.partial(_getOrderedItemList, _, 'contents', '_orderedIds'),
  getOrderedBoxList: _.partial(_getOrderedItemList, _, 'boxes', '_orderedBoxIds')
};
