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
