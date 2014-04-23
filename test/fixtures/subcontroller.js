var mongoose = require('mongoose');
var express = require('express');
var baucis = require('../..');
var es = require('event-stream');
var config = require('./config');

var app;
var server;

var User = new mongoose.Schema({
  name: String,
  tasks: [{ type: mongoose.Schema.ObjectId, ref: 'task' }]
});
var Task = new mongoose.Schema({
  name: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  comments: [{ type: mongoose.Schema.ObjectId, ref: 'comment' }]
});

var Comment = new mongoose.Schema({
  name: String,
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }
});

mongoose.model('user', User);
mongoose.model('task', Task);
mongoose.model('comment', Comment);

var fixture = module.exports = {
  init: function (done) {
    var Schema = mongoose.Schema;

    mongoose.connect(config.mongo.url);

    var users = baucis.rest('user');
    var tasks = users.vivify('tasks');
    var comment = tasks.vivify('comments');

    users.request(function (request, response, next) {
      if (request.baucis.controller === users) return next();
      next(new Error('request.baucis.controller set incorrectly!'));
    });

    tasks.request(function (request, response, next) {
      if (request.baucis.controller === tasks) return next();
      next(new Error('request.baucis.controller set incorrectly!'));
    });

    tasks.request(function (request, response, next) {
      request.baucis.outgoing(es.map(function (context, callback) {
        context.doc.name = 'middleware';
        callback(null, context);
      }));
      next();
    });

    comment.request(function (request, response, next) {
      request.baucis.outgoing(es.map(function (context, callback) {
        context.doc.name = 'middleware';
        callback(null, context);
      }));
      next();
    });

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

        mongoose.model('comment').remove({}, function (error) {
          if (error) return done(error);

          mongoose.model('user').create(
            ['Alice', 'Bob'].map(function (name) { return { name: name } }),
            function (error) {
              if (error) return done(error);

              var users = arguments.length-1;
              for (var i=1; i<arguments.length; ++i) {
                var user = arguments[i];
                mongoose.model('task').create(
                  ['Mow the Lawn', 'Make the Bed', 'Darn the Socks'].map(function (name) { return { name: name, user : user._id } }),
                  function (error) {
                    if (error) return done(error);
                    users--;
                    if(!users) {
                      var tasks = arguments.length-1;
                      for (var i=1; i<arguments.length; ++i) {
                        var task = arguments[i];
                        mongoose.model('comment').create(
                          ['Comment1', 'Comment2', 'Comment3'].map(function (name) {
                              return { name: name, task : task._id }
                            }),
                            function(error) {
                              if (error) return done(error);
                              tasks--;
                              if(!tasks) done();
                            }
                        );
                      }
                    }
                  }
                );
              }
            }
          );
        });
      });
    });
  }
};
