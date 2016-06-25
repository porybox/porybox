module.exports = func => (req, res) => Promise.method(func)(req, res).catch(err => {
  if (res.headersSent) {
    return sails.log.error(err);
  }
  if (!_.isError(err) && err.statusCode) {
    return res.status(err.statusCode).json(err.message);
  }
  res.serverError(err);
});

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
}, catchAsyncErrors);

This also allows custom errors to be thrown (e.g. from services that don't have access to the `res`
object). If a thrown error has the `statusCode` property (and optionally a `message` property), that
status code will be returned to the client.

Note: To avoid accidentally leaking error information,
error information will only get sent if the error is not an instance of the global `Error` object.

i.e.

throw {statusCode: 400, message: 'Missing parameter'}; // (will cause a 400 error to be sent to the client)

throw new Error({statusCode: 400, message: 'Missing parameter'}) // (will result in a 500 status code)

*/
