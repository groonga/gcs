var casper = require('casper').create();
var dashboardUrl = casper.cli.options['dashboard-url'];

casper.start(dashboardUrl, function() {
  this.test.assertTitle('Groonga CloudSearch');
});

casper.thenEvaluate(function() {
  document.querySelector('input[name="query"]').setAttribute('value', 'tokyo');
  document.querySelector('input[type="submit"]').click();
});

casper.waitForSelector('#results table', function() {
  this.test.assertEvalEquals(function() {
    return __utils__.findAll('.id-row').length;
  }, 3, 'Query "tokyo" returns 3 hit records');
});

casper.run(function() {
  this.test.renderResults(true);
});
