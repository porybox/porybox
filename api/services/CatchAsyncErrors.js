module.exports = func => (req, res) => Promise.method(func)(req, res).catch(err =>
  res.finished ? sails.log.error(err) : res.serverError(err)
);

/* Maps a controller function to an equivalent function that also handles async errors correctly.

In other words, you can replace this controller file:

module.exports = {
  async func1 (req, res) {
    try {
      doTheActualLogic();
    } catch (err) {
      return res.serverError();
    }
  },
  async func2 (req, res) {
    try {
      doMoreActualLogic();
    } catch (err) {
      return res.serverError();
    }
  }
};

...with this:

module.exports = _.mapValues({
  async func1 (req, res) {
    doTheActualLogic();
  },
  async func2 (req, res) {
    doMoreActualLogic();
  }
}, CatchAsyncErrors);

*/
