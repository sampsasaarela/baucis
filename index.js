// __Dependencies__
var Api = require('./Api');
var Release = require('./Release');
var Controller = require('./Controller');

// __Private Module Members__
var instance = Api();

// __Module Definition__
var baucis = module.exports = function (options) {
  var previous = baucis.empty();
  // TODO refactor options
  if (options) {
    if (options.releases) previous.set('releases', options.releases);
  }
  previous.initialize();
  return previous;
};

// __Expose Modules__
baucis.Api = Api;
baucis.Release = Release;
baucis.Controller = Controller;

// __Public Methods__
baucis.rest = function (options) {
  // TODO maybe only check publish here and not in Api
  var controller = instance.rest(options);
  return controller;
};

baucis.empty = function () {
  var previous = instance;
  instance = Api();
  return previous;
};
