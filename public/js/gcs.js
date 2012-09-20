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

App.SearchController = Ember.ObjectController.extend({
  content: null,
  query: null,
  perPage: 5,
  start: 0,
  numEnd: null,
  numHits: null,
  resultsAvailable: null,
  searched: false,
  numStart: function() {
    return this.get('start') + 1;
  }.property('start'),
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

    var perPage = this.get('perPage');
    var params = this.get('paramsForRequest');
    var start = this.get('start');
    var self = this;
    $.ajax({
      type: 'GET',
      url: searchEndpoint,
      data: params,
      dataType: 'jsonp',
      success: function(data) {
        self.set('searched', true);
        self.set('resultsAvailable', data.hits.found > 0);
        self.set('numHits', data.hits.found);
        self.set('numEnd', start + data.hits.found);
        renderResults(data, perPage);
        $('#results').show();
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

function renderResults(data, perPage) {
  var rendered = JST['results'](data);
  var found = data.hits.found;
  var start = data.hits.start;
  var returned = data.hits.hit.length;
  var nextStart = start + perPage;
  var previousStart = data.hits.start - perPage;
  $('#results').html(rendered);

  if (previousStart < 0) {
    $('#pager .previous').addClass('disabled');
    $('#pager .previous a').click(function() { return false; });
  } else {
    $('#pager .previous a').click(function() {
      $('form#search input[name="start"]').val(previousStart);
      searchExecute();
    });
  }

  if (nextStart >= data.hits.found) {
    $('#pager .next').addClass('disabled');
    $('#pager .previous a').click(function() { return false; });
  } else {
    $('#pager .next a').click(function() {
      $('form#search input[name="start"]').val(nextStart);
      searchExecute();
    });
  }

  var from = start + 1;
  var to = start + returned;
}

function renderRequestInformation(data) {
  var rendered = JST['request_information'](data);
  $('#request-information').html(rendered);
}

function searchExecute() {
  var query = $('form#search input[name="query"]').val();
  var domains = $('#domain-and-id');
  var domain = domains.find('option[value="' + domains.val() + '"]');
  var searchEndpoint = 'http://' + domain.attr('value') + '/2011-02-01/search';
  var fields = domain.attr('data-field-names');
  var perPage = 5;
  var start = parseInt($('form#search input[name="start"]').val() || '0', 10);
  var params = {
        q:     query,
        size:  perPage,
        start: start,
        'return-fields': fields
      };
  var urlForRawRequest = searchEndpoint + '?' + jQuery.param(params);
  renderRequestInformation({urlForRawRequest: urlForRawRequest});

  $('#results').empty();
  $.ajax({
    type: 'GET',
    url: searchEndpoint,
    data: params,
    dataType: 'jsonp',
    success: function(data) {
      renderResults(data, perPage);
      $('#results').show();
    }
  });
  return false;
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
