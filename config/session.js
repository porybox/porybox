/**
 * Session Configuration
 * (sails.config.session)
 *
 * Sails session integration leans heavily on the great work already done by
 * Express, but also unifies Socket.io with the Connect session store. It uses
 * Connect's cookie parser to normalize configuration differences between Express
 * and Socket.io and hooks into Sails' middleware interpreter to allow you to access
 * and auto-save to `req.session` with Socket.io the same way you would with Express.
 *
 * For more information on configuring the session, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.session.html
 */

module.exports.session = {

  /***************************************************************************
  *                                                                          *
  * Session secret is automatically generated when your new app is created   *
  * Replace at your own risk in production-- you will invalidate the cookies *
  * of your users, forcing them to log in again.                             *
  *                                                                          *
  ***************************************************************************/
  secret: '1f27e8af10263b9e822e0a6ebeb4f888',

  cookie: {
    // 1000 years. The expiration date of the session must be a valid javascript Date, so `Infinity` doesn't work
    maxAge: 1000 * 365 * 24 * 60 * 60 * 1000
  },

  autoReconnect: true,


  adapter: 'connect-mongo',
  url: 'mongodb://localhost:27017/porybox',
  collection: 'sessions'

};
