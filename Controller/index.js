// __Dependencies__
var deco = require('deco');
var express = require('express');

// __Module Definition__
var Controller = module.exports = deco();

Controller.factory(express);
Controller.decorators(__dirname, [ 'configure' ]);
Controller.decorators(deco.builtin.setOptions);
Controller.decorators(__dirname, [ 'publicMethods', 'middleware' ]);
Controller.defaults({
  findBy: '_id',
  'allow set': false,
  'allow pull': false,
  'allow push': false,
  'allow comments': false,
  'allow hints': false,
  versions: '*'
});
