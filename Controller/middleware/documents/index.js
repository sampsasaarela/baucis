// __Dependencies__
var deco = require('deco');

// __Module Definition__
var middleware = module.exports = deco(__dirname, [
  // __Document-Stage Middleware__

  // Activate middleware to execute the query.
  'execute',
  // Activate some middleware that will set the Link header when that feature
  // is enabled.  (This must come after exec or else the count is
  // returned for all subsequqent executions of the query.)
  'linkHeader',
  // Activate the middleware that sets the `Last-Modified` header when appropriate.
  'lastModified'
]);
