module.exports = (req, res, next) => {
  const password = req.param('password');
  try {
    Validation.assert(_.isString(password), 'Invalid password');
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json(err.message);
  }
  return Passport.findOne({user: req.user.name, protocol: 'local'})
    .then(currentPassport => currentPassport.validatePassword(password))
    .then(isValid => isValid ? next() : res.status(401).json('Incorrect password'))
    .catch(next);
};
