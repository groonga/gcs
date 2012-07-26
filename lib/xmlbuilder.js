module.exports = require('xmlbuilder');
var XMLFragment = require('xmlbuilder/lib/XMLFragment');
module.exports.XMLFragment = XMLFragment;

XMLFragment.prototype.fragment = function(fragments) {
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

XMLFragment.prototype.importXMLBuilder = function(xmlbuilder) {
  var root = xmlbuilder.children[xmlbuilder.children.length-1];
  var clonedRoot = root.clone(true);
  clonedRoot.parent = this;
  this.children.push(clonedRoot);
  clonedRoot.isRoot = false;
  return this;
};

XMLFragment.prototype.clone = function(deep) {
  var fragment = new XMLFragment(this.parent, this.name, this.attributes, this.value);
  if (deep) {
    this.children.forEach(function(child) {
      var clonedChild = child.clone(deep);
      clonedChild.parent = fragment;
      fragment.children.push(clonedChild);
    }, this);
  }
  return this;
};
