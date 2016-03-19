const supertest = require('supertest-as-promised');
const _ = require('lodash');
const expect = require('chai').expect;
const Promise = require('bluebird');
describe('PokemonController', () => {
  let agent, otherAgent, noAuthAgent, adminAgent;
  before(async () => {
    agent = supertest.agent(sails.hooks.http.app);
    otherAgent = supertest.agent(sails.hooks.http.app);
    noAuthAgent = supertest.agent(sails.hooks.http.app);
    adminAgent = supertest.agent(sails.hooks.http.app);
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

    const res3 = await adminAgent.post('/auth/local/register').send({
      name: 'pokemon_admin',
      password: 'correct horse battery staple',
      email: 'pokemon_admin@porybox.com'
    });
    expect(res3.statusCode).to.equal(302);
    expect(res.header.location).to.equal('/');

    await sails.models.user.update({name: 'pokemon_admin'}, {isAdmin: true});
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
    });
    it('allows the uploader to view all the data on a readonly pokemon', async () => {
      const res = await agent.get(`/p/${readOnlyId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.pid).to.exist;
    });
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
    it('allows an admin to view all the data on a public pokemon', async () => {
      const res = await adminAgent.get(`/p/${publicId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.dexNo).to.exist;
      expect(res.body.pid).to.exist;
    });
    it('allows an admin to view all the data on a readonly pokemon', async () => {
      const res = await adminAgent.get(`/p/${readOnlyId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.dexNo).to.exist;
      expect(res.body.pid).to.exist;
    });
    it('allows an admin to view all the data on a private pokemon', async () => {
      const res = await adminAgent.get(`/p/${privateId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.dexNo).to.exist;
      expect(res.body.pid).to.exist;
    });
    it("can return a list of all the requester's pokemon", async () => {
      const res = await agent.get('/pokemon/mine');
      expect(_.map(res.body, 'id')).to.include(privateId);
    });
    it('does not leak internal properties of a a pokemon to the client', async () => {
      const pkmn = (await agent.get(`/pokemon/${publicId}`)).body;
      expect(pkmn._markedForDeletion).to.not.exist;
      expect(pkmn._rawPk6).to.not.exist;
    });
  });

  describe('deleting a pokemon', () => {
    let previousDeletionDelay, pkmn;
    before(() => {
      /* Normally this is 5 minutes, but it's annoying for the unit tests to take that long.
      So for these tests it's set to 2 seconds instead. */
      previousDeletionDelay = sails.services.constants.POKEMON_DELETION_DELAY;
      sails.services.constants.POKEMON_DELETION_DELAY = 2000;
    });
    beforeEach(async () => {
      const res = await agent.post('/uploadpk6').attach('pk6', `${__dirname}/pkmn1.pk6`);
      expect(res.statusCode).to.equal(201);
      pkmn = res.body;
    });
    it('allows the owner of a pokemon to delete it', async () => {
      const res = await agent.del(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.get(`/p/${pkmn.id}`);
      expect(res2.statusCode).to.equal(404);
    });
    it("does not allow a third party to delete someone else's pokemon", async () => {
      const res = await otherAgent.del(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(403);
      const res2 = await otherAgent.get(`/p/${pkmn.id}`);
      expect(res2.statusCode).to.not.equal(404);
    });
    it("allows an admin to delete someone's pokemon", async () => {
      const res = await adminAgent.del(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      expect((await agent.get(`/p/${pkmn.id}`)).statusCode).to.equal(404);
    });
    it("allows an admin to undelete someone's pokemon", async () => {
      const res = await agent.del(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await adminAgent.post(`/p/${pkmn.id}/undelete`);
      expect(res2.statusCode).to.equal(200);
      expect((await agent.get(`/p/${pkmn.id}`)).statusCode).to.equal(200);
    });
    it('allows a deleted pokemon to be undeleted shortly afterwards', async () => {
      await agent.del(`/p/${pkmn.id}`);
      expect((await agent.get(`/p/${pkmn.id}`)).statusCode).to.equal(404);
      const res = await agent.post(`/p/${pkmn.id}/undelete`);
      expect(res.statusCode).to.equal(200);
      expect((await agent.get(`/p/${pkmn.id}`)).statusCode).to.equal(200);
      await Promise.delay(sails.services.constants.POKEMON_DELETION_DELAY);
      expect((await agent.get(`/p/${pkmn.id}`)).statusCode).to.equal(200);
    });
    it('does not allow a pokemon to be undeleted once some time has elapsed', async () => {
      await agent.del(`/p/${pkmn.id}`);
      await Promise.delay(sails.services.constants.POKEMON_DELETION_DELAY);
      const res = await agent.post(`/p/${pkmn.id}/undelete`);
      expect(res.statusCode).to.equal(404);
      const res2 = await agent.get(`/p/${pkmn.id}`);
      expect(res2.statusCode).to.equal(404);
    });
    it("does not allow a third party to undelete someone else's pokemon", async () => {
      await agent.del(`/p/${pkmn.id}`);
      expect((await otherAgent.post(`/p/${pkmn.id}/undelete`)).statusCode).to.equal(404);
    });
    it('deletes a pokemon immediately if the `immediately` parameter is set to true', async () => {
      await agent.del(`/p/${pkmn.id}`).send({immediately: true});
      const res = await agent.post(`/p/${pkmn.id}/undelete`);
      expect(res.statusCode).to.equal(404);
    });
    it('does not hang the server while waiting for a pokemon to be fully deleted', async () => {
      await agent.del(`/p/${pkmn.id}`);
      const timer = Promise.delay(sails.services.constants.POKEMON_DELETION_DELAY);
      await agent.get('/');
      expect(timer.isFulfilled()).to.be.false;
    });
    it('does not show a deleted pokemon in the "my pokemon" listing', async () => {
      const res = await agent.get('/pokemon/mine');
      expect(_.map(res.body, 'id')).to.include(pkmn.id);
      await agent.del(`/p/${pkmn.id}`);
      const res2 = await agent.get('/pokemon/mine');
      expect(_.map(res2.body, 'id')).to.not.include(pkmn.id);
    });
    it('does not show deleted contents when a box is retrieved', async () => {
      const res = await agent.get(`/b/${pkmn.box}`);
      expect(_.map(res.body.contents, 'id')).to.include(pkmn.id);
      await agent.del(`/p/${pkmn.id}`);
      const res2 = await agent.get(`/b/${pkmn.box}`);
      expect(_.map(res2.body.contents, 'id')).to.not.include(pkmn.id);
    });
    after(() => {
      sails.services.constants.POKEMON_DELETION_DELAY = previousDeletionDelay;
    });
  });
  describe('downloading a pokemon', () => {
    let publicPkmn, readonlyPkmn, privatePkmn, rawPk6;
    before(async () => {
      const res = await agent.post('/uploadpk6')
        .attach('pk6', `${__dirname}/pkmn1.pk6`)
        .field('visibility', 'public');
      expect(res.statusCode).to.equal(201);
      publicPkmn = res.body;
      const res2 = await agent.post('/uploadpk6').attach('pk6', `${__dirname}/pkmn1.pk6`);
      expect(res2.statusCode).to.equal(201);
      readonlyPkmn = res2.body;
      const res3 = await agent.post('/uploadpk6')
        .attach('pk6', `${__dirname}/pkmn1.pk6`)
        .field('visibility', 'private');
      expect(res3.statusCode).to.equal(201);
      privatePkmn = res3.body;
      rawPk6 = require('fs').readFileSync(`${__dirname}/pkmn1.pk6`).toString('base64');
    });
    it('allows a user to download their own pokemon, regardless of visibility', async () => {
      const res = await agent.get(`/p/${publicPkmn.id}/download`);
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal(rawPk6);
      const res2 = await agent.get(`/p/${readonlyPkmn.id}/download`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body).to.equal(rawPk6);
      const res3 = await agent.get(`/p/${privatePkmn.id}/download`);
      expect(res3.statusCode).to.equal(200);
      expect(res3.body).to.equal(rawPk6);
    });
    it("only allows other users to download someone's public pokemon", async () => {
      const res = await otherAgent.get(`/p/${publicPkmn.id}/download`);
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal(rawPk6);
      const res2 = await otherAgent.get(`/p/${readonlyPkmn.id}/download`);
      expect(res2.statusCode).to.equal(403);
      expect(res2.body).to.not.equal(rawPk6);
      const res3 = await otherAgent.get(`/p/${privatePkmn.id}/download`);
      expect(res3.statusCode).to.equal(403);
      expect(res3.body).to.not.equal(rawPk6);
    });
    it('only allows an unauthenticated user to download a public pokemon', async () => {
      const res = await noAuthAgent.get(`/p/${publicPkmn.id}/download`);
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal(rawPk6);
      const res2 = await noAuthAgent.get(`/p/${readonlyPkmn.id}/download`);
      expect(res2.statusCode).to.equal(403);
      expect(res2.body).to.not.equal(rawPk6);
      const res3 = await noAuthAgent.get(`/p/${privatePkmn.id}/download`);
      expect(res3.statusCode).to.equal(403);
      expect(res3.body).to.not.equal(rawPk6);
    });
    it('allows an admin to download any pokemon, regardless of visibility', async () => {
      const res = await adminAgent.get(`/p/${publicPkmn.id}/download`);
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal(rawPk6);
      const res2 = await adminAgent.get(`/p/${readonlyPkmn.id}/download`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body).to.equal(rawPk6);
      const res3 = await adminAgent.get(`/p/${privatePkmn.id}/download`);
      expect(res3.statusCode).to.equal(200);
      expect(res3.body).to.equal(rawPk6);
    });
    it('increases the download count with downloads by third parties', async () => {
      const initialCount = (await agent.get(`/p/${publicPkmn.id}`)).body.downloadCount;
      await otherAgent.get(`/p/${publicPkmn.id}/download`);
      const newCount = (await agent.get(`/p/${publicPkmn.id}`)).body.downloadCount;
      expect(newCount).to.equal(initialCount + 1);
    });
    it('increases the download count with downloads by unauthenticated users', async () => {
      const initialCount = (await agent.get(`/p/${publicPkmn.id}`)).body.downloadCount;
      await noAuthAgent.get(`/p/${publicPkmn.id}/download`);
      const newCount = (await agent.get(`/p/${publicPkmn.id}`)).body.downloadCount;
      expect(newCount).to.equal(initialCount + 1);
    });
    it("does not increase the download count with downloads by a pokemon's owner", async () => {
      const initialCount = (await agent.get(`/p/${publicPkmn.id}`)).body.downloadCount;
      await agent.get(`/p/${publicPkmn.id}/download`);
      const newCount = (await agent.get(`/p/${publicPkmn.id}`)).body.downloadCount;
      expect(newCount).to.equal(initialCount);
    });
    it('increases the download count on admin downloads, only for public pokemon', async () => {
      const initialPublicCount = (await agent.get(`/p/${publicPkmn.id}`)).body.downloadCount;
      const initialReadonlyCount = (await agent.get(`/p/${readonlyPkmn.id}`)).body.downloadCount;
      const initialPrivateCount = (await agent.get(`/p/${privatePkmn.id}`)).body.downloadCount;
      await adminAgent.get(`/p/${publicPkmn.id}/download`);
      await adminAgent.get(`/p/${readonlyPkmn.id}/download`);
      await adminAgent.get(`/p/${privatePkmn.id}/download`);
      const finalPublicCount = (await agent.get(`/p/${publicPkmn.id}`)).body.downloadCount;
      const finalReadonlyCount = (await agent.get(`/p/${readonlyPkmn.id}`)).body.downloadCount;
      const finalPrivateCount = (await agent.get(`/p/${privatePkmn.id}`)).body.downloadCount;
      expect(finalPublicCount).to.equal(initialPublicCount + 1);
      expect(finalReadonlyCount).to.equal(initialReadonlyCount);
      expect(finalPrivateCount).to.equal(initialPrivateCount);
    });
  });
  describe('moving a pokemon', () => {
    let pkmn, someoneElsesPkmn, box1, box2, someoneElsesBox, adminPkmn, adminBox;
    beforeEach(async () => {
      box1 = (await agent.post('/box').send({name: 'Shoebox'})).body;
      box2 = (await agent.post('/box').send({name: 'Lunchbox'})).body;
      pkmn = (await agent.post('/uploadpk6')
        .attach('pk6', `${__dirname}/pkmn1.pk6`)
        .field('box', box1.id)).body;
      someoneElsesBox = (await otherAgent.post('/box').send({name: 'Mailbox'})).body;
      someoneElsesPkmn = (await otherAgent.post('/uploadpk6')
        .attach('pk6', `${__dirname}/pkmn1.pk6`)
        .field('box', someoneElsesBox.id)).body;
      adminBox = (await adminAgent.post('/box').send({name: 'Icebox'})).body;
      adminPkmn = (await adminAgent.post('/uploadpk6')
        .attach('pk6', `${__dirname}/pkmn1.pk6`)
        .field('box', adminBox.id)).body;
    });
    it('allows a user to move their own pokemon to a different box', async () => {
      const res = await agent.post(`/p/${pkmn.id}/move`).send({box: box2.id});
      expect(res.statusCode).to.equal(200);
      expect((await agent.get(`/p/${pkmn.id}`)).body.box).to.equal(box2.id);
      expect((await agent.get(`/b/${box1.id}`)).body.contents).to.be.empty;
      expect((await agent.get(`/b/${box2.id}`)).body.contents[0].id).to.equal(pkmn.id);
    });
    it("does not allow a third party to move someone's else pokemon", async () => {
      const res = await otherAgent.post(`/p/${pkmn.id}/move`).send({box: someoneElsesBox.id});
      expect(res.statusCode).to.equal(403);
      const res2 = await otherAgent.post(`/p/${pkmn.id}/move`).send({box: box2.id});
      expect(res2.statusCode).to.equal(403);
    });
    it("does not allow a third party to move their pokemon into someone else's box", async () => {
      const res = await otherAgent.post(`/p/${someoneElsesPkmn.id}/move`).send({box: box1.id});
      expect(res.statusCode).to.equal(403);
    });
    it("allows an admin to move someone else's pokemon to another one of their boxes", async () => {
      const res = await adminAgent.post(`/p/${pkmn.id}/move`).send({box: box2.id});
      expect(res.statusCode).to.equal(200);
      expect((await agent.get(`/b/${box1.id}`)).body.contents).to.be.empty;
      expect((await agent.get(`/b/${box2.id}`)).body.contents[0].id).to.equal(pkmn.id);
    });
    it("does not allow an admin to move one user's pokemon to a different user's box", async () => {
      const res = await adminAgent.post(`/p/${pkmn.id}/move`).send({box: someoneElsesBox.id});
      expect(res.statusCode).to.equal(403);
    });
    it("does not allow an admin to move their own pokemon to someone else's box", async () => {
      const res = await adminAgent.post(`/p/${adminPkmn.id}/move`).send({box: box2.id});
      expect(res.statusCode).to.equal(403);
    });
    it("does not allow an admin to move someone else's pokemon into the admin's box", async () => {
      const res = await adminAgent.post(`/p/${pkmn.id}/move`).send({box: adminBox.id});
      expect(res.statusCode).to.equal(403);
    });
    it('returns a 404 error if an invalid pokemon ID is included', async () => {
      expect((await agent.post('/p/aaa/move').send({box: box2.id})).statusCode).to.equal(404);
    });
    it('returns a 404 error if an invalid box ID is included', async () => {
      expect((await agent.post(`/p/${pkmn.id}/move`).send({box: 'a'})).statusCode).to.equal(404);
    });
    it('returns a 400 error if no box ID is included', async () => {
      expect((await agent.post(`/p/${pkmn.id}/move`)).statusCode).to.equal(400);
    });
    it("does not allow a pokemon to be moved if it's marked for deletion", async () => {
      const res = await agent.del(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.post(`/p/${pkmn.id}/move`).send({box: box2.id});
      expect(res2.statusCode).to.equal(404);
    });
    it("does not allow a pokemon to be moved to a box that's marked for deletion", async () => {
      const res = await agent.del(`/b/${box2.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.post(`/p/${pkmn.id}/move`).send({box: box2.id});
      expect(res2.statusCode).to.equal(404);
    });
  });
  describe('adding notes', () => {
    let pkmn;
    beforeEach(async () => {
      const res = await agent.post('/uploadpk6').attach('pk6', `${__dirname}/pkmn1.pk6`);
      expect(res.statusCode).to.equal(201);
      pkmn = res.body;
    });
    it('allows users to add notes on their own pokemon', async () => {
      const res = await agent.post(`/p/${pkmn.id}/note`).send({text: 'b'});
      expect(res.statusCode).to.equal(201);
      const res2 = await agent.get(`/p/${pkmn.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.notes).to.be.an.instanceof(Array);
      expect(res2.body.notes).to.not.be.empty;
      expect(_.last(res2.body.notes)).to.eql(res.body);
    });
    it('allows users to set the visibility of their notes when uploading', async () => {
      const res = await agent.post(`/p/${pkmn.id}/note`).send({text: 'c', visibility: 'private'});
      expect(res.statusCode).to.equal(201);
      expect(res.body.visibility).to.equal('private');
      const res2 = await agent.post(`/p/${pkmn.id}/note`).send({text: 'd', visibility: 'public'});
      expect(res2.body.visibility).to.equal('public');
    });
    it('returns a 400 error if a note with an invalid visibility is sent', async () => {
      const res = await agent.post(`/p/${pkmn.id}/note`).send({text: 'e', visibility: 'meh'});
      expect(res.statusCode).to.equal(400);
    });
    it('returns a 400 error if a note with no text is sent', async () => {
      const res = await agent.post(`/p/${pkmn.id}/note`).send({visibility: 'public'});
      expect(res.statusCode).to.equal(400);
    });
    it("does not allow users to add notes on other peoples' pokemon", async () => {
      const res = await otherAgent.post(`/p/${pkmn.id}/note`).send({text: 'f'});
      expect(res.statusCode).to.equal(403);
    });
  });
  describe('deleting notes', () => {
    let pkmn, note;
    beforeEach(async () => {
      const res = await agent.post('/uploadpk6').attach('pk6', `${__dirname}/pkmn1.pk6`);
      expect(res.statusCode).to.equal(201);
      pkmn = res.body;
      const res2 = await agent.post(`/p/${pkmn.id}/note`).send({text: 'a'});
      expect(res2.statusCode).to.equal(201);
      note = res2.body;
    });
    it('allows a user to delete a note on their pokemon', async () => {
      const res = await agent.get(`/p/${pkmn.id}`);
      expect(_.map(res.body.notes, 'id')).to.include(note.id);
      const res2 = await agent.del(`/p/${pkmn.id}/n/${note.id}`);
      expect(res2.statusCode).to.equal(200);
      const res3 = await agent.get(`/p/${pkmn.id}`);
      expect(_.map(res3.body.notes), 'id').to.not.include(note.id);
    });
    it("does not allow a user to delete a note on someone else's pokemon", async () => {
      const res = await otherAgent.del(`/p/${pkmn.id}/n/${note.id}`);
      expect(res.statusCode).to.equal(403);
    });
    it("allows an admin to delete a note on anyone's pokemon", async () => {
      const res = await adminAgent.del(`/p/${pkmn.id}/n/${note.id}`);
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/p/${pkmn.id}`);
      expect(_.map(res2.body.notes), 'id').to.not.include(note.id);
    });
    it('does not allow a note to be deleted if its parent is marked for deletion', async () => {
      const res = await agent.del(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.del(`/p/${pkmn.id}/n/${note.id}`);
      expect(res2.statusCode).to.equal(404);
    });
  });
  describe('getting notes', () => {
    let pkmn, publicNote, privateNote;
    before(async () => {
      const res = await agent.post('/uploadpk6').attach('pk6', `${__dirname}/pkmn1.pk6`);
      expect(res.statusCode).to.equal(201);
      pkmn = res.body;
      const res2 = await agent.post(`/p/${pkmn.id}/note`).send({text: 'a', visibility: 'public'});
      expect(res2.statusCode).to.equal(201);
      publicNote = res2.body;
      const res3 = await agent.post(`/p/${pkmn.id}/note`).send({text: 'b', visibility: 'private'});
      expect(res3.statusCode).to.equal(201);
      privateNote = res3.body;
    });
    it('displays all notes when a user views their own pokemon', async () => {
      const res = await agent.get(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.notes).to.be.an.instanceof(Array);
      expect(res.body.notes).to.have.lengthOf(2);
      expect(res.body.notes[0].id).to.equal(publicNote.id);
      expect(res.body.notes[1].id).to.equal(privateNote.id);
    });
    it('only displays public notes when a third party views a pokemon', async () => {
      const res = await otherAgent.get(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.notes).to.be.an.instanceof(Array);
      expect(res.body.notes).to.have.lengthOf(1);
      expect(res.body.notes[0].id).to.equal(publicNote.id);
    });
    it('only displays public notes when an unauthenticated user views a pokemon', async () => {
      const res = await noAuthAgent.get(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.notes).to.be.an.instanceof(Array);
      expect(res.body.notes).to.have.lengthOf(1);
      expect(res.body.notes[0].id).to.equal(publicNote.id);
    });
    it('displays all notes when an admin views a pokemon', async () => {
      const res = await adminAgent.get(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.notes).to.be.an.instanceof(Array);
      expect(res.body.notes).to.have.lengthOf(2);
      expect(res.body.notes[0].id).to.equal(publicNote.id);
      expect(res.body.notes[1].id).to.equal(privateNote.id);
    });
  });
  describe('editing notes', () => {
    let pkmn, note, otherPkmn;
    beforeEach(async () => {
      const res = await agent.post('/uploadpk6').attach('pk6', `${__dirname}/pkmn1.pk6`);
      expect(res.statusCode).to.equal(201);
      pkmn = res.body;
      const res2 = await agent.post(`/p/${pkmn.id}/note`).send({text: 'a', visibility: 'public'});
      expect(res2.statusCode).to.equal(201);
      note = res2.body;
      const res3 = await otherAgent.post('/uploadpk6').attach('pk6', `${__dirname}/pkmn1.pk6`);
      expect(res3.statusCode).to.equal(201);
      otherPkmn = res3.body;
    });
    it('allows a user to edit a note on their pokemon', async () => {
      const res = await agent.post(`/p/${pkmn.id}/n/${note.id}/edit`).send({
        visibility: 'private',
        text: 'b'
      });
      expect(res.statusCode).to.equal(200);
      const updated = (await agent.get(`/p/${pkmn.id}`)).body.notes[0];
      expect(updated.text).to.equal('b');
      expect(updated.visibility).to.equal('private');
    });
    it('allows a user to only edit the text of a note', async () => {
      const res = await agent.post(`/p/${pkmn.id}/n/${note.id}/edit`).send({text: 'c'});
      expect(res.statusCode).to.equal(200);
      const updated = (await agent.get(`/p/${pkmn.id}`)).body.notes[0];
      expect(updated.text).to.equal('c');
      expect(updated.visibility).to.equal('public');
    });
    it('allows a user to only edit the visibility of a note', async () => {
      const res = await agent.post(`/p/${pkmn.id}/n/${note.id}/edit`).send({visibility: 'private'});
      expect(res.statusCode).to.equal(200);
      const updated = (await agent.get(`/p/${pkmn.id}`)).body.notes[0];
      expect(updated.text).to.equal('a');
      expect(updated.visibility).to.equal('private');
    });
    it('returns a 400 error when given an invalid visibility', async () => {
      const res = await agent.post(`/p/${pkmn.id}/n/${note.id}/edit`).send({visibility: 'meh'});
      expect(res.statusCode).to.equal(400);
    });
    it('returns a 400 error when given an invalid text', async () => {
      const res = await agent.post(`/p/${pkmn.id}/n/${note.id}/edit`).send({text: ''});
      expect(res.statusCode).to.equal(400);
      const res2 = await agent.post(`/p/${pkmn.id}/n/${note.id}/edit`).send({text: ['cookies']});
      expect(res2.statusCode).to.equal(400);
    });
    it('returns a 400 error when no valid parameters are provided', async () => {
      const res = await agent.post(`/p/${pkmn.id}/n/${note.id}/edit`).send({pokemon: 'aaaaa'});
      expect(res.statusCode).to.equal(400);
    });
    it("returns a 404 error if the given note isn't found on the given pokemon", async () => {
      const res2 = await otherAgent.post(`/p/${otherPkmn.id}/n/${note.id}/edit`).send({text: 'd'});
      expect(res2.statusCode).to.equal(404);
    });
    it("does not allow a user to edit another user's notes", async () => {
      const res = await otherAgent.post(`/p/${pkmn.id}/n/${note.id}/edit`).send({text: 'blah'});
      expect(res.statusCode).to.equal(403);
    });
    it('does not allow a note to be edited on a pokemon which is marked for deletion', async () => {
      const res = await agent.del(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.post(`/p/${pkmn.id}/n/${note.id}/edit`).send({text: 'e'});
      expect(res2.statusCode).to.equal(404);
    });
  });
  describe("editing a pokemon's visibility", () => {
    let pkmn;
    beforeEach(async () => {
      const res = await agent.post('/uploadpk6')
        .attach('pk6', `${__dirname}/pkmn1.pk6`)
        .field('visibility', 'readonly');
      expect(res.statusCode).to.equal(201);
      pkmn = res.body;
    });
    it("allows a user to edit their pokemon's visibility", async () => {
      const res = await agent.post(`/p/${pkmn.id}/edit`).send({visibility: 'private'});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/p/${pkmn.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.visibility).to.equal('private');
    });
    it('returns a 400 error if no valid parameters are specified', async () => {
      const res = await agent.post(`/p/${pkmn.id}/edit`).send({owner: 'AAAAA'});
      expect(res.statusCode).to.equal(400);
    });
    it('returns a 404 error if given an invalid pokemon id', async () => {
      const res = await agent.post('/p/invalidpokemonid/edit').send({visibility: 'private'});
      expect(res.statusCode).to.equal(404);
    });
    it("does not allow a user to edit another user's pokemon's visibility", async () => {
      const res = await otherAgent.post(`/p/${pkmn.id}/edit`).send({visibility: 'private'});
      expect(res.statusCode).to.equal(403);
    });
    it("allows an admin to edit a pokemon's visibility", async () => {
      const res = await adminAgent.post(`/p/${pkmn.id}/edit`).send({visibility: 'private'});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/p/${pkmn.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.visibility).to.equal('private');
    });
    it('does not allow a deleted pokemon to be edited', async () => {
      const res = await agent.del(`/p/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.post(`/p/${pkmn.id}/edit`).send({visibility: 'private'});
      expect(res2.statusCode).to.equal(404);
    });
  });
});
