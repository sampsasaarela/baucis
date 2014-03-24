// __Dependencies__
var deco = require('deco');

// __Module Definition__
var middleware = module.exports = deco(__dirname, [
  'linkHeader'
  // TODO add middleware to check not mixing documents + streaming!
]);
