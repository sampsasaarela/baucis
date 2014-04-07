// __Dependencies__
var deco = require('deco');
var util = require('util');

// __Module Definition__

var errors = module.exports = {};

// __Private Module Members__

// Build a constructor function for a Baucis error, with a custom default message
// that can be overridden.
function buildConstructor (options) {
  var ChildError = deco(function (message) {
    this.status = options.status;
    this.name = options.name;
    // Format the formatted error message.
    this.message = util.format('%s (%s).', message, this.status);
  });

  ChildError.container(errors).inherit(errors.BaucisError);
  ChildError.sanitize(function () {
    // Use the given message (if any) and format it, or else use the default message.
    if (typeof arguments[0] === 'string') return util.format.apply(util, arguments);
    else return options.defaultMessage;
  });

  return ChildError;
};

// __Public Module Members__

// Parent type for child baucis errors.
errors.BaucisError = deco().inherit(Error);

errors.BadRequest = buildConstructor({
  defaultMessage: 'Please fix this request and try again',
  status: 400,
  name: 'Bad Request'
});

errors.Deprecated = buildConstructor({
  defaultMessage: 'One or more deprecated features were used in this request',
  status: 400,
  name: 'Bad Request'
});

errors.Forbidden = buildConstructor({
  defaultMessage: 'This action is forbidden',
  status: 403,
  name: 'Forbidden'
});

errors.NotFound = buildConstructor({
  defaultMessage: 'No document matched the requested query',
  status: 404,
  name: 'Not Found'
});

errors.MethodNotAllowed = buildConstructor({
  defaultMessage: 'The requested HTTP method is not allowed for this resource',
  status: 405,
  name: 'Method Not Allowed'
});

errors.NotAcceptable = buildConstructor({
  defaultMessage: 'The requested content type could not be provided',
  status: 406,
  name: 'Not Acceptable'
});

errors.LockConflict = buildConstructor({
  defaultMessage: 'This update is for an outdated version of the document',
  status: 409,
  name: 'Conflict'
});

errors.UnsupportedMediaType = buildConstructor({
  defaultMessage: "No parser is available for this request's content type",
  status: 415,
  name: 'Unsupported Media Type'
});

errors.ValidationError = buildConstructor({
  defaultMessage: 'A document failed validation',
  status: 422,
  name: 'Unprocessable Entity'
});

errors.Configuration = buildConstructor({
  defaultMessage: 'Baucis is misconfigured',
  status: 500,
  name: 'Internal Server Error'
});

errors.NotImplemented = buildConstructor({
  defaultMessage: 'The requested functionality is not implemented',
  status: 501,
  name: 'Not Implemented'
});
