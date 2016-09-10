'use strict';
const sails = require('sails');

before(function(done) {

  // Increase the Mocha timeout so that Sails has enough time to lift.
  this.timeout(10000);
  require('babel-register')();

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
      }
    },
    models: {
      connection: 'testDB',
      migrate: 'drop'
    },
    connection: 'testDB',
    paths: { public: 'client', views: 'client' },
    email: {
      transport: {
        host: 'localhost',
        port: 1235,
        ignoreTLS: true
      },
      sender: 'Porybox <no-reply@example.org>'
    },
    log: {level: 'debug'},
    hooks: {
      grunt: false
    }
  }, function(err) {
    if (err) return done(err);
    // here you can load fixtures, etc.
    done(err, sails);
  });
});

after(function(done) {
  // here you can clear fixtures, etc.
  sails.lower(done);
});
