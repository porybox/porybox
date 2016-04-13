// polyfill lodash.keyBy, which was introduced in lodash 4, since sails only exposes lodash 3.
const keyBy = (collection, iteratee) => _.mapValues(_.groupBy(collection, iteratee), 0);
module.exports = {
  getOrderedPokemonList (box) {
    const pokemonMapById = keyBy(box.contents, 'id');
    const orderedList = [];
    _.forEach(box._orderedIds, id => {
      if (_.isString(id) && id in pokemonMapById) {
        if (!pokemonMapById[id]._markedForDeletion) {
          orderedList.push(pokemonMapById[id]);
        }
      } else {
        sails.log.warn(`Pokemon ${id} is in box ${box.id}, but is not on its ordered ID list.`);
      }
    });
    return orderedList;
  }
};
