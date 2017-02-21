const ctrlTest = require('./add.ctrl');
const sinon = require('sinon');
const Promise = require('bluebird');
const utils = require('../test/utils.js');
const MdToast = require('../test/mdtoast');
Promise.config({warnings: false});

describe('AddCtrl', () => {
  const errorHandler = {};
  const BOX_ID = 123;
  let $scope, io, tested, boxes, $mdToast, $mdDialog, $mdMedia, $location, box;
  beforeEach(inject(($controller) => {
    box = { data: { contents: [], id: BOX_ID} };
    $mdMedia = () => {};
    $mdToast = new MdToast();
    $location = { path: sinon.stub()};
    $mdDialog = { show: sinon.stub() };
    boxes = [];
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
      $mdToast.show.returns(utils.promise({}));
      return tested.box().then(() => {
        expect($mdToast.simple.called).to.equal(true);
        expect($mdToast.textContent.called).to.equal(true);
        expect($mdToast.textContent.args[0][0]).to.equal('Box \'name\' created successfully');
        expect($mdToast.show.called).to.equal(true);
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
      boxes.push({});
      $mdDialog.show.returns(utils.promise({name: 'name', description: 'description'}));
      io.socket.postAsync.returns(utils.promise({}));
      return tested.box().then(() => expect(boxes.length).to.equal(2));
    });
  });

  describe('controller.addPokemon', () => {
    it('calls io.socket.postAsync', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([]));
      return tested.pokemon().then(() => expect(io.socket.postAsync.called).to.equal(true));
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
        expect(simpleSpy.called).to.equal(true);
        expect(positionSpy.called).to.equal(true);
        expect(hideSpy.called).to.equal(true);
        expect(textContentSpy.called).to.equal(true);
        expect(textContentSpy.args[0][0]).to.equal('1 Pokémon uploaded successfully');
        expect(showSpy.called).to.equal(true);
      });
    });

    it('creates toast with correct number of successful', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: 1}},
        {success: true, created: {box: 1}}]));
      const textContentSpy = sinon.spy($mdToast, 'textContent');
      return tested.pokemon().then(() => {
        expect(textContentSpy.called).to.equal(true);
        expect(textContentSpy.args[0][0]).to.equal('2 Pokémon uploaded successfully');
      });
    });

    it('creates toast with correct number of unsuccessful', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: 1}},
        {success: false, created: {box: 1}}]));
      const textContentSpy = sinon.spy($mdToast, 'textContent');
      return tested.pokemon().then(() => {
        expect(textContentSpy.called).to.equal(true);
        expect(textContentSpy.args[0][0]).to.equal('1 Pokémon uploaded successfully (1 failed)');
      });
    });

    it('creates toast when none uploaded successfully', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: false, created: {box: 1}}]));
      const textContentSpy = sinon.spy($mdToast, 'textContent');
      return tested.pokemon().then(() => {
        expect(textContentSpy.called).to.equal(true);
        expect(textContentSpy.args[0][0]).to.equal('Upload failed; no Pokémon uploaded');
      });
    });

    it('creates toast with action if 1 successful', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: 1}}]));
      const actionSpy = sinon.spy($mdToast, 'action');
      return tested.pokemon().then(() => {
        expect(actionSpy.called).to.equal(true);
        expect(actionSpy.args[0][0]).to.equal('View');
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
      return tested.pokemon().delay(1).then(() => {
        expect(box.data.contents.length).to.equal(1);
      });
    });

    it('doesn\'t add pokemon to box if uploaded to different box', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: true, created: {box: BOX_ID + 1}}]));
      return tested.pokemon().delay(1).then(() => {
        expect(box.data.contents.length).to.equal(0);
      });
    });

    it('doesn\'t add pokemon to box if not uploaded', () => {
      $mdDialog.show.returns(utils.promise([{data: [{}]}]));
      io.socket.postAsync.returns(utils.promise([{success: false, created: {box: BOX_ID}}]));
      return tested.pokemon().delay(1).then(() => {
        expect(box.data.contents.length).to.equal(0);
      });
    });
  });
});
