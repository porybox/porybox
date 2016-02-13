'use strict';
require('babel-polyfill');
const Promise = require('bluebird');
const expect = require('chai').expect;
let sailsRequest;

describe('unit tests', () => {
  before(async function () {
    this.timeout(5000);
    await Promise.promisify(require('sails').load)();
    /* sails.request takes a callback instead of returning a Promise, so Promisify it and use a new `sailsRequest` function,
    which is exactly the same except that it returns a Promise. */
    sailsRequest = Promise.promisify(sails.request);
  });
  it('returns a 404 error when fetching a nonexistent path', async () => {
    await sailsRequest({method: 'get', url: '/this-path-is-invalid'}).then(expect.fail, err => {
      expect(err.status).to.equal(404);
    });
  });
});
