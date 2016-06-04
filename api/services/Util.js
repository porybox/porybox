module.exports = {
  generateHexId (numBytes = 16) {
    return require('crypto').randomBytes(numBytes).toString('hex');
  }
};
