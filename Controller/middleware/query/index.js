// __Dependencies__
var deco = require('deco');

// __Module Definition__
var middleware = module.exports = deco(__dirname, [
  // __Query-Stage Middleware__
  // The query will have been created (except for POST, which doesn't use a
  // find or remove query).

  // Activate middleware to build the query (except for POST requests).
  'buildQuery',
  // Activate middleware to handle controller and query options.
  'applyControllerOptions',
  'applyQueryString'
]);
