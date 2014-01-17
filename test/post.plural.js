var expect = require('expect.js');
var request = require('request');
var baucis = require('..');

var fixtures = require('./fixtures');

describe('POST plural', function () {
  before(fixtures.vegetable.init);
  beforeEach(fixtures.vegetable.create);
  after(fixtures.vegetable.deinit);

  it('should create a new object and return its ID (JSON)', function (done) {
    var options = {
      url: 'http://localhost:8012/api/vegetables/',
      json: { name: 'Tomato' }
    };
    request.post(options, function (error, response, body) {
      if (error) return done(error);

      expect(response.statusCode).to.equal(201);
      expect(body._id).not.to.be.empty();
      expect(response.headers.location).to.equal('/api/vegetables/' + body._id);

      var options = {
      	url: 'http://localhost:8012' + response.headers.location,
      	json: true
      };
      request.get(options, function (error, response, body) {
      	if (error) return done(error);
      	expect(response).to.have.property('statusCode', 200);
      	expect(body).to.have.property('name', 'Tomato');
      	done();
      });
    });
  });

  it('should create a new object and return its ID (form)', function (done) {
    var options = {
      url: 'http://localhost:8012/api/vegetables/',
      json: true,
      form: { name: 'Tepin Pepper' }
    };
    request.post(options, function (error, response, body) {
      if (error) return done(error);

      expect(response.statusCode).to.equal(201);
      expect(body._id).not.to.be.empty();
      expect(response.headers.location).to.equal('/api/vegetables/' + body._id);

      var options = {
        url: 'http://localhost:8012' + response.headers.location,
        json: true
      };
      request.get(options, function (error, response, body) {
        if (error) return done(error);
        expect(response).to.have.property('statusCode', 200);
        expect(body).to.have.property('name', 'Tepin Pepper');
        done();
      });
    });
  });

  it('should correctly set location header when there is no trailing slash', function (done) {
    var options = {
      url: 'http://localhost:8012/api/vegetables',
      json: { name: 'Tomato' }
    };
    request.post(options, function (error, response, body) {
      if (error) return done(error);

      expect(response.statusCode).to.equal(201);
      expect(body._id).not.to.be.empty();
      expect(response.headers.location).to.equal('/api/vegetables/' + body._id);

      done();
    });
  });

  it('should allow posting multiple documents at once', function (done) {
    var options = {
      url: 'http://localhost:8012/api/vegetables/',
      json: [{ name: 'Catnip' }, { name: 'Cattail'}]
    };
    request.post(options, function (error, response, body) {
      if (error) return done(error);

      expect(response.statusCode).to.equal(201);
      expect(body[0]._id).not.to.be.empty();
      expect(body[1]._id).not.to.be.empty();

      var options = {
        url: 'http://localhost:8012' + response.headers.location,
        json: true
      };
      request.get(options, function (error, response, body) {
        if (error) return done(error);
        expect(response).to.have.property('statusCode', 200);
        expect(body).to.have.property('length', 2);
        expect(body[0]).to.have.property('name', 'Catnip');
        expect(body[1]).to.have.property('name', 'Cattail');
        done();
      });
    });
  });

  it('should fire pre save Mongoose middleware', function (done) {
    fixtures.vegetable.saveCount = 0;

    var options = {
      url: 'http://localhost:8012/api/vegetables/',
      json: { name: 'Ground Cherry' }
    };
    request.post(options, function (error, response, body) {
      if (error) return done(error);

      expect(fixtures.vegetable.saveCount).to.be(1);
      done();
    });
  });

  it('should provide correct status and informative body for validation errors', function (done) {
    var options = {
      url: 'http://localhost:8012/api/vegetables/',
      json: { score: -1 }
    };
    request.post(options, function (error, response, body) {
      if (error) return done(error);

      expect(response).to.have.property('statusCode', 422);
      expect(body).to.have.property('name');
      expect(body.name).to.have.property('message', 'Path `name` is required.');
      expect(body.name).to.have.property('name', 'ValidatorError');
      expect(body.name).to.have.property('path', 'name');
      expect(body.name).to.have.property('type', 'required');
      expect(body).to.have.property('score');
      expect(body.score).to.have.property('message', 'Path `score` (-1) is less than minimum allowed value (1).');
      expect(body.score).to.have.property('name', 'ValidatorError');
      expect(body.score).to.have.property('path', 'score');
      expect(body.score).to.have.property('type', 'min');
      expect(body.score).to.have.property('value', -1);

      done();
    });
  });

});
