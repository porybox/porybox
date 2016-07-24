'use strict';
const request = require('supertest');

describe('404', () => {
  it('should return 404 on nonexistent path', (done) => {
    request(sails.hooks.http.app)
      .get('/api/v1/thiswillneverbevalid')
      .expect(404, done);
  });
});
