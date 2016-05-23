'use strict';
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

    it('should redirect from /login to / when logged in', async () => {
      const res = await otherAgent.post('/auth/local/register').send({
        name: 'redirectLoginToHome',
        password: 'hunter22',
        email: 'redirect@porybox.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/');
      const res2 = await otherAgent.get('/login');
      expect(res2.statusCode).to.equal(302);
      expect(res2.header.location).to.equal('/');
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
  describe('changing a password', () => {
    let passAgent, passAgent2, passAgent3, username;
    beforeEach(async () => {
      username = `USERNAME_${require('crypto').randomBytes(4).toString('hex')}`;
      passAgent = supertest.agent(sails.hooks.http.app);
      passAgent2 = supertest.agent(sails.hooks.http.app);
      passAgent3 = supertest.agent(sails.hooks.http.app);
      const res = await passAgent.post('/auth/local/register').send({
        name: username,
        password: 'Correct Horse Battery Staple',
        email: `${require('crypto').randomBytes(4).toString('hex')}@porybox.com`
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/');
    });
    it('allows a user to change their password', async () => {
      const res = await passAgent.post('/changePassword').send({
        oldPassword: 'Correct Horse Battery Staple',
        newPassword: 'Correct Llama Battery Staple'
      });
      expect(res.statusCode).to.equal(200);
      // do another request to make sure the current user is still authenticated
      const res2 = await passAgent.post('/box').send({name: 'Soapbox'});
      expect(res2.statusCode).to.equal(201);
      // log in with a different agent to make sure the new password works
      const res3 = await passAgent2.post('/auth/local').send({
        identifier: username,
        password: 'Correct Llama Battery Staple'
      });
      expect(res3.statusCode).to.equal(302);
      expect(res3.header.location).to.equal('/');
      // log in with the old password and make sure it doesn't work
      const res4 = await passAgent3.post('/auth/local').send({
        identifier: username,
        password: 'Correct Horse Battery Staple'
      });
      expect(res4.statusCode).to.equal(302);
      expect(res4.header.location).to.equal('/login');
    });
    it('does not allow users to change their password if the given password is wrong', async () => {
      const res = await passAgent.post('/changePassword').send({
        oldPassword: 'Incorrect Horse Battery Staple',
        newPassword: 'invalid new password'
      });
      expect(res.statusCode).to.equal(403);
      // log in with the old password and make sure it still works
      const res2 = await passAgent2.post('/auth/local').send({
        identifier: username,
        password: 'Correct Horse Battery Staple'
      });
      expect(res2.statusCode).to.equal(302);
      expect(res2.header.location).to.equal('/');
      // log in with the new password and make sure it doesn't work
      const res3 = await passAgent3.post('/auth/local').send({
        identifier: username,
        password: 'invalid new password'
      });
      expect(res3.statusCode).to.equal(302);
      expect(res3.header.location).to.equal('/login');
    });
    it('returns a 400 error if a user omits either parameter', async () => {
      const res = await passAgent.post('/changePassword').send({newPassword: 'new password yay'});
      expect(res.statusCode).to.equal(400);
      const res2 = await passAgent.post('/changePassword').send({oldPassword: 'old password yay'});
      expect(res2.statusCode).to.equal(400);
    });
    it('functions properly if the new password happens to be the same as the old one', async () => {
      const res = await passAgent.post('/changePassword').send({
        oldPassword: 'Correct Horse Battery Staple',
        newPassword: 'Correct Horse Battery Staple'
      });
      expect(res.statusCode).to.equal(200);
      // do another request to make sure the current user is still authenticated
      const res2 = await passAgent.post('/box').send({name: 'Outbox'});
      expect(res2.statusCode).to.equal(201);
      // log in with a different agent to make sure the password still works
      const res3 = await passAgent2.post('/auth/local').send({
        identifier: username,
        password: 'Correct Horse Battery Staple'
      });
      expect(res3.statusCode).to.equal(302);
      expect(res3.header.location).to.equal('/');
    });
    it('returns a 400 error and keeps the old password valid if new one is invalid', async () => {
      const res = await passAgent.post('/changePassword').send({
        oldPassword: 'Correct Horse Battery Staple',
        newPassword: 'blah' // Invalid password (too short)
      });
      expect(res.statusCode).to.equal(400);
      // do another request to make sure the current user is still authenticated
      const res2 = await passAgent.post('/box').send({name: 'PO Box'});
      expect(res2.statusCode).to.equal(201);
      // log in with a different agent to make sure the old password still works
      const res3 = await passAgent2.post('/auth/local').send({
        identifier: username,
        password: 'Correct Horse Battery Staple'
      });
      expect(res3.statusCode).to.equal(302);
      expect(res3.header.location).to.equal('/');
    });
  });

  describe('logging out', () => {
    let logoutAgent;
    beforeEach(async () => {
      logoutAgent = supertest.agent(sails.hooks.http.app);
      const res = await logoutAgent.post('/auth/local/register').send({
        name: 'logoutTester',
        password: "I can't think of any funny placeholder passwords right now",
        email: 'logoutTester@porybox.com'
      });
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/');
    });
    it('allows the user to log themselves out', async () => {
      const res = await logoutAgent.post('/logout');
      expect(res.statusCode).to.equal(200);

      // Do a request to make sure it doesn't work
      const res2 = await logoutAgent.get('/boxes/mine');
      expect(res2.statusCode).to.equal(302);
      expect(res2.header.location.startsWith('/login')).to.be.true;
    });
  });
});
