'use strict';

var express = require('express');


var development = process.env.NODE_ENV !== 'production';
var app = express();

if (development) {
  var React = require('react');
  var path = require('path');
  var url = require('url');
  var browserify = require('connect-browserify');
  var nodejsx = require('node-jsx').install();

  var routes = require('./src/Routes');
  var Router = require('react-router');

  app = app
    .get('/assets/bundle.js', browserify('./client', {debug: true, watch: false}))
    .use('/assets', express.static(path.join(__dirname, 'assets')))
    .use('/vendor', express.static(path.join(__dirname, 'vendor')))
    .use(function renderApp(req, res) {
      var fileName = url.parse(req.url).pathname;

      Router.run(routes, req.url, function (Handler) {
        var RootHTML = React.renderToString(React.createElement(Handler));

        res.send(RootHTML);
      })

      
    });
} else {
  app = app
    .use(express.static(__dirname));
}

app
  .listen(4000, function () {
    console.log('Server started at http://localhost:4000');
  });