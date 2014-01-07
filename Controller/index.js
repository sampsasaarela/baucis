// __Dependencies__
var util = require('util');
var express = require('express');
var mongoose = require('mongoose');
var lingo = require('lingo');
var connect = require('connect');
var includes = require('requireindex')(__dirname);

// __Module Definition__
var Controller = module.exports = function Controller (options) {
  // __Private Instance Members & Validation__

  // Marshal string into a hash
  if (typeof options === 'string') options = { singular: options };

  if (!options.singular) throw new Error('Must provide the Mongoose schema name');

  var controller = express();
  var model = mongoose.model(options.singular);
  var findByPath;

  if (options.basePath && options.basePath !== '/') {
    if (options.basePath.indexOf('/') !== 0) throw new Error('basePath must start with a "/"');
    if (options.basePath.lastIndexOf('/') === options.basePath.length - 1) throw new Error('basePath must not end with a "/"');
  }
  if (options.findBy) {
    findByPath = model.schema.path(options.findBy);
    if (!findByPath.options.unique && !(findByPath.options.index && findByPath.options.index.unique)) {
      throw new Error('findBy path for ' + options.singular + ' not unique');
    }
  }

  var basePath = options.basePath ? options.basePath : '/';
  var separator = (basePath === '/' ? '' : '/');
  var basePathWithId = basePath + separator + ':id';
  var basePathWithOptionalId = basePath + separator + ':id?';

  // __Public Instance Members__

  // Return the array of active verbs
  controller.activeVerbs = function () {
    // TODO is there a del/delete bug here?
    return [ 'head', 'get', 'post', 'put', 'del' ].filter(function (verb) {
      return controller.get(verb) !== false;
    });
  };

  controller.checkBadSelection = function (select) {
    var bad = false;
    controller.get('deselected paths').forEach(function (path) {
      var badPath = new RegExp('\\b[+]?' + path + '\\b', 'i');
      if (badPath.exec(select)) bad = true;
    });
    return bad;
  };

  controller.checkBadUpdateOperatorPaths = function (operator, paths) {
    var bad = false;
    var whitelisted = controller.get('allow ' + operator);
    var parts;

    if (!whitelisted) return true;

    parts = whitelisted.split(/\s+/);

    paths.forEach(function (path) {
      if (parts.indexOf(path) !== -1) return;
      bad = true;
    });

    return bad;
  };

  controller.getFindByConditions = function (request) {
    var conditions = connect.utils.merge({}, request.baucis.conditions || {});
    conditions[request.baucis.controller.get('findBy')] = request.params.id;
    return conditions;
  };

  // __Configuration__

  Object.keys(options).forEach(function (key) {
    controller.set(key, options[key]);
  });

  // TODO merge defaults

  controller.set('model', model);
  controller.set('schema', model.schema);
  controller.set('plural', options.plural || lingo.en.pluralize(options.singular));
  controller.set('findBy', options.findBy || '_id');
  controller.set('allow set', options['allow set'] || false);
  controller.set('allow pull', options['allow pull'] || false);
  controller.set('allow push', options['allow push'] || false);
  controller.set('allow comments', options['allow comments'] || false);
  controller.set('allow hints', options['allow hints'] || false);
  controller.set('dependency', options['dependency'] || '*');

  controller.set('basePath', basePath);
  controller.set('basePathWithId', basePathWithId);
  controller.set('basePathWithOptionalId', basePathWithOptionalId);

  var deselected = [];
  model.schema.eachPath(function (name, path) {
    if (path.options.select === false) deselected.push(name);
  });
  if (controller.get('select')) {
    controller.get('select').split(/\s+/).forEach(function (path) {
      var match = /^(?:[-](\w+))$/.exec(path);
      if (match) deselected.push(match[1]);
    });
  }
  // Filter to unique paths
  deselected = deselected.filter(function(path, position) {
    return deselected.indexOf(path) === position;
  });
  controller.set('deselected paths', deselected);

  // __Mixins__
  includes.middleware.apply(controller);
  includes.swagger.apply(controller);

  controller.generateSwaggerDefinition();

  return controller;
};

util.inherits(Controller, express);
