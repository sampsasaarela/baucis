// __Dependencies__
var deco = require('deco');

// __Private Module Members__
var setMessage = function (message) { this.message = message } // TODO allow empty/default message

// __Module Definition__
var errors = module.exports = {
  // TODO deco(setMessage).inherit(Error).container(errors)
  Configuration: deco(setMessage),
  Deprecated: deco(setMessage),
  BadRequest: deco(setMessage),
  Forbidden: deco(setMessage),
  NotFound: deco(setMessage),
  MethodNotAllowed: deco(setMessage),
  LockConflict: deco(setMessage),
  ValidationError: deco(setMessage)
};

Object.keys(errors).forEach(function (name) {
  var BaucisError = errors[name];
  BaucisError.inherit(Error);
  BaucisError.container(errors);
});
