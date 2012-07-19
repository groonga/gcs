module.exports = require('xmlbuilder');
module.exports.XMLFragment = require('xmlbuilder/lib/XMLFragment');

module.exports.XMLFragment.prototype.addFragment = function(fragments) {
  if (fragments) {
    if (!Array.isArray(fragments))
      fragments = [fragments];
    fragments.forEach(function(fragment) {
      fragment.parent = this;
      this.children.push(fragment);
    }, this);
  }
  return this;
};

// This is a workaround for the problem that text() does not work when empty string is given.
// https://github.com/oozcitak/xmlbuilder-js/pull/19
var originalToString = module.exports.XMLFragment.prototype.toString;
module.exports.XMLFragment.prototype.toString = function() {
  var string = originalToString.apply(this, arguments);
  return string.replace(/<\/>/g, '');
};
