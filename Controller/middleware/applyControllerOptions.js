// __Module Definition__
var mixin = module.exports = function () {
  var controller = this;

  // Apply various options based on controller parameters
  controller.query(true, function (request, response, next) {
    var select = request.baucis.controller.get('select');

    if (!select) return next();
    if (!request.baucis.query) return next();

    request.baucis.query.select(select);
    next();
  });
};
