var express = require('express');
var router = express.Router();
var elasticsearch = require('elasticsearch');
var moment = require('moment');
var botstatus = require('../services/botstatus');

var client = new elasticsearch.Client({
      host: 'localhost:9200',
      log: 'trace'
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET home page. */
router.post('/search', function(req, res, next) {
  client.search({
    q: req.body.query
  }).then(function (body) {
    console.log(JSON.stringify(body));
    res.render('search', { title: 'Search Results', searchResults: body.hits.hits.map(function(hit) {return hit._source; })});
  }, function (error) {
    console.trace(error.message);
  });
});

router.get('/bots', function(req, res, next) {
  res.render('bots', {bots: botstatus.get()})
});

module.exports = router;
