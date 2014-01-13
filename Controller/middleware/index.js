// __Dependencies__
var deco = require('deco');

// __Module Definition__
var middleware = module.exports = deco(__dirname, [
  'initialize',
  'request',
  'query',
  'documents',
  // Activate the middleware that sends the final document(s) or count.
  'send'
]);
