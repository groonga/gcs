var casper = require('casper').create();
var dashboardUrl = casper.cli.options['dashboard-url'];

casper.start(dashboardUrl, function() {
  this.test.assertTitle('Groonga CloudSearch');
});

casper.run(function() {
  this.test.renderResults(true);
});
