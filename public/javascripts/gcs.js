function renderResults(data) {
  var template = $('script#table-template').text();
  var rendered = jade.compile(template)(data);
  $(results).html(rendered);
}

$(document).ready(function($) {
  $('form.search').submit(function() {
    var query = $('form.search input[name="query"]').val();

    $.ajax({
      type: 'GET',
      url: 'http://search-companies-example.localhost:3000/2011-02-01/search', // TODO
      data: {q: query},
      dataType: 'jsonp',
      success: function(data) {
        renderResults(data);
      }
    });
    return false;
  });
});
