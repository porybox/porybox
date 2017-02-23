'use strict';
const sails = require('sails');
let mongoServerInstance;

before(function(done) {
  require('babel-register')();

  const MongoInMemory = require('mongo-in-memory');
  const port = 5544;
  mongoServerInstance = new MongoInMemory(port);

  mongoServerInstance.start((error) => {
    if (error) {
      throw error;
    }
    const mongouri = mongoServerInstance.getMongouri('test');

    sails.lift({
      environment: 'test',
      port: 1234,
      connections: {
        default: 'testDB',
        testDB: {
          adapter: 'sails-mongo',
          url: mongouri
        }
      },
      models: {
        connection: 'testDB',
        migrate: 'drop'
      },
      session: {
        url: mongouri
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
});

after(function(done) {
  mongoServerInstance.stop((error) => {
    if (error) {
      console.error(error);  // eslint-disable-line no-console
    }
  });
  sails.lower(done);
});
