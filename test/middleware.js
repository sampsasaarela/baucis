var expect = require('expect.js');
var mongoose = require('mongoose');
var express = require('express');
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
var request = require('request');
var baucis = require('..');

var fixtures = require('./fixtures');

describe('Middleware', function () {
  before(fixtures.vegetable.init);
  beforeEach(fixtures.vegetable.create);
  after(fixtures.vegetable.deinit);

  it('should prevent resource from being loaded when block is set', function (done) {
    var options = {
      url : 'http://localhost:8012/api/vegetables/' + vegetables[0]._id,
      qs  : { block: true },
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response.statusCode).to.be(401);
      done();
    });
  });

  it('should allow resource to be loaded when block is not set', function (done) {
    var options = {
      url : 'http://localhost:8012/api/vegetables/' + vegetables[0]._id,
      qs  : { block: false },
      json: true
    };

    request.get(options, function (error, response, body) {
      if (error) return done(error);

      expect(response.statusCode).to.be(200);
      expect(body).to.have.property('name', 'Turnip');

      done();
    });
  });

  it('should allow query middleware to alter query', function (done) {
    var options = {
      url: 'http://localhost:8012/api/vegetables/' + vegetables[0]._id,
      qs: { testQuery: true },
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response.statusCode).to.be(200);
      expect(body).to.have.property('_id');
      expect(body).not.to.have.property('name');
      done();
    });
  });

  it('should allow custom stream handlers (IN)', function (done) {
    // should set all fields to a string
    var options = {
      url: 'http://localhost:8012/api/vegetables/',
      qs: { streamIn: true },
      json: { name: 'zoom' }
    };
    request.post(options, function (error, response, body) {
      if (error) return done(error);
      expect(response.statusCode).to.be(201);
      expect(body).to.have.property('_id');
      expect(body).to.have.property('name', 'boom');
      done();
    });
  });

  it('should skip streaming documents in if request.body is already present', function (done) {
    var options = {
      url: 'http://localhost:8012/api/vegetables/',
      qs: { parse: true },
      json: { name: 'zoom' }
    };
    request.post(options, function (error, response, body) {
      if (error) return done(error);
      expect(response.statusCode).to.be(201);
      expect(body).to.have.property('_id');
      expect(body).to.have.property('name', 'zoom');
      done();
    });
  });

  it('should allow custom stream handlers (OUT)', function (done) {
    // should set all fields to a string
    var options = {
      url: 'http://localhost:8012/api/vegetables/',
      qs: { streamOut: true },
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response.statusCode).to.be(200);
      expect(body).to.have.property('length', 8);
      expect(body[0]).to.have.property('name', 'beam');
      expect(body[1]).to.have.property('name', 'beam');
      expect(body[2]).to.have.property('name', 'beam');
      done();
    });
  });

  // TODO decide if these pending tests are needed
  it('should prevent mixing streaming and documents middleware (maybe)');
  it('should allow streaming out into request.baucis.documents');//, function (done) {
  //   // should set all fields to a string
  //   var options = {
  //     url: 'http://localhost:8012/api/vegetables/',
  //     qs: { streamToArray: true },
  //     json: true
  //   };
  //   request.get(options, function (error, response, body) {
  //     if (error) return done(error);
  //     expect(response.statusCode).to.be(201);
  //     expect(body).to.have.property('length', 8);
  //     expect(body[0]).to.have.property('name', 'beam');
  //     expect(body[1]).to.have.property('name', 'beam');
  //     expect(body[2]).to.have.property('name', 'beam');
  //     done();
  //   });
  // });

  it('should 404 if request.baucis.documents is undefined, null, or 0');//, function (done) {
  //       // should set all fields to a string
  //   var options = {
  //     url: 'http://localhost:8012/api/vegetables/',
  //     qs: { emptyIt: true },
  //     json: true
  //   };
  //   request.get(options, function (error, response, body) {
  //     if (error) return done(error);
  //     console.log(body)
  //     expect(response.statusCode).to.be(404);
  //     done();
  //   });
  // });

  it('should skip streaming documents out if request.baucis.documents is present');//, function (done) {
  //   var options = {
  //     url: 'http://localhost:8012/api/vegetables/',
  //     qs: { creamIt: true },
  //     json: true
  //   };
  //   request.get(options, function (error, response, body) {
  //     if (error) return done(error);
  //     expect(response.statusCode).to.be(200);
  //     expect(body).to.be('Devonshire Clotted Cream.');
  //     done();
  //   });
  // });

});
