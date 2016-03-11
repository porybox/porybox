const supertest = require('supertest-as-promised');
const expect = require('chai').expect;
const _ = require('lodash');
const Promise = require('bluebird');
describe('BoxController', () => {
  let agent, otherAgent, noAuthAgent;
  before(async () => {
    agent = supertest.agent(sails.hooks.http.app);
    otherAgent = supertest.agent(sails.hooks.http.app);
    noAuthAgent = supertest.agent(sails.hooks.http.app);
    const res = await agent.post('/auth/local/register').send({
      name: 'boxtester',
      password: '********',
      email: 'boxtester@boxtesting.com'
    });
    expect(res.statusCode).to.equal(302);
    expect(res.header.location).to.equal('/');

    const res2 = await otherAgent.post('/auth/local/register').send({
      name: 'EXPLOUD_BOX',
      password: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      email: 'AAAAAAAA@BOXBOXBOXBOXBOX.com'
    });
    expect(res2.statusCode).to.equal(302);
    expect(res.header.location).to.equal('/');
  });
  describe('creating a box', () => {
    it('can create a box', async () => {
      const res = await agent.post('/box').send({name: 'Pizza Box', description: 'A box'});
      expect(res.body.owner).to.equal('boxtester');
      expect(res.body.name).to.equal('Pizza Box');
      expect(res.body.description).to.equal('A box');
    });
  });
  describe('getting a box', () => {
    let box1Id;
    before(async () => {
      box1Id = (await agent.post('/box').send({name: 'Jukebox'})).body.id;
      await agent.post('/box').send({name: 'Sandbox'});
      await agent.post('/box').send({name: 'Penalty Box', visibility: 'unlisted'});
      await otherAgent.post('/box').send({name: "Pandora's Box"});
      await Promise.each(['readonly', 'public', 'private'], visibility => {
        return agent.post('/uploadpk6')
          .attach('pk6', __dirname + '/pkmn1.pk6')
          .field('box', box1Id)
          .field('visibility', visibility);
      });
    });
    it('allows a user to view the contents of their box by ID', async () => {
      const box1 = (await agent.get(`/b/${box1Id}`)).body;
      expect(box1.id).to.equal(box1Id);
      expect(box1.contents).to.have.lengthOf(3);
      expect(box1.contents[0].pid).to.exist;
      expect(box1.contents[1].pid).to.exist;
      expect(box1.contents[2].pid).to.exist;
    });
    it('allows third parties to view a box, filtering contents by pokemon visibility', async () => {
      const box1 = (await otherAgent.get(`/b/${box1Id}`)).body;
      expect(box1.id).to.equal(box1Id);
      expect(box1.contents[0].visibility).to.equal('readonly');
      expect(box1.contents[0].pid).to.not.exist;
      expect(box1.contents[1].visibility).to.equal('public');
      expect(box1.contents[1].pid).to.exist;
      expect(box1.contents[2]).to.not.exist;
    });
    it('allows an unauthenticated user to view a box by ID', async () => {
      const res = await noAuthAgent.get(`/b/${box1Id}`);
      expect(res.statusCode).to.equal(200);
      const box1 = res.body;
      expect(box1.id).to.equal(box1Id);
      expect(box1.contents[0].visibility).to.equal('readonly');
      expect(box1.contents[0].pid).to.not.exist;
      expect(box1.contents[1].visibility).to.equal('public');
      expect(box1.contents[1].visibility).to.exist;
      expect(box1.contents[2]).to.not.exist;
    });
    it('allows a user to get their own boxes', async () => {
      const res = await agent.get('/boxes/mine');
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/user/boxtester/boxes');
      const boxNames = _.map((await agent.get('/user/boxtester/boxes')).body, 'name');
      expect(boxNames).to.include('Jukebox');
      expect(boxNames).to.include('Sandbox');
      expect(boxNames).to.include('Penalty Box');
      expect(boxNames).to.not.include("Pandora's Box");
    });
    it("allows a third party to get a user's listed boxes", async () => {
      const listedBoxNames = _.map((await otherAgent.get('/user/boxtester/boxes')).body, 'name');
      expect(listedBoxNames).to.include('Jukebox');
      expect(listedBoxNames).to.include('Sandbox');
      expect(listedBoxNames).to.not.include('Penalty Box');
    });
    it("allows an unauthenticated user to get a user's listed boxes", async () => {
      const listedBoxNames = _.map((await noAuthAgent.get('/user/boxtester/boxes')).body, 'name');
      expect(listedBoxNames).to.include('Jukebox');
      expect(listedBoxNames).to.include('Sandbox');
      expect(listedBoxNames).to.not.include('Penalty Box');
    });
    it('does not leak internal properties of a box to the client', async () => {
      const box = (await agent.get(`/b/${box1Id}`)).body;
      expect(box._markedForDeletion).to.not.exist;
    });
  });
  describe('deleting a box', function () {
    let previousDeletionDelay, box, pkmn;
    before(() => {
      /* Normally this is 5 minutes, but it's annoying for the unit tests to take that long.
      So for these tests it's set to 2 seconds instead. */
      previousDeletionDelay = sails.services.constants.BOX_DELETION_DELAY;
      sails.services.constants.BOX_DELETION_DELAY = 2000;
    });
    beforeEach(async () => {
      const res = await agent.post('/box').send({name: 'Boombox'});
      expect(res.statusCode).to.equal(201);
      box = res.body;
      const res2 = await agent.post('/uploadpk6')
        .field('box', box.id)
        .attach('pk6', `${__dirname}/pkmn1.pk6`);
      expect(res2.statusCode).to.equal(201);
      pkmn = res2.body;
    });
    it('does not allow users to delete boxes that belong to other users', async () => {
      const res = await otherAgent.del(`/b/${box.id}`);
      expect(res.statusCode).to.equal(403);
    });
    it('returns a 404 error after fetching a deleted box', async () => {
      const res = await agent.del(`/b/${box.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.get(`/b/${box.id}`);
      expect(res2.statusCode).to.equal(404);
    });
    it('also deletes all Pokemon contents when a box is deleted', async () => {
      await agent.del(`/b/${box.id}`);
      const res2 = await agent.get(`/p/${pkmn.id}`);
      expect(res2.statusCode).to.equal(404);
      await Promise.delay(sails.services.constants.BOX_DELETION_DELAY);
      const res3 = await agent.get(`/p/${pkmn.id}`);
      expect(res3.statusCode).to.equal(404);
    });
    it('allows deleted boxes to be undeleted shortly afterwards', async () => {
      await agent.del(`/b/${box.id}`);
      const res = await agent.post(`/b/${box.id}/undelete`);
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/b/${box.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.id).to.equal(box.id);
      await Promise.delay(sails.services.constants.BOX_DELETION_DELAY);
      const res3 = await agent.get(`/b/${box.id}`);
      expect(res3.statusCode).to.equal(200);
      expect(res3.body.id).to.equal(box.id);
    });
    it('does not allow boxes to be undeleted once some time has elapsed', async () => {
      await agent.del(`/b/${box.id}`);
      await Promise.delay(sails.services.constants.BOX_DELETION_DELAY);
      const res = await agent.post(`/b/${box.id}/undelete`);
      expect(res.statusCode).to.equal(404);
      const res2 = await agent.get(`/b/${box.id}`);
      expect(res2.statusCode).to.equal(404);
    });
    it('does not allow users to undelete boxes that belong to other users', async () => {
      await agent.del(`/b/${box.id}`);
      const res = await otherAgent.post(`/b/${box.id}/undelete`);
      expect(res.statusCode).to.equal(404);
    });
    it("restores a box's contents after undeleting it", async () => {
      await agent.del(`/b/${box.id}`);
      const res = await agent.get(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(404);
      await agent.post(`/b/${box.id}/undelete`);
      const res2 = await agent.get(`/p/${pkmn.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.id).to.equal(pkmn.id);
    });
    it('deletes a box immediately if the `immediately` parameter is set to true', async () => {
      await agent.del(`/b/${box.id}`).send({immediately: true});
      const res = await agent.post(`/b/${box.id}/undelete`);
      expect(res.statusCode).to.equal(404);
    });
    it('does not hang the server while waiting for a box to be fully deleted', async () => {
      await agent.del(`/b/${box.id}`);
      const timer = Promise.delay(sails.services.constants.BOX_DELETION_DELAY);
      await agent.get('/');
      expect(timer.isFulfilled()).to.be.false;
    });
    it('does not show deleted boxes in box listings', async () => {
      const res = await agent.get('/user/boxtester/boxes');
      expect(_.map(res.body, 'id')).to.include(box.id);
      await agent.del(`/b/${box.id}`);
      const res2 = await agent.get('/user/boxtester/boxes');
      expect(_.map(res2.body, 'id')).to.not.include(box.id);
    });
    it('does not show pokemon from deleted boxes in the "my pokemon" listing', async () => {
      const res = await agent.get('/pokemon/mine');
      expect(_.map(res.body, 'id')).to.include(pkmn.id);
      await agent.del(`/b/${box.id}`);
      const res2 = await agent.get('/pokemon/mine');
      expect(_.map(res2.body, 'id')).to.not.include(pkmn.id);
    });
    after(() => {
      sails.services.constants.BOX_DELETION_DELAY = previousDeletionDelay;
    });
  });
});
