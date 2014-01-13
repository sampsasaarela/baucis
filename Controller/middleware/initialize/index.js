// __Dependencies__
var deco = require('deco');

// __Module Definition__
var middleware = module.exports = deco(__dirname, [
  'bodyParsers',
  'stages',
  'publicMethods',
  // Initialize baucis state
  'initialize'
]);
