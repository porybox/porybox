'use strict';
const sails = require('sails');

before(function(done) {

  // Increase the Mocha timeout so that Sails has enough time to lift.
  this.timeout(10000);
  require('babel-register')();
  require('babel-polyfill');
  global.Promise = require('bluebird');

  sails.lift({
    environment: 'test',
    port: 1234,
    connections: {
      default: 'testDB',
      testDB: {
        adapter: 'sails-mongo',
        host: 'localhost',
        port: 27017,
        user: '',
        password: '',
        database: 'porybox-test'
      },
    },
    models: {
      connection: 'testDB',
      migrate: 'drop'
    },
    connection: 'testDB',
    paths: { public: 'client', views: 'client' }
  }, function(err, server) {
    if (err) return done(err);
    // here you can load fixtures, etc.
    done(err, sails);
  });
});

after(function(done) {
  // here you can clear fixtures, etc.
  sails.lower(done);
});
