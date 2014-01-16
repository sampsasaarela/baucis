// __Dependencies__
var Api = require('./Api');
var Release = require('./Release');
var Controller = require('./Controller');
var errors = require('./errors');

// __Private Module Members__
var instance = Api();

// __Module Definition__
var baucis = module.exports = function (options) {
  if (!options) options = {};

  var previous = baucis.empty();
  previous.set('releases', options.releases || [ '0.0.1' ]); // TODO
  previous.initialize();
  return previous;
};

// __Expose Modules__
baucis.Api = Api;
baucis.Release = Release;
baucis.Controller = Controller;
baucis.errors = errors;

// __Public Methods__
baucis.rest = function (options) {
  // Don't publish it automatically if it's private.
  if (options.publish === false) return Controller(options);
  else return instance.rest(options);
};

baucis.empty = function () {
  var previous = instance;
  instance = Api();
  return previous;
};
