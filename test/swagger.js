var expect = require('expect.js');
var mongoose = require('mongoose');
var express = require('express');
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
var request = require('request');
var baucis = require('..');
var parselinks = require('parse-links');

var fixtures = require('./fixtures');

describe('Swagger Resource Listing', function () {
  before(fixtures.vegetable.init);
  beforeEach(fixtures.vegetable.create);
  after(fixtures.vegetable.deinit);

  it('should not generate a listing by default', function (done) {
    var controller = baucis.rest('vegetable');
    var app = baucis();

    expect(app.routes.get).to.be(undefined);
    done();
  });

  it('should generate the correct listing', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/api-docs.json',
      json: true
    };
    request.get(options, function (err, response, body) {
      if (err) return done(err);

      expect(response).to.have.property('statusCode', 200);
      expect(response).to.have.property('statusCode', 200);
      expect(body).to.have.property('apiVersion', '0.0.1');
      expect(body).to.have.property('swaggerVersion', '1.1');
      expect(body).to.have.property('basePath', 'http://127.0.0.1/api/v1');
      expect(body).to.have.property('models');

      // Check the model
      expect(body.models).to.have.property('Vegetable');
      expect(body.models.Vegetable).to.have.property('id', 'Vegetable');
      expect(body.models.Vegetable).to.have.property('properties');
      expect(body.models.Vegetable.properties).to.have.property('name');
      expect(body.models.Vegetable.properties.name).to.have.property('type', 'string');
      expect(body.models.Vegetable.properties.name).to.have.property('required', true);
      expect(body.models.Vegetable.properties).to.have.property('_id');
      expect(body.models.Vegetable.properties._id).to.have.property('type', 'string');
      expect(body.models.Vegetable.properties._id).to.have.property('required', true);
      expect(body.models.Vegetable.properties).to.have.property('lastModified');
      expect(body.models.Vegetable.properties.lastModified).to.have.property('type', 'Date');
      expect(body.models.Vegetable.properties.lastModified).to.have.property('required', true);
      expect(body.models.Vegetable.properties).to.have.property('__v');
      expect(body.models.Vegetable.properties.__v).to.have.property('type', 'double');
      expect(body.models.Vegetable.properties.__v).to.have.property('required', false);
      expect(body.models.Vegetable.properties).not.to.have.property('diseases');

      // Check the API listing
      expect(body.apis).to.be.an(Array);
      expect(body.apis[0].path).to.be('/vegetables/{id}');
      expect(body.apis[1].path).to.be('/vegetables');
      expect(body.apis[0].operations).to.be.an(Array);
      expect(body.apis[1].operations).to.be.an(Array);
      expect(body.apis[0].operations).to.have.property('length', 4);
      expect(body.apis[1].operations).to.have.property('length', 4);
      // TODO more

      done();
    });
  });

});
