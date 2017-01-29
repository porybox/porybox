'use strict';
const expect = require('chai').use(require('dirty-chai')).expect;
const _ = require('lodash');
const Promise = require('bluebird');
const testHelpers = require('../test-helpers');
describe('BoxController', function () {
  this.timeout(30000);
  let agent, otherAgent, noAuthAgent, adminAgent;
  before(async () => {
    agent = await testHelpers.getAgent();
    otherAgent = await testHelpers.getAgent();
    noAuthAgent = await testHelpers.getAgent();
    adminAgent = await testHelpers.getAgent();
    const res = await agent.post('/api/v1/auth/local/register').send({
      name: 'boxtester',
      password: '********',
      email: 'boxtester@boxtesting.com'
    });
    expect(res.statusCode).to.equal(200);

    const res2 = await otherAgent.post('/api/v1/auth/local/register').send({
      name: 'EXPLOUD_BOX',
      password: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      email: 'AAAAAAAA@BOXBOXBOXBOXBOX.com'
    });
    expect(res2.statusCode).to.equal(200);

    const res3 = await adminAgent.post('/api/v1/auth/local/register').send({
      name: 'box_admin',
      password: 'boxboxboxboxboxbox',
      email: 'boxadmin@porybox.com'
    });
    expect(res3.statusCode).to.equal(200);
    await sails.models.user.update({name: 'box_admin'}, {isAdmin: true});
  });
  describe('creating a box', () => {
    it('can create a box', async () => {
      const res = await agent.post('/api/v1/box').send({name: 'Pizza Box', description: 'A box'});
      expect(res.body.owner).to.equal('boxtester');
      expect(res.body.name).to.equal('Pizza Box');
      expect(res.body.description).to.equal('A box');
      expect(res.body.id).to.match(/^[0-9a-f]{32}$/);
    });
    it('does not allow a box to be created with an invalid/missing name', async () => {
      const res = await agent.post('/api/v1/box').send({description: 'A box', name: 5});
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal("Invalid/missing required parameter 'name'");

      const res2 = await agent.post('/api/v1/box').send({description: 'A box', name: ''});
      expect(res2.statusCode).to.equal(400);
      expect(res2.body).to.equal('Invalid/missing box name');
    });
    it('does not allow a box to be created with an invalid description', async () => {
      const res = await agent.post('/api/v1/box').send({name: 'Pizza Box', description: 5});
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Invalid box description');
    });
    it('does not allow box names longer than 300 characters', async () => {
      const res = await agent.post('/api/v1/box').send({name: 'A'.repeat(300)});
      expect(res.statusCode).to.equal(201);
      const res2 = await agent.post('/api/v1/box').send({name: 'A'.repeat(301)});
      expect(res2.statusCode).to.equal(400);
      expect(res2.body).to.equal('Box name too long');
    });
    it('does not allow box descriptions longer than 1000 characters', async () => {
      const res = await agent.post('/api/v1/box')
        .send({name: 'myBox', description: 'A'.repeat(1000)});
      expect(res.statusCode).to.equal(201);
      const res2 = await agent.post('/api/v1/box')
        .send({name: 'myBox', description: 'A'.repeat(1001)});
      expect(res2.statusCode).to.equal(400);
      expect(res2.body).to.equal('Box description too long');
    });
  });
  describe('getting a box', () => {
    let boxId;
    before(async () => {
      boxId = (await agent.post('/api/v1/box').send({name: 'Inbox'})).body.id;
      await Promise.each(['viewable', 'public', 'private'], async visibility => {
        const res = await agent.post('/api/v1/pokemon')
          .field('box', boxId)
          .field('visibility', visibility)
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
        expect(res.statusCode).to.equal(201);
      });
    });
    it('allows a user to view the contents of their box by ID', async () => {
      const box = (await agent.get(`/api/v1/box/${boxId}`)).body;
      expect(box.id).to.equal(boxId);
      expect(box.contents).to.have.lengthOf(3);
      expect(box.contents[0].pid).to.exist();
      expect(box.contents[0].speciesName).to.exist();
      expect(box.contents[0].box).to.equal(box.id);
      expect(box.contents[1].pid).to.exist();
      expect(box.contents[1].speciesName).to.exist();
      expect(box.contents[1].box).to.equal(box.id);
      expect(box.contents[2].pid).to.exist();
      expect(box.contents[2].speciesName).to.exist();
      expect(box.contents[2].box).to.equal(box.id);
      expect(box.createdAt).to.be.a('string');
      expect(box.updatedAt).to.exist();
      expect(box.totalSize).to.equal(3);
    });
    it('allows third parties to view a box, filtering contents by pokemon visibility', async () => {
      const box = (await otherAgent.get(`/api/v1/box/${boxId}`)).body;
      expect(box.id).to.equal(boxId);
      expect(box.contents[0].visibility).to.equal('viewable');
      expect(box.contents[0].pid).to.not.exist();
      expect(box.contents[0].box).to.exist();
      expect(box.contents[0].speciesName).to.exist();
      expect(box.contents[1].visibility).to.equal('public');
      expect(box.contents[1].pid).to.exist();
      expect(box.contents[1].box).to.exist();
      expect(box.contents[1].speciesName).to.exist();
      expect(box.contents[2]).to.not.exist();
      expect(box.updatedAt).to.not.exist();
      expect(box.totalSize).to.equal(2);
    });
    it('allows admins to view the full contents of a box by ID', async () => {
      const box = (await adminAgent.get(`/api/v1/box/${boxId}`)).body;
      expect(box.id).to.equal(boxId);
      expect(box.contents[0].visibility).to.equal('viewable');
      expect(box.contents[0].pid).to.exist();
      expect(box.contents[0].speciesName).to.exist();
      expect(box.contents[0].box).to.equal(box.id);
      expect(box.contents[1].visibility).to.equal('public');
      expect(box.contents[1].pid).to.exist();
      expect(box.contents[1].speciesName).to.exist();
      expect(box.contents[1].box).to.equal(box.id);
      expect(box.contents[2].visibility).to.equal('private');
      expect(box.contents[2].pid).to.exist();
      expect(box.contents[2].speciesName).to.exist();
      expect(box.contents[2].box).to.equal(box.id);
      expect(box.updatedAt).to.exist();
      expect(box.totalSize).to.equal(3);
    });
    it('allows an unauthenticated user to view a box by ID', async () => {
      const res = await noAuthAgent.get(`/api/v1/box/${boxId}`);
      expect(res.statusCode).to.equal(200);
      const box = res.body;
      expect(box.id).to.equal(boxId);
      expect(box.contents[0].visibility).to.equal('viewable');
      expect(box.contents[0].pid).to.not.exist();
      expect(box.contents[0].speciesName).to.exist();
      expect(box.contents[0].box).to.exist();
      expect(box.contents[1].visibility).to.equal('public');
      expect(box.contents[1].pid).to.exist();
      expect(box.contents[1].speciesName).to.exist();
      expect(box.contents[1].box).to.exist();
      expect(box.contents[2]).to.not.exist();
      expect(box.updatedAt).to.not.exist();
      expect(box.totalSize).to.equal(2);
    });
    it('allows the properties of the Pokémon in the box to be specified by query', async () => {
      const res = await agent.get(`/api/v1/box/${boxId}`).query({pokemonFields: 'speciesName'});
      expect(res.statusCode).to.equal(200);
      expect(res.body.id).to.equal(boxId);
      expect(res.body.contents).to.eql([
        {speciesName: 'Pelipper'},
        {speciesName: 'Pelipper'},
        {speciesName: 'Pelipper'}
      ]);
      expect(res.body.totalSize).to.equal(3);
    });
    it('does not allow private properties of Pokémon to be accessed by the query', async () => {
      const publicPid = (await agent.get(`/api/v1/box/${boxId}`)).body.contents[1].pid;
      const res = await otherAgent.get(`/api/v1/box/${boxId}`)
        .query({pokemonFields: 'speciesName,pid'});
      expect(res.statusCode).to.equal(200);
      expect(res.body.id).to.equal(boxId);
      expect(res.body.contents).to.eql([
        {speciesName: 'Pelipper'},
        {speciesName: 'Pelipper', pid: publicPid}
      ]);
      expect(res.body.totalSize).to.equal(2);
    });
    it('does not allow internal properties of Pokémon to be accessed by the query', async () => {
      const res = await agent.get(`/api/v1/box/${boxId}`)
        .query({pokemonFields: 'speciesName,_rawPk6,_rawFile'});
      expect(res.statusCode).to.equal(200);
      expect(res.body.id).to.equal(boxId);
      expect(res.body.contents).to.eql([
        {speciesName: 'Pelipper'},
        {speciesName: 'Pelipper'},
        {speciesName: 'Pelipper'}
      ]);
      expect(res.body.totalSize).to.equal(3);
    });
  });
  describe('box pagination', () => {
    let pkmnList, box, pageSize;
    beforeEach(async () => {
      pageSize = sails.services.constants.BOX_PAGE_SIZE;
      expect(pageSize).to.be.a('number');
      expect(pageSize).to.be.above(0);
      const res = await agent.post('/api/v1/box').send({name: 'multibox'});
      expect(res.statusCode).to.equal(201);
      box = res.body;
      const pkmnData = require('fs').readFileSync(`${__dirname}/pk6/pkmn1.pk6`, {
        encoding: 'base64'
      });
      pkmnList = [];
      for (const amount of [pageSize, pageSize, pageSize, 1]) {
        const res2 = await agent.post('/api/v1/pokemon/multi').send({files: _.times(amount, () => ({
          box: box.id, visibility: _.sample(['public', 'private', 'viewable']), data: pkmnData
        }))});
        expect(res2.statusCode).to.equal(201);
        expect(_.map(res2.body, 'success')).to.eql(_.times(amount, () => true));
        expect(_.map(res2.body, 'error')).to.eql(_.times(amount, () => null));
        pkmnList.push(..._.map(res2.body, 'created'));
      }
    });
    it('returns the first BOX_PAGE_SIZE items if no parameter is provided', async () => {
      const res = await agent.get(`/api/v1/box/${box.id}`);
      expect(res.body.totalSize).to.equal(pageSize * 3 + 1);
      expect(res.statusCode).to.equal(200);
      expect(_.map(res.body.contents, 'id')).to.eql(_.map(pkmnList.slice(0, pageSize), 'id'));
    });
    it('adjusts the results for privacy if the user is not the owner', async () => {
      const res = await otherAgent.get(`/api/v1/box/${box.id}`);
      expect(res.statusCode).to.equal(200);
      const nonPrivatePkmn = pkmnList.filter(pkmn => pkmn.visibility !== 'private');
      expect(_.map(res.body.contents, 'id')).to.eql(_.map(nonPrivatePkmn.slice(0, pageSize), 'id'));
    });
    describe('with an "after" parameter', () => {
      it('returns all pokemon following an "after" pokemon id', async () => {
        const res = await agent.get(`/api/v1/box/${box.id}`)
          .query({after: pkmnList[pageSize - 1].id});
        expect(res.statusCode).to.equal(200);
        expect(res.body.contents).to.be.an.instanceof(Array);
        expect(res.body.contents).to.have.lengthOf(pageSize);
        expect(res.body.contents).to.eql(pkmnList.slice(pageSize, 2 * pageSize));
      });
      it('filters contents in an "after" listing if the user is not the owner', async () => {
        const res = await otherAgent.get(`/api/v1/box/${box.id}`)
          .query({after: pkmnList[pageSize - 1].id});
        expect(res.statusCode).to.equal(200);
        expect(res.body.contents).to.be.an.instanceof(Array);
        expect(res.body.contents).to.have.lengthOf(pageSize);
        const expectedResults = pkmnList
          .slice(pageSize)
          .filter(pkmn => pkmn.visibility !== 'private')
          .slice(0, pageSize)
          .map(pkmn => {
            return pkmn.visibility === 'public'
              ? _.omit(pkmn, ['privateNotes'])
              : _.omit(pkmn, ['pid', 'encryptionConstant', 'privateNotes']);
          });
        expect(res.body.contents).to.eql(expectedResults);
      });
      it('filters deleted items out of the box', async () => {
        const res = await agent.del(`/api/v1/pokemon/${_.last(pkmnList).id}`);
        expect(res.statusCode).to.equal(202);
        const res2 = await agent.get(`/api/v1/box/${box.id}`)
          .query({after: pkmnList[pkmnList.length - 2].id});
        expect(res2.statusCode).to.equal(200);
        expect(res2.body.contents).to.be.an.instanceof(Array);
        expect(res2.body.contents).to.have.lengthOf(0);
      });
      it('returns a shortened list if there are an too few remaining Pokémon', async () => {
        const res = await agent.get(`/api/v1/box/${box.id}`)
          .query({after: pkmnList[pageSize * 3 - 1].id});
        expect(res.statusCode).to.equal(200);
        expect(res.body.contents).to.be.an.instanceof(Array);
        expect(res.body.contents).to.have.lengthOf(1);
        expect(res.body.contents[0]).to.eql(pkmnList[pkmnList.length - 1]);
      });
      it('returns an empty list if there are no Pokémon after the "after" param', async () => {
        const res = await agent.get(`/api/v1/box/${box.id}`).query({after: _.last(pkmnList).id});
        expect(res.statusCode).to.equal(200);
        expect(res.body.contents).to.be.an.instanceof(Array);
        expect(res.body.contents).to.have.lengthOf(0);
      });
      it('returns nothing if only unviewable Pokémon are after the "after" param', async () => {
        const res = await agent.patch(`/api/v1/pokemon/${_.last(pkmnList).id}`)
          .send({visibility: 'private'});
        expect(res.statusCode).to.equal(200);
        const res2 = await otherAgent.get(`/api/v1/box/${box.id}`)
          .query({after: pkmnList[pkmnList.length - 2].id});
        expect(res2.statusCode).to.equal(200);
        expect(res2.body.contents).to.be.an.instanceof(Array);
        expect(res2.body.contents).to.have.lengthOf(0);
      });
      it('returns a 404 error if the "after" parameter is not in the box', async () => {
        const res = await agent.get(`/api/v1/box/${box.id}`).query({after: 'foo'});
        expect(res.statusCode).to.equal(404);
      });
    });
    describe('with a "before" parameter', () => {
      it('returns all pokemon preceeding a "before" pokemon id', async () => {
        const res = await agent.get(`/api/v1/box/${box.id}`).query({before: pkmnList[pageSize].id});
        expect(res.statusCode).to.equal(200);
        expect(res.body.contents).to.be.an.instanceof(Array);
        expect(res.body.contents).to.have.lengthOf(pageSize);
        expect(res.body.contents).to.eql(pkmnList.slice(0, pageSize));
      });
      it('filters contents in a "before" listing if the user is not the owner', async () => {
        const res = await otherAgent.get(`/api/v1/box/${box.id}`)
          .query({before: _.last(pkmnList).id});
        expect(res.statusCode).to.equal(200);
        expect(res.body.contents).to.be.an.instanceof(Array);
        expect(res.body.contents).to.have.lengthOf(pageSize);
        const expectedResults = pkmnList
          .slice(0, -1)
          .filter(pkmn => pkmn.visibility !== 'private')
          .slice(-pageSize)
          .map(pkmn => {
            return pkmn.visibility === 'public'
              ? _.omit(pkmn, ['privateNotes'])
              : _.omit(pkmn, ['pid', 'encryptionConstant', 'privateNotes']);
          });
        expect(res.body.contents).to.eql(expectedResults);
      });
      it('filters deleted items out of the box', async () => {
        const res = await agent.del(`/api/v1/pokemon/${pkmnList[0].id}`);
        expect(res.statusCode).to.equal(202);
        const res2 = await agent.get(`/api/v1/box/${box.id}`).query({before: pkmnList[1].id});
        expect(res2.statusCode).to.equal(200);
        expect(res2.body.contents).to.be.an.instanceof(Array);
        expect(res2.body.contents).to.have.lengthOf(0);
      });
      it('returns a shortened list for an insufficient number of remaining Pokémon', async () => {
        const res = await agent.get(`/api/v1/box/${box.id}`)
          .query({before: pkmnList[pageSize - 1].id});
        expect(res.statusCode).to.equal(200);
        expect(res.body.contents).to.be.an.instanceof(Array);
        expect(res.body.contents).to.have.lengthOf(pageSize - 1);
        expect(res.body.contents).to.eql(pkmnList.slice(0, pageSize - 1));
      });
      it('returns an empty list if there are no Pokémon preceding the "before" param', async () => {
        const res = await agent.get(`/api/v1/box/${box.id}`).query({before: pkmnList[0].id});
        expect(res.statusCode).to.equal(200);
        expect(res.body.contents).to.be.an.instanceof(Array);
        expect(res.body.contents).to.have.lengthOf(0);
      });
      it('returns an empty list if only private Pokémon precede the "before" param', async () => {
        const res = await agent.get(`/api/v1/box/${box.id}`).query({before: pkmnList[0].id});
        expect(res.statusCode).to.equal(200);
        expect(res.body.contents).to.be.an.instanceof(Array);
        expect(res.body.contents).to.have.lengthOf(0);
      });
      it('returns a 404 error if the "before" parameter is not in the box', async () => {
        it('returns a 404 error if the "after" parameter is not in the box', async () => {
          const res = await agent.get(`/api/v1/box/${box.id}`).query({after: 'foo'});
          expect(res.statusCode).to.equal(404);
        });
      });
    });
    describe('with both a "before" and an "after" parameter', () => {
      it('only uses the "before" parameter and ignores the "after" parameter', async () => {
        const res = await agent.get(`/api/v1/box/${box.id}`)
          .query({after: pkmnList[pageSize - 1].id, before: pkmnList[pageSize].id});
        expect(res.statusCode).to.equal(200);
        expect(res.body.contents).to.be.an.instanceof(Array);
        expect(res.body.contents).to.eql(pkmnList.slice(pageSize, 2 * pageSize));
      });
    });
  });
  describe("getting a user's boxes", () => {
    let box1, box2, unlistedBox, otherBox;
    beforeEach(async () => {
      const res = await agent.post('/api/v1/box').send({name: 'Jukebox'});
      expect(res.statusCode).to.equal(201);
      box1 = res.body;
      const res2 = await agent.post('/api/v1/box').send({name: 'Sandbox'});
      expect(res2.statusCode).to.equal(201);
      box2 = res2.body;
      const res3 = await agent.post('/api/v1/box')
        .send({name: 'Penalty Box', visibility: 'unlisted'});
      expect(res3.statusCode).to.equal(201);
      unlistedBox = res3.body;
      const res4 = await otherAgent.post('/api/v1/box').send({name: "Pandora's Box"});
      expect(res4.statusCode).to.equal(201);
      otherBox = res4.body;
      await Promise.each(['viewable', 'public', 'private'], async visibility => {
        const res = await agent.post('/api/v1/pokemon')
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
          .field('box', box1.id)
          .field('visibility', visibility);
        expect(res.statusCode).to.equal(201);
      });
    });
    it('allows a user to get their own boxes', async () => {
      const res = await agent.get('/api/v1/me/boxes');
      expect(res.statusCode).to.equal(302);
      expect(res.header.location).to.equal('/user/boxtester/boxes');
      const myBoxes = (await agent.get('/api/v1/user/boxtester/boxes')).body;
      const boxIds = _.map(myBoxes, 'id');
      expect(boxIds).to.include(box1.id);
      expect(boxIds).to.include(box2.id);
      expect(boxIds).to.include(unlistedBox.id);
      expect(boxIds).to.not.include(otherBox.id);
      const boxContents = _.find(myBoxes, {id: box1.id}).contents;
      expect(boxContents).to.eql([]);
    });
    it("allows a third party to get a user's listed boxes", async () => {
      const boxes = (await otherAgent.get('/api/v1/user/boxtester/boxes')).body;
      const listedBoxIds = _.map(boxes, 'id');
      expect(listedBoxIds).to.include(box1.id);
      expect(listedBoxIds).to.include(box2.id);
      expect(listedBoxIds).to.not.include(unlistedBox.id);
      expect(listedBoxIds).to.not.include(otherBox.id);
      const boxContents = _.find(boxes, {id: box1.id}).contents;
      expect(boxContents).to.eql([]);
    });
    it("allows an unauthenticated user to get a user's listed boxes", async () => {
      const boxes = (await noAuthAgent.get('/api/v1/user/boxtester/boxes')).body;
      const listedBoxIds = _.map(boxes, 'id');
      expect(listedBoxIds).to.include(box1.id);
      expect(listedBoxIds).to.include(box2.id);
      expect(listedBoxIds).to.not.include(unlistedBox.id);
      expect(listedBoxIds).to.not.include(otherBox.id);
      const boxContents = _.find(boxes, {id: box1.id}).contents;
      expect(boxContents).to.eql([]);
    });
    it("allows an admin to get all of a user's boxes", async () => {
      const boxes = (await adminAgent.get('/api/v1/user/boxtester/boxes')).body;
      const boxIds = _.map(boxes, 'id');
      expect(boxIds).to.include(box1.id);
      expect(boxIds).to.include(box2.id);
      expect(boxIds).to.include(unlistedBox.id);
      expect(boxIds).to.not.include(otherBox.id);
      const boxContents = _.find(boxes, {id: box1.id}).contents;
      expect(boxContents).to.eql([]);
    });
    it('does not leak internal properties of a box to the client', async () => {
      const box = (await agent.get(`/api/v1/box/${box1.id}`)).body;
      expect(box._markedForDeletion).to.not.exist();
      expect(box._orderedIds).to.not.exist();
    });
    it('adds newly-created boxes to the end of the box list', async () => {
      const res = await agent.get('/api/v1/user/boxtester/boxes');
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.post('/api/v1/box').send({name: 'Shadowbox'});
      expect(res2.statusCode).to.equal(201);
      const res3 = await agent.get('/api/v1/user/boxtester/boxes');
      expect(res3.statusCode).to.equal(200);
      expect(res3.body).to.eql(res.body.concat(res2.body));
    });
  });
  describe('deleting a box', () => {
    let previousDeletionDelay, box, pkmn;
    before(() => {
      /* Normally this is 5 minutes, but it's annoying for the unit tests to take that long.
      So for these tests it's set to 2 seconds instead. */
      previousDeletionDelay = sails.services.constants.BOX_DELETION_DELAY;
      sails.services.constants.BOX_DELETION_DELAY = 2000;
    });
    beforeEach(async () => {
      const res = await agent.post('/api/v1/box').send({name: 'Boombox'});
      expect(res.statusCode).to.equal(201);
      box = res.body;
      const res2 = await agent.post('/api/v1/pokemon')
        .field('box', box.id)
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
      expect(res2.statusCode).to.equal(201);
      pkmn = res2.body;
    });
    it('does not allow a user to delete their last box', async () => {
      const initialLength = (await agent.get('/api/v1/user/boxtester/boxes')).body.length;
      await Promise.all(_.times(5, async () => {
        const res = await agent.post('/api/v1/box').send({name: 'Fare Box'});
        expect(res.statusCode).to.equal(201);
      }));
      const res2 = await agent.get('/api/v1/user/boxtester/boxes');
      expect(res2.body.length).to.equal(initialLength + 5);
      expect(res2.statusCode).to.equal(200);
      await Promise.each(res2.body.slice(1), async box => {
        const res3 = await agent.del(`/api/v1/box/${box.id}`);
        expect(res3.statusCode).to.equal(202);
      });
      const res4 = await agent.del(`/api/v1/box/${res2.body[0].id}`);
      expect(res4.statusCode).to.equal(400);
      const res5 = await agent.get('/api/v1/user/boxtester/boxes');
      expect(res5.body.length).to.equal(1);
    });
    it('does not allow users to delete boxes that belong to other users', async () => {
      const res = await otherAgent.del(`/api/v1/box/${box.id}`);
      expect(res.statusCode).to.equal(403);
    });
    it('returns a 404 error after fetching a deleted box', async () => {
      const res = await agent.del(`/api/v1/box/${box.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res2.statusCode).to.equal(404);
    });
    it('also deletes all Pokemon contents when a box is deleted', async () => {
      await agent.del(`/api/v1/box/${box.id}`);
      const res2 = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res2.statusCode).to.equal(404);
      await Promise.delay(sails.services.constants.BOX_DELETION_DELAY);
      const res3 = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res3.statusCode).to.equal(404);
    });
    it('allows deleted boxes to be undeleted shortly afterwards', async () => {
      await agent.del(`/api/v1/box/${box.id}`);
      const res = await agent.post(`/api/v1/box/${box.id}/undelete`);
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.id).to.equal(box.id);
      await Promise.delay(sails.services.constants.BOX_DELETION_DELAY);
      const res3 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res3.statusCode).to.equal(200);
      expect(res3.body.id).to.equal(box.id);
    });
    it('does not allow boxes to be undeleted once some time has elapsed', async () => {
      await agent.del(`/api/v1/box/${box.id}`);
      await Promise.delay(sails.services.constants.BOX_DELETION_DELAY);
      const res = await agent.post(`/api/v1/box/${box.id}/undelete`);
      expect(res.statusCode).to.equal(404);
      const res2 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res2.statusCode).to.equal(404);
    });
    it('does not allow users to undelete boxes that belong to other users', async () => {
      await agent.del(`/api/v1/box/${box.id}`);
      const res = await otherAgent.post(`/api/v1/box/${box.id}/undelete`);
      expect(res.statusCode).to.equal(404);
    });
    it('does not allow a user to undelete a pokemon if its box was deleted', async () => {
      await agent.del(`/api/v1/box/${box.id}`);
      const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/undelete`);
      expect(res.statusCode).to.equal(400);
    });
    it('allows admins to delete a box belonging to anyone', async () => {
      const res = await adminAgent.del(`/api/v1/box/${box.id}`);
      expect(res.statusCode).to.equal(202);
      expect((await agent.get(`/api/v1/box/${box.id}`)).statusCode).to.equal(404);
    });
    it('allows admins to undelete a box belonging to anyone', async () => {
      const res = await agent.del(`/api/v1/box/${box.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await adminAgent.post(`/api/v1/box/${box.id}/undelete`);
      expect(res2.statusCode).to.equal(200);
      expect((await agent.get(`/api/v1/box/${box.id}`)).statusCode).to.equal(200);
    });
    it("restores a box's contents after undeleting it", async () => {
      await agent.del(`/api/v1/box/${box.id}`);
      const res = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res.statusCode).to.equal(404);
      await agent.post(`/api/v1/box/${box.id}/undelete`);
      const res2 = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.id).to.equal(pkmn.id);
    });
    it('deletes a box immediately if the `immediately` parameter is set to true', async () => {
      await agent.del(`/api/v1/box/${box.id}`).send({immediately: true});
      const res = await agent.post(`/api/v1/box/${box.id}/undelete`);
      expect(res.statusCode).to.equal(404);
    });
    it('does not hang the server while waiting for a box to be fully deleted', async () => {
      await agent.del(`/api/v1/box/${box.id}`);
      const timer = Promise.delay(sails.services.constants.BOX_DELETION_DELAY);
      await agent.get('/api/v1/');
      expect(timer.isFulfilled()).to.be.false();
    });
    it('does not show deleted boxes in box listings', async () => {
      const res = await agent.get('/api/v1/user/boxtester/boxes');
      expect(_.map(res.body, 'id')).to.include(box.id);
      await agent.del(`/api/v1/box/${box.id}`);
      const res2 = await agent.get('/api/v1/user/boxtester/boxes');
      expect(_.map(res2.body, 'id')).to.not.include(box.id);
    });
    it('does not cause errors if the same box is deleted in two separate requests', async () => {
      const res = await agent.del(`/api/v1/box/${box.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.post(`/api/v1/box/${box.id}/undelete`);
      expect(res2.statusCode).to.equal(200);
      const res3 = await agent.del(`/api/v1/box/${box.id}`);
      expect(res3.statusCode).to.equal(202);
      await Promise.delay(sails.services.constants.BOX_DELETION_DELAY);
      const res4 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res4.statusCode).to.equal(404);
    });
    after(() => {
      sails.services.constants.BOX_DELETION_DELAY = previousDeletionDelay;
    });
  });
  describe('editing a box', () => {
    let box, box2;
    beforeEach(async () => {
      const res = await agent.post('/api/v1/box').send({name: 'Pillbox', visibility: 'listed'});
      const res2 = await agent.post('/api/v1/box').send({name: 'Pillbox2', visibility: 'listed'});
      expect(res.statusCode).to.equal(201);
      expect(res2.statusCode).to.equal(201);
      box = res.body;
      box2 = res2.body;
    });
    it('removes pokemon from clone lists when updating visibility', async () => {
      const res = await agent.post('/api/v1/pokemon')
        .field('box', box.id)
        .field('visibility', 'viewable')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
      const res2 = await agent.post('/api/v1/pokemon')
        .field('box', box2.id)
        .field('visibility', 'viewable')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
      expect(res.statusCode).to.equal(201);
      expect(res2.statusCode).to.equal(201);
      const pokemon = res.body;
      const pokemon2 = res2.body;
      const res3 = await otherAgent.get(`/api/v1/pokemon/${pokemon2.id}/clones`);
      expect(res3.body.contents[0].id).to.equal(pokemon.id);
      const res4 = await agent.patch(`/api/v1/box/${box.id}`).send({visibility: 'unlisted'});
      expect(res4.statusCode).to.equal(200);
      const res5 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res5.body.name).to.equal('Pillbox');
      expect(res5.body.description).to.equal('');
      expect(res5.body.visibility).to.equal('unlisted');
      const res6 = await otherAgent.get(`/api/v1/pokemon/${pokemon2.id}/clones`);
      expect(res6.body.contents[0]).to.equal(null);
    });
    it('allows a user to edit the name of their box', async () => {
      const res = await agent.patch(`/api/v1/box/${box.id}`).send({name: 'Boxfish'});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res2.body.name).to.equal('Boxfish');
      expect(res2.body.description).to.equal('');
      expect(res2.body.visibility).to.equal('listed');
    });
    it('allows a user to edit the description of their box', async () => {
      const res = await agent.patch(`/api/v1/box/${box.id}`).send({description: 'Contains things'});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res2.body.name).to.equal('Pillbox');
      expect(res2.body.description).to.equal('Contains things');
      expect(res2.body.visibility).to.equal('listed');
    });
    it('allows a user to edit the visibility of their box', async () => {
      const res = await agent.patch(`/api/v1/box/${box.id}`).send({visibility: 'unlisted'});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res2.body.name).to.equal('Pillbox');
      expect(res2.body.description).to.equal('');
      expect(res2.body.visibility).to.equal('unlisted');
    });
    it('allows a user to edit multiple box properties at once', async () => {
      const res = await agent.patch(`/api/v1/box/${box.id}`)
        .send({name: 'a', visibility: 'unlisted'});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res2.body.name).to.equal('a');
      expect(res2.body.description).to.equal('');
      expect(res2.body.visibility).to.equal('unlisted');
    });
    it('does not allow invalid properties to be edited', async () => {
      const res = await agent.patch(`/api/v1/box/${box.id}`).send({
        visibility: 'unlisted',
        owner: 'b'
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res2.body.name).to.equal('Pillbox');
      expect(res2.body.description).to.equal('');
      expect(res2.body.visibility).to.equal('unlisted');
      expect(res2.body.owner).to.not.equal('b');
    });
    it('returns a 400 error if no valid properties are specified', async () => {
      const res = await agent.patch(`/api/v1/box/${box.id}`).send({owner: 'b', contents: []});
      expect(res.statusCode).to.equal(400);
    });
    it('returns a 404 error if an invalid box ID is given', async () => {
      const res = await agent.patch('/api/v1/box/NotARealBoxID').send({visibility: 'unlisted'});
      expect(res.statusCode).to.equal(404);
    });
    it("does not allow a user to edit someone else's box", async () => {
      const res = await otherAgent.patch(`/api/v1/box/${box.id}`).send({description: 'a box'});
      expect(res.statusCode).to.equal(403);
    });
    it("allows an admin to edit anyone's box", async () => {
      const res = await adminAgent.patch(`/api/v1/box/${box.id}`).send({description: 'a box'});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.name).to.equal('Pillbox');
      expect(res2.body.description).to.equal('a box');
      expect(res.body.visibility).to.equal('listed');
    });
    it('does not allow a deleted box to be edited', async () => {
      const res = await agent.del(`/api/v1/box/${box.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.patch(`/api/v1/box/${box.id}`).send({description: 'a box'});
      expect(res2.statusCode).to.equal(404);
    });
    it("does not allow a box's name to be edited to the empty string", async () => {
      const res = await agent.patch(`/api/v1/box/${box.id}`).send({name: ''});
      expect(res.statusCode).to.equal(400);
    });
    it("does not allow a box's name to be edited to longer than 300 chars", async () => {
      const res = await agent.patch(`/api/v1/box/${box.id}`).send({name: 'A'.repeat(301)});
      expect(res.statusCode).to.equal(400);
    });
    it("does not allow a box's description to be edited to longer than 1000 chars", async () => {
      const res = await agent.patch(`/api/v1/box/${box.id}`).send({name: 'A'.repeat(1001)});
      expect(res.statusCode).to.equal(400);
    });
  });
});
