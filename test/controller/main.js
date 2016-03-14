const request = require('supertest');

describe('404', () => {
  it('should return 404 on nonexistent path', (done) => {
    request(sails.hooks.http.app)
      .post('/thiswillneverbevalid')
      .expect(404, done);
  });
});
