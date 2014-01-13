// __Private Module Members__
function setConditions (request, response, next) {
  if (!request.query.conditions) return next();

  var conditions = request.query.conditions;
  if (typeof request.query.conditions === 'string') conditions = JSON.parse(conditions);

  request.baucis.conditions = conditions;
  next();
}

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  // Set the conditions used for finding/removing documents
  controller.request(false, 'instance', 'put', setConditions);
  controller.request(false, 'collection', 'head get del', setConditions);
};
