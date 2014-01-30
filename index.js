// __Dependencies__
var deco = require('deco');
var Api = require('./Api');
var Release = require('./Release');
var Controller = require('./Controller');
var errors = require('./errors');

// __Private Module Members__
var instance = Api();

// __Module Definition__
var baucis = module.exports = function (options) {
  var previous = baucis.empty();

  options = deco.merge({}, options);
  if (options.releases) previous.set('releases', options.releases);

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
