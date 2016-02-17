const supertest = require('supertest');
require('babel-polyfill');
describe('AuthController', function() {
  let agent;
  let otherAgent;
  before(() => {
    agent = supertest.agent(sails.hooks.http.app);
    otherAgent = supertest.agent(sails.hooks.http.app);
  });
  describe('#login()', function(done) {
    it('should redirect to /login when not logged in', done => {
      agent.get('/').expect(302).expect('location', '/login', done);
    });
    it('should be able to register an account', async () => {
      await sails.models.user.destroy({username: 'testuser1'}); // delete whatever user exists from previous test runs
      await new Promise((resolve, reject) => {
        agent
          .post('/auth/local/register')
          .send({username: 'testuser1', password: 'hunter22', email: 'testuser1@gmail.com'})
          .expect(302)
          .expect('location', '/', (err, res) => {
            agent.saveCookies(res);
            return err ? reject(err) : resolve(res);
          });
      });
    });
    it('should not allow logins with invalid passwords', done => {
      otherAgent.post('/auth/local/login')
      .send({username: 'testuser1', password: '********'})
      .expect(302)
      .expect('location', '/login', done)
    });
    xit('should block attempts to register an account with an already-existing username', done => {
      // At the moment it technically blocks the attempt, but it redirects to a confusing page (issue #55)
      otherAgent.post('/auth/local/register')
      .send({username: 'testuser1', password: 'beepboop', email: 'testuser1spoof@gmail.com'})
      .expect(403)
      .end(done)
    });
    it('should redirect to / when logged in', done => {
      agent.get('/').expect(200, done);
    });
  });
});
