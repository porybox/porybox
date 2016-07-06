'use strict';
const supertest = require('supertest-as-promised');
const expect = require('chai').use(require('dirty-chai')).expect;
describe('UserController', () => {
  let agent, adminAgent, noAuthAgent, generalPurposeBox;
  before(async () => {
    agent = supertest.agent(sails.hooks.http.app);
    const res = await agent.post('/auth/local/register').send({
      name: 'usertester',
      password: '********',
      email: 'usertester@usertesting.com'
    });
    expect(res.statusCode).to.equal(200);
    adminAgent = supertest.agent(sails.hooks.http.app);
    const res2 = await adminAgent.post('/auth/local/register').send({
      name: 'IM_AN_ADMIN_FEAR_ME',
      password: '***********************************************************************',
      email: 'admin@porybox.com'
    });
    expect(res2.statusCode).to.equal(200);
    await sails.models.user.update({name: 'IM_AN_ADMIN_FEAR_ME'}, {isAdmin: true});
    noAuthAgent = supertest.agent(sails.hooks.http.app);

    const res3 = await agent.post('/box').send({name: 'Boxer'});
    expect(res3.statusCode).to.equal(201);
    generalPurposeBox = res3.body.id;
  });
  it('can redirect users to information about their own profile', async () => {
    const res = await agent.get('/api/v1/me');
    expect(res.statusCode).to.equal(302);
    expect(res.header.location).to.equal('/user/usertester');
  });
  describe('getting a user profile', () => {
    it('returns full information when a user gets their own profile', async () => {
      const res = await agent.get('/user/usertester');
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
      const res = await agent.get('/user/IM_AN_ADMIN_FEAR_ME');
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
      const res = await adminAgent.get('/user/usertester');
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
      const res = await noAuthAgent.get('/user/usertester');
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
      const res = await agent.get('/user/usertester');
      expect(res.statusCode).to.equal(200);
      expect(res.body._orderedBoxIds).to.not.exist();
      const res2 = await adminAgent.get('/user/usertester');
      expect(res2.statusCode).to.equal(200);
      expect(res2.body._orderedBoxIds).to.not.exist();
      const res3 = await noAuthAgent.get('/user/usertester');
      expect(res3.statusCode).to.equal(200);
      expect(res3.body._orderedBoxIds).to.not.exist();
    });
  });
  describe('preferences', () => {
    it("can get a user's preferences", async () => {
      const res = await agent.get('/preferences');
      expect(res.body.defaultBoxVisibility).to.equal('listed');
      expect(res.body.defaultPokemonVisibility).to.equal('viewable');
    });
    describe('modifying preferences', () => {
      it("can edit a user's preferences", async () => {
        await agent.post('/preferences/edit').send({defaultBoxVisibility: 'unlisted'});
        const newPrefs = (await agent.get('/preferences')).body;
        expect(newPrefs.defaultBoxVisibility).to.equal('unlisted');
        await agent.post('/preferences/edit').send({defaultBoxVisibility: 'listed'});
        const revertedPrefs = (await agent.get('/preferences')).body;
        expect(revertedPrefs.defaultBoxVisibility).to.equal('listed');
      });
      it('only allows users to change certain preference attributes', async () => {
        /* i.e. even though `user` is an attribute in the UserPreferences schema, the server
        shouldn't allow the user to change it. */
        const res = await agent.post('/preferences/edit').send({user: 'someone_else'});
        expect(res.statusCode).to.equal(400);
      });
      it('returns a 400 error when sent invalid preference values', async () => {
        const res = await agent.post('/preferences/edit').send({defaultBoxVisibility: 'invalid'});
        expect(res.statusCode).to.equal(400);
      });
    });
    describe('defaultBoxVisibility', () => {
      it('sets the default visibility of uploaded boxes', async () => {
        await agent.post('/preferences/edit').send({defaultBoxVisibility: 'unlisted'});
        const newBox = (await agent.post('/box').send({name: 'Lunchbox'})).body;
        expect(newBox.visibility).to.equal('unlisted');
        await agent.post('/preferences/edit').send({defaultBoxVisibility: 'listed'});
        const evenNewerBox = (await agent.post('/box').send({name: 'Chatterbox'})).body;
        expect(evenNewerBox.visibility).to.equal('listed');
      });
      it('can be overridden by specifying a visibility while uploading a box', async () => {
        await agent.post('/preferences/edit').send({defaultBoxVisibility: 'unlisted'});
        const newBox = (await agent.post('/box').send({
          name: 'Matchbox',
          visibility: 'listed'
        })).body;
        expect(newBox.visibility).to.equal('listed');
        await agent.post('/preferences/edit').send({defaultBoxVisibility: 'listed'});
        const evenNewerBox = (await agent.post('/box').send({
          name: 'Toolbox',
          visibility: 'unlisted'
        })).body;
        expect(evenNewerBox.visibility).to.equal('unlisted');
      });
    });
    describe('defaultPokemonVisibility', () => {
      it('sets the default visibility of uploaded pokemon', async () => {
        await agent.post('/preferences/edit').send({defaultPokemonVisibility: 'public'});
        const res = await agent.post('/uploadpk6')
          .attach('pk6', `${__dirname}/pkmn1.pk6`)
          .field('box', generalPurposeBox);
        expect(res.statusCode).to.equal(201);
        expect(res.body.visibility).to.equal('public');
        await agent.post('/preferences/edit').send({defaultPokemonVisibility: 'viewable'});
        const res2 = await agent.post('/uploadpk6')
          .attach('pk6', `${__dirname}/pkmn1.pk6`)
          .field('box', generalPurposeBox);
        expect(res2.statusCode).to.equal(201);
        expect(res2.body.visibility).to.equal('viewable');
      });
      it('can be overridden by specifying a visibility while uploading a pokemon', async () => {
        await agent.post('/preferences/edit').send({defaultPokemonVisibility: 'public'});
        const res = await agent.post('/uploadpk6')
          .field('visibility', 'viewable')
          .field('box', generalPurposeBox)
          .attach('pk6', `${__dirname}/pkmn1.pk6`);
        expect(res.statusCode).to.equal(201);
        expect(res.body.visibility).to.equal('viewable');
        await agent.post('/preferences/edit').send({defaultPokemonVisibility: 'viewable'});
        const res2 = await agent.post('/uploadpk6')
          .field('visibility', 'public')
          .field('box', generalPurposeBox)
          .attach('pk6', `${__dirname}/pkmn1.pk6`);
        expect(res.statusCode).to.equal(201);
        expect(res2.body.visibility).to.equal('public');
      });
    });
  });
  describe('editing account information', async () => {
    beforeEach(async () => {
      const res = await agent.post('/me').send({
        friendCodes: [],
        inGameNames: [],
        trainerShinyValues: []
      });
      expect(res.statusCode).to.equal(200);
    });
    it('allows a user to edit their account information', async () => {
      const res = await agent.post('/me').send({
        friendCodes: ['0000-0000-0000', '1111-1111-1111'],
        inGameNames: ['Joe', 'Steve', 'Bob'],
        trainerShinyValues: ['0000', '4095', '1337']
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get('/user/usertester');
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.friendCodes).to.eql(['0000-0000-0000', '1111-1111-1111']);
      expect(res2.body.inGameNames).to.eql(['Joe', 'Steve', 'Bob']);
      expect(res2.body.trainerShinyValues).to.eql(['0000', '4095', '1337']);
    });
    it('allows the user to edit a subset of their information by omitting parameters', async () => {
      const res = await agent.post('/me').send({
        friendCodes: ['0000-0000-0135']
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get('/user/usertester');
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
        const res = await agent.post('/me').send(params);
        const res2 = await agent.get('/user/usertester');
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
      const res = await adminAgent.post('/user/usertester/grantAdminStatus');
      expect(res.statusCode).to.equal(200);
      expect((await noAuthAgent.get('/user/usertester')).body.isAdmin).to.be.true();
      const res2 = await adminAgent.post('/user/usertester/revokeAdminStatus');
      expect(res2.statusCode).to.equal(200);
      expect((await noAuthAgent.get('/user/usertester')).body.isAdmin).to.be.false();
    });
    it('does not allow non-admins to grant/revoke admin status', async () => {
      const res = await agent.post('/user/usertester/grantAdminStatus');
      expect(res.statusCode).to.equal(403);
      expect((await noAuthAgent.get('/user/usertester')).body.isAdmin).to.be.false();
      const res2 = await agent.post('/user/IM_AN_ADMIN_FEAR_ME/revokeAdminStatus');
      expect(res2.statusCode).to.equal(403);
      expect((await noAuthAgent.get('/user/IM_AN_ADMIN_FEAR_ME')).body.isAdmin).to.be.true();
    });
    it('returns a 404 error if the specified user does not exist', async () => {
      const res = await adminAgent.post('/user/nonexistent_username/grantAdminStatus');
      expect(res.statusCode).to.equal(404);
      const res2 = await adminAgent.post('/user/nonexistent_username/revokeAdminStatus');
      expect(res2.statusCode).to.equal(404);
    });
  });
  describe('deleting an account', () => {
    let deleteAgent;
    beforeEach(async () => {
      deleteAgent = supertest.agent(sails.hooks.http.app);
      const uniqueUsername = `deleteTester${require('crypto').randomBytes(4).toString('hex')}`;
      const res = await deleteAgent.post('/auth/local/register').send({
        name: uniqueUsername,
        password: 'correct-password',
        email: `${uniqueUsername}@usertesting.com`
      });
      expect(res.statusCode).to.equal(200);
    });
    it('allows an account to be deleted if the correct password is provided', async () => {
      const res = await deleteAgent.post('/deleteAccount').send({password: 'correct-password'});
      expect(res.statusCode).to.equal(200);
    });
    it('does not allow an account to be deleted if an incorrect password is provided', async () => {
      const res = await deleteAgent.post('/deleteAccount').send({password: 'incorrect-password'});
      expect(res.statusCode).to.equal(403);
    });
    it("deletes all of a user's boxes when their account is deleted", async () => {
      const res = await deleteAgent.post('/box').send({name: 'My box', visibility: 'listed'});
      expect(res.statusCode).to.equal(201);
      const box = res.body;
      expect((await agent.get(`/b/${box.id}`)).statusCode).to.equal(200);
      await deleteAgent.post('/deleteAccount').send({password: 'correct-password'});
      expect((await agent.get(`/b/${box.id}`)).statusCode).to.equal(404);
    });
  });
});
