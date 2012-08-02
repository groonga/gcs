function parse(stringAddress) {
  var parsed = 0;
  stringAddress
    .split('.')
    .reverse()
    .forEach(function(part, index) {
      // don't use bitshift, because 32bit 1xxxxxxx-Fxxxxxxx becomes negative number.
      parsed += parseInt(part) * Math.pow(2, index * 8);
    });
  return parsed;
}
exports.parse = parse;

function stringify(integerAddress) {
  var parts = [];
  for (var i = 0, maxi = 4, part; i < maxi; i++) {
    parts.push(integerAddress & 255);
    integerAddress = integerAddress >> 8;
  }
  return parts.reverse().join('.');
}
exports.stringify = stringify;

var no32bit = '00000000000000000000000000000000';
var all32bit = '11111111111111111111111111111111';

function isInRange(stringAddress, stringNetworkAddress) {
  var networkAndMask = stringNetworkAddress.split('/');

  var network = parse(networkAndMask[0]).toString(2);
  network = (no32bit + network).substr(-32);

  var mask = networkAndMask[1];
  if (mask.indexOf('.') < 0) {
    mask = (all32bit.substr(0, parseInt(mask)) + no32bit).substr(0, 32);
  } else {
    mask = parse(mask).toString(2);
  }

  var address = parse(stringAddress).toString(2);
  address = (no32bit + address).substr(-32);

  for (var i = 0, maxi = 32; i < maxi; i++) {
    if (mask[i] == '1' && network[i] != address[i])
      return false;
  }
  return true;
}
exports.isInRange = isInRange;
