/* eslint no-console: "off" */
const ctrlTest = require('./add.ctrl');
const sinon = require('sinon');
const Promise = require('bluebird');
const utils = require('../test/utils.js');
const MdToast = require('../test/mdtoast');
Promise.config({warnings: false});

describe('AddCtrl', () => {
  const errorHandler = (err) => err && console.log(err);
  const BOX_ID = 123;
  const BOX_ID2 = 1234;
  let $scope, io, tested, boxes, $mdToast, $mdDialog, $mdMedia, $location, box;
  beforeEach(inject(($controller) => {
    box = { data: { contents: [], id: BOX_ID} };
    $mdMedia = () => {};
    $mdToast = new MdToast();
    $location = { path: sinon.stub()};
    $mdDialog = { show: sinon.stub() };
    boxes = [box.data, { contents: [], id: BOX_ID2} ];
    $scope = {
      $apply: () => {},
      $watch: () => {}
    };
    io = require('../test/io')();
    tested = $controller(ctrlTest, {
      $location, $scope, io, $mdDialog, $mdMedia, $mdToast, errorHandler
    }, {boxes, selected: {selectedBox: box, onscroll: () => ({})}});
    tested.prefs = {defaultBoxVisibility: 'listed', defaultPokemonVisibility: 'private'};
    io.socket.postAsync = sinon.stub();
  }));

  describe('controller.addBox', () => {
    it('calls io.socket.postAsync', () => {
      $mdDialog.show.returns(utils.promise({name: 'name', description: 'description'}));
      io.socket.postAsync.returns(utils.promise({}));
      return tested.box().then(() => expect(io.socket.postAsync.called).to.equal(true));
    });

    it('creates toast to inform user of creation', () => {
      $mdDialog.show.returns(utils.promise({name: 'name', description: 'description'}));
      io.socket.postAsync.returns(utils.promise({name: 'name', description: 'description'}));
      $mdToast.simple = sinon.stub();
      $mdToast.position = sinon.stub();
      $mdToast.hideDelay = sinon.stub();
      $mdToast.textContent = sinon.stub();
      $mdToast.show = sinon.stub();
      $mdToast.simple.returns($mdToast);
      $mdToast.position.returns($mdToast);
      $mdToast.hideDelay.returns($mdToast);
      $mdToast.textContent.returns($mdToast);
      $mdToast.show.returns(utils.blankPromise());
      return tested.box().then(() => {
        expect($mdToast.simple.calledTwice).to.equal(true);
        expect($mdToast.position.calledTwice).to.equal(true);
        expect($mdToast.hideDelay.calledTwice).to.equal(true);
        expect($mdToast.textContent.calledTwice).to.equal(true);
        expect($mdToast.textContent.args[0][0]).to.equal('Creating box');
        expect($mdToast.show.calledTwice).to.equal(true);
      });
    });

    it('creates toast with box\'s new name', () => {
      $mdDialog.show.returns(utils.promise({name: 'name', description: 'description'}));
      io.socket.postAsync.returns(utils.promise({name: 'name', description: 'description'}));
      $mdToast.simple = sinon.stub();
      $mdToast.position = sinon.stub();
      $mdToast.hideDelay = sinon.stub();
      $mdToast.textContent = sinon.stub();
      $mdToast.show = sinon.stub();
      $mdToast.simple.returns($mdToast);
      $mdToast.position.returns($mdToast);
      $mdToast.hideDelay.returns($mdToast);
      $mdToast.textContent.returns($mdToast);
      $mdToast.show.returns(new Promise(() => {}));
      return tested.box().then(() => {
        expect($mdToast.simple.calledTwice).to.equal(true);
        expect($mdToast.position.calledTwice).to.equal(true);
        expect($mdToast.hideDelay.calledTwice).to.equal(true);
        expect($mdToast.textContent.calledTwice).to.equal(true);
        expect($mdToast.textContent.args[1][0]).to.equal('Box \'name\' created successfully');
        expect($mdToast.show.calledTwice).to.equal(true);
      });
    });

    it('redirects when toast is clicked', () => {
      $mdDialog.show.returns(utils.promise({name: 'name', description: 'description'}));
      io.socket.postAsync.returns(utils.promise({name: 'name', description: 'description'}));
      $mdToast.show = sinon.stub();
      $mdToast.show.returns(utils.promise('ok'));
      $location.path.returns(true);
      return tested.box().delay(1).then(() => {
        expect($location.path.called).to.equal(true);
      });
    });

    it('adds box to list of boxes', () => {
      expect(boxes.length).to.equal(2);
      $mdDialog.show.returns(utils.promise({name: 'name', description: 'description'}));
      io.socket.postAsync.returns(utils.promise({}));
      return tested.box().then(() => expect(boxes.length).to.equal(3));
    });
  });

  describe('controller.addPokemon', () => {
    it('calls io.socket.postAsync', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([]));
      return tested.pokemon().then(() => expect(io.socket.postAsync.called).to.equal(true));
    });

    it('creates toast to inform user of upload', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: 1}}]));
      const simpleSpy = sinon.spy($mdToast, 'simple');
      const positionSpy = sinon.spy($mdToast, 'position');
      const hideSpy = sinon.spy($mdToast, 'hideDelay');
      const textContentSpy = sinon.spy($mdToast, 'textContent');
      const showSpy = sinon.spy($mdToast, 'show');
      return tested.pokemon().then(() => {
        expect(simpleSpy.calledTwice).to.equal(true);
        expect(positionSpy.calledTwice).to.equal(true);
        expect(hideSpy.calledTwice).to.equal(true);
        expect(textContentSpy.calledTwice).to.equal(true);
        expect(textContentSpy.args[0][0]).to.equal('Uploading Pokémon');
        expect(showSpy.calledTwice).to.equal(true);
      });
    });

    it('creates toast with success message if all successful', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: 1}}]));
      const simpleSpy = sinon.spy($mdToast, 'simple');
      const positionSpy = sinon.spy($mdToast, 'position');
      const hideSpy = sinon.spy($mdToast, 'hideDelay');
      const textContentSpy = sinon.spy($mdToast, 'textContent');
      const showSpy = sinon.spy($mdToast, 'show');
      return tested.pokemon().then(() => {
        expect(simpleSpy.calledTwice).to.equal(true);
        expect(positionSpy.calledTwice).to.equal(true);
        expect(hideSpy.calledTwice).to.equal(true);
        expect(textContentSpy.calledTwice).to.equal(true);
        expect(textContentSpy.args[1][0]).to.equal('1 Pokémon uploaded successfully');
        expect(showSpy.calledTwice).to.equal(true);
      });
    });

    it('creates toast with correct number of successful', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: 1}},
        {success: true, created: {box: 1}}]));
      const textContentSpy = sinon.spy($mdToast, 'textContent');
      return tested.pokemon().then(() => {
        expect(textContentSpy.called).to.equal(true);
        expect(textContentSpy.args[1][0]).to.equal('2 Pokémon uploaded successfully');
      });
    });

    it('creates toast with correct number of unsuccessful', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: 1}},
        {success: false, created: {box: 1}}]));
      const textContentSpy = sinon.spy($mdToast, 'textContent');
      return tested.pokemon().then(() => {
        expect(textContentSpy.called).to.equal(true);
        expect(textContentSpy.args[1][0]).to.equal('1 Pokémon uploaded successfully (1 failed)');
      });
    });

    it('creates toast when none uploaded successfully', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: false, created: {box: 1}}]));
      const textContentSpy = sinon.spy($mdToast, 'textContent');
      return tested.pokemon().then(() => {
        expect(textContentSpy.called).to.equal(true);
        expect(textContentSpy.args[1][0]).to.equal('Upload failed; no Pokémon uploaded');
      });
    });

    it('creates toast with action if 1 successful', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: 1}}]));
      const actionSpy = sinon.spy($mdToast, 'action');
      return tested.pokemon().then(() => {
        expect(actionSpy.called).to.equal(true);
        expect(actionSpy.args[1][0]).to.equal('View');
      });
    });

    it('redirects when toast is clicked', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: 1}}]));
      $mdToast.show = sinon.stub();
      $mdToast.show.returns(utils.promise('ok'));
      $location.path.returns(true);
      return tested.pokemon().delay(1).then(() => {
        expect($location.path.called).to.equal(true);
      });
    });

    it('adds pokemon to box if uploaded to current box', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: BOX_ID}}]));
      return tested.pokemon().then(() => {
        expect(box.data.contents.length).to.equal(1);
      });
    });

    it('doesn\'t add pokemon to box if uploaded to different box', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: BOX_ID + 1}}]));
      return tested.pokemon().then(() => {
        expect(box.data.contents.length).to.equal(0);
      });
    });

    it('adds pokemon to correct box if uploaded to different box', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: BOX_ID2}}]));
      return tested.pokemon().then(() => {
        expect(boxes[1].contents.length).to.equal(1);
      });
    });

    it('doesn\'t add pokemon to box if not uploaded', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: false, created: {box: BOX_ID}}]));
      return tested.pokemon().then(() => {
        expect(box.data.contents.length).to.equal(0);
      });
    });
  });
});
