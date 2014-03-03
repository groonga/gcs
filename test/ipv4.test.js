var utils = require('./test-utils');
var assert = require('chai').assert;

var ipv4 = require('../lib/ipv4');

suite('ipv4', function() {
  function testParse(expected, source) {
    test('parse(' + source + ') => ' + expected.toString(16), function() {
      var actual = ipv4.parse(source);
      assert.equal(actual.toString(16), expected.toString(16));
    });
  }
  testParse(0x00000000, '0.0.0.0');
  testParse(0x7f000001, '127.0.0.1');
  testParse(0xc0a80000, '192.168.0.0');
  testParse(0xc0a800ff, '192.168.0.255');
  testParse(0xc0a8ff00, '192.168.255.0');
  testParse(0xc0a8ffff, '192.168.255.255');
  testParse(0xffffffff, '255.255.255.255');

  function testStringify(expected, source) {
    test('stringify(' + source.toString(16) + ') => ' + expected, function() {
      var actual = ipv4.stringify(source);
      assert.equal(actual, expected);
    });
  }
  testStringify('0.0.0.0',         0x00000000);
  testStringify('127.0.0.1',       0x7f000001);
  testStringify('192.168.0.0',     0xc0a80000);
  testStringify('192.168.0.255',   0xc0a800ff);
  testStringify('192.168.255.0',   0xc0a8ff00);
  testStringify('192.168.255.255', 0xc0a8ffff);
  testStringify('255.255.255.255', 0xffffffff);

  function testIsInRange(address, network) {
    test('is in range: ' + address + ' vs ' + network, function() {
      assert.isTrue(ipv4.isInRange(address, network));
    });
  }
  testIsInRange('127.0.0.0',       '127.0.0.0/8');
  testIsInRange('127.0.255.255',   '127.0.0.0/8');
  testIsInRange('192.168.0.0',     '192.168.0.0/16');
  testIsInRange('192.168.255.255', '192.168.0.0/16');
  testIsInRange('192.168.0.0',     '192.168.0.0/24');
  testIsInRange('192.168.0.255',   '192.168.0.0/24');
  testIsInRange('192.168.0.0',     '192.168.0.0/255.255.255.0');
  testIsInRange('192.168.0.255',   '192.168.0.0/255.255.255.0');

  function testIsOutOfRange(address, network) {
    test('is out of range: ' + address + ' vs ' + network, function() {
      assert.isFalse(ipv4.isInRange(address, network));
    });
  }
  testIsOutOfRange('126.255.0.0',     '127.0.0.0/8');
  testIsOutOfRange('128.0.0.0',       '127.0.0.0/8');
  testIsOutOfRange('192.167.255.0',   '192.168.0.0/16');
  testIsOutOfRange('192.169.0.0',     '192.168.0.0/16');
  testIsOutOfRange('192.167.255.255', '192.168.0.0/24');
  testIsOutOfRange('192.168.1.0',     '192.168.0.0/24');
  testIsOutOfRange('192.167.255.0',   '192.168.0.0/255.255.255.0');
  testIsOutOfRange('192.169.0.1',     '192.168.0.0/255.255.255.0');
});
