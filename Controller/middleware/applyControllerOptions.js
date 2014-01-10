// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  // Apply various options based on controller parameters
  controller.query(false, function (request, response, next) {
    var select = request.baucis.controller.get('select');
    if (!select) return next();
    request.baucis.query.select(select);
    next();
  });
};
