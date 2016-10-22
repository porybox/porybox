'use strict';
const expect = require('chai').use(require('dirty-chai')).expect;
const testHelpers = require('../test-helpers');
describe('UserController', () => {
  let agent, adminAgent, noAuthAgent, generalPurposeBox;
  before(async () => {
    agent = await testHelpers.getAgent();
    const res = await agent.post('/api/v1/auth/local/register').send({
      name: 'usertester',
      password: '********',
      email: 'usertester@usertesting.com'
    });
    expect(res.statusCode).to.equal(200);
    adminAgent = await testHelpers.getAgent();
    const res2 = await adminAgent.post('/api/v1/auth/local/register').send({
      name: 'IM_AN_ADMIN_FEAR_ME',
      password: '***********************************************************************',
      email: 'admin@porybox.com'
    });
    expect(res2.statusCode).to.equal(200);
    await sails.models.user.update({name: 'IM_AN_ADMIN_FEAR_ME'}, {isAdmin: true});
    noAuthAgent = await testHelpers.getAgent();

    const res3 = await agent.post('/api/v1/box').send({name: 'Boxer'});
    expect(res3.statusCode).to.equal(201);
    generalPurposeBox = res3.body.id;
  });

  it('can redirect users to information about their own profile', async () => {
    const res = await agent.get('/api/v1/me');
    expect(res.statusCode).to.equal(302);
    expect(res.header.location).to.equal('/api/v1/user/usertester');
  });

  describe('forgotten username', () => {
    let username, recipientEmailAddress;
    before(async () => {
      username = 'usernameForgetter';
      recipientEmailAddress = 'usernameForgetter@example.com';
      const tempAgent = await testHelpers.getAgent();
      const res = await tempAgent.post('/api/v1/auth/local/register').send({
        name: username,
        password: 'Obliviate!',
        email: recipientEmailAddress
      });
      expect(res.statusCode).to.equal(200);
    });
    describe('when the requested account exists', () => {
      it('returns a 202 response and sends a username reminder email to the user', async () => {
        const res = await agent.post(`/api/v1/user/${recipientEmailAddress}/forgotUsername`);
        expect(res.statusCode).to.equal(202);
        expect(res.body).to.eql({});
        const email = await new Promise(resolve => testHelpers.emailEmitter.once('email', resolve));
        expect(email.sender).to.equal('no-reply@example.org');
        expect(email.receivers).to.eql({[recipientEmailAddress]: true});
        expect(email.subject).to.equal('[Porybox] Your username');
        expect(email.body).to.include(username);
      });
    });
    describe('when the requested account does not exist', () => {
      it('returns a 202 message but doesn\'t send an email', async () => {
        // We don't want a user to know if an account exists for a specific email address, as this increases attack vectors
        const res = await agent.post(`/api/v1/user/${recipientEmailAddress}.au/forgotUsername`);
        expect(res.statusCode).to.equal(202);
      });
    });
    describe('when the requested account has an encoding error', () => {
      it('returns a 400', async () => {
        const res = await agent.post('/api/v1/user/%ZZ/forgotUsername');
        expect(res.statusCode).to.equal(400);
      });
    });
  });

  describe('getting a user profile', () => {
    it('returns full information when a user gets their own profile', async () => {
      const res = await agent.get('/api/v1/user/usertester');
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('usertester');
      expect(res.body.isAdmin).to.be.false();
      expect(res.body.email).to.equal('usertester@usertesting.com');
      expect(res.body.preferences).to.exist();
      expect(res.body.friendCodes).to.be.an.instanceof(Array);
      expect(res.body.inGameNames).to.be.an.instanceof(Array);
      expect(res.body.trainerShinyValues).to.be.an.instanceof(Array);
      expect(res.body.createdAt).to.be.a('string');
      expect(res.body.updatedAt).not.to.exist();
      expect(res.body.passports).not.to.exist();
      expect(res.body.preferences.createdAt).to.not.exist();
      expect(res.body.preferences.updatedAt).to.not.exist();
      expect(res.body.preferences.id).to.not.exist();
    });
    it("omits private information when a user gets someone else's profile", async () => {
      const res = await agent.get('/api/v1/user/IM_AN_ADMIN_FEAR_ME');
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('IM_AN_ADMIN_FEAR_ME');
      expect(res.body.isAdmin).to.be.true();
      expect(res.body.email).to.not.exist();
      expect(res.body.preferences).to.not.exist();
      expect(res.body.friendCodes).to.exist();
      expect(res.body.inGameNames).to.exist();
      expect(res.body.trainerShinyValues).exist();
      expect(res.body.createdAt).to.be.a('string');
      expect(res.body.updatedAt).not.to.exist();
      expect(res.body.passports).not.to.exist();
    });
    it("returns full information when an admin gets someone else's profile", async () => {
      const res = await adminAgent.get('/api/v1/user/usertester');
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('usertester');
      expect(res.body.isAdmin).to.be.false();
      expect(res.body.email).to.equal('usertester@usertesting.com');
      expect(res.body.preferences).to.exist();
      expect(res.body.friendCodes).to.exist();
      expect(res.body.inGameNames).to.exist();
      expect(res.body.trainerShinyValues).exist();
    });
    it('omits private information when an unauthenticated user gets a profile', async () => {
      const res = await noAuthAgent.get('/api/v1/user/usertester');
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('usertester');
      expect(res.body.isAdmin).to.be.false();
      expect(res.body.email).to.not.exist();
      expect(res.body.preferences).to.not.exist();
      expect(res.body.friendCodes).to.exist();
      expect(res.body.inGameNames).to.exist();
      expect(res.body.trainerShinyValues).exist();
    });
    it('omits server-only properties when anyone gets the profile', async () => {
      const res = await agent.get('/api/v1/user/usertester');
      expect(res.statusCode).to.equal(200);
      expect(res.body._orderedBoxIds).to.not.exist();
      const res2 = await adminAgent.get('/api/v1/user/usertester');
      expect(res2.statusCode).to.equal(200);
      expect(res2.body._orderedBoxIds).to.not.exist();
      const res3 = await noAuthAgent.get('/api/v1/user/usertester');
      expect(res3.statusCode).to.equal(200);
      expect(res3.body._orderedBoxIds).to.not.exist();
    });
    it('returns a 404 error if the user in the profile does not exist', async () => {
      const res = await agent.get('/user/adfjsakfdsafsadfasjdf');
      expect(res.statusCode).to.equal(404);
    });
  });

  describe('preferences', () => {
    it("can get a user's preferences", async () => {
      const res = await agent.get('/api/v1/me/preferences');
      expect(res.body.defaultBoxVisibility).to.equal('listed');
      expect(res.body.defaultPokemonVisibility).to.equal('viewable');
    });
    describe('modifying preferences', () => {
      it("can edit a user's preferences", async () => {
        await agent.patch('/api/v1/me/preferences').send({defaultBoxVisibility: 'unlisted'});
        const newPrefs = (await agent.get('/api/v1/me/preferences')).body;
        expect(newPrefs.defaultBoxVisibility).to.equal('unlisted');
        await agent.patch('/api/v1/me/preferences').send({defaultBoxVisibility: 'listed'});
        const revertedPrefs = (await agent.get('/api/v1/me/preferences')).body;
        expect(revertedPrefs.defaultBoxVisibility).to.equal('listed');
      });
      it('only allows users to change certain preference attributes', async () => {
        /* i.e. even though `user` is an attribute in the UserPreferences schema, the server
        shouldn't allow the user to change it. */
        const res = await agent.patch('/api/v1/me/preferences').send({user: 'someone_else'});
        expect(res.statusCode).to.equal(400);
      });
      it('returns a 400 error when sent invalid preference values', async () => {
        const res = await agent.patch('/api/v1/me/preferences')
          .send({defaultBoxVisibility: 'invalid'});
        expect(res.statusCode).to.equal(400);
      });
    });
    describe('defaultBoxVisibility', () => {
      it('sets the default visibility of uploaded boxes', async () => {
        await agent.patch('/api/v1/me/preferences').send({defaultBoxVisibility: 'unlisted'});
        const newBox = (await agent.post('/api/v1/box').send({name: 'Lunchbox'})).body;
        expect(newBox.visibility).to.equal('unlisted');
        await agent.patch('/api/v1/me/preferences').send({defaultBoxVisibility: 'listed'});
        const evenNewerBox = (await agent.post('/api/v1/box').send({name: 'Chatterbox'})).body;
        expect(evenNewerBox.visibility).to.equal('listed');
      });
      it('can be overridden by specifying a visibility while uploading a box', async () => {
        await agent.patch('/api/v1/me/preferences').send({defaultBoxVisibility: 'unlisted'});
        const newBox = (await agent.post('/api/v1/box').send({
          name: 'Matchbox',
          visibility: 'listed'
        })).body;
        expect(newBox.visibility).to.equal('listed');
        await agent.patch('/api/v1/me/preferences').send({defaultBoxVisibility: 'listed'});
        const evenNewerBox = (await agent.post('/api/v1/box').send({
          name: 'Toolbox',
          visibility: 'unlisted'
        })).body;
        expect(evenNewerBox.visibility).to.equal('unlisted');
      });
    });
    describe('defaultPokemonVisibility', () => {
      it('sets the default visibility of uploaded pokemon', async () => {
        await agent.patch('/api/v1/me/preferences').send({defaultPokemonVisibility: 'public'});
        const res = await agent.post('/api/v1/pokemon')
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
          .field('box', generalPurposeBox);
        expect(res.statusCode).to.equal(201);
        expect(res.body.visibility).to.equal('public');
        await agent.patch('/api/v1/me/preferences').send({defaultPokemonVisibility: 'viewable'});
        const res2 = await agent.post('/api/v1/pokemon')
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
          .field('box', generalPurposeBox);
        expect(res2.statusCode).to.equal(201);
        expect(res2.body.visibility).to.equal('viewable');
      });
      it('can be overridden by specifying a visibility while uploading a pokemon', async () => {
        await agent.patch('/api/v1/me/preferences').send({defaultPokemonVisibility: 'public'});
        const res = await agent.post('/api/v1/pokemon')
          .field('visibility', 'viewable')
          .field('box', generalPurposeBox)
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
        expect(res.statusCode).to.equal(201);
        expect(res.body.visibility).to.equal('viewable');
        await agent.patch('/api/v1/me/preferences').send({defaultPokemonVisibility: 'viewable'});
        const res2 = await agent.post('/api/v1/pokemon')
          .field('visibility', 'public')
          .field('box', generalPurposeBox)
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
        expect(res.statusCode).to.equal(201);
        expect(res2.body.visibility).to.equal('public');
      });
    });
  });

  describe('editing account information', async () => {
    beforeEach(async () => {
      const res = await agent.patch('/api/v1/me').send({
        friendCodes: [],
        inGameNames: [],
        trainerShinyValues: []
      });
      expect(res.statusCode).to.equal(200);
    });
    it('allows a user to edit their account information', async () => {
      const res = await agent.patch('/api/v1/me').send({
        friendCodes: ['0000-0000-0000', '1111-1111-1111'],
        inGameNames: ['Joe', 'Steve', 'Bob'],
        trainerShinyValues: ['0000', '4095', '1337']
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get('/api/v1/user/usertester');
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.friendCodes).to.eql(['0000-0000-0000', '1111-1111-1111']);
      expect(res2.body.inGameNames).to.eql(['Joe', 'Steve', 'Bob']);
      expect(res2.body.trainerShinyValues).to.eql(['0000', '4095', '1337']);
    });
    it('allows the user to edit a subset of their information by omitting parameters', async () => {
      const res = await agent.patch('/api/v1/me').send({
        friendCodes: ['0000-0000-0135']
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get('/api/v1/user/usertester');
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.friendCodes).to.eql(['0000-0000-0135']);
      expect(res2.body.inGameNames).to.eql([]);
      expect(res2.body.trainerShinyValues).to.eql([]);
    });
    it('returns a 400 error if any of the parameters are invalid', () => {
      const invalidParameterSets = [ // all of the following sets of parameters should be marked as "invalid".
        {}, // no parameters
        {someUnrelatedParameter: 5}, // no valid parameters
        {friendCodes: '0000-0000-0000'}, // not an array
        {friendCodes: ['not a real friend code']},
        {friendCodes: ['0000-1111-2222', 'not a real friend code']},
        {friendCodes: ['4444-4444-4444', '4444-4444-4444']}, // duplicates
        {inGameNames: 'Joe'}, // not an array
        {inGameNames: ['']}, // must be non-empty name
        {inGameNames: ['thisNameIsTooLong']},
        {inGameNames: ['thisNameIsOk', 'thisNameIsTooLong']},
        {inGameNames: ['Joe', 'Joe']}, // duplicates
        {trainerShinyValues: '0000'}, // not an array
        {trainerShinyValues: ['not a valid TSV']},
        {trainerShinyValues: ['0000', 'not a valid TSV']},
        {trainerShinyValues: [2222]}, // should be a string instead of a number
        {trainerShinyValues: [2222, '3333']},
        {trainerShinyValues: ['4096']}, // too high
        {trainerShinyValues: ['1234.5']},
        {trainerShinyValues: ['2222', '2222']}, // duplicates
        {friendCodes: ['1234-5678-9012'], inGameNames: ['thisNameIsTooLong']},
        {friendCodes: ['invalid fc'], inGameNames: ['Joe']},
        {friendCodes: ['0123-4567-8901'], inGameNames: ['Joe'], trainerShinyValues: ['9999']}
      ];
      return Promise.each(invalidParameterSets, async params => {
        const res = await agent.patch('/api/v1/me').send(params);
        const res2 = await agent.get('/api/v1/user/usertester');
        expect(res2.body.friendCodes).to.eql([]);
        expect(res2.body.inGameNames).to.eql([]);
        expect(res2.body.trainerShinyValues).to.eql([]);
        /* Normally this line would be right below the line with the POST request, but that makes
        it very hard to tell which test case failed, because it ends up only outputting an error message
        of `expected 200 to equal 400` without any more detail. Putting it below gives the same test
        security with more useful error messages. */
        expect(res.statusCode).to.equal(400);
      });
    });
  });

  describe('granting/revoking admin status', () => {
    beforeEach(async () => {
      await sails.models.user.update({name: 'IM_AN_ADMIN_FEAR_ME'}, {isAdmin: true});
      await sails.models.user.update({name: {not: 'IM_AN_ADMIN_FEAR_ME'}}, {isAdmin: false});
    });
    it('allows admins to grant/revoke admin status to other users', async () => {
      const res = await adminAgent.post('/api/v1/user/usertester/grantAdminStatus');
      expect(res.statusCode).to.equal(200);
      expect((await noAuthAgent.get('/api/v1/user/usertester')).body.isAdmin).to.be.true();
      const res2 = await adminAgent.post('/api/v1/user/usertester/revokeAdminStatus');
      expect(res2.statusCode).to.equal(200);
      expect((await noAuthAgent.get('/api/v1/user/usertester')).body.isAdmin).to.be.false();
    });
    it('does not allow non-admins to grant/revoke admin status', async () => {
      const res = await agent.post('/api/v1/user/usertester/grantAdminStatus');
      expect(res.statusCode).to.equal(403);
      expect((await noAuthAgent.get('/api/v1/user/usertester')).body.isAdmin).to.be.false();
      const res2 = await agent.post('/api/v1/user/IM_AN_ADMIN_FEAR_ME/revokeAdminStatus');
      expect(res2.statusCode).to.equal(403);
      expect((await noAuthAgent.get('/api/v1/user/IM_AN_ADMIN_FEAR_ME')).body.isAdmin).to.be.true();
    });
    it('returns a 404 error if the specified user does not exist', async () => {
      const res = await adminAgent.post('/api/v1/user/nonexistent_username/grantAdminStatus');
      expect(res.statusCode).to.equal(404);
      const res2 = await adminAgent.post('/api/v1/user/nonexistent_username/revokeAdminStatus');
      expect(res2.statusCode).to.equal(404);
    });
  });

  describe('deleting an account', () => {
    let deleteAgent;
    beforeEach(async () => {
      deleteAgent = await testHelpers.getAgent();
      const uniqueUsername = `deleteTester${require('crypto').randomBytes(4).toString('hex')}`;
      const res = await deleteAgent.post('/api/v1/auth/local/register').send({
        name: uniqueUsername,
        password: 'correct-password',
        email: `${uniqueUsername}@usertesting.com`
      });
      expect(res.statusCode).to.equal(200);
    });
    it('allows an account to be deleted if the correct password is provided', async () => {
      const res = await deleteAgent.del('/api/v1/me').send({password: 'correct-password'});
      expect(res.statusCode).to.equal(200);
    });
    it('does not allow an account to be deleted if an incorrect password is provided', async () => {
      const res = await deleteAgent.del('/api/v1/me').send({password: 'incorrect-password'});
      expect(res.statusCode).to.equal(401);
    });
    it("deletes all of a user's boxes when their account is deleted", async () => {
      const res = await deleteAgent.post('/api/v1/box')
        .send({name: 'My box', visibility: 'listed'});
      expect(res.statusCode).to.equal(201);
      const box = res.body;
      expect((await agent.get(`/api/v1/box/${box.id}`)).statusCode).to.equal(200);
      await deleteAgent.del('/api/v1/me').send({password: 'correct-password'});
      expect((await agent.get(`/api/v1/box/${box.id}`)).statusCode).to.equal(404);
    });
  });

  describe('changing a password', () => {
    let passAgent, passAgent2, passAgent3, otherAgent, username;
    beforeEach(async () => {
      username = `USERNAME_${require('crypto').randomBytes(4).toString('hex')}`;
      passAgent = await testHelpers.getAgent();
      passAgent2 = await testHelpers.getAgent();
      passAgent3 = await testHelpers.getAgent();
      otherAgent = await testHelpers.getAgent();
      const res = await passAgent.post('/api/v1/auth/local/register').send({
        name: username,
        password: 'Correct Horse Battery Staple',
        email: `${require('crypto').randomBytes(4).toString('hex')}@porybox.com`
      });
      expect(res.statusCode).to.equal(200);

      const res2 = await otherAgent.post('/api/v1/auth/local').send({
        name: username,
        password: 'Correct Horse Battery Staple'
      });
      expect(res2.statusCode).to.equal(200);
    });
    it('allows a user to change their password', async () => {
      const res = await passAgent.post('/api/v1/changePassword').send({
        password: 'Correct Horse Battery Staple',
        newPassword: 'Correct Llama Battery Staple'
      });
      expect(res.statusCode).to.equal(200);
      // do another request to make sure the current user is still authenticated
      const res2 = await passAgent.post('/api/v1/box').send({name: 'Soapbox'});
      expect(res2.statusCode).to.equal(201);
      // log in with a different agent to make sure the new password works
      const res3 = await passAgent2.post('/api/v1/auth/local').send({
        name: username,
        password: 'Correct Llama Battery Staple'
      });
      expect(res3.statusCode).to.equal(200);
      // log in with the old password and make sure it doesn't work
      const res4 = await passAgent3.post('/api/v1/auth/local').send({
        name: username,
        password: 'Correct Horse Battery Staple'
      });
      expect(res4.statusCode).to.equal(401);
      expect(res4.body).to.equal('Error.Passport.Password.Wrong');

      // make a request with an existing session to ensure that the session has been cleared
      const res5 = await otherAgent.get('/api/v1/me');
      expect(res5.statusCode).to.equal(403);
    });
    it('does not allow users to change their password if the given password is wrong', async () => {
      const res = await passAgent.post('/api/v1/changePassword').send({
        password: 'Incorrect Horse Battery Staple',
        newPassword: 'invalid new password'
      });
      expect(res.statusCode).to.equal(401);
      // log in with the old password and make sure it still works
      const res2 = await passAgent2.post('/api/v1/auth/local').send({
        name: username,
        password: 'Correct Horse Battery Staple'
      });
      expect(res2.statusCode).to.equal(200);
      // log in with the new password and make sure it doesn't work
      const res3 = await passAgent3.post('/api/v1/auth/local').send({
        name: username,
        password: 'invalid new password'
      });
      expect(res3.statusCode).to.equal(401);
      expect(res3.body).to.equal('Error.Passport.Password.Wrong');

      // make a request with an existing session to ensure that the session has not been cleared
      const res4 = await otherAgent.get('/api/v1/me');
      expect(res4.statusCode).to.equal(302);
      expect(res4.header.location).to.equal(`/api/v1/user/${username}`);
    });
    it('returns a 400 error if a user omits either parameter', async () => {
      const res = await passAgent.post('/api/v1/changePassword').send({newPassword: 'new pass'});
      expect(res.statusCode).to.equal(400);
      const res2 = await passAgent.post('/api/v1/changePassword')
        .send({password: 'Correct Horse Battery Staple'});
      expect(res2.statusCode).to.equal(400);
    });
    it('functions properly if the new password happens to be the same as the old one', async () => {
      const res = await passAgent.post('/api/v1/changePassword').send({
        password: 'Correct Horse Battery Staple',
        newPassword: 'Correct Horse Battery Staple'
      });
      expect(res.statusCode).to.equal(200);
      // do another request to make sure the current user is still authenticated
      const res2 = await passAgent.post('/api/v1/box').send({name: 'Outbox'});
      expect(res2.statusCode).to.equal(201);
      // log in with a different agent to make sure the password still works
      const res3 = await passAgent2.post('/api/v1/auth/local').send({
        name: username,
        password: 'Correct Horse Battery Staple'
      });
      expect(res3.statusCode).to.equal(200);
    });
    it('returns a 400 error and keeps the old password valid if new one is invalid', async () => {
      const res = await passAgent.post('/api/v1/changePassword').send({
        password: 'Correct Horse Battery Staple',
        newPassword: 'blah' // Invalid password (too short)
      });
      expect(res.statusCode).to.equal(400);
      // do another request to make sure the current user is still authenticated
      const res2 = await passAgent.post('/api/v1/box').send({name: 'PO Box'});
      expect(res2.statusCode).to.equal(201);
      // log in with a different agent to make sure the old password still works
      const res3 = await passAgent2.post('/api/v1/auth/local').send({
        name: username,
        password: 'Correct Horse Battery Staple'
      });
      expect(res3.statusCode).to.equal(200);

      // make a request with an existing session to ensure that the session has not been cleared
      const res4 = await otherAgent.get('/api/v1/me');
      expect(res4.statusCode).to.equal(302);
      expect(res4.header.location).to.equal(`/api/v1/user/${username}`);
    });
  });

  describe('changing an email address', () => {
    let changeAgent, oldEmail, newEmail, username, password;
    beforeEach(async () => {
      changeAgent = await testHelpers.getAgent();
      username = `deleteTester${require('crypto').randomBytes(4).toString('hex')}`;
      oldEmail = 'oldEmail@example.com';
      newEmail = 'newEmail@example.com';
      password = 'correct-password';
      const res = await changeAgent.post('/api/v1/auth/local/register').send({
        name: username,
        password,
        email: oldEmail
      });
      expect(res.statusCode).to.equal(200);
    });
    describe('the request is valid', () => {
      it('allows the user to change their email address', async () => {
        const res = await changeAgent.post('/api/v1/changeEmail').send({email: newEmail, password});
        expect(res.statusCode).to.equal(200);
      });
      afterEach(async () => {
        const res = await changeAgent.get(`/api/v1/user/${username}`);
        expect(res.statusCode).to.equal(200);
        expect(res.body.email).to.equal(newEmail);
      });
    });
    describe('the request is invalid', () => {
      it('returns a 400 error if the provided email is not a valid email address', async () => {
        const res = await changeAgent.post('/api/v1/changeEmail').send({
          email: 'newEmail@example.',
          password
        });
        expect(res.statusCode).to.equal(400);
      });
      it('returns a 400 error if no email is provided', async () => {
        const res = await changeAgent.post('/api/v1/changeEmail').send({password});
        expect(res.statusCode).to.equal(400);
      });
      it('returns a 400 error if a nonsense email address parameter is provided', async () => {
        const res = await changeAgent.post('/api/v1/changeEmail').send({
          password,
          email: [newEmail] // email should be a string rather than an array
        });
        expect(res.statusCode).to.equal(400);
      });
      it('returns a 401 error if the provided password is incorrect', async () => {
        const res = await changeAgent.post('/api/v1/changeEmail').send({
          email: newEmail,
          password: password + 'aaaaa'
        });
        expect(res.statusCode).to.equal(401);
      });
      it('returns a 400 error if no password is provided', async () => {
        const res = await changeAgent.post('/api/v1/changeEmail').send({email: newEmail});
        expect(res.statusCode).to.equal(400);
      });
      it('returns a 400 error if a nonsense password parameter is provided', async () => {
        const res = await changeAgent.post('/api/v1/changeEmail').send({
          email: newEmail,
          password: ['foo'] // password should be a string instead of an array
        });
        expect(res.statusCode).to.equal(400);
      });
      afterEach(async () => {
        const res = await changeAgent.get(`/api/v1/user/${username}`);
        expect(res.statusCode).to.equal(200);
        expect(res.body.email).to.equal(oldEmail);
      });
    });
  });
});
