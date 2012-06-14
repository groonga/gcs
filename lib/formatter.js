exports.formatResults = function(results) {
  var columns = {};
  results[0].forEach(function(column, index) {
    columns[index] = column[0];
  });

  var hashResults = [];
  results.slice(1).forEach(function(result) {
    var hashResult = {};
    result.forEach(function(column, index) {
      hashResult[columns[index]] = column;
    });
    hashResults.push(hashResult);
  });
  return hashResults;
};
