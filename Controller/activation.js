// __Dependencies__
var errors = require('../errors');

// __Private Module Members__

var parseActivateParameters = function (stage, params) {
  var options;
  var argumentsArray = Array.prototype.slice.call(params);

  options = last(0, ['endpoint', 'verbs', 'middleware'], argumentsArray);
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

// Parse middleware into an array of middleware definitions for each endpoint and verb
function factor (options) {
  var factored = [];
  var verbString = options.verbs;
  var verbs;

  if (verbString) verbString = verbString.toLowerCase();

  if (!verbString || verbString === '*') verbString = 'head get post put del';
  verbs = verbString.split(/\s+/);

  verbs.forEach(function (verb) {
    if (isInvalidVerb(verb)) throw errors.Configuration('Unrecognized HTTP method: "%s"', verb);
  });

  if (!options.stage) throw errors.Configuration('The middleware stage was not provided');
  if (options.endpoint && options.endpoint !== 'instance' && options.endpoint !== 'collection') {
    throw errors.Configuration('End-point type must be either "instance" or "collection," not "%s"', options.endpoint);
  }
  // Middleware function or array
  if (!Array.isArray(options.middleware) && typeof options.middleware !== 'function') {
    throw errors.Configuration('Middleware must be an array or function');
  }
  // Check endpoint is valid
  if (options.endpoint !== undefined && options.endpoint !== 'instance' && options.endpoint !== 'collection') {
    throw errors.Configuration('End-point type must be either "instance" or "collection," not "%s"', options.endpoint);
  }

  verbs.forEach(function (verb) {
    // Add definitions for one or both `endpoints`.
    if (options.endpoint !== 'collection') factored.push({ stage: options.stage, endpoint: 'instance', verb: verb, middleware: options.middleware });
    if (options.endpoint !== 'instance') factored.push({ stage: options.stage, endpoint: 'collection', verb: verb, middleware: options.middleware });
  });

  return factored;
}

// __Module Definition__
var decorator = module.exports = function (options, protect) {
 // __Private Instance Members__
  var controller = this;

  // A method used to activate middleware for a particular stage.
  function activate (definition) {
    var path = definition.endpoint === 'instance' ? controller.get('basePathWithId') : controller.get('basePath');
    protect.controllerForStage[definition.stage][definition.verb](path, definition.middleware);
  }

  // __Protected Instance Methods__
  protect.finalize = function (endpoint, verbs, middleware) {
    var definitions = parseActivateParameters('finalize', arguments);
    definitions.forEach(activate);
    return controller;
  };

  // __Public Instance Methods__

  // A method used to activate request-stage middleware.
  controller.request = function (endpoint, verbs, middleware) {
    var definitions = parseActivateParameters('request', arguments);
    definitions.forEach(activate);
    return controller;
  };

  // A method used to activate query-stage middleware.
  controller.query = function (endpoint, verbs, middleware) {
    var definitions = parseActivateParameters('query', arguments);
    definitions.forEach(activate);
    return controller;
  };

  // A method used to activate document-stage middleware.
  controller.documents = function (endpoint, verbs, middleware) {
    throw new errors.Deprecated('The documents stage of middleware has been deprecated.  Use an outgoing through stream instead.')
  };
};
