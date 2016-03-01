const supertest = require('supertest-as-promised');
const expect = require('chai').expect;
describe('pokemon handling', () => {
  let agent, otherAgent;
  before(async () => {
    agent = supertest.agent(sails.hooks.http.app);
    otherAgent = supertest.agent(sails.hooks.http.app);
    const res = await agent.post('/auth/local/register').send({
      username: 'pk6tester',
      password: '********',
      email: 'pk6tester@pk6testing.com'
    });
    expect(res.statusCode).to.equal(302);
    expect(res.header.location).to.equal('/');

    const res2 = await otherAgent.post('/auth/local/register').send({
      username: 'EXPLOUD_BOT',
      password: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      email: 'AAAAAAAA@AAAAAAAA.com'
    });
    expect(res2.statusCode).to.equal(302);
    expect(res.header.location).to.equal('/');
  });
  describe('upload', () => {
    it('should be able to upload a pk6 file and receive a parsed version', async () => {
      const res = await agent.post('/uploadpk6').attach('pk6', __dirname + '/pkmn1.pk6');
      expect(res.statusCode).to.equal(201);
      expect(res.body.dexNo).to.equal(279);
      expect(res.body.owner).to.equal('pk6tester');
    });
    it('should identify uploaded things as clones', async () => {
      const res1 = await agent.post('/uploadpk6').attach('pk6', __dirname + '/pkmn2.pk6');
      expect(res1.statusCode).to.equal(201);
      expect(res1.body.__isUnique__).to.be.true;
      const res2 = await agent.post('/uploadpk6').attach('pk6', __dirname + '/pkmn2.pk6');
      expect(res2.statusCode).to.equal(201);
      expect(res2.body.__isUnique__).to.be.false;
    });
  });
  describe('getting a pokemon by ID', () => {
    let publicId, privateId, readOnlyId;
    before(async () => {
      [publicId, privateId, readOnlyId] = await Promise.map(['public', 'private', 'readonly'], v =>
        agent.post('/uploadpk6').field('visibility', v).attach('pk6', __dirname + '/pkmn1.pk6')
      ).map(response => response.body.id);
    });
    it('allows third parties to view all the data on a public pokemon', async () => {
      const res = await otherAgent.get(`/pokemon/${publicId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.pid).to.exist;
    })
    it('allows the uploader to view all the data on a readonly pokemon', async () => {
      const res = await agent.get(`/pokemon/${readOnlyId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.pid).to.exist;
    })
    it('allows third parties to view only public data on a readonly pokemon', async () => {
      const res = await otherAgent.get(`/pokemon/${readOnlyId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.dexNo).to.exist;
      expect(res.body.pid).to.not.exist;
    });
    it('allows the uploader to view all the data on a private pokemon', async () => {
      const res = await agent.get(`/pokemon/${privateId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.pid).to.exist;
    });
    it('does not allow third parties to view a private pokemon', async () => {
      const res = await otherAgent.get(`/pokemon/${privateId}`);
      expect(res.statusCode).to.equal(403);
    });
  });

  describe('deleting a pokemon', async () => {
    let pokemon1Id, pokemon2Id;
    before(async () => {
      pokemon1Id = (await agent.post('/uploadpk6').attach('pk6', __dirname + '/pkmn1.pk6')).body.id;
      pokemon2Id = (await agent.post('/uploadpk6').attach('pk6', __dirname + '/pkmn2.pk6')).body.id;
    });
    it('allows the owner of a pokemon to delete it', async () => {
      const res = await agent.del(`/pokemon/${pokemon1Id}`);
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/pokemon/${pokemon1Id}`);
      expect(res2.statusCode).to.equal(404);
    });
    it("does not allow a third party to delete someone else's pokemon", async () => {
      const res = await otherAgent.del(`/pokemon/${pokemon2Id}`);
      expect(res.statusCode).to.equal(403);
      const res2 = await otherAgent.get(`/pokemon/${pokemon2Id}`);
      expect(res2.statusCode).to.not.equal(404);
    });
  });
});
