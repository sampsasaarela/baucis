var decorator = module.exports = function (options) {
  var controller = this;

  // Return the array of active verbs
  controller.activeVerbs = function () {
    // TODO is there a del/delete bug here?
    return [ 'head', 'get', 'post', 'put', 'del' ].filter(function (verb) {
      return controller.get(verb) !== false;
    });
  };

  controller.checkBadSelection = function (select) {
    var bad = false;
    controller.get('deselected paths').forEach(function (path) {
      var badPath = new RegExp('\\b[+]?' + path + '\\b', 'i');
      if (badPath.exec(select)) bad = true;
    });
    return bad;
  };

  controller.checkBadUpdateOperatorPaths = function (operator, paths) {
    var bad = false;
    var whitelisted = controller.get('allow ' + operator);
    var parts;

    if (!whitelisted) return true;

    parts = whitelisted.split(/\s+/);

    paths.forEach(function (path) {
      if (parts.indexOf(path) !== -1) return;
      bad = true;
    });

    return bad;
  };

  controller.getFindByConditions = function (request) {
    var conditions = request.baucis.conditions || {};
    conditions[request.baucis.controller.get('findBy')] = request.params.id;
    return conditions;
  };
};
