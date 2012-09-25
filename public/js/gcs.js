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
  content: [],
  query: null,
  perPage: 5,
  start: 0,
  data: null,
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
  urlForRawRequest: function() {
    var domain = App.currentDomain;
    var searchEndpoint = 'http://' + domain.endpoint + '/2011-02-01/search';
    var params = this.get('paramsForRequest');
    var urlForRawRequest = searchEndpoint + '?' + jQuery.param(params);
    return urlForRawRequest;
  }.property('paramsForRequest'),
  paramsForRequest: function() {
    var domain = App.currentDomain;
    var query = this.get('query');
    var start = this.get('start');
    var params = {
      q:     query,
      size:  this.get('perPage'),
      start: start,
      'return-fields': domain.fieldNames ? domain.fieldNames.join(',') : []
    };
    return params;
  }.property('query', 'perPage', 'start', 'App.currentDomain'),
  executeSearch: function(query) {
    var domain = App.currentDomain;
    var searchEndpoint = 'http://' + domain.endpoint + '/2011-02-01/search';

    var params = this.get('paramsForRequest');
    var self = this;
    $.ajax({
      type: 'GET',
      url: searchEndpoint,
      data: params,
      dataType: 'jsonp',
      success: function(data) {
        self.set('data', data);
      }
    });
  }
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
    controller.executeSearch(query);

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
