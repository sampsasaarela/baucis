// __Dependencies__
var deco = require('deco');

// __Module Definition__
var middleware = module.exports = deco(__dirname, [
  'stages',
  'activationMethods',
  // Initialize baucis state
  'initialize'
]);
