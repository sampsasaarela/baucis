var expect = require('expect.js');
var mongoose = require('mongoose');
var express = require('express');
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
var request = require('request');
var baucis = require('..');

var fixtures = require('./fixtures');

describe('Headers', function () {
  before(fixtures.vegetable.init);
  beforeEach(fixtures.vegetable.create);
  after(fixtures.vegetable.deinit);

  it('should set Last-Modified for single documents')
  it('should set Etag for single documents (?)')

  it('should set allowed', function (done) {
    var options = {
      url: 'http://localhost:8012/api/vegetables',
      json: true
    };
    request.head(options, function (err, response, body) {
      if (err) return done(err);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers).to.have.property('allow', 'HEAD,GET,POST,PUT,DELETE');
      done();
    });
  });

  it('should set accept', function (done) {
    var options = {
      url: 'http://localhost:8012/api/vegetables',
      json: true
    };
    request.head(options, function (err, response, body) {
      if (err) return done(err);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers).to.have.property('accept', 'application/json, application/x-www-form-urlencoded');
      done();
    });
  });

  it('should set X-Powered-By', function (done) {
    var options = {
      url: 'http://localhost:8012/api/vegetables',
      json: true
    };
    request.head(options, function (err, response, body) {
      if (err) return done(err);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers).to.have.property('x-powered-by', 'Baucis');
      done();
    });
  });

});
