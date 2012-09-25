var App = Ember.Application.create();

App.ApplicationController = Ember.Controller.extend();

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});

App.IndexView = Ember.View.extend({
  templateName: 'index'
});

App.currentDomain = Ember.Object.create();

App.domainsController = Ember.ArrayController.create();
App.DomainSelectorView = Ember.View.extend({
  classNames: ["navbar-form", "pull-right"],
  contentBinding: "App.DomainsController.content"
});

App.SearchController = Ember.ArrayController.extend({
  query: null,
  perPage: 5,
  start: 0,
  data: null,
  domainBinding: 'App.currentDomain',
  numStart: function() {
    return this.get('start') + 1;
  }.property('start'),
  numEnd: function() {
    return this.get('start') + this.get('numReceived');
  }.property('numReceived', 'start'),
  searched: function() {
    return !!this.data;
  }.property('data'),
  resultsAvailable: function() {
    return this.data && this.data.hits.found > 0;
  }.property('data'),
  numHits: function() {
    return this.data ? this.data.hits.found : 0;
  }.property('data'),
  numReceived: function() {
    return this.data ? this.data.hits.hit.length : 0;
  }.property('data'),
  content: function() {
    var data = this.get('data');
    if (!data) {
      return [];
    }
    var numStart = this.get('numStart');
    var content = data.hits.hit.map(function(hit, index) {
      var pairs = [];
      jQuery.each(hit.data, function(columnName, value) {
        pairs.push({columnName: columnName, value: value});
      });
      return {
        index: numStart + index,
        id: hit.id,
        data: pairs
      };
    });
    return content;
  }.property('data'),
  searchEndpoint: function() {
    return 'http://' + this.get('domain').endpoint + '/2011-02-01/search';
  }.property('domain'),
  urlForRawRequest: function() {
    var searchEndpoint = this.get('searchEndpoint');
    var params = this.get('paramsForRequest');
    var urlForRawRequest = searchEndpoint + '?' + jQuery.param(params);
    return urlForRawRequest;
  }.property('paramsForRequest', 'searchEndpoint'),
  paramsForRequest: function() {
    var domain = this.get('domain');
    var returnFields = domain.fieldNames ? domain.fieldNames.join(',') : [];
    var params = {
      q:     this.get('query'),
      size:  this.get('perPage'),
      start: this.get('start'),
      'return-fields': returnFields
    };
    return params;
  }.property('query', 'perPage', 'start', 'searchEndpoint'),
  reset: function() {
    this.set('data', null);
    this.set('start', 0);
  },
  executeSearch: function() {
    var self = this;
    $.ajax({
      type: 'GET',
      url: self.get('searchEndpoint'),
      data: self.get('paramsForRequest'),
      dataType: 'jsonp',
      success: function(data) {
        self.set('data', data);
      }
    });
  },
  nextPageAvailable: function() {
    return this.get('start') + this.get('perPage') < this.get('numHits');
  }.property('start', 'perPage', 'numHits'),
  nextPage: function() {
    console.log("nextPage");
    var newStart = this.get('start') + this.get('perPage');
    if (newStart < this.get('numHits')) {
      this.set('start', newStart);
      this.executeSearch();
    }
  },
  previousPageAvailable: function() {
    return this.get('start') > 0;
  }.property('start'),
  previousPage: function() {
    var newStart = this.get('start') - this.get('perPage');
    if (newStart < 0) {
      newStart = 0;
    }
    this.set('start', newStart);
    this.executeSearch();
  },
});

App.SearchView = Ember.View.extend({
  templateName: 'search'
});

App.SearchFormView = Ember.View.extend({
  tagName: 'form',
  classNames: ['form-search'],

  submit: function(event) {
    var query = this.get('controller.query');
    var controller = this.get('controller');
    controller.reset();
    controller.executeSearch();

    event.preventDefault();
  }
});

App.Router = Ember.Router.extend({
  root: Ember.Route.extend({
    index: Ember.Route.extend({
      route: '/',
      redirectsTo: 'search'
    }),
    search: Ember.Route.extend({
      route: 'search',
      connectOutlets: function(router) {
        router.get('applicationController').connectOutlet('search');
      },
      nextPage: function(router) {
        router.get('searchController').nextPage();
      },
      previousPage: function(router) {
        router.get('searchController').previousPage();
      }
    })
  })
});

var configurationEndpoint = 'http://' + location.host + '/';
var hostAndPort = getHostAndPort();

function getHostAndPort() {
  var hostAndPort = location.host.split(':');
  if (hostAndPort[0] == 'localhost')
    hostAndPort[0] = '127.0.0.1';
  if (hostAndPort[0].match(/^\d+\.\d+\.\d+\.\d+$/))
    hostAndPort[0] += '.xip.io';
  return hostAndPort.join(':');
}

$(document).ready(function($) {
  $.ajax({
    type: 'GET',
    url:  configurationEndpoint,
    data: {
      Version: '2011-02-01',
      Action:  'DescribeDomains'
    },
    dataType: 'xml',
    success: function(data) {
      var domains = [];
      var domainStatusMembers = $(data).find('DomainStatusList > member');
      domainStatusMembers.each(function(index) {
          var domain = $(this);
          var name = domain.find('DomainName').text();
          var endpoint = domain.find('SearchService > Endpoint').text();
          $.ajax({
            type: 'GET',
            url:  configurationEndpoint,
            data: {
              Version:    '2011-02-01',
              Action:     'DescribeIndexFields',
              DomainName: name
            },
            dataType: 'xml',
            success: function(data) {
              var fieldNames = [];
              $(data).find('IndexFields > member')
                .each(function(index) {
                  var field = $(this);
                  fieldNames.push(field.find('IndexFieldName').text());
                });
              domains.push({
                name: name,
                endpoint: endpoint,
                fieldNames: fieldNames
              });
            }
          });
        });
      var timer = setInterval(function() {
        if (domains.length == domainStatusMembers.size()) {
          // Now all DescribeIndexFields requests are done
          clearInterval(timer);
          App.domainsController.set('content', domains);
          if (domains.length > 0) {
            // set default domain
            App.set('currentDomain', domains[0]);
          }
        }
      }, 100);
    }
  });
});
