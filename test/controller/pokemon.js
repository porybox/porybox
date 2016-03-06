const supertest = require('supertest-as-promised');
const _ = require('lodash');
const expect = require('chai').expect;
describe('pokemon handling', () => {
  let agent, otherAgent;
  before(async () => {
    agent = supertest.agent(sails.hooks.http.app);
    otherAgent = supertest.agent(sails.hooks.http.app);
    const res = await agent.post('/auth/local/register').send({
      name: 'pk6tester',
      password: '********',
      email: 'pk6tester@pk6testing.com'
    });
    expect(res.statusCode).to.equal(302);
    expect(res.header.location).to.equal('/');

    const res2 = await otherAgent.post('/auth/local/register').send({
      name: 'EXPLOUD_BOT',
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
      expect(res1.body.isUnique).to.be.true;
      const res2 = await agent.post('/uploadpk6').attach('pk6', __dirname + '/pkmn2.pk6');
      expect(res2.statusCode).to.equal(201);
      expect(res2.body.isUnique).to.be.false;
    });
    it("should reject uploads that aren't pk6 files", async () => {
      const res = await agent.post('/uploadpk6').attach('pk6', `${__dirname}/not_a_pk6_file.txt`);
      expect(res.statusCode).to.equal(400);
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
      const res = await otherAgent.get(`/p/${publicId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.pid).to.exist;
    })
    it('allows the uploader to view all the data on a readonly pokemon', async () => {
      const res = await agent.get(`/p/${readOnlyId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.pid).to.exist;
    })
    it('allows third parties to view only public data on a readonly pokemon', async () => {
      const res = await otherAgent.get(`/p/${readOnlyId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.dexNo).to.exist;
      expect(res.body.pid).to.not.exist;
    });
    it('allows the uploader to view all the data on a private pokemon', async () => {
      const res = await agent.get(`/p/${privateId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.pid).to.exist;
    });
    it('does not allow third parties to view a private pokemon', async () => {
      const res = await otherAgent.get(`/p/${privateId}`);
      expect(res.statusCode).to.equal(403);
    });
    it("can return a list of all the requester's pokemon", async () => {
      const res = await agent.get('/pokemon/mine');
      expect(_.map(res.body, 'id')).to.include(privateId);
    });
  });

  describe('deleting a pokemon', async () => {
    let pokemon1Id, pokemon2Id;
    before(async () => {
      pokemon1Id = (await agent.post('/uploadpk6').attach('pk6', __dirname + '/pkmn1.pk6')).body.id;
      pokemon2Id = (await agent.post('/uploadpk6').attach('pk6', __dirname + '/pkmn2.pk6')).body.id;
      await otherAgent.post('/uploadpk6').attach('pk6', __dirname + '/pkmn1.pk6')
    });
    it('allows the owner of a pokemon to delete it', async () => {
      const res = await agent.del(`/p/${pokemon1Id}`);
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/p/${pokemon1Id}`);
      expect(res2.statusCode).to.equal(404);
    });
    it("does not allow a third party to delete someone else's pokemon", async () => {
      const res = await otherAgent.del(`/p/${pokemon2Id}`);
      expect(res.statusCode).to.equal(403);
      const res2 = await otherAgent.get(`/p/${pokemon2Id}`);
      expect(res2.statusCode).to.not.equal(404);
    });
  });
});
