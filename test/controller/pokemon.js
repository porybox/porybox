const expect = require('chai').expect;
describe('pokemon handling', () => {
  let agent;
  before(done => {
    agent = require('supertest').agent(sails.hooks.http.app);
    agent.post('/auth/local/register')
      .send({username: 'pk6tester', password: '********', email: 'pk6tester@pk6testing.com'})
      .expect(302)
      .expect('location', '/', (err, res) => {
        agent.saveCookies(res);
        done(err);
      });
  });
  it('should be able to upload a pk6 file and receive a parsed version as a response', done => {
    agent.post('/uploadpk6')
      .attach('pk6', __dirname + '/example_pokemon1.pk6')
      .expect(201)
      .end((err, res) => {
        expect(res.body.dexNo).to.equal(279);
        expect(res.body.ownerUsername).to.equal('pk6tester');
        done(err);
      });
  });
  it('should identify uploaded things as clones', done => {
    agent.post('/uploadpk6')
    .attach('pk6', __dirname + '/example_pokemon2.pk6')
    .expect(201)
    .end((err, res) => {
      expect(res.body.__isUnique__).to.be.true;
      agent.post('/uploadpk6')
      .attach('pk6', __dirname + '/example_pokemon2.pk6')
      .expect(201)
      .end((err, res) => {
        expect(res.body.__isUnique__).to.be.false;
        done(err);
      });
    });
  });
});
