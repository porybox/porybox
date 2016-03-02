/**
 * BoxController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = {

  add: function (req, res) {
    const params = req.allParams();

    Box.create({
      name: params.name,
      user: req.user.name,
      description: params.description,
      id: require('crypto').randomBytes(16).toString('hex')
    }, function (err, box) {
      if (err) {
        return res.badRequest();
      } else {
        return res.ok(box);
      }
    })
  }
};
