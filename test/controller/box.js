const supertest = require('supertest-as-promised');
const expect = require('chai').expect;
const _ = require('lodash');
describe('box handling', () => {
  let agent, otherAgent;
  before(async () => {
    agent = supertest.agent(sails.hooks.http.app);
    otherAgent = supertest.agent(sails.hooks.http.app);
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
    })
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
    it('allows a user to get their own boxes', async () => {
      const boxNames = _.map((await agent.get('/boxes/mine')).body, 'name');
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
  });
});
