// __Dependencies__
var mongoose = require('mongoose');
var lingo = require('lingo');
var errors = require('../errors');

// __Module Definition__
var decorator = module.exports = function (options, protect) {
  if (!options.model && !options.singular) throw errors.Configuration('Must provide the Mongoose schema name.');

  var controller = this;
  var model;
  var modelName;
  var findByPath;
  var deselected = [];
  // If no model passed in, use the singular name to get the model from mongoose.
  if (!options.model) model = mongoose.model(options.singular);
  // If a model name was passed in, load from mongoose.
  else if (typeof options.model === 'string') model = mongoose.model(options.model);
  // Otherwise, assume it's a model and use it straight.
  else model = options.model;
  // Set the model name.
  modelName = model.modelName;
  // Check for a few configuration errors.
  if (options.basePath && options.basePath !== '/') {
    if (options.basePath.indexOf('/') !== 0) throw errors.Configuration('basePath must start with a "/"');
    if (options.basePath[options.basePath.length - 1] === '/') throw errors.Configuration('basePath must not end with a "/"');
  }
  if (options.findBy && options.findBy !== '_id') {
    findByPath = model.schema.path(options.findBy);
    if (!findByPath.options.unique && !(findByPath.options.index && findByPath.options.index.unique)) {
      throw errors.Configuration('findBy path for model "' + modelName + '" not unique.');
    }
  }
  // Initialize & calculate base paths.
  var basePath = options['basePath'] = options.basePath ? options.basePath : '/';
  var separator = (basePath === '/' ? '' : '/');
  var basePathWithId = options['basePathWithId'] = basePath + separator + ':id';
  var basePathWithOptionalId = options['basePathWithOptionalId'] = basePath + separator + ':id?';
  // Store naming, model, and schema.
  options['model'] = model;
  options['modelName'] = modelName;
  options['schema'] = model.schema;
  options['singular'] = options.singular || modelName;
  options['plural'] = options.plural || lingo.en.pluralize(options.singular);
  // Find deselected paths in the schema.
  model.schema.eachPath(function (name, path) {
    if (path.options.select === false) deselected.push(name);
  });
  // Add deselected paths from the controller.
  if (options.select) {
    options.select.split(/\s+/).forEach(function (path) {
      var match = /^(?:[-](\w+))$/.exec(path);
      if (match) deselected.push(match[1]);
    });
  }
  // Filter deselected to unique paths.
  options['deselected paths'] = deselected.filter(function(path, position) {
    return deselected.indexOf(path) === position;
  });
  // Pass changes to options down stream.
  protect.options(options);
};
