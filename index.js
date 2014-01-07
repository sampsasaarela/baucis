// __Dependencies__
var Api = require('./Api');

// __Private Module Members__
var instance = Api();

// __Module Definition__
var baucis = module.exports = function (options) {
  var previous = baucis.empty();
  return previous;
};

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
