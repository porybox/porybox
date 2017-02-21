module.exports = {
  promise: (data) => Promise.resolve().then(() => (data)),

  blankPromise: () => new Promise(() => {})
};
