const supertest = require('supertest-as-promised');
const expect = require('chai').expect;
describe('UserController', () => {
  let agent, adminAgent, noAuthAgent;
  before(async () => {
    agent = supertest.agent(sails.hooks.http.app);
    const res = await agent.post('/auth/local/register').send({
      name: 'usertester',
      password: '********',
      email: 'usertester@usertesting.com'
    });
    expect(res.statusCode).to.equal(302);
    expect(res.header.location).to.equal('/');
    adminAgent = supertest.agent(sails.hooks.http.app);
    const res2 = await adminAgent.post('/auth/local/register').send({
      name: 'I_AM_AN_ADMIN_FEAR_ME',
      password: '*********************************************************************************',
      email: 'admin@porybox.com'
    });
    expect(res2.statusCode).to.equal(302);
    expect(res2.header.location).to.equal('/');
    await sails.models.user.update({name: 'I_AM_AN_ADMIN_FEAR_ME'}, {isAdmin: true});
    noAuthAgent = supertest.agent(sails.hooks.http.app);
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
      expect(res.body.isAdmin).to.be.false;
      expect(res.body.email).to.equal('usertester@usertesting.com');
      expect(res.body.preferences).to.exist;
    });
    it("omits private information when a user gets someone else's profile", async () => {
      const res = await agent.get('/user/I_AM_AN_ADMIN_FEAR_ME');
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('I_AM_AN_ADMIN_FEAR_ME');
      expect(res.body.isAdmin).to.be.true;
      expect(res.body.email).to.not.exist;
      expect(res.body.preferences).to.not.exist;
    });
    it("returns full information when an admin gets someone else's profile", async () => {
      const res = await adminAgent.get('/user/usertester');
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('usertester');
      expect(res.body.isAdmin).to.be.false;
      expect(res.body.email).to.equal('usertester@usertesting.com');
      expect(res.body.preferences).to.exist;
    });
    it('omits private information when an unauthenticated user gets a profile', async () => {
      const res = await noAuthAgent.get('/user/usertester');
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('usertester');
      expect(res.body.isAdmin).to.be.false;
      expect(res.body.email).to.not.exist;
      expect(res.body.preferences).to.not.exist;
    });
  });
  describe('preferences', () => {
    it("can get a user's preferences", async () => {
      const res = await agent.get('/preferences');
      expect(res.body.defaultBoxVisibility).to.equal('listed');
      expect(res.body.defaultPokemonVisibility).to.equal('readonly');
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
        const res = await agent.post('/uploadpk6').attach('pk6', `${__dirname}/pkmn1.pk6`);
        expect(res.body.visibility).to.equal('public');
        await agent.post('/preferences/edit').send({defaultPokemonVisibility: 'readonly'});
        const res2 = await agent.post('/uploadpk6').attach('pk6', `${__dirname}/pkmn1.pk6`);
        expect(res2.body.visibility).to.equal('readonly');
      });
      it('can be overridden by specifying a visibility while uploading a pokemon', async () => {
        await agent.post('/preferences/edit').send({defaultPokemonVisibility: 'public'});
        const res = await agent.post('/uploadpk6')
          .field('visibility', 'readonly')
          .attach('pk6', `${__dirname}/pkmn1.pk6`);
        expect(res.body.visibility).to.equal('readonly');
        await agent.post('/preferences/edit').send({defaultPokemonVisibility: 'readonly'});
        const res2 = await agent.post('/uploadpk6')
          .field('visibility', 'public')
          .attach('pk6', `${__dirname}/pkmn1.pk6`);
        expect(res2.body.visibility).to.equal('public');
      });
    });
    describe('granting/revoking admin status', () => {
      beforeEach(async () => {
        await sails.models.user.update({name: 'I_AM_AN_ADMIN_FEAR_ME'}, {isAdmin: true});
        await sails.models.user.update({name: {not: 'I_AM_AN_ADMIN_FEAR_ME'}}, {isAdmin: false});
      });
      it('allows admins to grant/revoke admin status to other users', async () => {
        const res = await adminAgent.post('/user/usertester/grantAdminStatus');
        expect(res.statusCode).to.equal(200);
        expect((await noAuthAgent.get('/user/usertester')).body.isAdmin).to.be.true;
        const res2 = await adminAgent.post('/user/usertester/revokeAdminStatus');
        expect(res2.statusCode).to.equal(200);
        expect((await noAuthAgent.get('/user/usertester')).body.isAdmin).to.be.false;
      });
      it('does not allow non-admins to grant/revoke admin status', async () => {
        const res = await agent.post('/user/usertester/grantAdminStatus');
        expect(res.statusCode).to.equal(403);
        expect((await noAuthAgent.get('/user/usertester')).body.isAdmin).to.be.false;
        const res2 = await agent.post('/user/I_AM_AN_ADMIN_FEAR_ME/revokeAdminStatus');
        expect(res2.statusCode).to.equal(403);
        expect((await noAuthAgent.get('/user/I_AM_AN_ADMIN_FEAR_ME')).body.isAdmin).to.be.true;
      });
      it('returns a 404 error if the specified user does not exist', async () => {
        const res = await adminAgent.post('/user/nonexistent_username/grantAdminStatus');
        expect(res.statusCode).to.equal(404);
        const res2 = await adminAgent.post('/user/nonexistent_username/revokeAdminStatus');
        expect(res2.statusCode).to.equal(404);
      })
    });
  });
});
