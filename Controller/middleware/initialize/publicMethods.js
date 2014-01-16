// __Dependencies__
var errors = require('../../../errors');

// __Private Module Members__

var parseActivateParameters = function (stage, params) {
  var options;
  var argumentsArray = Array.prototype.slice.call(params);

  // First, check for override.
  if (typeof argumentsArray[0] === 'boolean') {
    options = last(1, ['howMany', 'verbs', 'middleware'], argumentsArray);
    options.override = argumentsArray[0];
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

  if (count < 1) throw errors.Configuration('Too few arguments.');

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

  if (verbString) verbString = verbString.toLowerCase();

  // Prevent explicitly setting query-stage POST middleware.  Implicitly adding
  // this middleware is ignored.
  if (options.override === false && options.stage === 'query'
    && verbString && verbString.indexOf('post') !== -1) throw errors.Configuration('Query stage not executed for POST.');

  if (!verbString || verbString === '*') verbString = 'head get post put del';
  verbs = verbString.split(/\s+/);

  if (!options.stage) throw errors.Configuration('Must supply stage.');
  if (verbs.some(isInvalidVerb)) throw errors.Configuration('Unrecognized verb.');
  if (options.howMany && options.howMany !== 'instance' && options.howMany !== 'collection') {
    throw errors.Configuration('Unrecognized howMany: ' + options.howMany);
  }
  // Middleware function or array
  if (!Array.isArray(options.middleware) && typeof options.middleware !== 'function') {
    throw errors.Configuration('Middleware must be an array or function.');
  }

  // Check howMany is valid
  if (options.howMany !== undefined && options.howMany !== 'instance' && options.howMany !== 'collection') {
    throw errors.Configuration('Unrecognized howMany: "' + options.howMany + '".');
  }

  verbs.forEach(function (verb) {
    // Ignore implicitly added middleware that doesn't make sense.
    if (options.override === false && options.stage === 'query' && verb === 'post') return;
    if (options.override === false && options.stage === 'query' && options.howMany === 'collection' && verb === 'put') return;
    // Add definitions for one or both `howManys`.
    if (options.howMany !== 'collection') factored.push({ stage: options.stage, howMany: 'instance', verb: verb, middleware: options.middleware, override: options.override });
    if (options.howMany !== 'instance') factored.push({ stage: options.stage, howMany: 'collection', verb: verb, middleware: options.middleware, override: options.override });
  });

  return factored;
}

// __Module Definition__
var decorator = module.exports = function (options, protect) {
 // __Private Instance Members__
  var controller = this;
  var finalMiddlewareWasAdded = false;

  // A method used to activate middleware for a particular stage.
  function activate (definition) {
    // If override is not set, and the verb has been turned off, ignore the middleware
    if (definition.override === false && controller.get(definition.verb) === false) return;
    var path = definition.howMany === 'instance' ? controller.get('basePathWithId') : controller.get('basePath');
    protect.controllerForStage[definition.stage][definition.verb](path, definition.middleware);
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

  controller.finalize = function (middleware) {
    if (finalMiddlewareWasAdded) throw errors.Configuration('Already added final middleware.');
    protect.controllerForStage.finalize.use(middleware);
    finalMiddlewareWasAdded = true;
  };
};
