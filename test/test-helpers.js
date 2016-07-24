const supertest = require('supertest-as-promised');
const defaults = require('superagent-defaults');
const expect = require('chai').use(require('dirty-chai')).expect;

module.exports = {
  getAgent () {
    const agent = defaults(supertest.agent(sails.hooks.http.app));
    return agent.get('/csrfToken').then(res => {
      expect(res.statusCode).to.equal(200);
      agent.set('x-csrf-token', res.body._csrf);
      /* Due to a quirk in how supertest-as-promised and superagent-defaults work together, a `.then` method gets attached
      to the agent. We don't want the agent to be treated as a thenable when returning from this function, so just get rid of
      the .then function. */
      agent.then = undefined;
    }).return(agent);
  }
};
