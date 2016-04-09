const supertest = require('supertest-as-promised');
const expect = require('chai').expect;
require('babel-polyfill');

describe('AuthController', function() {
  let agent;
  let otherAgent;
  let invalidAgent;
  before(() => {
    agent = supertest.agent(sails.hooks.http.app);
  });

  beforeEach(() => {
    otherAgent = supertest.agent(sails.hooks.http.app);
    invalidAgent = supertest.agent(sails.hooks.http.app);
  });

  describe('#login()', function(done) {

    it('should redirect to /login when not logged in', async () => {
      const res = await agent.get('/');
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/login');
    });

    it('should be able to register an account', async () => {
      const res = await agent.post('/auth/local/register').send({
        name: 'testuser1',
        password: 'hunter22',
        email: 'testuser1@gmail.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/');
    });

    it('should redirect to / when logged in', async () => {
      expect((await agent.get('/')).statusCode).to.equal(200);
    });

    it("shouldn't register an account with an already-existing name", async () => {
      const res = await otherAgent.post('/auth/local/register').send({
        name: 'testuser1',
        password: 'beepboop',
        email: 'testuser1spoof@gmail.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/register');
    });

    it("shouldn't register an account with an already-existing email", async () => {
      const res = await otherAgent.post('/auth/local/register').send({
        name: 'testuser2',
        password: 'beepboop',
        email: 'testuser1@gmail.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/register');
    });

    it("shouldn't register an account with a password less than 8 characters", async () => {
      const res = await otherAgent.post('/auth/local/register').send({
        name: 'testuser2',
        password: 'one',
        email: 'testuser2@gmail.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/register');
    });

    it('should not allow logins with invalid passwords', async () => {
      const res = await otherAgent.post('/auth/local').send({
        identifier: 'testuser1',
        password: 'not_the_correct_password'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/login');
    });

    it('does not allow a login with very similar passwords up to 72 characters', async () => {
      const res = await otherAgent.post('/auth/local/register').send({
        name: 'validUsername',
        // 72 asterisks
        password: '************************************************************************',
        email: 'invalid5@porybox.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/');
      const res2 = await invalidAgent.post('/auth/local').send({
        identifier: 'validUsername',
        // 71 asterisks followed by an 'a'
        password: '***********************************************************************a'
      });
      expect(res2.statusCode).to.equal(302);
      expect(res2.header.location).to.equal('/login');
    });

    it('should allow logins with valid passwords', async () => {
      const res = await otherAgent.post('/auth/local').send({
        identifier: 'testuser1',
        password: 'hunter22'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/');
    });

    it('should not allow logins with invalid user but the password of another', async () => {
      const res = await otherAgent.post('/auth/local/login').send({
        identifier: 'testuser2',
        password: 'hunter22'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/login');
    });

    it('should not allow registration with usernames that contain special characters', async () => {
      const res = await invalidAgent.post('/auth/local/register').send({
        name: 'testuseréééé',
        password: 'blahblahblah',
        email: 'invalid@porybox.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/register');
    });

    it('should not allow registration with a username that has been deleted', async () => {
      const res = await otherAgent.post('/auth/local/register').send({
        name: 'claimedUsername2',
        password: 'blahblahblah',
        email: 'invalid3@porybox.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/');
      const res2 = await otherAgent.post('/deleteAccount').send({password: 'blahblahblah'});
      expect(res2.statusCode).to.equal(302);
      expect(res2.header.location).to.equal('/');
      const res3 = await invalidAgent.post('/auth/local/register').send({
        name: 'CLAIMEDUSERNAME2',
        password: 'AAAAAAAAAAAAA',
        email: 'invalid4@porybox.com'
      });
      expect(res3.statusCode).to.equal(302);
      expect(res3.header.location).to.equal('/register');
    });

    it('does not allow passwords longer than 72 characters', async () => {
      const res = await otherAgent.post('/auth/local/register').send({
        name: 'UNIQUE_USERNAME',
        // 73 asterisks
        password: '*************************************************************************',
        email: 'invalid5@porybox.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/register');
    });
  });
});
