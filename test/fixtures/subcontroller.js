var mongoose = require('mongoose');
var express = require('express');
var baucis = require('../..');
var config = require('./config');

var app;
var server;
var controller;
var subcontroller;

var fixture = module.exports = {
  init: function (done) {
    var Schema = mongoose.Schema;

    mongoose.connect(config.mongo.url);

    var User = new mongoose.Schema({ name: String });
    var Task = new mongoose.Schema({
      name: String,
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    });

    if (!mongoose.models['user']) mongoose.model('user', User);
    if (!mongoose.models['task']) mongoose.model('task', Task);

    var taskSubcontroller = baucis.rest({
      singular: 'task',
      basePath: '/:_id/tasks',
      publish: false
    });

    taskSubcontroller.query(function (request, response, next) {
      request.baucis.query.where('user', request.params._id);
      next();
    });

    taskSubcontroller.request(function (request, response, next) {
      if (request.baucis.controller === taskSubcontroller) return next();
      next(new Error('request.baucis.controller set incorrectly!'));
    });

    var userController = baucis.rest('user');

    userController.request(function (request, response, next) {
      if (request.baucis.controller === userController) return next();
      next(new Error('request.baucis.controller set incorrectly!'));
    });

    userController.use(taskSubcontroller);

    app = express();
    app.use('/api', baucis());

    server = app.listen(8012);

    done();
  },
  deinit: function (done) {
    server.close();
    mongoose.disconnect();
    done();
  },
  create: function (done) {
    // clear all first
    mongoose.model('user').remove({}, function (error) {
      if (error) return done(error);

      mongoose.model('task').remove({}, function (error) {
        if (error) return done(error);

        mongoose.model('user').create(
          ['Alice', 'Bob'].map(function (name) { return { name: name } }),
          function (error) {
            if (error) return done(error);

            mongoose.model('task').create(
              ['Mow the Lawn', 'Make the Bed', 'Darn the Socks'].map(function (name) { return { name: name } }),
              done
            );
          }
        );
      });
    });
  }
};
