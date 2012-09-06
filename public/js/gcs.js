$(document).ready(function($) {
  var App = Ember.Application.create();

  App.ApplicationController = Ember.Controller.extend();

  App.ApplicationView = Ember.View.extend({
    templateName: 'application'
  });

  App.IndexView = Ember.View.extend({
    templateName: 'index'
  });

  App.SearchView = Ember.View.extend({
    templateName: 'search'
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
  App.initialize();
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
  $('#showing').text('Showing ' + from + ' to ' + to + ' of ' + found + ' Results');
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
      $(data).find('DomainStatusList > member')
        .each(function(index) {
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
              var option = $("<option/>")
                    .text(name)
                    .attr('value', endpoint)
                    .attr('data-field-names', fieldNames.join(','));
              $('#domain-and-id').append(option);
            }
          });
        });
    }
  });
});
