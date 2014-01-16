// __Dependencies__
var errors = require('../../errors');

// __Dependencies__
var url = require('url');
var express = require('express');
var mongoose = require('mongoose');
var etag = require('express/lib/utils').etag

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  controller.finalize(function (request, response, next) {
    // If no routes matched, initialization won't have happened.
    if (!request.baucis) return next();

    var ids;
    var location;
    var replacer;
    var spaces;
    var findBy = request.baucis.controller.get('findBy');
    var basePath = request.originalUrl;
    var documents = request.baucis.documents;

    // 404 if document(s) not found or 0 documents removed/counted
    if (!documents) return next(errors.NotFound('No documents matched your query.'));
    // Send 204 No Content if no body.
    if (request.baucis.noBody) {
      if (request.method !== 'HEAD') return response.send(204);
      if (documents) {
        replacer = request.baucis.controller.get('json replacer');
        spaces = request.baucis.controller.get('json spaces');
        response.set('ETag', etag(JSON.stringify(documents, replacer, spaces)));
      }
      return response.send(200);
    }
    // If it's a document count (e.g. the result of a DELETE), send it back and
    // short-circuit.
    if (typeof documents === 'number') return response.json(documents);
    // If count mode is set, send the length, or send 1 for single document
    if (request.baucis.count) {
      if (Array.isArray(documents)) response.json(documents.length);
      else response.json(1);
      return;
    }
    // If it's not a POST, send now because Location shouldn't be set.
    if (request.method !== 'POST') return response.json(documents);
    // Ensure there is a trailing slash on basePath for proper function of
    // url.resolve, otherwise the model's plural will be missing in the location
    // URL.
    if(!basePath.match(/\/$/)) basePath += '/';
    // Now, set the location and send JSON document(s).  Don't set location if documents
    // don't have IDs for whatever reason e.g. custom middleware.
    if (documents instanceof mongoose.Document) {
      location = url.resolve(basePath, documents.get(findBy).toString());
    }
    else if (documents.length === 1 && documents[0] instanceof mongoose.Document) {
      location = url.resolve(basePath, documents[0].get(findBy).toString());
    }
    else if (documents.every(function (doc) { return doc instanceof mongoose.Document })) {
      ids = documents.map(function (doc) { return '"' + doc.get(findBy) + '"' });
      if (ids.every(function (id) { return id })) {
        location = basePath + '?conditions={ "' + findBy + '": { "$in": [' + ids.join() + '] } }';
      }
    }

    if (location) response.set('Location', location);
    response.json(documents);
  });
};

