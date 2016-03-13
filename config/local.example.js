/**
 * Example local.js file. Copy this to local.js and change the below settings
 * to connect to the database.
 *
 * NEVER change this file to your production details, as this could easily be
 * added back to git, and that's a big problem.
 */
module.exports = {

  port: 1337,

  connections: {
    default: 'mongo',
    mongo: {
      adapter: 'sails-mongo',
      host: 'localhost',
      port: 27017,
      user: '',
      password: '',
      database: 'porybox'
    }
  },

  session: {
    adapter: 'mongo',
    host: 'localhost',
    port: 27017,
    db: 'porybox',
    username: '',
    password: '',
    collection: 'sessions'
  }

};
