const supertest = require('supertest-as-promised');
const expect = require('chai').expect;
require('babel-polyfill');

describe('AuthController', function() {
  let agent;
  let otherAgent;
  before(() => {
    agent = supertest.agent(sails.hooks.http.app);
    otherAgent = supertest.agent(sails.hooks.http.app);
  });

  describe('#login()', function(done) {

    it('should redirect to /login when not logged in', async () => {
      const res = await agent.get('/');
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/login');
    });

    it('should be able to register an account', async () => {
      const res = await agent.post('/auth/local/register').send({
        username: 'testuser1',
        password: 'hunter22',
        email: 'testuser1@gmail.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/');
    });

    it('should redirect to / when logged in', async () => {
      expect((await agent.get('/')).statusCode).to.equal(200);
    });

    it("shouldn't register an account with an already-existing username", async () => {
      const res = await otherAgent.post('/auth/local/register').send({
        username: 'testuser1',
        password: 'beepboop',
        email: 'testuser1spoof@gmail.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/register');
    });

    it("shouldn't register an account with an already-existing email", async () => {
      const res = await otherAgent.post('/auth/local/register').send({
        username: 'testuser2',
        password: 'beepboop',
        email: 'testuser1@gmail.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/register');
    });

    it("shouldn't register an account with a password less than 8 characters", async () => {
      const res = await otherAgent.post('/auth/local/register').send({
        username: 'testuser2',
        password: 'one',
        email: 'testuser2@gmail.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/register');
    });

    it('should not allow logins with invalid passwords', async () => {
      const res = await otherAgent.post('/auth/local/login').send({
        username: 'testuser1',
        password: 'not_the_correct_password'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/login');
    });

    it('should not allow logins with invalid user but the password of another', async () => {
      const res = await otherAgent.post('/auth/local/login').send({
        username: 'testuser2',
        password: 'hunter22'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/login');
    });
  });
});
