// __Dependencies__
var deco = require('deco');
var express = require('express');

// __Module Definition__
var Controller = module.exports = deco(function () {
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
});

Controller.factory(express);
Controller.decorators(__dirname, [ 'configure' ]);
Controller.decorators(deco.builtin.setOptions);
Controller.decorators(__dirname, [ 'basicMethods', 'middleware' ]);
Controller.defaults({
  findBy: '_id',
  'allow set': false,
  'allow pull': false,
  'allow push': false,
  'allow comments': false,
  'allow hints': false,
  versions: '*'
});
