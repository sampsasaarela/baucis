// __Dependencies__
var deco = require('deco');

// __Module Definition__
var middleware = module.exports = deco(__dirname, [
  // __Request-Stage Middleware__
  // Activate middleware to check for deprecated features
  'deprecated',
  // Activate middleware that sets the Allow & Accept headers
  'allowHeader',
  'acceptHeader',
  // Activate middleware that checks for correct Mongo _ids when applicable
  'validateId',
  // Activate middleware that checks for disabled HTTP methods
  'checkMethodSupported',
  // Activate middleware to set request.baucis.conditions
  'setConditions'
]);
