/**
 * HomeController.js
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = _.mapValues({
  async index (req, res) {

    /* NOTE: This if-block is only necessary to prevent devs from having to migrate their local database
    due to the introduction of the _orderedBoxIds property. It should never get called after the first run, and
    we should remove it at some point. */
    if (req.user && !req.user._orderedBoxIds) {
      req.user._orderedBoxIds = _.map(await Box.find({owner: req.user.name}), 'id');
      await req.user.save();
    }
    res.view('home/view');
  },
  faq: (req, res) => res.view('static/faq'),
  about: (req, res) => res.view('static/about'),
  donate: (req, res) => res.view('static/donate'),
  privacyPolicy: (req, res) => res.view('static/privacy-policy'),
  tos: (req, res) => res.view('static/tos'),
  extractingPk6Files: (req, res) => res.view('static/extracting-pk6-files'),
  howToPk6Bvs: (req, res) => res.view('static/how-to-pk6-1-bvs'),
  howToPk6Homebrew: (req, res) => res.view('static/how-to-pk6-2-homebrew'),
  howToPk6SaveFiles: (req, res) => res.view('static/how-to-pk6-3-4-save-files'),
  howToPk6DecryptedPowersaves: (req, res) => res.view('static/how-to-pk6-6-decrypted-powersaves')
}, catchAsyncErrors);
