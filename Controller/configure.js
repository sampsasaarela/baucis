// __Dependencies__
var mongoose = require('mongoose');
var semver = require('semver');
var pluralize = require('mongoose/lib/utils').toCollectionName;
var BaucisError = require('../BaucisError');

// __Module Definition__
var decorator = module.exports = function (model, protected) {
  var controller = this;

  if (typeof model !== 'string' && !model.schema) {
    throw BaucisError.Configuration('You must pass in a model or model name');
  }

  // __Private Instance Members__
  var properties = {};
  var multi = {
    methods: {
      get: true,
      post: true,
      put: true,
      del: true
    },
    operators: {
      $push: false,
      $pull: false,
      $set: false
    }
  };

  // __Protected Instance Members__
  var property = protected.property = function (name, initial, action) {
    // Initialize the property value.
    properties[name] = initial;
    // Add the property to the controller.
    controller[name] = function (value) {
      if (arguments.length === 0) return properties[name];
      if (action) value = action(value);
      properties[name] = value;
      controller.validate();
      return controller;
    };

    return controller;
  };

  var multiproperty = protected.multiproperty = function (name, action) {
    // Add the property to the controller.
    controller[name] = function (items, cargo) {
      var store = multi[name];
      // If one argument was passed, returned the value for that item.
      if (arguments.length === 1) {
        if (items.match(/\s/)) throw new Error();
        return store[items];
      }
      // If two arguments were passed, update the items with the cargo.
      else if (arguments.length === 2) {
        items.split(/\s+/g).forEach(function (item) {
          store[item] = action ? action(cargo) : cargo;
        });
      }
      // Return a list of activated items.
      return Object.keys(store).filter(function (item) {
        return store[item];
      });
    };

    return controller;
  };

  // __Property Definitions__
  property('findBy', '_id');
  property('versions', '*'); // TODO changing is an NOP
  property('comments', false);
  property('hints', false);
  property('locking', false);
  property('relations', true);
  property('select', '');
  property('schema');
  property('lastModified');
  property('api'); // TODO changing this is an NOP
  property('parentPath');

  property('model', undefined, function (model) {
    var name;
    var definition;
    // If it's a string, get the model from mongoose.
    if (typeof model === 'string') {
      name = model;
      definition = mongoose.model(name);
    }
    // Otherwise, assume it's a model object.
    else {
      definition = model;
      name = model.modelName;
    }
    // If the singular name hasn't been set, set it.
    if (!controller.singular()) controller.singular(name);
    // Record the new schema.
    controller.schema(definition.schema);

    return definition;
  });

  property('singular', undefined, function (name) {
    // If the plural name hasn't yet been set, set it to the pluralized version
    // of the singular name.
    if (!name) return name;
    if (!controller.plural()) controller.plural(pluralize(name));
    return name;
  });

  // TODO changing this after activation is a NOP
  property('plural', undefined, function (name) {
    if (!name) return name;
    return name;
  });

  // TODO changing this after activation is a NOP
  property('path', undefined, function (path) {
    if (!path) return path;
    return '/' + path.replace(/[.]/g, '/');
  });

  // TODO changing this after release init is an NOP
  property('parent', undefined, function (parent) {
    controller.api(parent.api());
    if (!controller.parentPath()) controller.parentPath(parent.singular());
    return parent;
  });

  multiproperty('operators');
  multiproperty('methods', function (enabled) {
    return enabled ? true : false;
  });

  // Check the configuration.
  controller.validate = function () {
    var findByPath;

    if (controller.schema() && controller.findBy() && controller.findBy() !== '_id') {
      findByPath = controller.schema().path(controller.findBy());
      if (!findByPath.options.unique && !(findByPath.options.index && findByPath.options.index.unique)) {
        throw BaucisError.Configuration('`findBy` path for model "%s" must be unique', controller.model().modelName);
      }
    }
    if (!semver.validRange(controller.versions())) {
      throw BaucisError.Configuration('Controller version range "%s" was not a valid semver range', controller.versions());
    }
    return controller;
  };

  controller.deselected = function (path) {
    var deselected = [];
    // Store naming, model, and schema.
    // Find deselected paths in the schema.
    controller.schema().eachPath(function (name, path) {
      if (path.options.select === false) deselected.push(name);
    });
    // Add deselected paths from the controller.
    controller.select().split(/\s+/).forEach(function (path) {
      var match = /^(?:[-]((?:[\w]|[-])+)\b)$/.exec(path);
      if (match) deselected.push(match[1]);
    });
    var finalized = deselected.filter(function(path, position) {
      return deselected.indexOf(path) === position;
    });

    if (arguments.length === 0) return finalized;
    else return (finalized.indexOf(path) !== -1);
  };

  // Set the controller model.
  controller.model(model);
};
