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

    var Party = new Schema({ hobbits: Number, dwarves: Number });
    var Dungeon = new Schema({ treasures: Number });

    if (!mongoose.models['party']) mongoose.model('party', Party);
    if (!mongoose.models['dungeon']) mongoose.model('dungeon', Dungeon);

    app = express();

    baucis.rest({
      singular: 'party',
      versions: '1.x'
    });

    baucis.rest({
      singular: 'party',
      versions: '2.1.0'
    });

    baucis.rest({
      singular: 'party',
      versions: '~3'
    });

    app.use('/api/versioned', baucis({
      releases: [ '1.0.0', '2.1.0', '3.0.1' ]
    }));

    baucis.rest('dungeon');

    app.use('/api/unversioned', baucis());

    server = app.listen(8012);

    done();
  },
  deinit: function (done) {
    server.close();
    mongoose.disconnect();
    done();
  }
};
