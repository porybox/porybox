/**
 * BoxController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = {

  add: async function (req, res) {
    const params = req.allParams();

    Box.create({
      name: params.name,
      user: req.user.username,
      description: params.description
    }, function (err, box) {
      if (err) {
        return res.badRequest();
      } else {
        return res.ok(box);
      }
    })
  },

};
