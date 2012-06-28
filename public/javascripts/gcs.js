function renderResults(data) {
  var template = $('script#results-template').text();
  var rendered = jade.compile(template)(data);
  $('#results').html(rendered);
}

function renderRequestInformation(data) {
  var template = $('script#request-information-template').text();
  var rendered = jade.compile(template)(data);
  $('#request-information').html(rendered);
}

function onSearch() {
  var query = $('form#search input[name="query"]').val();
  var domain = $('form#domain input[name="domain-name"]').val();
  var searchEndpoint = 'http://search-' + domain + '-00000000000000000000000000.localhost:3000/2011-02-01/search';
  var params = {q: query};
  var urlForRawRequest = searchEndpoint + '?' + jQuery.param(params);
  renderRequestInformation({urlForRawRequest: urlForRawRequest});

  $('#results').hide();
  $.ajax({
    type: 'GET',
    url: searchEndpoint,
    data: params,
    dataType: 'jsonp',
    success: function(data) {
      renderResults(data);
      $('#results').show();
    }
  });
  return false;
}

$(document).ready(function($) {
  $('form#domain').submit(onSearch);
  $('form#search').submit(onSearch);
});
