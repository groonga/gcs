function renderResults(data, perPage) {
  var template = $('script#results-template').text();
  var rendered = jade.compile(template)(data);
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
  var template = $('script#request-information-template').text();
  var rendered = jade.compile(template)(data);
  $('#request-information').html(rendered);
}

function searchExecute() {
  var query = $('form#search input[name="query"]').val();
  var domain = $('form#domain input[name="domain-name"]').val();
  var searchEndpoint = 'http://search-' + domain + '-00000000000000000000000000.localhost:7575/2011-02-01/search';
  var perPage = 5;
  var start = parseInt($('form#search input[name="start"]').val() || '0', 10);
  var params = {q: query, size: perPage, start: start};
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
  $('form#domain').submit(searchExecute);
  $('form#search').submit(searchExecute);
});
