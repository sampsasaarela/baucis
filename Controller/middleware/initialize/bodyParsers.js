// __Dependencies__
var express = require('express');

// __Module Definition__
var decorator = module.exports = function () {
  // __Body Parsers__
  // Middleware for parsing JSON POST/PUTs
  this.use(express.json());
  // Middleware for parsing form POST/PUTs
  this.use(express.urlencoded());
};
