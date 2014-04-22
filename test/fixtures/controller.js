var mongoose = require('mongoose');
var express = require('express');
var baucis = require('../..');
var config = require('./config');

var app;
var server;
var Schema = mongoose.Schema;

var Stores = new Schema({
  name: { type: String, required: true, unique: true },
  tools: [{ type: mongoose.Schema.ObjectId, ref: 'tool' }],
  mercoledi: Boolean
});

var Tools = new Schema({
  name: { type: String, required: true },
  store: { type: String, required: true },
  bogus: { type: Boolean, default: false, required: true }
});

var Cheese = new Schema({
  name: { type: String, required: true, unique: true },
  color: { type: String, required: true, select: false },
  molds: [ String ],
  arbitrary: [{
    goat: Boolean,
    champagne: String,
    llama: [ Number ]
  }]
});

var Beans = new Schema({ koji: Boolean });
var Deans = new Schema({ room: { type: Number, unique: true } });
var Liens = new Schema({ title: String });
var Fiends = new Schema({ average: Number });
var Unmades = new Schema({ mode: Number });

mongoose.model('tool', Tools);
mongoose.model('store', Stores);
mongoose.model('cheese', Cheese);
mongoose.model('bean', Beans);
mongoose.model('dean', Deans);
mongoose.model('lien', Liens);
mongoose.model('fiend', Fiends);
mongoose.model('unmade', Unmades);

var fixture = module.exports = {
  init: function (done) {
    mongoose.connect(config.mongo.url);

    // Stores controller
    var stores = baucis.rest('store').findBy('name');

    stores.use('/binfo', function (request, response, next) {
      response.json('Poncho!');
    });

    stores.use(function (request, response, next) {
      response.set('X-Poncho', 'Poncho!');
      next();
    });

    stores.get('/info', function (request, response, next) {
      response.json('OK!');
    });

    stores.get('/:id/arbitrary', function (request, response, next) {
      response.json(request.params.id);
    });

    stores.request(function (request, response, next) {
      if (request.baucis.controller === stores) return next();
      next(new Error('request.baucis.controller set incorrectly!'));
    });

    // Tools embedded controller
    var storeTools = stores.vivify('tools');

    storeTools.request(function (request, response, next) {
      if (request.baucis.controller === storeTools) return next();
      next(new Error('request.baucis.controller set incorrectly!'));
    });

    storeTools.query(function (request, response, next) {
      request.baucis.query.where('bogus', false);
      next();
    });

    var cheesy = baucis.rest('cheese').select('-_id color name').findBy('name');
    cheesy.operators('$push', 'molds arbitrary arbitrary.$.llama');
    cheesy.operators('$set', 'molds arbitrary.$.champagne');
    cheesy.operators('$pull', 'molds arbitrary.$.llama');

    baucis.rest('cheese').singular('timeentry').plural('timeentries').findBy('name');
    baucis.rest('bean').methods('get', false);
    baucis.rest('dean').findBy('room').methods('get', false);
    baucis.rest('lien').methods('del', false);
    baucis.rest('fiend').singular('mean').locking(true);
    baucis.rest('store').plural('baloo').findBy('name');
    baucis.rest('store').plural('baloo').path('linseed.oil');

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
    // TODO use async
    // clear all first
    mongoose.model('store').remove({}, function (error) {
      if (error) return done(error);

      mongoose.model('tool').remove({}, function (error) {
        if (error) return done(error);

        mongoose.model('cheese').remove({}, function (error) {

          // create stores and tools
          mongoose.model('store').create(
            ['Westlake', 'Corner'].map(function (name) { return { name: name } }),
            function (error, store) {
              if (error) return done(error);

              var cheeses = [
                { name: 'Cheddar', color: 'Yellow' },
                { name: 'Huntsman', color: 'Yellow, Blue, White' },
                { name: 'Camembert', color: 'White',
                  arbitrary: [
                    { goat: true, llama: [ 3, 4 ] },
                    { goat: false, llama: [ 1, 2 ] }
                  ]
                }
              ];

              mongoose.model('cheese').create(cheeses, function (error) {
                if (error) return done(error);

                mongoose.model('tool').create(
                  ['Hammer', 'Saw', 'Axe'].map(function (name) { return { store: store.name, name: name } }),
                  done
                );
              });
            }
          );
        });
      });
    });
  }
};
