module.exports = require('xmlbuilder');
module.exports.XMLFragment = require('xmlbuilder/lib/XMLFragment');
module.exports.XMLFragment.prototype.addFragment = function(fragment) {
  fragment.parent = this;
  this.children.push(fragment);
  return this;
};
