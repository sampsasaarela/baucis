// __Dependencies__
var deco = require('deco');
var express = require('express');

// __Module Definition__
var Controller = module.exports = deco();

Controller.factory(express);
Controller.decorators(__dirname, [
  'configure',
  'stages',
  'activation',
  'vivify',
  'initialize',
  'request',
  'query',
  'send'
]);
