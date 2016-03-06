const supertest = require('supertest-as-promised');
const expect = require('chai').expect;
describe('UserController', () => {
  let agent;
  before(async () => {
    agent = supertest.agent(sails.hooks.http.app);
    const res = await agent.post('/auth/local/register').send({
      name: 'usertester',
      password: '********',
      email: 'usertester@usertesting.com'
    });
    expect(res.statusCode).to.equal(302);
    expect(res.header.location).to.equal('/');
  });
  it("can get information on a user's profile", async () => {
    const res = await agent.get('/api/v1/me');
    expect(res.body.name).to.equal('usertester');
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
  });
});
