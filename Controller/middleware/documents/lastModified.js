// __Dependencies__
var errors = require('../../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  controller.documents(false, function (request, response, next) {
    var lastModifiedPath = request.baucis.controller.get('lastModified');
    var documents = request.baucis.documents;

    if (!lastModifiedPath) return next();
    if (typeof documents === 'number') return next();
    if (!documents) return next();

    var modifiedDates = [].concat(documents).map(function (doc) {
      return doc[lastModifiedPath];
    });

    // Validate
    // TODO allow/convert Timestamp, Number, ISODate
    modifiedDates.forEach(function (modified) {
      if (modified instanceof Date) return;
      else next(errors.Configuration('lastModified path was not a date'));
    });

    // Find the latest date
    var lastModified = Math.max.apply(null, modifiedDates);

    // Stringify to RFC 822, updated by RFC 1123 e.g. Sun, 06 Nov 1994 08:49:37 GMT
    response.set('Last-Modified', (new Date(lastModified)).toUTCString());

    next();
  });
};

