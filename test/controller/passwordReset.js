'use strict';
const expect = require('chai').use(require('dirty-chai')).expect;
const Promise = require('bluebird');
const testHelpers = require('../test-helpers');

describe('PasswordResetController', () => {
  let agent;
  beforeEach(async () => {
    agent = await testHelpers.getAgent();
  });
  describe('requesting password resets', () => {
    let username, recipientEmailAddress;
    before(async () => {
      username = 'passwordForgetter';
      recipientEmailAddress = 'passwordForgetter@example.com';
      const tempAgent = await testHelpers.getAgent();
      const res = await tempAgent.post('/api/v1/auth/local/register').send({
        name: username,
        password: 'Obliviate!',
        email: recipientEmailAddress
      });
      expect(res.statusCode).to.equal(200);
    });
    describe('when the requested account exists', () => {
      it('returns a 202 response and sends an password reset email to the user', async () => {
        const res = await agent.post(`/api/v1/user/${username}/passwordReset`);
        expect(res.statusCode).to.equal(202);
        expect(res.body).to.eql({});
        const email = await new Promise(resolve => testHelpers.emailEmitter.once('email', resolve));
        expect(email.sender).to.equal('no-reply@example.org');
        expect(email.receivers).to.eql({[recipientEmailAddress]: true});
        expect(email.subject).to.equal('[Porybox] Your password reset request');
        expect(email.body).to.include(username);
        const userRequests = await sails.models.passwordreset.find({owner: username});
        expect(userRequests).to.have.lengthOf(1);
        expect(email.body).to.include(userRequests[0].id);
      });
    });
    describe('when the requested account does not exist', () => {
      it('returns a 404 error', async () => {
        // (the existence of a given account is not secret on porybox, so this does not cause an information leak)
        const res = await agent.post(`/api/v1/user/${username}aaaaaa/passwordReset`);
        expect(res.statusCode).to.equal(404);
      });
    });
  });

  describe('verifying password resets', () => {
    let username, token, recipientEmailAddress, originalExpirationTime;
    before(async () => {
      originalExpirationTime = sails.services.constants.PASSWORD_RESET_EXPIRATION_TIME;
      sails.services.constants.PASSWORD_RESET_EXPIRATION_TIME = 2000;
      username = 'passwordForgetter2';
      recipientEmailAddress = 'passwordForgetter2@example.com';
      const tempAgent = await testHelpers.getAgent();
      const res = await tempAgent.post('/api/v1/auth/local/register').send({
        name: username,
        password: 'Obliviate!',
        email: recipientEmailAddress
      });
      expect(res.statusCode).to.equal(200);
    });
    beforeEach(async () => {
      const res = await agent.post(`/api/v1/user/${username}/passwordReset`);
      expect(res.statusCode).to.equal(202);
      await Promise.delay(200);
      token = (await sails.models.passwordreset.findOne({owner: username})).id;
    });
    it('returns a 200 response if the token is valid', async () => {
      const res = await agent.get(`/api/v1/passwordReset/${token}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.eql({});
    });
    it('returns a 404 error if the token is incorrect', async () => {
      const res = await agent.get(`/api/v1/passwordReset/${token}aaaaa`);
      expect(res.statusCode).to.equal(404);
    });
    it('returns a 404 error if the token is expired', async () => {
      await Promise.delay(sails.services.constants.PASSWORD_RESET_EXPIRATION_TIME);
      const res = await agent.get(`/api/v1/passwordReset/${token}`);
      expect(res.statusCode).to.equal(404);
    });
    it('returns a 404 error if the token is already used', async () => {
      const res = await agent.del(`/api/v1/passwordReset/${token}`)
        .send({newPassword: 'foobarbaz'});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/passworeReset/${token}`);
      expect(res2.statusCode).to.equal(404);
    });
    it('returns a 404 error if the token has been superceded by another token', async () => {
      const res = await agent.post(`/api/v1/user/${username}/passwordReset`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.get(`/api/v1/passworeReset/${token}`);
      expect(res2.statusCode).to.equal(404);
    });
    after(() => {
      sails.services.constants.PASSWORD_RESET_EXPIRATION_TIME = originalExpirationTime;
    });
  });

  describe('activating password resets', () => {
    let username, oldPassword, newPassword, token, originalExpirationTime, originalAgent;
    before(() => {
      originalExpirationTime = sails.services.constants.PASSWORD_RESET_EXPIRATION_TIME;
      sails.services.constants.PASSWORD_RESET_EXPIRATION_TIME = 2000;
    });
    beforeEach(async () => {
      username = 'resetter' + require('crypto').randomBytes(4).toString('hex');
      oldPassword = 'hunter22'; // this will appear as ******** to anyone who reads the tests, right?
      originalAgent = await testHelpers.getAgent();
      const res = await originalAgent.post('/api/v1/auth/local/register').send({
        name: username,
        password: oldPassword,
        email: 'testuser1@example.com'
      });
      expect(res.statusCode).to.equal(200);
      newPassword = 'Tr0ub4dor&3';

      const res2 = await agent.post(`/api/v1/user/${username}/passwordReset`);
      expect(res2.statusCode).to.equal(202);
      await Promise.delay(200);
      token = (await sails.models.passwordreset.findOne({owner: username})).id;
    });
    describe('if the token is correct and not expired', () => {
      it('should return a 200 status code', async () => {
        const res = await agent.del(`/api/v1/passwordReset/${token}`).send({newPassword});
        expect(res.statusCode).to.equal(200);
      });
      afterEach(async () => {
        // should authenticate the current session
        const res = await agent.get('/api/v1/me');
        expect(res.statusCode).to.equal(302);
        expect(res.header.location.endsWith(`/user/${username}`)).to.be.true();
      });
      afterEach(async () => {
        // should allow login with the new password
        const tempAgent = await testHelpers.getAgent();
        const res = await tempAgent.post('/api/v1/auth/local').send({
          name: username,
          password: newPassword
        });
        expect(res.statusCode).to.equal(200);

        const res2 = await tempAgent.get('/api/v1/me');
        expect(res2.statusCode).to.equal(302);
        expect(res2.header.location.endsWith(`/user/${username}`)).to.be.true();
      });
      afterEach(async () => {
        // should not allow login with the old password
        const tempAgent = await testHelpers.getAgent();
        const res = await tempAgent.post('/api/v1/auth/local').send({
          name: username,
          password: oldPassword
        });
        expect(res.statusCode).to.equal(401);

        const res2 = await tempAgent.get('/api/v1/me');
        expect(res2.statusCode).to.equal(403);
      });
      afterEach(async () => {
        // should not allow the token to be used again
        const res = await agent.del(`/api/v1/passwordReset/${token}`).send({newPassword});
        expect(res.statusCode).to.equal(404);
      });
      afterEach(async () => {
        // should clear existing sessions
        const res = await originalAgent.get('/api/v1/me');
        expect(res.statusCode).to.equal(403);
      });
    });
    describe('if the request is invalid', () => {
      describe('if the token is incorrect', () => {
        it('should return a 404 error', async () => {
          const res = await agent.del(`/api/v1/passwordReset/${token}aaaa`).send({
            newPassword
          });
          expect(res.statusCode).to.equal(404);
        });
      });
      describe('if the token is correct but expired', () => {
        it('should return a 404 error', async () => {
          await Promise.delay(sails.services.constants.PASSWORD_RESET_EXPIRATION_TIME);
          const res = await agent.del(`/api/v1/passwordReset/${token}`).send({newPassword});
          expect(res.statusCode).to.equal(404);
        });
      });
      describe('if another request has been made since this token was sent', () => {
        it('should return a 404 error', async () => {
          const res = await agent.post(`/api/v1/user/${username}/passwordReset`);
          expect(res.statusCode).to.equal(202);
          const res2 = await agent.del(`/api/v1/passwordReset/${token}`).send({newPassword});
          expect(res2.statusCode).to.equal(404);
        });
      });
      describe('if the new password is invalid', () => {
        it('should return a 400 error', async () => {
          const res = await agent.del(`/api/v1/passwordReset/${token}`)
            .send({newPassword: 'a'});
          expect(res.statusCode).to.equal(400);
          // don't invalidate the token if the password is invalid
          expect(await sails.models.passwordreset.findOne({id: token})).to.exist();
        });
      });
      afterEach(async () => {
        // should not authenticate the current session
        const res = await agent.get('/api/v1/me');
        expect(res.statusCode).to.equal(403);
      });
      afterEach(async () => {
        // should not allow login with the new password
        const tempAgent = await testHelpers.getAgent();
        const res = await tempAgent.post('/api/v1/auth/local').send({
          name: username,
          password: newPassword
        });
        expect(res.statusCode).to.equal(401);

        const res2 = await tempAgent.get('/api/v1/me');
        expect(res2.statusCode).to.equal(403);
      });
      afterEach(async () => {
        // should allow login with the old password
        const tempAgent = await testHelpers.getAgent();
        const res = await tempAgent.post('/api/v1/auth/local').send({
          name: username,
          password: oldPassword
        });
        expect(res.statusCode).to.equal(200);

        const res2 = await tempAgent.get('/api/v1/me');
        expect(res2.statusCode).to.equal(302);
        expect(res2.header.location.endsWith(`/user/${username}`)).to.be.true();
      });
      afterEach(async () => {
        // should not clear existing sessions
        const res = await originalAgent.get('/api/v1/me');
        expect(res.statusCode).to.equal(302);
        expect(res.header.location).to.equal(`/api/v1/user/${username}`);
      });
    });
    after(() => {
      sails.services.constants.PASSWORD_RESET_EXPIRATION_TIME = originalExpirationTime;
    });
  });
});
