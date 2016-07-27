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
    adapter: 'connect-mongo',
    url: 'mongodb://localhost:27017/porybox',
    // url: 'mongodb://username:pass@localhost:27017/porybox'
    collection: 'sessions'
  },

  email: {
    // By default, this will stub out all emails and not send them, but the server will otherwise function normally.
    // To connect to an actual SMTP server, uncomment the lines below and replace them with info on the SMTP server.
    //
    // transport: {
    //   host: 'smtp.example.org',
    //   port: 2525,
    //   auth: {
    //     user: 'foo@example.com',
    //     pass: 'hunter2'
    //   }
    // },
    // sender: 'Foo Bar <no-reply@example.com>'
  },

  // The URL that appears in emails from the site
  siteUrl: 'localhost:1337'
};
