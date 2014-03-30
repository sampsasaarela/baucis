// __Dependencies__
var deco = require('deco');

// __Module Definition__
var middleware = module.exports = deco(__dirname, [
  'deprecated',
  'headers',
  'validation',
  'conditions',
  'streams'
]);
