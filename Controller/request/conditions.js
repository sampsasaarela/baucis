// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;
  // Set the conditions used for finding/updating/removing documents.
  this.request(function (request, response, next) {
    var conditions = request.query.conditions || {};

    if (typeof conditions === 'string') conditions = JSON.parse(conditions);
    if (request.params.id !== undefined) {
      conditions[controller.findBy()] = request.params.id;
    }

    request.baucis.conditions = conditions;
    next();
  });
};
