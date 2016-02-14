/**
 * HomeController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = {

  index: async function (req, res) {
    const boxes = await Box.find({'user': req.user.username}).then(function (test) {
      return test;
    });
    console.log(boxes);
    res.view(
      'home/view',
      {boxes: boxes}
    );
  },

};
