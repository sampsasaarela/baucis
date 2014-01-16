// __Dependencies__
var mongoose = require('mongoose');
var errors = require('../errors');
var lingo = require('lingo'); // TODO use mongoose pluralizer?

// __Module Definition__
var decorator = module.exports = function (options, protect) {
  // Marshal string into a hash
  if (typeof options === 'string') options = { model: options };

  if (!options.model && !options.singular) throw errors.Configuration('Must provide the Mongoose schema name.');

  var controller = this;
  var model = mongoose.model(options.model || options.singular);
  var modelName = model.modelName;
  var findByPath;
  var deselected = [];

  if (options.basePath && options.basePath !== '/') {
    if (options.basePath.indexOf('/') !== 0) throw errors.Configuration('basePath must start with a "/"');
    if (options.basePath.lastIndexOf('/') === options.basePath.length - 1) throw errors.Configuration('basePath must not end with a "/"');
  }
  if (options.findBy && options.findBy !== '_id') {
    findByPath = model.schema.path(options.findBy);
    if (!findByPath.options.unique && !(findByPath.options.index && findByPath.options.index.unique)) {
      throw errors.Configuration('findBy path for model "' + modelName + '" not unique.');
    }
  }

  var basePath = options.basePath ? options.basePath : '/';
  var separator = (basePath === '/' ? '' : '/');
  var basePathWithId = basePath + separator + ':id';
  var basePathWithOptionalId = basePath + separator + ':id?';

  options['model'] = model;
  options['modelName'] = modelName;
  options['schema'] = model.schema;
  options['singular'] = options.singular || modelName;
  options['plural'] = options.plural || lingo.en.pluralize(options.singular || modelName);

  options['basePath'] = basePath;
  options['basePathWithId'] = basePathWithId;
  options['basePathWithOptionalId'] = basePathWithOptionalId;

  model.schema.eachPath(function (name, path) {
    if (path.options.select === false) deselected.push(name);
  });
  if (options.select) {
    options.select.split(/\s+/).forEach(function (path) {
      var match = /^(?:[-](\w+))$/.exec(path);
      if (match) deselected.push(match[1]);
    });
  }
  // Filter to unique paths
  options['deselected paths'] = deselected.filter(function(path, position) {
    return deselected.indexOf(path) === position;
  });

  protect.options(options);
};
