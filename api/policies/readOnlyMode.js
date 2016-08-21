module.exports = (req, res, next) => {
  if (sails.config.readOnly && req.method.toLowerCase() !== 'get') {
    return res.status(405).json('READONLY');
  }
  return next();
};
