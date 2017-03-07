'use strict';
const _ = require('lodash');
const expect = require('chai').use(require('dirty-chai')).expect;
const Promise = require('bluebird');
const testHelpers = require('../test-helpers');
describe('PokemonController', () => {
  let agent, otherAgent, noAuthAgent, adminAgent, generalPurposeBox;
  before(async () => {
    agent = await testHelpers.getAgent();
    otherAgent = await testHelpers.getAgent();
    noAuthAgent = await testHelpers.getAgent();
    adminAgent = await testHelpers.getAgent();
    const res = await agent.post('/api/v1/auth/local/register').send({
      name: 'pk6tester',
      password: '********',
      email: 'pk6tester@pk6testing.com'
    });
    expect(res.statusCode).to.equal(200);

    const res2 = await otherAgent.post('/api/v1/auth/local/register').send({
      name: 'EXPLOUD_BOT',
      password: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      email: 'AAAAAAAA@AAAAAAAA.com'
    });
    expect(res2.statusCode).to.equal(200);

    const res3 = await adminAgent.post('/api/v1/auth/local/register').send({
      name: 'pokemon_admin',
      password: 'correct horse battery staple',
      email: 'pokemon_admin@porybox.com'
    });
    expect(res3.statusCode).to.equal(200);

    const res4 = await agent.post('/api/v1/box').send({name: 'Boxers'});
    expect(res4.statusCode).to.equal(201);
    generalPurposeBox = res4.body.id;

    await sails.models.user.update({name: 'pokemon_admin'}, {isAdmin: true});
  });
  describe('upload', () => {
    let otherBox, initialMaxBoxSize;
    before(async () => {
      const res = await otherAgent.post('/api/v1/box').send(
        {name: 'carBoxyl', visibility: 'listed'}
      );
      expect(res.statusCode).to.equal(201);
      otherBox = res.body.id;
    });
    before(() => {
      initialMaxBoxSize = sails.services.constants.MAX_BOX_SIZE;
    });
    afterEach(() => {
      sails.services.constants.MAX_BOX_SIZE = initialMaxBoxSize;
    });
    it('should be able to upload a pk6 file and receive a parsed version', async () => {
      const res = await agent.post('/api/v1/pokemon')
        .field('box', generalPurposeBox)
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
      expect(res.statusCode).to.equal(201);
      expect(res.body.dexNo).to.equal(279);
      expect(res.body.speciesName).to.equal('Pelipper');
      expect(res.body.box).to.equal(generalPurposeBox);
      expect(res.body.pid).to.exist();
      expect(res.body._cloneHash).to.not.exist();
      expect(res.body.owner).to.equal('pk6tester');
      expect(res.body.id).to.match(/^[0-9a-f]{32}$/);
      expect(res.body._boxVisibility).to.not.exist();
      expect(res.body.gen).to.equal(6);
    });
    it('should identify uploaded things as clones', async () => {
      const res1 = await agent.post('/api/v1/pokemon')
        .field('box', generalPurposeBox)
        .attach('pk6', `${__dirname}/pk6/pkmn2.pk6`);
      expect(res1.statusCode).to.equal(201);
      expect(res1.body.isUnique).to.be.true();
      const res2 = await agent.post('/api/v1/pokemon')
        .field('box', generalPurposeBox)
        .attach('pk6', `${__dirname}/pk6/pkmn2.pk6`);
      expect(res2.statusCode).to.equal(201);
      expect(res2.body.isUnique).to.be.false();
    });
    it("should reject uploads that aren't pk6 files", async () => {
      const res = await agent.post('/api/v1/pokemon')
        .field('box', generalPurposeBox)
        .attach('pk6', `${__dirname}/pk6/not_a_pk6_file.txt`);
      expect(res.statusCode).to.equal(400);
    });
    it('should not allow a user to upload a pk6 file without specifying a box', async () => {
      const res = await agent.post('/api/v1/pokemon').attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
      expect(res.statusCode).to.equal(400);
    });
    it('should return a 404 error if the specified box does not exist', async () => {
      const res = await agent.post('/api/v1/pokemon')
        .field('box', 'not a real box id')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
      expect(res.statusCode).to.equal(404);
    });
    it('should return a 403 error if the specified box belongs to someone else', async () => {
      const res = await agent.post('/api/v1/pokemon')
        .field('box', otherBox)
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
      expect(res.statusCode).to.equal(403);
    });
    it('should not allow kyurem-white to be uploaded', async () => {
      const res = await agent.post('/api/v1/pokemon')
        .field('box', generalPurposeBox)
        .attach('pk6', `${__dirname}/pk6/kyurem-w.pk6`);
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Kyurem-White may not be uploaded');
    });
    it('should not allow a pokemon with invalid move IDs to be uploaded', async () => {
      const res = await agent.post('/api/v1/pokemon')
        .field('box', generalPurposeBox)
        .attach('pk6', `${__dirname}/pk6/invalid-moves.pk6`);
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Failed to parse the provided file');
    });
    it('can handle concurrent uploads to the same box without losing anything', async () => {
      const res = await agent.get(`/api/v1/box/${generalPurposeBox}`);
      expect(res.statusCode).to.equal(200);
      const initialCount = res.body.contents.length;
      expect(initialCount).to.be.a('number');
      const newIds = await Promise.all(_.times(10, async () => {
        const res2 = await agent.post('/api/v1/pokemon')
          .field('box', generalPurposeBox)
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
        expect(res2.statusCode).to.equal(201);
        return res2.body.id;
      }));
      const res3 = await agent.get(`/api/v1/box/${generalPurposeBox}`);
      expect(res3.body.contents.length).to.equal(initialCount + 10);
      expect(_.map(res3.body.contents.slice(-10), 'id').sort()).to.eql(newIds.sort());
    });
    it('should not allow uploads to a box at max capacity', async () => {
      sails.services.constants.MAX_BOX_SIZE = await sails.models.pokemon.count({
        box: generalPurposeBox,
        _markedForDeletion: false
      });
      const res = await agent.post('/api/v1/pokemon')
        .field('box', generalPurposeBox)
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Cannot upload to a maximum-capacity box');
    });
  });
  describe('multi upload', () => {
    let pk6Data, invalidPk6Data1, invalidPk6Data2, kyuremW, verifyValidUpload, initialMaxBoxSize;
    before(() => {
      const fs = require('fs');
      pk6Data = fs.readFileSync(`${__dirname}/pk6/pkmn1.pk6`, {encoding: 'base64'});
      // (prepend a random string)
      invalidPk6Data1 = '44444444444444444' + pk6Data;
      // (valid structure with invalid move IDs)
      invalidPk6Data2 = fs.readFileSync(`${__dirname}/pk6/invalid-moves.pk6`, {encoding: 'base64'});

      kyuremW = fs.readFileSync(`${__dirname}/pk6/kyurem-w.pk6`, {encoding: 'base64'});

      verifyValidUpload = data => {
        expect(data.success).to.be.true();
        expect(data.error).to.be.null();
        expect(data.created.speciesName).to.equal('Pelipper');
        expect(data.created.pid).to.exist();
      };
    });
    before(() => {
      initialMaxBoxSize = sails.services.constants.MAX_BOX_SIZE;
    });
    afterEach(() => {
      sails.services.constants.MAX_BOX_SIZE = initialMaxBoxSize;
    });
    it('allows multiple files to be uploaded simultaneously', async () => {
      const files = [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data},
        {box: generalPurposeBox, visibility: 'private', data: pk6Data}
      ];
      const res = await agent.post('/api/v1/pokemon/multi').send({files});
      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an.instanceof(Array);
      expect(res.body).to.have.lengthOf(3);
      expect(_.map(res.body, 'success')).to.eql([true, true, true]);
      expect(_.map(res.body, 'error')).to.eql([null, null, null]);
      expect(_.map(res.body, 'created.visibility')).to.eql(['viewable', 'public', 'private']);
      expect(_.map(res.body, 'created.speciesName')).to.eql(_.times(3, () => 'Pelipper'));
      expect(_.map(res.body, 'created.box')).to.eql(_.times(3, () => generalPurposeBox));
    });
    it("defaults to the user's default upload visibility if none is provided", async () => {
      const res = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, data: pk6Data}
      ]});
      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an.instanceof(Array);
      expect(res.body).to.have.lengthOf(1);
      expect(res.body[0].success).to.be.true();
      expect(res.body[0].error).to.be.null();
      const res2 = await agent.get('/api/v1/me/preferences');
      expect(res2.statusCode).to.equal(200);
      const userDefaultVisibility = res2.body.defaultPokemonVisibility;
      expect(res.body[0].created.visibility).to.equal(userDefaultVisibility);
    });
    it('returns a 400 error if the `files` argument is not an array', async () => {
      const notAnArray = {length: 3, 0: 'foo', 1: 'bar', 2: 'baz'};
      const res = await agent.post('/api/v1/pokemon/multi').send({files: notAnArray});
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Invalid files array');
    });
    it('returns a 400 error if the `files` array is empty', async () => {
      const res = await agent.post('/api/v1/pokemon/multi').send({files: []});
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('No files uploaded');
    });
    it('returns a 400 error if the `files` array has a length greater than 50', async () => {
      const res = await agent.post('/api/v1/pokemon/multi').send({files: _.times(51, () => ({}))});
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('A maximum of 50 files may be uploaded at a time');
    });
    it('returns a 400 error if any provided visibility is invalid', async () => {
      const res = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: generalPurposeBox, visibility: 'private', data: pk6Data},
        {box: generalPurposeBox, visibility: 'HI THANKS FOR READING THE UNIT TESTS', data: pk6Data},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data}
      ]});
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Invalid Pokémon visibility');
    });
    it('returns a 400 error if any box IDs are missing/invalid', async () => {
      const res = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {visibility: 'private', data: pk6Data},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data}
      ]});
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Missing/invalid box ID');

      const res2 = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: ['this is an array'], visibility: 'private', data: pk6Data},
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data}
      ]});
      expect(res2.statusCode).to.equal(400);
      expect(res2.body).to.equal('Missing/invalid box ID');
    });
    it('does not accept Pokémon with invalid pk6 data', async () => {
      const res = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: generalPurposeBox, visibility: 'private', data: invalidPk6Data1},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data}
      ]});
      const res2 = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: generalPurposeBox, visibility: 'private', data: invalidPk6Data2},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data}
      ]});
      [res, res2].forEach(response => {
        expect(response.statusCode).to.equal(201);
        expect(response.body).to.be.an.instanceof(Array);
        expect(response.body).to.have.lengthOf(3);
        verifyValidUpload(response.body[0]);
        expect(response.body[0].created.visibility).to.equal('viewable');
        verifyValidUpload(response.body[2]);
        expect(response.body[2].created.visibility).to.equal('public');
        expect(response.body[1].success).to.be.false();
        expect(response.body[1].created).to.be.null();
        expect(response.body[1].error).to.equal('Failed to parse the provided file');
      });
    });
    it("does not accept box IDs that don't exist", async () => {
      const res = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: generalPurposeBox + 'extra not-box-id bit', visibility: 'private', data: pk6Data},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data}
      ]});
      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an.instanceof(Array);
      expect(res.body).to.have.lengthOf(3);
      verifyValidUpload(res.body[0]);
      expect(res.body[0].created.visibility).to.equal('viewable');
      verifyValidUpload(res.body[2]);
      expect(res.body[2].created.visibility).to.equal('public');
      expect(res.body[1].success).to.be.false();
      expect(res.body[1].created).to.be.null();
      expect(res.body[1].error).to.equal('Box not found');
    });
    it('does not accept box IDs that belong to another user', async () => {
      const res = await otherAgent.post('/api/v1/box').send({name: 'Outbox'});
      expect(res.statusCode).to.equal(201);
      const otherBox = res.body;
      const res2 = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: otherBox.id, visibility: 'private', data: pk6Data},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data}
      ]});
      expect(res2.statusCode).to.equal(201);
      expect(res2.body).to.be.an.instanceof(Array);
      expect(res2.body).to.have.lengthOf(3);
      verifyValidUpload(res2.body[0]);
      expect(res2.body[0].created.visibility).to.equal('viewable');
      verifyValidUpload(res2.body[2]);
      expect(res2.body[2].created.visibility).to.equal('public');
      expect(res2.body[1].success).to.be.false();
      expect(res2.body[1].created).to.be.null();
      expect(res2.body[1].error).to.equal('Cannot upload to this box');
    });
    it('does not accept kyurem-w or kyurem-b', async () => {
      const res = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: generalPurposeBox, visibility: 'private', data: kyuremW},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data}
      ]});
      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an.instanceof(Array);
      expect(res.body).to.have.lengthOf(3);
      verifyValidUpload(res.body[0]);
      expect(res.body[0].created.visibility).to.equal('viewable');
      verifyValidUpload(res.body[2]);
      expect(res.body[2].created.visibility).to.equal('public');
      expect(res.body[1].success).to.be.false();
      expect(res.body[1].created).to.be.null();
      expect(res.body[1].error).to.equal('Kyurem-White may not be uploaded');
    });
    it('enters the results into the correct boxes with the correct settings', async () => {
      const res = await agent.post('/api/v1/box').send({name: 'Checkbox'});
      expect(res.statusCode).to.equal(201);
      const box1 = res.body;

      const res2 = await agent.post('/api/v1/box').send({name: 'Bounding Box'});
      expect(res2.statusCode).to.equal(201);
      const box2 = res2.body;

      const res3 = await agent.get(`/api/v1/box/${generalPurposeBox}`);
      expect(res3.statusCode).to.equal(200);
      const initialContents = res3.body.contents;

      const res4 = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: box1.id, visibility: 'public', data: pk6Data},
        {box: box2.id, visibility: 'private', data: pk6Data},
        {box: box1.id, visibility: 'private', data: pk6Data},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data},
        {box: box2.id, visibility: 'viewable', data: invalidPk6Data1},
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data}
      ]});

      expect(res4.statusCode).to.equal(201);
      expect(res4.body).to.be.an.instanceof(Array);
      expect(res4.body).to.have.lengthOf(7);
      expect(_.map(res4.body, 'success')).to.eql([true, true, true, true, true, false, true]);
      _.forEach([0, 1, 2, 3, 4, 6], index => verifyValidUpload(res4.body[index]));
      expect(res4.body[5].created).to.be.null();
      expect(res4.body[5].error).to.equal('Failed to parse the provided file');

      const res5 = await agent.get(`/api/v1/box/${box1.id}`);
      expect(res5.statusCode).to.equal(200);
      const updatedBox1 = res5.body;
      const res6 = await agent.get(`/api/v1/box/${box2.id}`);
      expect(res6.statusCode).to.equal(200);
      const updatedBox2 = res6.body;
      const res7 = await agent.get(`/api/v1/box/${generalPurposeBox}`);
      expect(res7.statusCode).to.equal(200);
      const updatedInitialBox = res7.body;
      expect(updatedBox1.contents).to.eql(_.map([res4.body[1], res4.body[3]], 'created'));
      expect(updatedBox2.contents).to.eql([res4.body[2].created]);
      expect(updatedInitialBox.contents).to.eql(
        initialContents.concat(_.map([res4.body[0], res4.body[4], res4.body[6]], 'created'))
      );
    });
    it('does not allow uploads to push boxes over the max box size', async () => {
      sails.services.constants.MAX_BOX_SIZE = await sails.models.pokemon.count({
        box: generalPurposeBox,
        _markedForDeletion: false
      }) + 2;

      const res = await agent.post('/api/v1/pokemon/multi').send({files: [
        {box: generalPurposeBox, visibility: 'viewable', data: pk6Data},
        {box: generalPurposeBox, visibility: 'private', data: pk6Data},
        {box: generalPurposeBox, visibility: 'public', data: pk6Data}
      ]});
      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an.instanceof(Array);
      expect(res.body).to.have.lengthOf(3);
      expect(res.body[0].success).to.be.true();
      expect(res.body[1].success).to.be.true();
      expect(res.body[2].success).to.be.false();
      expect(res.body[2].error).to.equal('Cannot upload to a maximum-capacity box');
    });
    describe('specifying a generation', () => {

      it('allows uploads to specify a generation', async () => {
        const res = await agent.post('/api/v1/pokemon/multi').send({files: [
          {box: generalPurposeBox, visibility: 'viewable', data: pk6Data, gen: 6},
          {box: generalPurposeBox, visibility: 'private', data: pk6Data, gen: 7},
          {box: generalPurposeBox, visibility: 'public', data: pk6Data}
        ]});

        expect(res.statusCode).to.equal(201);
        expect(res.body.every(result => result.success)).to.be.true();
        expect(res.body.map(result => result.created.gen)).to.eql([6, 7, 6]);
      });
      it("doesn't allow uploads from gens other than explicitly listed ones", async () => {
        const res = await agent.post('/api/v1/pokemon/multi').send({files: [
          {box: generalPurposeBox, visibility: 'viewable', data: pk6Data, gen: 8}
        ]});

        expect(res.statusCode).to.equal(201);
        expect(res.body[0].success).to.be.false();
      });
    });
  });
  describe('getting a pokemon by ID', () => {
    let publicId, privateId, viewableId, unlistedPublicId,
      unlistedPrivateId, unlistedViewableId, unlistedBox, listedBox;
    before(async () => {
      const res = await agent.post('/api/v1/box').send({name: 'Gearbox', visibility: 'unlisted'});
      expect(res.statusCode).to.equal(201);
      unlistedBox = res.body;

      const res2 = await agent.post('/api/v1/box').send({name: 'Pepperbox', visibility: 'listed'});
      expect(res2.statusCode).to.equal(201);
      listedBox = res2.body;

      [publicId, privateId, viewableId] = await Promise.map(['public', 'private', 'viewable'], v =>
        agent.post('/api/v1/pokemon')
          .field('visibility', v)
          .field('box', listedBox.id)
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
      ).map(response => response.body.id);

      [unlistedPublicId, unlistedPrivateId, unlistedViewableId] = await Promise.map([
        'public',
        'private',
        'viewable'
      ], visibility =>
        agent.post('/api/v1/pokemon')
          .field('visibility', visibility)
          .field('box', unlistedBox.id)
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
      ).map(response => response.body.id);
    });
    it('allows third parties to view all the data on a public pokemon', async () => {
      const res = await otherAgent.get(`/api/v1/pokemon/${publicId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.pid).to.exist();
      expect(res.body.encryptionConstant).to.exist();
      expect(res.body.speciesName).to.equal('Pelipper');
      expect(res.body.abilityName).to.equal('Keen Eye');
      expect(res.body.natureName).to.equal('Modest');
      expect(res.body.move1Name).to.equal('Agility');
      expect(res.body.box).to.equal(listedBox.id);
      expect(res.body.privateNotes).to.not.exist();
    });
    it('allows the uploader to view all the data on a viewable pokemon', async () => {
      const res = await agent.get(`/api/v1/pokemon/${viewableId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.pid).to.exist();
      expect(res.body.speciesName).to.exist();
      expect(res.body.box).to.equal(listedBox.id);
      expect(res.body.privateNotes).to.exist();
      expect(res.body.publicNotes).to.exist();
    });
    it('allows third parties to view only public data on a viewable pokemon', async () => {
      const res = await otherAgent.get(`/api/v1/pokemon/${viewableId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.dexNo).to.exist();
      expect(res.body.pid).to.not.exist();
      expect(res.body.encryptionConstant).to.not.exist();
      expect(res.body.speciesName).to.exist();
      expect(res.body.tsv).to.be.a('number');
      expect(res.body.esv).to.be.a('number');
      expect(res.body.isShiny).to.be.a('boolean');
      expect(res.body.box).to.equal(listedBox.id);
      expect(res.body.privateNotes).to.not.exist();
      expect(res.body.publicNotes).to.exist();
    });
    it('allows the uploader to view all the data on a private pokemon', async () => {
      const res = await agent.get(`/api/v1/pokemon/${privateId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.pid).to.exist();
      expect(res.body.speciesName).to.exist();
      expect(res.body.box).to.equal(listedBox.id);
      expect(res.body.privateNotes).to.exist();
      expect(res.body.publicNotes).to.exist();
    });
    it('does not allow third parties to view a private pokemon', async () => {
      const res = await otherAgent.get(`/api/v1/pokemon/${privateId}`);
      expect(res.statusCode).to.equal(403);
    });
    it('allows an admin to view all the data on a public pokemon', async () => {
      const res = await adminAgent.get(`/api/v1/pokemon/${publicId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.dexNo).to.exist();
      expect(res.body.pid).to.exist();
      expect(res.body.speciesName).to.exist();
      expect(res.body.box).to.equal(listedBox.id);
      expect(res.body.privateNotes).to.exist();
    });
    it('allows an admin to view all the data on a viewable pokemon', async () => {
      const res = await adminAgent.get(`/api/v1/pokemon/${viewableId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.dexNo).to.exist();
      expect(res.body.pid).to.exist();
      expect(res.body.speciesName).to.exist();
      expect(res.body.box).to.equal(listedBox.id);
      expect(res.body.privateNotes).to.exist();
    });
    it('allows an admin to view all the data on a private pokemon', async () => {
      const res = await adminAgent.get(`/api/v1/pokemon/${privateId}`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.dexNo).to.exist();
      expect(res.body.pid).to.exist();
      expect(res.body.speciesName).to.exist();
      expect(res.body.box).to.equal(listedBox.id);
      expect(res.body.privateNotes).to.exist();
    });
    it('does not leak internal properties of a a pokemon to the client', async () => {
      const pkmn = (await agent.get(`/api/v1/pokemon/${publicId}`)).body;
      expect(pkmn._markedForDeletion).to.not.exist();
      expect(pkmn._rawPk6).to.not.exist();
      expect(pkmn._rawFile).to.not.exist();
    });
    it('allows a list of fields to be specified as a query parameter', async () => {
      const res = await agent.get(`/api/v1/pokemon/${viewableId}`).query({
        pokemonFields: 'id,visibility,ivHp'
      });
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.eql({id: viewableId, visibility: 'viewable', ivHp: 31});
    });
    it('does not allow private fields to be sent even if specified in the query', async () => {
      const res = await otherAgent.get(`/api/v1/pokemon/${viewableId}`)
        .query({pokemonFields: 'id,pid'});
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.eql({id: viewableId});
      expect(res.body.pid).not.to.exist();
    });
    it('allows private fields to be sent to the owner if specified in the query', async () => {
      const res = await agent.get(`/api/v1/pokemon/${viewableId}`).query({pokemonFields: 'pid'});
      expect(res.statusCode).to.equal(200);
      expect(Object.keys(res.body)).to.eql(['pid']);
    });
    it('does not leak internal properties of a pokemon if specified in the query', async () => {
      const res = await agent.get(`/api/v1/pokemon/${viewableId}`)
        .query({pokemonFields: '_rawPk6,_rawFile'});
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.eql({});
    });
    describe('sending the box ID for unlisted boxes', () => {
      describe('when the requester is the owner', () => {
        it('sends the box ID of a public Pokémon', async () => {
          const res = await agent.get(`/api/v1/pokemon/${unlistedPublicId}`);
          expect(res.statusCode).to.equal(200);
          expect(res.body.box).to.equal(unlistedBox.id);
        });
        it('sends the box ID of a viewable Pokémon', async () => {
          const res = await agent.get(`/api/v1/pokemon/${unlistedViewableId}`);
          expect(res.statusCode).to.equal(200);
          expect(res.body.box).to.equal(unlistedBox.id);
        });
        it('sends the box ID of a private Pokémon', async () => {
          const res = await agent.get(`/api/v1/pokemon/${unlistedPrivateId}`);
          expect(res.statusCode).to.equal(200);
          expect(res.body.box).to.equal(unlistedBox.id);
        });
      });
      describe('when the requester is an admin', () => {
        it('sends the box ID of a public Pokémon', async () => {
          const res = await adminAgent.get(`/api/v1/pokemon/${unlistedPublicId}`);
          expect(res.statusCode).to.equal(200);
          expect(res.body.box).to.equal(unlistedBox.id);
        });
        it('sends the box ID of a viewable Pokémon', async () => {
          const res = await adminAgent.get(`/api/v1/pokemon/${unlistedViewableId}`);
          expect(res.statusCode).to.equal(200);
          expect(res.body.box).to.equal(unlistedBox.id);
        });
        it('sends the box ID of a private Pokémon', async () => {
          const res = await adminAgent.get(`/api/v1/pokemon/${unlistedPrivateId}`);
          expect(res.statusCode).to.equal(200);
          expect(res.body.box).to.equal(unlistedBox.id);
        });
      });
      describe('when the requester is another user', () => {
        it('does not send the box ID of a public Pokémon', async () => {
          const res = await otherAgent.get(`/api/v1/pokemon/${unlistedPublicId}`);
          expect(res.statusCode).to.equal(200);
          expect(res.body.box).to.not.exist();
        });
        it('does not send the box ID of a viewable Pokémon', async () => {
          const res = await otherAgent.get(`/api/v1/pokemon/${unlistedViewableId}`);
          expect(res.statusCode).to.equal(200);
          expect(res.body.box).to.not.exist();
        });
        it('does not send the box Id of a private Pokémon', async () => {
          const res = await otherAgent.get(`/api/v1/pokemon/${unlistedPrivateId}`);
          expect(res.statusCode).to.equal(403);
          expect(res.body.box).to.not.exist();
        });
      });
      describe('the user is unauthenticated', () => {
        it('does not send the box ID of a public Pokémon', async () => {
          const res = await noAuthAgent.get(`/api/v1/pokemon/${unlistedPublicId}`);
          expect(res.statusCode).to.equal(200);
          expect(res.body.box).to.not.exist();
        });
        it('does not send the box ID of a viewable Pokémon', async () => {
          const res = await noAuthAgent.get(`/api/v1/pokemon/${unlistedViewableId}`);
          expect(res.statusCode).to.equal(200);
          expect(res.body.box).to.not.exist();
        });
        it('does not send the box Id of a private Pokémon', async () => {
          const res = await noAuthAgent.get(`/api/v1/pokemon/${unlistedPrivateId}`);
          expect(res.statusCode).to.equal(403);
          expect(res.body.box).to.not.exist();
        });
      });
      describe('when sending the box itself', () => {
        describe('when the box is listed', () => {
          describe('the requester is the uploader', () => {
            it('sends a `box` parameter on the Pokémon in the box', async () => {
              const res = await agent.get(`/api/v1/box/${listedBox.id}`);
              expect(res.statusCode).to.equal(200);
              expect(res.body.contents[0].box).to.equal(listedBox.id);
            });
          });
          describe('the requester is an admin', () => {
            it('sends a `box` parameter on the Pokémon in the box', async () => {
              const res = await adminAgent.get(`/api/v1/box/${listedBox.id}`);
              expect(res.statusCode).to.equal(200);
              expect(res.body.contents[0].box).to.equal(listedBox.id);
            });
          });
          describe('the requester is another user', () => {
            it('sends a `box` parameter on the Pokémon in the box', async () => {
              const res = await otherAgent.get(`/api/v1/box/${listedBox.id}`);
              expect(res.statusCode).to.equal(200);
              expect(res.body.contents[0].box).to.equal(listedBox.id);
            });
          });
          describe('the requester is unauthenticated', () => {
            it('sends a `box` parameter on the Pokémon in the box', async () => {
              const res = await noAuthAgent.get(`/api/v1/box/${listedBox.id}`);
              expect(res.statusCode).to.equal(200);
              expect(res.body.contents[0].box).to.equal(listedBox.id);
            });
          });
        });
        describe('when the box is unlisted', () => {
          describe('the requester is the uploader', () => {
            it('sends a `box` parameter on the Pokémon in the box', async () => {
              const res = await agent.get(`/api/v1/box/${unlistedBox.id}`);
              expect(res.statusCode).to.equal(200);
              expect(res.body.contents[0].box).to.equal(unlistedBox.id);
            });
          });
          describe('the requester is an admin', () => {
            it('sends a `box` parameter on the Pokémon in the box', async () => {
              const res = await adminAgent.get(`/api/v1/box/${unlistedBox.id}`);
              expect(res.statusCode).to.equal(200);
              expect(res.body.contents[0].box).to.equal(unlistedBox.id);
            });
          });
          describe('the requester is another user', () => {
            it('does not send a `box` parameter on the Pokémon in the box', async () => {
              const res = await otherAgent.get(`/api/v1/box/${unlistedBox.id}`);
              expect(res.statusCode).to.equal(200);
              expect(res.body.contents[0].box).to.not.exist();
            });
          });
          describe('the requester is unauthenticated', () => {
            it('does not send a `box` parameter on the Pokémon in the box', async () => {
              const res = await noAuthAgent.get(`/api/v1/box/${unlistedBox.id}`);
              expect(res.statusCode).to.equal(200);
              expect(res.body.contents[0].box).to.not.exist();
            });
          });
        });
      });
    });
  });

  describe('deleting a pokemon', () => {
    let previousDeletionDelay, previousMaxBoxSize, pkmn;
    before(() => {
      /* Normally this is 5 minutes, but it's annoying for the unit tests to take that long.
      So for these tests it's set to 2 seconds instead. */
      previousDeletionDelay = sails.services.constants.POKEMON_DELETION_DELAY;
      previousMaxBoxSize = sails.services.constants.MAX_BOX_SIZE;
      sails.services.constants.POKEMON_DELETION_DELAY = 2000;
    });
    beforeEach(async () => {
      const res = await agent.post('/api/v1/pokemon')
        .field('box', generalPurposeBox)
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
      expect(res.statusCode).to.equal(201);
      pkmn = res.body;
    });
    afterEach(() => {
      sails.services.constants.MAX_BOX_SIZE = previousMaxBoxSize;
    });
    after(() => {
      sails.services.constants.POKEMON_DELETION_DELAY = previousDeletionDelay;
    });
    it('allows the owner of a pokemon to delete it', async () => {
      const res = await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res2.statusCode).to.equal(404);
    });
    it("does not allow a third party to delete someone else's pokemon", async () => {
      const res = await otherAgent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(res.statusCode).to.equal(403);
      const res2 = await otherAgent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res2.statusCode).to.not.equal(404);
    });
    it("allows an admin to delete someone's pokemon", async () => {
      const res = await adminAgent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      expect((await agent.get(`/api/v1/pokemon/${pkmn.id}`)).statusCode).to.equal(404);
    });
    it("allows an admin to undelete someone's pokemon", async () => {
      const res = await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await adminAgent.post(`/api/v1/pokemon/${pkmn.id}/undelete`);
      expect(res2.statusCode).to.equal(200);
      expect((await agent.get(`/api/v1/pokemon/${pkmn.id}`)).statusCode).to.equal(200);
    });
    it('allows a deleted pokemon to be undeleted shortly afterwards', async () => {
      await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect((await agent.get(`/api/v1/pokemon/${pkmn.id}`)).statusCode).to.equal(404);
      const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/undelete`);
      expect(res.statusCode).to.equal(200);
      expect((await agent.get(`/api/v1/pokemon/${pkmn.id}`)).statusCode).to.equal(200);
      await Promise.delay(sails.services.constants.POKEMON_DELETION_DELAY);
      expect((await agent.get(`/api/v1/pokemon/${pkmn.id}`)).statusCode).to.equal(200);
    });
    it('does not allow a pokemon to be undeleted once some time has elapsed', async () => {
      await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      await Promise.delay(sails.services.constants.POKEMON_DELETION_DELAY);
      const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/undelete`);
      expect(res.statusCode).to.equal(404);
      const res2 = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res2.statusCode).to.equal(404);
    });
    it("does not allow a third party to undelete someone else's pokemon", async () => {
      await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(
        (await otherAgent.post(`/api/v1/pokemon/${pkmn.id}/undelete`)).statusCode
      ).to.equal(404);
    });
    it('deletes a pokemon immediately if the `immediately` parameter is set to true', async () => {
      await agent.del(`/api/v1/pokemon/${pkmn.id}`).send({immediately: true});
      const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/undelete`);
      expect(res.statusCode).to.equal(404);
    });
    it('does not hang the server while waiting for a pokemon to be fully deleted', async () => {
      await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      const timer = Promise.delay(sails.services.constants.POKEMON_DELETION_DELAY);
      await agent.get('/api/v1/');
      expect(timer.isFulfilled()).to.be.false();
    });
    it('does not show deleted contents when a box is retrieved', async () => {
      const res = await agent.get(`/api/v1/box/${pkmn.box}`);
      const res2 = await agent.get(`/api/v1/box/${pkmn.box}`)
        .query({after: _.last(res.body.contents).id});
      expect(_.map(res.body.contents.concat(res2.body.contents), 'id')).to.include(pkmn.id);
      await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      const res3 = await agent.get(`/api/v1/box/${pkmn.box}`);
      const res4 = await agent.get(`/api/v1/box/${pkmn.box}`).query({page: 2});
      expect(_.map(res3.body.contents.concat(res4.body.contents), 'id')).to.not.include(pkmn.id);
    });
    it('does not cause errors if the same Pokémon is deleted in two requests', async () => {
      const res = await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.post(`/api/v1/pokemon/${pkmn.id}/undelete`);
      expect(res2.statusCode).to.equal(200);
      const res3 = await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(res3.statusCode).to.equal(202);
      await Promise.delay(sails.services.constants.POKEMON_DELETION_DELAY);
      const res4 = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res4.statusCode).to.equal(404);
    });
    it('does not allow a pokemon to be undeleted if the box is at capacity', async () => {
      const res = await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      sails.services.constants.MAX_BOX_SIZE = await sails.models.pokemon.count({
        box: generalPurposeBox,
        _markedForDeletion: false
      });
      const res2 = await agent.post(`/api/v1/pokemon/${pkmn.id}/undelete`);
      expect(res2.statusCode).to.equal(400);
      expect(res2.body).to.equal('Cannot add a Pokémon to a maximum-capacity box');
    });
  });
  describe('downloading a pokemon', () => {
    let publicPkmn, viewablePkmn, privatePkmn, rawPk6;
    before(async () => {
      const res = await agent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('visibility', 'public')
        .field('box', generalPurposeBox);
      expect(res.statusCode).to.equal(201);
      publicPkmn = res.body;
      const res2 = await agent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('box', generalPurposeBox);
      expect(res2.statusCode).to.equal(201);
      viewablePkmn = res2.body;
      const res3 = await agent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('visibility', 'private')
        .field('box', generalPurposeBox);
      expect(res3.statusCode).to.equal(201);
      privatePkmn = res3.body;
      rawPk6 = require('fs').readFileSync(`${__dirname}/pk6/pkmn1.pk6`).toString('utf8');
    });
    it('allows a user to download their own pokemon, regardless of visibility', async () => {
      const res = await agent.get(`/api/v1/pokemon/${publicPkmn.id}/raw`).buffer()
        .expect(
          'Content-Disposition',
          `attachment; filename="${publicPkmn.nickname}-${publicPkmn.id}.pk6"`
        );
      expect(res.statusCode).to.equal(200);
      expect(res.body.toString('utf8')).to.equal(rawPk6);
      const res2 = await agent.get(`/api/v1/pokemon/${viewablePkmn.id}/raw`).buffer();
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.toString('utf8')).to.equal(rawPk6);
      const res3 = await agent.get(`/api/v1/pokemon/${privatePkmn.id}/raw`).buffer();
      expect(res3.statusCode).to.equal(200);
      expect(res3.body.toString('utf8')).to.equal(rawPk6);
    });
    it('downloads as pk7 when gen 7', async () => {
      const files = [
        {box: generalPurposeBox, visibility: 'viewable', gen: 7,
          data: require('fs').readFileSync(`${__dirname}/pk7/pkmn1.pk7`, {encoding: 'base64'})},
      ];
      const uploadRes = await agent.post('/api/v1/pokemon/multi').send({files});
      expect(uploadRes.statusCode).to.equal(201);
      const pk7Pokemon = uploadRes.body[0].created;
      const rawPk7 = require('fs').readFileSync(`${__dirname}/pk7/pkmn1.pk7`).toString('utf8');
      const downloadRes = await agent.get(`/api/v1/pokemon/${pk7Pokemon.id}/raw`).buffer()
        .expect(
          'Content-Disposition',
          `attachment; filename="${pk7Pokemon.nickname}-${pk7Pokemon.id}.pk7"`
        );
      expect(downloadRes.statusCode).to.equal(200);
      expect(downloadRes.body.toString('utf8')).to.equal(rawPk7);
    });
    it("only allows other users to download someone's public pokemon", async () => {
      const res = await otherAgent.get(`/api/v1/pokemon/${publicPkmn.id}/raw`).buffer();
      expect(res.statusCode).to.equal(200);
      const res2 = await otherAgent.get(`/api/v1/pokemon/${viewablePkmn.id}/raw`).buffer();
      expect(res.body.toString('utf8')).to.equal(rawPk6);
      expect(res2.statusCode).to.equal(403);
      const res3 = await otherAgent.get(`/api/v1/pokemon/${privatePkmn.id}/raw`).buffer();
      expect(res2.body.toString('utf8')).to.not.equal(rawPk6);
      expect(res3.statusCode).to.equal(403);
      expect(res3.body.toString('utf8')).to.not.equal(rawPk6);
    });
    it('only allows an unauthenticated user to download a public pokemon', async () => {
      const res = await noAuthAgent.get(`/api/v1/pokemon/${publicPkmn.id}/raw`).buffer();
      expect(res.statusCode).to.equal(200);
      const res2 = await noAuthAgent.get(`/api/v1/pokemon/${viewablePkmn.id}/raw`).buffer();
      expect(res.body.toString('utf8')).to.equal(rawPk6);
      expect(res2.statusCode).to.equal(403);
      const res3 = await noAuthAgent.get(`/api/v1/pokemon/${privatePkmn.id}/raw`).buffer();
      expect(res2.body.toString('utf8')).to.not.equal(rawPk6);
      expect(res3.statusCode).to.equal(403);
      expect(res3.body.toString('utf8')).to.not.equal(rawPk6);
    });
    it('allows an admin to download any pokemon, regardless of visibility', async () => {
      const res = await adminAgent.get(`/api/v1/pokemon/${publicPkmn.id}/raw`).buffer();
      expect(res.statusCode).to.equal(200);
      const res2 = await adminAgent.get(`/api/v1/pokemon/${viewablePkmn.id}/raw`).buffer();
      expect(res.body.toString('utf8')).to.equal(rawPk6);
      expect(res2.statusCode).to.equal(200);
      const res3 = await adminAgent.get(`/api/v1/pokemon/${privatePkmn.id}/raw`).buffer();
      expect(res2.body.toString('utf8')).to.equal(rawPk6);
      expect(res3.statusCode).to.equal(200);
      expect(res3.body.toString('utf8')).to.equal(rawPk6);
    });
    it('increases the download count with downloads by third parties', async () => {
      const initialCount = (await agent.get(`/api/v1/pokemon/${publicPkmn.id}`)).body.downloadCount;
      await otherAgent.get(`/api/v1/pokemon/${publicPkmn.id}/raw`).buffer();
      await Promise.delay(500);
      const newCount = (await agent.get(`/api/v1/pokemon/${publicPkmn.id}`)).body.downloadCount;
      expect(newCount).to.equal(initialCount + 1);
    });
    it('increases the download count with downloads by unauthenticated users', async () => {
      const initialCount = (await agent.get(`/api/v1/pokemon/${publicPkmn.id}`)).body.downloadCount;
      await noAuthAgent.get(`/api/v1/pokemon/${publicPkmn.id}/raw`).buffer();
      await Promise.delay(500);
      const newCount = (await agent.get(`/api/v1/pokemon/${publicPkmn.id}`)).body.downloadCount;
      expect(newCount).to.equal(initialCount + 1);
    });
    it("does not increase the download count with downloads by a pokemon's owner", async () => {
      const initialCount = (await agent.get(`/api/v1/pokemon/${publicPkmn.id}`)).body.downloadCount;
      await agent.get(`/api/v1/pokemon/${publicPkmn.id}/raw`).buffer();
      await Promise.delay(500);
      const newCount = (await agent.get(`/api/v1/pokemon/${publicPkmn.id}`)).body.downloadCount;
      expect(newCount).to.equal(initialCount);
    });
    it('increases the download count on admin downloads, only for public pokemon', async () => {
      const initialPublicCount = (
        await agent.get(`/api/v1/pokemon/${publicPkmn.id}`)
      ).body.downloadCount;
      const initialviewableCount = (
        await agent.get(`/api/v1/pokemon/${viewablePkmn.id}`)
      ).body.downloadCount;
      const initialPrivateCount = (
        await agent.get(`/api/v1/pokemon/${privatePkmn.id}`)
      ).body.downloadCount;
      await adminAgent.get(`/api/v1/pokemon/${publicPkmn.id}/raw`).buffer();
      await adminAgent.get(`/api/v1/pokemon/${viewablePkmn.id}/raw`).buffer();
      await adminAgent.get(`/api/v1/pokemon/${privatePkmn.id}/raw`).buffer();
      await Promise.delay(500);
      const finalPublicCount = (
        await agent.get(`/api/v1/pokemon/${publicPkmn.id}`)
      ).body.downloadCount;
      const finalviewableCount = (
        await agent.get(`/api/v1/pokemon/${viewablePkmn.id}`)
      ).body.downloadCount;
      const finalPrivateCount = (
        await agent.get(`/api/v1/pokemon/${privatePkmn.id}`)
      ).body.downloadCount;
      expect(finalPublicCount).to.equal(initialPublicCount + 1);
      expect(finalviewableCount).to.equal(initialviewableCount);
      expect(finalPrivateCount).to.equal(initialPrivateCount);
    });
    it('escapes special characters in nicknames correctly', async () => {
      await sails.models.pokemon.update({id: publicPkmn.id}, {nickname: '\r\né∫ab;"\''});
      const res = await agent.get(`/api/v1/pokemon/${publicPkmn.id}/raw`).buffer();
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-disposition']).to.equal(
        `attachment; filename="??é?ab;\\"'-${publicPkmn.id}.pk6"; ` +
        `filename*=UTF-8''%0D%0A%C3%A9%E2%88%ABab%3B%22%27-${publicPkmn.id}.pk6`
      );
    });
  });
  describe('moving a pokemon', () => {
    let pkmn, pkmn2, pkmn3, pkmn4, pkmn5, pkmn6, someoneElsesPkmn, box1, box2, someoneElsesBox,
      unlistedBox, adminPkmn, adminBox, initialMaxBoxSize;
    // pkmn, pkmn2, and pkmn3 start out in box1
    // pkmn4, pkmn5, and pkmn6 start out in box2
    before(() => {
      initialMaxBoxSize = sails.services.constants.MAX_BOX_SIZE;
    });
    afterEach(() => {
      sails.services.constants.MAX_BOX_SIZE = initialMaxBoxSize;
    });
    beforeEach(async () => {
      box1 = (await agent.post('/api/v1/box').send({name: 'Shoebox'})).body;
      box2 = (await agent.post('/api/v1/box').send({name: 'Lunchbox'})).body;
      unlistedBox = (await agent.post('/api/v1/box').send({
        name: 'Breadbox',
        visibility: 'unlisted'
      })).body;
      pkmn = (await agent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('box', box1.id)).body;
      pkmn2 = (await agent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('box', box1.id)).body;
      pkmn3 = (await agent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('box', box1.id)).body;
      pkmn4 = (await agent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('box', box2.id)).body;
      pkmn5 = (await agent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('box', box2.id)).body;
      pkmn6 = (await agent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('box', box2.id)).body;
      someoneElsesBox = (await otherAgent.post('/api/v1/box').send({name: 'Mailbox'})).body;
      someoneElsesPkmn = (await otherAgent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('box', someoneElsesBox.id)).body;
      adminBox = (await adminAgent.post('/api/v1/box').send({name: 'Icebox'})).body;
      adminPkmn = (await adminAgent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('box', adminBox.id)).body;
    });
    it('allows a user to move their own pokemon to a different box', async () => {
      const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`).send({box: box2.id});
      expect(res.statusCode).to.equal(200);
      expect((await agent.get(`/api/v1/pokemon/${pkmn.id}`)).body.box).to.equal(box2.id);
      const updatedBox1 = (await agent.get(`/api/v1/box/${box1.id}`)).body;
      expect(_.map(updatedBox1.contents, 'id')).to.eql([pkmn2.id, pkmn3.id]);
      const updatedBox2 = (await agent.get(`/api/v1/box/${box2.id}`)).body;
      expect(_.map(updatedBox2.contents, 'id')).to.eql([pkmn4.id, pkmn5.id, pkmn6.id, pkmn.id]);
      expect(+new Date(updatedBox2.updatedAt)).to.be.above(+new Date(box2.updatedAt));
    });
    it('allows an index to be specified for the pokemon within the new box', async () => {
      const res = await agent.post(`/api/v1/pokemon/${pkmn2.id}/move`)
        .send({box: box2.id, index: 1});
      expect(res.statusCode).to.equal(200);
      expect((await agent.get(`/api/v1/pokemon/${pkmn2.id}`)).body.box).to.equal(box2.id);
      const updatedBox1 = (await agent.get(`/api/v1/box/${box1.id}`)).body;
      expect(_.map(updatedBox1.contents, 'id')).to.eql([pkmn.id, pkmn3.id]);
      const updatedBox2 = (await agent.get(`/api/v1/box/${box2.id}`)).body;
      expect(_.map(updatedBox2.contents, 'id')).to.eql([pkmn4.id, pkmn2.id, pkmn5.id, pkmn6.id]);
    });
    it('allows a pokemon to be relocated within its original box', async () => {
      const res = await agent.post(`/api/v1/pokemon/${pkmn3.id}/move`)
        .send({box: box1.id, index: 1});
      expect(res.statusCode).to.equal(200);
      const updatedBox1 = (await agent.get(`/api/v1/box/${box1.id}`)).body;
      expect(_.map(updatedBox1.contents, 'id')).to.eql([pkmn.id, pkmn3.id, pkmn2.id]);
    });
    it('allows a pokemon to be moved to a later slot in its own box', async () => {
      const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`)
        .send({box: box1.id, index: 1});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box1.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(_.map(res2.body.contents, 'id')).to.eql([pkmn2.id, pkmn.id, pkmn3.id]);

      const res3 = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`)
        .send({box: box1.id, index: 2});
      expect(res3.statusCode).to.equal(200);
      const res4 = await agent.get(`/api/v1/box/${box1.id}`);
      expect(res4.statusCode).to.equal(200);
      expect(_.map(res4.body.contents, 'id')).to.eql([pkmn2.id, pkmn3.id, pkmn.id]);
    });
    it('defaults to the last slot of the box if an index is not provided', async () => {
      const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`).send({box: box1.id});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box1.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(_.map(res2.body.contents, 'id')).to.eql([pkmn2.id, pkmn3.id, pkmn.id]);
    });
    it('returns a 400 error if the length is out of range due to offsetting', async () => {
      const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`)
        .send({box: box1.id, index: 3});
      expect(res.statusCode).to.equal(400);
      const res2 = await agent.get(`/api/v1/box/${box1.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(_.map(res2.body.contents, 'id')).to.eql([pkmn.id, pkmn2.id, pkmn3.id]);
    });
    it('allows index to equal the box length if the pkmn is moved to a different box', async () => {
      const res = await agent.post(`/api/v1/pokemon/${pkmn4.id}/move`)
        .send({box: box1.id, index: 3});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box1.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(_.map(res2.body.contents, 'id')).to.eql([pkmn.id, pkmn2.id, pkmn3.id, pkmn4.id]);
    });
    it('does not take deleted IDs into account when moving by index', async () => {
      const res = await agent.del(`/api/v1/pokemon/${pkmn2.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.get(`/api/v1/box/${box1.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(_.map(res2.body.contents, 'id')).to.eql([pkmn.id, pkmn3.id]);
      const res3 = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`)
        .send({box: box1.id, index: 1});
      expect(res3.statusCode).to.equal(200);
      const res4 = await agent.get(`/api/v1/box/${box1.id}`);
      expect(res4.statusCode).to.equal(200);
      expect(_.map(res4.body.contents, 'id')).to.eql([pkmn3.id, pkmn.id]);
    });
    it('returns a 400 error if the provided index is too large due to deletion', async () => {
      const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`)
        .send({box: box1.id, index: 2});
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/box/${box1.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(_.map(res2.body.contents, 'id')).to.eql([pkmn2.id, pkmn3.id, pkmn.id]);
      const res3 = await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(res3.statusCode).to.equal(202);
      const res4 = await agent.get(`/api/v1/box/${box1.id}`);
      expect(res4.statusCode).to.equal(200);
      expect(_.map(res4.body.contents, 'id')).to.eql([pkmn2.id, pkmn3.id]);
      const res5 = await agent.post(`/api/v1/pokemon/${pkmn2.id}/move`)
        .send({box: box1.id, index: 2});
      expect(res5.statusCode).to.equal(400);
    });
    it("does not allow a third party to move someone's else pokemon", async () => {
      const res = await otherAgent.post(`/api/v1/pokemon/${pkmn.id}/move`)
        .send({box: someoneElsesBox.id});
      expect(res.statusCode).to.equal(403);
      const res2 = await otherAgent.post(`/api/v1/pokemon/${pkmn.id}/move`).send({box: box2.id});
      expect(res2.statusCode).to.equal(403);
    });
    it("does not allow a third party to move their pokemon into someone else's box", async () => {
      const res = await otherAgent.post(`/api/v1/pokemon/${someoneElsesPkmn.id}/move`).send({
        box: box1.id
      });
      expect(res.statusCode).to.equal(403);
    });
    it("allows an admin to move someone else's pokemon to another one of their boxes", async () => {
      const res = await adminAgent.post(`/api/v1/pokemon/${pkmn.id}/move`)
        .send({box: box2.id, index: 0});
      expect(res.statusCode).to.equal(200);
      const updatedBox1 = (await agent.get(`/api/v1/box/${box1.id}`)).body;
      const updatedBox2 = (await agent.get(`/api/v1/box/${box2.id}`)).body;
      expect(_.map(updatedBox1.contents, 'id')).to.eql([pkmn2.id, pkmn3.id]);
      expect(_.map(updatedBox2.contents, 'id')).to.eql([pkmn.id, pkmn4.id, pkmn5.id, pkmn6.id]);
      const updatedPkmn = (await agent.get(`/api/v1/pokemon/${pkmn.id}`)).body;
      expect(updatedPkmn.box).to.equal(box2.id);
    });
    it("does not allow an admin to move one user's pokemon to a different user's box", async () => {
      const res = await adminAgent.post(`/api/v1/pokemon/${pkmn.id}/move`)
        .send({box: someoneElsesBox.id});
      expect(res.statusCode).to.equal(403);
    });
    it("does not allow an admin to move their own pokemon to someone else's box", async () => {
      const res = await adminAgent.post(`/api/v1/pokemon/${adminPkmn.id}/move`)
        .send({box: box2.id});
      expect(res.statusCode).to.equal(403);
    });
    it("does not allow an admin to move someone else's pokemon into the admin's box", async () => {
      const res = await adminAgent.post(`/api/v1/pokemon/${pkmn.id}/move`).send({box: adminBox.id});
      expect(res.statusCode).to.equal(403);
    });
    it('returns a 404 error if an invalid pokemon ID is included', async () => {
      expect(
        (await agent.post('/api/v1/pokemon/aaa/move').send({box: box2.id})).statusCode
      ).to.equal(404);
    });
    it('returns a 404 error if an invalid box ID is included', async () => {
      expect((
        await agent.post(`/api/v1/pokemon/${pkmn.id}/move`).send({box: 'a'})
      ).statusCode).to.equal(404);
    });
    it('returns a 400 error if no box ID is included', async () => {
      expect((await agent.post(`/api/v1/pokemon/${pkmn.id}/move`)).statusCode).to.equal(400);
    });
    it('returns a 400 error if the provided index is invalid', () => {
      const invalidIndices = [
        -1, // negative
        5, // larger than box length
        '2', // not an integer
        1.5, // not an integer
        [], // not an integer
        null // not an integer
      ];
      return Promise.each(invalidIndices, async index => {
        const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`).send({box: box2.id, index});
        const res2 = await agent.get(`/api/v1/box/${box1.id}`);
        const res3 = await agent.get(`/api/v1/box/${box2.id}`);
        expect(res2.statusCode).to.equal(200);
        expect(res3.statusCode).to.equal(200);
        expect(_.map(res2.body.contents, 'id')).to.eql([pkmn.id, pkmn2.id, pkmn3.id]);
        expect(_.map(res3.body.contents, 'id')).to.eql([pkmn4.id, pkmn5.id, pkmn6.id]);
        expect(res.statusCode).to.equal(400);
      });
    });
    it("does not allow a pokemon to be moved if it's marked for deletion", async () => {
      const res = await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`).send({box: box2.id});
      expect(res2.statusCode).to.equal(404);
    });
    it("does not allow a pokemon to be moved to a box that's marked for deletion", async () => {
      const res = await agent.del(`/api/v1/box/${box2.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`).send({box: box2.id});
      expect(res2.statusCode).to.equal(404);
    });
    it('does not allow a pokemon to be moved to a box at max capacity', async () => {
      sails.services.constants.MAX_BOX_SIZE = 3;
      const res = await agent.post(`/api/v1/pokemon/${pkmn4.id}/move`).send({box: box1.id});
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Cannot move a Pokémon to a maximum-capacity box');
    });
    it("stops showing a pokemon's box if it is moved to an unlisted box", async () => {
      const initialResponse = await otherAgent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(initialResponse.statusCode).to.equal(200);
      expect(initialResponse.body.box).to.equal(box1.id);
      const res = await agent.post(`/api/v1/pokemon/${pkmn.id}/move`).send({box: unlistedBox.id});
      expect(res.statusCode).to.equal(200);
      const finalResponse = await otherAgent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(finalResponse.statusCode).to.equal(200);
      expect(finalResponse.body.box).to.not.exist();
    });
  });
  describe("editing a pokemon's visibility and notes", () => {
    let pkmn;
    beforeEach(async () => {
      const res = await agent.post('/api/v1/pokemon')
        .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`)
        .field('visibility', 'viewable')
        .field('box', generalPurposeBox);
      expect(res.statusCode).to.equal(201);
      pkmn = res.body;
    });
    it("allows a user to edit their pokemon's visibility", async () => {
      const res = await agent.patch(`/api/v1/pokemon/${pkmn.id}`).send({
        visibility: 'private',
        publicNotes: 'public things',
        privateNotes: 'private things'
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.visibility).to.equal('private');
      expect(res2.body.publicNotes).to.equal('public things');
      expect(res2.body.privateNotes).to.equal('private things');
    });
    it('returns a 400 error if no valid parameters are specified', async () => {
      const res = await agent.patch(`/api/v1/pokemon/${pkmn.id}`).send({owner: 'AAAAA'});
      expect(res.statusCode).to.equal(400);
    });
    it('returns a 404 error if given an invalid pokemon id', async () => {
      const res = await agent.patch('/api/v1/pokemon/invalidpokemonid')
        .send({visibility: 'private'});
      expect(res.statusCode).to.equal(404);
    });
    it("does not allow a user to edit another user's pokemon's visibility", async () => {
      const res = await otherAgent.patch(`/api/v1/pokemon/${pkmn.id}`)
        .send({visibility: 'private'});
      expect(res.statusCode).to.equal(403);
    });
    it("allows an admin to edit a pokemon's info", async () => {
      const res = await adminAgent.patch(`/api/v1/pokemon/${pkmn.id}`).send({
        visibility: 'private',
        publicNotes: 'foo'
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.visibility).to.equal('private');
      expect(res2.body.publicNotes).to.equal('foo');
    });
    it('does not allow a deleted pokemon to be edited', async () => {
      const res = await agent.del(`/api/v1/pokemon/${pkmn.id}`);
      expect(res.statusCode).to.equal(202);
      const res2 = await agent.patch(`/api/v1/pokemon/${pkmn.id}`).send({visibility: 'private'});
      expect(res2.statusCode).to.equal(404);
    });
    it('returns a 400 error if the given visibility is invalid', async () => {
      const res = await agent.patch(`/api/v1/pokemon/${pkmn.id}`).send({
        visibility: 'foo',
        publicNotes: 'bar',
        privateNotes: 'baz'
      });
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Invalid Pokémon visibility');
    });
    it('returns a 400 error if the given public notes are too long', async () => {
      const res = await agent.patch(`/api/v1/pokemon/${pkmn.id}`).send({
        publicNotes: 'A'.repeat(3000)
      });
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Public notes too long');
    });
    it('returns a 400 error if the given private notes are too long', async () => {
      const res = await agent.patch(`/api/v1/pokemon/${pkmn.id}`).send({
        privateNotes: 'A'.repeat(3000)
      });
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Private notes too long');
    });
    it('returns a 400 error if the given public notes are invalid', async () => {
      const res = await agent.patch(`/api/v1/pokemon/${pkmn.id}`).send({publicNotes: 5});
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Invalid publicNotes');
    });
    it('returns a 400 error if the given private notes are invalid', async () => {
      const res = await agent.patch(`/api/v1/pokemon/${pkmn.id}`).send({privateNotes: 5});
      expect(res.statusCode).to.equal(400);
      expect(res.body).to.equal('Invalid privateNotes');
    });
    it('does not modify other fields if only some fields are specified', async () => {
      const res = await agent.patch(`/api/v1/pokemon/${pkmn.id}`).send({
        visibility: 'private',
        publicNotes: 'foo',
        privateNotes: 'bar'
      });
      expect(res.statusCode).to.equal(200);
      const res2 = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res2.statusCode).to.equal(200);
      expect(res2.body.visibility).to.equal('private');
      expect(res2.body.publicNotes).to.equal('foo');
      expect(res2.body.privateNotes).to.equal('bar');

      const res3 = await agent.patch(`/api/v1/pokemon/${pkmn.id}`).send({publicNotes: 'baz'});
      expect(res3.statusCode).to.equal(200);
      const res4 = await agent.get(`/api/v1/pokemon/${pkmn.id}`);
      expect(res4.statusCode).to.equal(200);
      expect(res4.body.visibility).to.equal('private');
      expect(res4.body.publicNotes).to.equal('baz');
      expect(res4.body.privateNotes).to.equal('bar');
    });
  });

  describe('getting a list of clones of a Pokémon', () => {
    let pkmnList, unlistedBox, pageSize;
    before(async function () {
      this.timeout(20000);
      const res = await agent.post('/api/v1/box').send({name: 'Boxball', visibility: 'unlisted'});
      expect(res.statusCode).to.equal(201);
      unlistedBox = res.body.id;

      const maxMultiUploadSize = sails.services.constants.MAX_MULTI_UPLOAD_SIZE;
      pkmnList = [];
      for (let i = 0; i < maxMultiUploadSize * 2; i++) {
        const res = await agent.post('/api/v1/pokemon')
          .field('box', generalPurposeBox)
          // (this just creates a good mix of visibilities)
          .field('visibility', ['public', 'private', 'viewable'][i % 3])
          .attach('pk6', `${__dirname}/pk6/porygon.pk6`);
        expect(res.statusCode).to.equal(201);
        pkmnList.unshift(res.body);
      }
      pageSize = sails.services.constants.CLONES_LIST_PAGE_SIZE;
    });
    it('returns a list of clones sorted by upload date', async () => {
      const res = await agent.get(`/api/v1/pokemon/${pkmnList[1].id}/clones`);
      expect(res.statusCode).to.equal(200);
      // response format: { contents: [ { pkmn1 }, { pkmn2 }, { pkmn3 }, ]} ...
      // The outer object with `contents` is used so that we can add metadata later if we want to
      expect(res.body.contents).to.be.an.instanceof(Array);
      expect(res.body.contents.length).to.equal(pageSize);
      expect(_.map(res.body.contents, 'id')).to.eql(
        _.map([pkmnList[0]].concat(pkmnList.slice(2, pageSize + 1)), 'id')
      );
    });
    it('returns a 404 error if a Pokémon with the given id does not exist', async () => {
      const res = await agent.get(`/api/v1/pokemon/${pkmnList[1].id}aaaaaa/clones`);
      expect(res.statusCode).to.equal(404);
    });
    it('returns a 403 error if the Pokémon is private and the user is not the owner', async () => {
      const privateId = pkmnList.find(pkmn => pkmn.visibility === 'private').id;
      const res = await otherAgent.get(`/api/v1/pokemon/${privateId}/clones`);
      expect(res.statusCode).to.equal(403);
    });
    it('returns a 403 error for an unauthenticated user if the Pokémon is private', async () => {
      const privateId = pkmnList.find(pkmn => pkmn.visibility === 'private').id;
      const res = await noAuthAgent.get(`/api/v1/pokemon/${privateId}/clones`);
      expect(res.statusCode).to.equal(403);
    });
    it("doesn't return an error if the Pokémon is private and the user is the owner", async () => {
      const privateId = pkmnList.find(pkmn => pkmn.visibility === 'private').id;
      const res = await agent.get(`/api/v1/pokemon/${privateId}/clones`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.contents).to.be.an.instanceof(Array);
      expect(_.map(res.body.contents, 'id')).to.eql(
        _.map(_.reject(pkmnList.slice(0, pageSize + 1), pkmn => pkmn.id === privateId), 'id')
      );
    });
    it('does not return an error if the Pokémon is private and the user is an admin', async () => {
      const privateId = pkmnList.find(pkmn => pkmn.visibility === 'private').id;
      const res = await adminAgent.get(`/api/v1/pokemon/${privateId}/clones`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.page).to.equal(1);
      expect(res.body.pageSize).to.equal(sails.services.constants.CLONES_LIST_PAGE_SIZE);
      expect(res.body.contents).to.be.an.instanceof(Array);
      expect(res.body.contents).to.eql(
        _.reject(pkmnList.slice(0, pageSize + 1), {id: privateId})
          .map(pkmn => _.omit(pkmn, 'isUnique'))
      );
    });
    it('returns `null` in place of private Pokémon to indicate their existence', async () => {
      const res = await otherAgent.get(`/api/v1/pokemon/${_.last(pkmnList).id}/clones`);
      expect(res.statusCode).to.equal(200);
      expect(res.body.page).to.equal(1);
      expect(res.body.pageSize).to.equal(sails.services.constants.CLONES_LIST_PAGE_SIZE);
      _.forEach(res.body.contents.slice(0, pageSize), (clone, index) => {
        if (pkmnList[index].visibility === 'private') {
          expect(clone).to.be.null();
        } else {
          expect(clone.id).to.equal(pkmnList[index].id);
          expect(clone.pid).to.equal(
            clone.visibility === 'public' ? pkmnList[index].pid : undefined
          );
          expect(clone.box).to.be.undefined();
          expect(clone.speciesName).to.exist();
        }
      });
    });
    describe('unlisted pokemon', () => {
      let clone1, clone2;
      before(async () => {
        const res = await agent.post('/api/v1/pokemon')
          .field('box', generalPurposeBox)
          .field('visibility', 'viewable')
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
        const res2 = await agent.post('/api/v1/pokemon')
          .field('box', unlistedBox)
          .field('visibility', 'viewable')
          .attach('pk6', `${__dirname}/pk6/pkmn1.pk6`);
        expect(res.statusCode).to.equal(201);
        expect(res2.statusCode).to.equal(201);
        clone1 = res.body;
        clone2 = res2.body;
      });
      it('filters clone list based on box visibility', async () => {
        const res = await otherAgent.get(`/api/v1/pokemon/${clone1.id}/clones`);
        expect(res.body.contents[0]).to.be.null();
      });
      it('displays unlisted pokemon to their owner in a clone list', async () => {
        const res = await agent.get(`/api/v1/pokemon/${clone1.id}/clones`);
        expect(res.body.contents[0].id).to.eql(clone2.id);
      });
      it('displays unlisted pokemon to admins in a clone list', async () => {
        const res = await adminAgent.get(`/api/v1/pokemon/${clone1.id}/clones`);
        expect(res.body.contents[0].id).to.eql(clone2.id);
      });
      it('does not display unlisted pokemon to unauthenticated users in a clone list', async () => {
        const res = await noAuthAgent.get(`/api/v1/pokemon/${clone1.id}/clones`);
        expect(res.body.contents[0]).to.be.null();
      });
    });
    it('allows a `pokemonFields` query parameter, filtering responses correctly', async () => {
      const res = await agent.get(`/api/v1/pokemon/${pkmnList[0].id}/clones`)
        .query({pokemonFields: 'speciesName'});
      expect(res.statusCode).to.equal(200);
      expect(res.body.contents).to.eql(_.times(pageSize, () => ({speciesName: 'Porygon'})));
      expect(res.body.page).to.equal(1);
      expect(res.body.pageSize).to.equal(sails.services.constants.CLONES_LIST_PAGE_SIZE);
    });
    it('does not return private information from `pokemonFields` queries', async () => {
      const res = await otherAgent.get(`/api/v1/pokemon/${pkmnList[0].id}/clones`)
        .query({pokemonFields: 'pid'});
      expect(res.statusCode).to.equal(200);
      expect(res.body.contents).to.eql(pkmnList.slice(1, pageSize + 1).map(pkmn => {
        return pkmn.visibility === 'public'
          ? {pid: pkmn.pid}
          : pkmn.visibility === 'private'
            ? null
            : {};
      }));
    });
    it('allows a further items to be returned with a `page` parameter', async () => {
      const res = await agent.get(`/api/v1/pokemon/${pkmnList[0].id}/clones`).query({page: 2});
      expect(res.statusCode).to.equal(200);
      expect(_.map(res.body.contents, 'id')).to.eql(
        _.map(pkmnList.slice(pageSize + 1, 2 * pageSize + 1), 'id')
      );
      expect(res.body.page).to.equal(2);
      expect(res.body.pageSize).to.equal(sails.services.constants.CLONES_LIST_PAGE_SIZE);

      const res2 = await otherAgent.get(`/api/v1/pokemon/${pkmnList[0].id}/clones`)
        .query({page: 2});
      expect(res2.statusCode).to.equal(200);
      expect(_.map(res2.body.contents, 'id')).to.eql(pkmnList
        .slice(pageSize + 1, 2 * pageSize + 1)
        .map(pkmn => pkmn.visibility === 'private' ? undefined : pkmn.id)
      );
      expect(res.body.page).to.equal(2);
      expect(res.body.pageSize).to.equal(sails.services.constants.CLONES_LIST_PAGE_SIZE);
    });
    it('returns a response with an empty array if the `page` parameter is too large', async () => {
      const res = await agent.get(`/api/v1/pokemon/${pkmnList[0].id}/clones`).query({page: 10});
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.eql({
        contents: [],
        page: 10,
        pageSize: sails.services.constants.CLONES_LIST_PAGE_SIZE
      });
    });
    it('returns a 400 error if the page is not an integer', async () => {
      const res = await agent.get(`/api/v1/pokemon/${pkmnList[0].id}/clones`).query({page: 'foo'});
      expect(res.statusCode).to.equal(400);
    });
  });
});
