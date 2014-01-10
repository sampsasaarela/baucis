// This is a Controller mixin to add methods for generating Swagger data.

// __Dependencies__
var mongoose = require('mongoose');

// __Private Members__

// Convert a Mongoose type into a Swagger type
function swaggerTypeFor (type) {
  if (!type) return null;
  if (type === String) return 'string';
  if (type === Number) return 'double';
  if (type === Date) return 'Date';
  if (type === Boolean) return 'boolean';
  if (type === mongoose.Schema.Types.ObjectId) return 'string';
  if (type === mongoose.Schema.Types.Oid) return 'string';
  if (type === mongoose.Schema.Types.Array) return 'Array';
  if (Array.isArray(type)) return 'Array';
  if (type === Object) return null;
  if (type instanceof Object) return null;
  if (type === mongoose.Schema.Types.Mixed) return null;
  if (type === mongoose.Schema.Types.Buffer) return null;
  throw new Error('Unrecognized type: ' + type);
};

// A method for capitalizing the first letter of a string
function capitalize (s) {
  if (!s) return s;
  if (s.length === 1) return s.toUpperCase();
  return s[0].toUpperCase() + s.substring(1);
}

// __Module Definition__
var mixin = module.exports = function () {

  var controller = this;

  // __Public Members__

  // A method used to generate a Swagger model definition for a controller
  controller.generateModelDefinition = function () {
    var definition = {};
    var schema = controller.get('schema');

    definition.id = capitalize(controller.get('singular'));
    definition.properties = {};

    Object.keys(schema.paths).forEach(function (name) {
      var property = {};
      var path = schema.paths[name];
      var select = controller.get('select');
      var type = swaggerTypeFor(path.options.type);
      var mode = select && (select.match(/\b[-]/g) ? 'exclusive' : 'inclusive');
      var exclusiveNamePattern = new RegExp('\\B-' + name + '\\b', 'gi');
      var inclusiveNamePattern = new RegExp('(?:\\B[+]|\\b)' + name + '\\b', 'gi');

      // Keep deselected paths private
      if (path.selected === false) return;

      // TODO is _id always included unless explicitly excluded?

      // If it's excluded, skip this one
      if (mode === 'exclusive' && select.match(exclusiveNamePattern)) return;
      // If the mode is inclusive but the name is not present, skip this one
      if (mode === 'inclusive' && name !== '_id' && !select.match(inclusiveNamePattern)) return;

      // Configure the property
      property.required = path.options.required;
      property.type = type;

      // Set enum values if applicable
      if (path.enumValues && path.enumValues.length > 0) {
        property.allowableValues = { valueType: 'LIST', values: path.enumValues };
      }

      // Set allowable values range if min or max is present
      if (!isNaN(path.options.min) || !isNaN(path.options.max)) {
        property.allowableValues = { valueType: 'RANGE' };
      }

      if (!isNaN(path.options.min)) {
        property.allowableValues.min = path.options.min;
      }

      if (!isNaN(path.options.max)) {
        property.allowableValues.max = path.options.max;
      }

      if (!property.type) {
        console.log('Warning: That field type is not yet supported in baucis Swagger definitions, using "string."');
        console.log('Path name: %s.%s', definition.id, name);
        console.log('Mongoose type: %s', path.options.type);
        property.type = 'string';
      }

      definition.properties[name] = property;
    });

    return definition;
  };

  // Generate parameter list for operations
  controller.generateParameters = function (verb, plural) {
    var parameters = [];

    // Parameters available for singular routes
    if (!plural) {
      parameters.push({
        paramType: 'path',
        name: 'id',
        description: 'The ID of a ' + controller.get('singular'),
        dataType: 'string',
        required: true,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'header',
        name: 'X-Baucis-Update-Operator',
        description: '**BYPASSES VALIDATION** May be used with PUT to update the document using $push, $pull, or $set.',
        dataType: 'string',
        required: false,
        allowMultiple: false
      });
    }

    // Parameters available for plural routes
    if (plural) {
      parameters.push({
        paramType: 'query',
        name: 'skip',
        description: 'How many documents to skip.',
        dataType: 'int',
        required: false,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'query',
        name: 'limit',
        description: 'The maximum number of documents to send.',
        dataType: 'int',
        required: false,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'query',
        name: 'count',
        description: 'Set to true to return count instead of documents.',
        dataType: 'boolean',
        required: false,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'query',
        name: 'conditions',
        description: 'Set the conditions used to find or remove the document(s).',
        dataType: 'string',
        required: false,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'query',
        name: 'sort',
        description: 'Set the fields by which to sort.',
        dataType: 'string',
        required: false,
        allowMultiple: false
      });
    }

    // Parameters available for singular and plural routes
    parameters.push({
      paramType: 'query',
      name: 'select',
      description: 'Select which paths will be returned by the query.',
      dataType: 'string',
      required: false,
      allowMultiple: false
    });

    parameters.push({
      paramType: 'query',
      name: 'populate',
      description: 'Specify which paths to populate.',
      dataType: 'string',
      required: false,
      allowMultiple: false
    });

    if (verb === 'post') {
      // TODO post body can be single or array
      parameters.push({
        paramType: 'body',
        name: 'document',
        description: 'Create a document by sending the paths to be updated in the request body.',
        dataType: capitalize(controller.get('singular')),
        required: true,
        allowMultiple: false
      });
    }

    if (verb === 'put') {
      parameters.push({
        paramType: 'body',
        name: 'document',
        description: 'Update a document by sending the paths to be updated in the request body.',
        dataType: capitalize(controller.get('singular')),
        required: true,
        allowMultiple: false
      });
    }

    return parameters;
  };

  controller.generateErrorResponses = function (plural) {
    var errorResponses = [];

    // TODO other errors (400, 403, etc. )

    // Error rosponses for singular operations
    if (!plural) {
      errorResponses.push({
        code: 404,
        reason: 'No ' + controller.get('singular') + ' was found with that ID.'
      });
    }

    // Error rosponses for plural operations
    if (plural) {
      errorResponses.push({
        code: 404,
        reason: 'No ' + controller.get('plural') + ' matched that query.'
      });
    }

    // Error rosponses for both singular and plural operations
    // None.

    return errorResponses;
  };

  // Generate a list of a controller's operations
  controller.generateOperations = function (plural) {
    var operations = [];

    controller.activeVerbs().forEach(function (verb) {
      var operation = {};
      var titlePlural = capitalize(controller.get('plural'));
      var titleSingular = capitalize(controller.get('singular'));

      // Don't do head, post/put for single/plural
      if (verb === 'head') return;
      if (verb === 'post' && !plural) return;
      if (verb === 'put' && plural) return;

      // Use the full word
      if (verb === 'del') verb = 'delete';

      operation.httpMethod = verb.toUpperCase();

      if (plural) operation.nickname = verb + titlePlural;
      else operation.nickname = verb + titleSingular + 'ById';

      operation.responseClass = titleSingular; // TODO sometimes an array!

      if (plural) operation.summary = capitalize(verb) + ' some ' + controller.get('plural');
      else operation.summary = capitalize(verb) + ' a ' + controller.get('singular') + ' by its unique ID';

      operation.parameters = controller.generateParameters(verb, plural);
      operation.errorResponses = controller.generateErrorResponses(plural);

      operations.push(operation);
    });

    return operations;
  };

  // A method used to generate a Swagger API definition for the controller
  controller.generateSwaggerDefinition = function () {
    var modelName = capitalize(controller.get('singular'));

    controller.swagger = { apis: [], models: {} };

    // Model
    controller.swagger.models[modelName] = controller.generateModelDefinition();

    // Instance route
    controller.swagger.apis.push({
      path: '/' + controller.get('plural') + '/{id}',
      description: 'Operations about a given ' + controller.get('singular'),
      operations: controller.generateOperations(false)
    });

    // Collection route
    controller.swagger.apis.push({
      path: '/' + controller.get('plural'),
      description: 'Operations about ' + controller.get('plural'),
      operations: controller.generateOperations(true)
    });

    return controller.swagger;
  };
}
