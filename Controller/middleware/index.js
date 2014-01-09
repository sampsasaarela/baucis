// This is a Controller mixin for adding methods to manage middleware creation.

// __Dependencies__
var express = require('express');
var middleware = require('requireindex')(__dirname);

// __Private Module Members__

var parseActivateParameters = function (stage, params) {
  var options;
  var argumentsArray = Array.prototype.slice.call(params);

  // First, check for override.
  if (typeof argumentsArray[0] === 'boolean') {
    options = last(1, ['howMany', 'verbs', 'middleware'], argumentsArray);
    options.override = argumentsArray[1];
  }
  // Override wasn't set.
  else {
    options = last(0, ['howMany', 'verbs', 'middleware'], argumentsArray);
    options.override = false;
  }

  options.stage = stage;

  return factor(options);
}

function exists (o) { return o !== undefined && o !== null }

// Handle variable number of arguments
function last (skip, names, values) {
  var r = {};
  var position = names.length;
  var count = values.filter(exists).length - skip;

  if (count < 1) throw new Error('Too few arguments.');

  names.forEach(function (name) {
    var index = skip + count - position;
    position--;
    if (index >= skip) r[name] = values[index];
  });

  return r;
}

function isInvalidVerb (s) {
  return /^head|get|put|post|del$/.exec(s) ? false : true;
}

// Parse middleware into an array of middleware definitions for each howMany and verb
function factor (options) {
  var factored = [];
  var verbString = options.verbs;
  var verbs;

  if (!verbString || verbString === '*') verbString = 'head get post put del';
  verbs = verbString.toLowerCase().split(/\s+/);

  if (!options.stage) throw new Error('Must supply stage.');
  if (verbs.some(isInvalidVerb)) throw new Exception('Unrecognized verb.');
  if (options.howMany && options.howMany !== 'instance' && options.howMany !== 'collection') {
    throw new Error('Unrecognized howMany: ' + options.howMany);
  }
  // Middleware function or array
  if (!Array.isArray(options.middleware) && typeof options.middleware !== 'function') {
    throw new Error('Middleware must be an array or function.');
  }
  // Prevent explicitly setting query-stage POST middleware.  Implicitly adding
  // this middleware is ignored.
  if (options.stage === 'query' && options.verb === 'post') throw new Error('Query stage not executed for POST.');
  // Check howMany is valid
  if (options.howMany !== undefined && options.howMany !== 'instance' && options.howMany !== 'collection') {
    throw new Error('Unrecognized howMany: "' + options.howMany + '".');
  }

  // TODO ignore implicitly added middleware that doesn't make sense

  verbs.forEach(function (verb) {
    if (options.howMany !== 'collection') factored.push({ stage: options.stage, howMany: 'instance', verb: verb, middleware: options.middleware, override: options.override });
    if (options.howMany !== 'instance') factored.push({ stage: options.stage, howMany: 'collection', verb: verb, middleware: options.middleware, override: options.override });
  });

  return factored;
}

// __Module Definition__
var mixin = module.exports = function () {

  // __Private Instance Members__

  var controller = this;
  var controllerForStage = {
    pre: express(), // TODO make sure this is only privately accessible
    request: express(),
    query: express(),
    documents: express()
  };

  // A method used to activate middleware for a particular stage.
  function activate (definition) {
    // If override is not set, and the verb has been turned off, ignore the middleware
    if (definition.override !== true && controller.get(definition.verb) === false) return;
    var path = definition.howMany === 'instance' ? controller.get('basePathWithId') : controller.get('basePath');
    controllerForStage[definition.stage][definition.verb](path, definition.middleware);
  }

  // __Public Instance Methods__

  // A method used to activate request-stage middleware.
  controller.request = function (override, howMany, verbs, middleware) {
    var definitions = parseActivateParameters('request', arguments);
    definitions.forEach(activate);
    return controller;
  };

  // A method used to activate query-stage middleware.
  controller.query = function (override, howMany, verbs, middleware) {
    var definitions = parseActivateParameters('query', arguments);
    definitions.forEach(activate);
    return controller;
  };

  // A method used to activate document-stage middleware.
  controller.documents = function (override, howMany, verbs, middleware) {
    var definitions = parseActivateParameters('documents', arguments);
    definitions.forEach(activate);
    return controller;
  };

  // Middleware for parsing JSON POST/PUTs
  controller.use(express.json());
  // Middleware for parsing form POST/PUTs
  controller.use(express.urlencoded());

  // Activate stage controllers.
  controller.use(controllerForStage.request);
  controller.use(controllerForStage.query);
  controller.use(controllerForStage.documents);

  // __Request-Stage Middleware__

  // Initialize baucis state
  middleware.initialize.apply(controller);
  // Activate middleware to check for deprecated features
  middleware.deprecated.apply(controller);
  // Activate middleware that sets the Allow & Accept headers
  middleware.allowHeader.apply(controller);
  middleware.acceptHeader.apply(controller);
  // Activate middleware that checks for correct Mongo _ids when applicable
  middleware.validateId.apply(controller);
  // Activate middleware that checks for disabled HTTP methods
  middleware.checkMethodSupported.apply(controller);
  // Activate middleware to set request.baucis.conditions for find/remove
  middleware.setConditions.apply(controller);
  // Also activate conditions middleware for update
  // TODO // activate('request', 'instance', 'put', middleware.configure.conditions);
  // Activate middleware to set request.baucis.count when query is present
  // TODO // activate('request', 'get', middleware.configure.count);

  // __Query-Stage Middleware__
  // The query will have been created (except for POST, which doesn't use a
  // find or remove query).

  // Activate middleware to build the query (except for POST requests).
  middleware.buildQuery.apply(controller);
  // Activate middleware to handle controller and query options.
  middleware.applyControllerOptions.apply(controller);
  middleware.applyQueryString.apply(controller);

  // __Document-Stage Middleware__

  // Activate middleware to execute the query.
  middleware.execute.apply(controller);
  // Activate some middleware that will set the Link header when that feature
  // is enabled.  (This must come after exec or else the count is
  // returned for all subsequqent executions of the query.)
  middleware.linkHeader.apply(controller);
  // Activate the middleware that sets the `Last-Modified` header when appropriate.
  middleware.lastModified.apply(controller);

  // TODO this comes after documents-stage, correct?
  // Activate the middleware that sends the resulting document(s) or count.
  middleware.send.apply(controller);

  return controller;
};
