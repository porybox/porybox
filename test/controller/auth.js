'use strict';
const expect = require('chai').use(require('dirty-chai')).expect;
const testHelpers = require('../test-helpers');

describe('AuthController', function() {
  let agent;
  let otherAgent;
  let invalidAgent;
  beforeEach(async () => {
    agent = await testHelpers.getAgent();
    otherAgent = await testHelpers.getAgent();
    invalidAgent = await testHelpers.getAgent();
  });

  describe('#login()', function () {
    it('should be able to register an account', async () => {
      const res = await agent.post('/api/v1/auth/local/register').send({
        name: 'testuser1',
        password: 'hunter22',
        email: 'testuser1@gmail.com'
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get('/api/v1/me/preferences');
      expect(res2.statusCode).to.equal(200);
    });

    it('creates a box for the user after registering an account', async () => {
      const firstBoxAgent = await testHelpers.getAgent();
      const res = await firstBoxAgent.post('/api/v1/auth/local/register').send({
        name: 'firstBoxTester',
        password: 'f1rstB0xTest3r',
        email: 'firstBoxTester@porybox.com'
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await firstBoxAgent.get('/api/v1/user/firstBoxTester/boxes');
      expect(res2.statusCode).to.equal(200);
      expect(res2.body).to.be.an.instanceof(Array);
      expect(res2.body).to.have.lengthOf(1);
      expect(res2.body[0].name).to.equal(sails.services.constants.FIRST_BOX_NAME);
      expect(res2.body[0].description).to.equal(sails.services.constants.FIRST_BOX_DESCRIPTION);
      expect(res2.body[0].visibility).to.equal('listed');
      expect(res2.body[0].contents).to.eql([]);
    });

    it("shouldn't register an account with an already-existing name", async () => {
      const res = await otherAgent.post('/api/v1/auth/local/register').send({
        name: 'testuser1',
        password: 'beepboop',
        email: 'testuser1spoof@gmail.com'
      });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.equal('Error.Passport.Username.Taken');
    });

    it("shouldn't register an account with a password less than 8 characters", async () => {
      const res = await otherAgent.post('/api/v1/auth/local/register').send({
        name: 'testuser2',
        password: 'one',
        email: 'testuser2@gmail.com'
      });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.equal('Error.Passport.Password.Invalid');
    });

    it('should not allow logins with invalid passwords', async () => {
      const res = await otherAgent.post('/api/v1/auth/local').send({
        name: 'testuser1',
        password: 'not_the_correct_password'
      });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.equal('Error.Passport.Password.Wrong');
    });

    it('does not allow a login with very similar passwords up to 72 characters', async () => {
      const res = await otherAgent.post('/api/v1/auth/local/register').send({
        name: 'validUsername',
        // 72 asterisks
        password: '************************************************************************',
        email: 'invalid5@porybox.com'
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await invalidAgent.post('/api/v1/auth/local').send({
        name: 'validUsername',
        // 71 asterisks followed by an 'a'
        password: '***********************************************************************a'
      });
      expect(res2.statusCode).to.equal(401);
      expect(res2.body).to.equal('Error.Passport.Password.Wrong');
    });

    it('should allow logins with valid passwords', async () => {
      const res = await otherAgent.post('/api/v1/auth/local').send({
        name: 'testuser1',
        password: 'hunter22'
      });
      expect(res.statusCode).to.equal(200);
    });

    it('should not allow logins with invalid user but the password of another', async () => {
      const res = await otherAgent.post('/api/v1/auth/local').send({
        name: 'testuser2',
        password: 'hunter22'
      });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.equal('Error.Passport.Username.NotFound');
    });

    it('should not allow registration with usernames that contain special characters', async () => {
      const res = await invalidAgent.post('/api/v1/auth/local/register').send({
        name: 'testuseréééé',
        password: 'blahblahblah',
        email: 'invalid@porybox.com'
      });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.equal('Error.Passport.Bad.Username');
    });

    it('should not allow registration with a username that has been deleted', async () => {
      const res = await otherAgent.post('/api/v1/auth/local/register').send({
        name: 'claimedUsername2',
        password: 'blahblahblah',
        email: 'invalid3@porybox.com'
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await otherAgent.del('/api/v1/me').send({password: 'blahblahblah'});
      expect(res2.statusCode).to.equal(200);
      const res3 = await invalidAgent.post('/api/v1/auth/local/register').send({
        name: 'CLAIMEDUSERNAME2',
        password: 'AAAAAAAAAAAAA',
        email: 'invalid4@porybox.com'
      });
      expect(res3.statusCode).to.equal(401);
      expect(res3.body).to.equal('Error.Passport.Username.Taken');
    });

    it('does not allow passwords longer than 72 characters', async () => {
      const res = await otherAgent.post('/api/v1/auth/local/register').send({
        name: 'UNIQUE_USERNAME',
        // 73 asterisks
        password: '*************************************************************************',
        email: 'invalid6@porybox.com'
      });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.equal('Error.Passport.Password.Invalid');
    });
  });

  describe('logging out', () => {
    let logoutAgent;
    beforeEach(async () => {
      logoutAgent = await testHelpers.getAgent();
      const res = await logoutAgent.post('/api/v1/auth/local/register').send({
        name: 'logoutTester',
        password: "I can't think of any funny placeholder passwords right now",
        email: 'logoutTester@porybox.com'
      });
      expect(res.statusCode).to.equal(200);
    });
    it('allows the user to log themselves out', async () => {
      const res = await logoutAgent.post('/api/v1/logout');
      expect(res.statusCode).to.equal(200);

      // Do a request to make sure it doesn't work
      const res2 = await logoutAgent.get('/api/v1/me/boxes');
      expect(res2.statusCode).to.equal(403);
    });
  });

  describe('misc. security', async () => {
    let res;
    before(async () => {
      res = await agent.get('/');
      expect(res.statusCode).to.equal(200);
    });
    it('sends an x-frame-options: SAMEORIGIN header on every request', async () => {
      expect(res.header['x-frame-options']).to.equal('SAMEORIGIN');
    });
    it('sends an x-xss-protection: 1; mode=block header on every request', async () => {
      expect(res.header['x-xss-protection']).to.equal('1; mode=block');
    });
    it('sends an x-content-type-options: nosniff header on every request', async () => {
      expect(res.header['x-content-type-options']).to.equal('nosniff');
    });
    it('sends a content-security-policy header to only allow scripts from self', async () => {
      expect(res.header['content-security-policy']).to.equal(
        "default-src 'self' ; script-src 'self' *.google-analytics.com 'sha256-YK4QnoRTRZEROg1LNIoMFIigO9GqLGEnuUYQ7fa3s/U='; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src * data:; font-src 'self' https://fonts.gstatic.com; connect-src *; frame-ancestors 'self' ; form-action 'self' https://www.paypal.com ; reflected-xss block;"
      );
    });
  });

  describe('read-only mode', async () => {
    let boxId;
    before(async () => {
      agent = await testHelpers.getAgent();
      const res = await agent.post('/api/v1/auth/local/register').send({
        name: 'readonly',
        password: 'readonly',
        email: 'readonly@example.com'
      });
      expect(res.statusCode).to.equal(200);

      const res2 = await agent.post('/api/v1/box').send({name: 'Good Box'});
      expect(res2.statusCode).to.equal(201);
      boxId = res2.body.id;
      sails.config.readOnly = true;
    });
    it('does not allow anything to be created in readonly mode', async () => {
      const res = await agent.post('/api/v1/box').send({name: 'Bad Box'});
      expect(res.statusCode).to.equal(405);
      expect(res.body).to.equal('READONLY');

      const res2 = await agent.patch(`/api/v1/box/${boxId}`).send({visibility: 'listed'});
      expect(res2.statusCode).to.equal(405);
      expect(res2.body).to.equal('READONLY');
    });
    it('still allows GET requests in readonly mode', async () => {
      const res = await agent.get(`/api/v1/box/${boxId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('Good Box');
    });
    afterEach(() => {
      sails.config.readOnly = false;
    });
  });
});
