// __Dependencies__
var deco = require('deco');
var Api = require('./Api');
var Release = require('./Release');
var Controller = require('./Controller');
var BaucisError = require('./BaucisError');
var plugins = {
  json: require('baucis-json')
};

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
baucis.Error = BaucisError;

Api.container(baucis);
Release.container(baucis);
Controller.container(baucis);
BaucisError.container(baucis);

// __Plugins__
plugins.json.apply(baucis);

// __Public Methods__
baucis.rest = function (model) {
  return instance.rest(model);
};

baucis.empty = function () {
  var previous = instance;
  instance = Api();
  return previous;
};
