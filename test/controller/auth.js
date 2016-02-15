const request = require('supertest');
  // agent = request.agent();

describe('AuthController', function() {

  describe('#login()', function(done) {
    it('should redirect to /login when not logged in', function (done) {
      request(sails.hooks.http.app)
        .get('/')
        .expect(302)
        .expect('location','/login', done);
    });
  });

// Not working yet :-\ seems to not want to register
  // describe('#login()', function() {
  //   before('', (done) => {
  //     request(sails.hooks.http.app)
  //       .post('/auth/local/register')
  //       .send({username: 'testuser1', password: '123456789', email: 'testuser1@gmail.com'})
  //       .end(function (err, res) {
  //         if (err) {
  //           throw err;
  //         }
  //         console.log(res);
  //         agent.saveCookies(res);
  //         done();
  //       });
  //   })
  //   it('should redirect to / when logged in', function (done) {
  //     const req = request(sails.hooks.http.app).get('/');
  //     agent.attachCookies(req);
  //     req.expect(302)
  //       .expect('location', '/', done);
  //   });
  // });
});
