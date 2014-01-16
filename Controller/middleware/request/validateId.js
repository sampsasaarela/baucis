// __Dependencies__
var errors = require('../../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  controller.request(false, function (request, response, next) {
    var findBy = request.baucis.controller.get('findBy');
    var id = request.params.id;
    var findByPath = request.baucis.controller.get('schema').path(findBy);
    var check = ['ObjectID', 'Number'];
    var instance = findByPath.instance;

    if (!id) return next();
    if (check.indexOf(instance) === -1) return next();
    if (instance === 'ObjectID' && id.match(/^[a-f0-9]{24}$/i)) return next();
    if (instance === 'Number' && !isNaN(Number(id))) return next();

    next(errors.BadRequest('Invalid document ID.'));
  });
};
