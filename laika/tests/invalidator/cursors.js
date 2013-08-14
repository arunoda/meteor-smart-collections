var assert = require('assert');
global._ = require('../../../node_modules/underscore');
global.EJSON = { equals: require('../../../node_modules/deep-equal') };
require('../loader')('lib/invalidator.js');

suite('Invalidator - cursor releated methods', function() {
  test('.addCursor() once', function() {
    var invalidator = new Meteor.SmartInvalidator();
    var cursor = {a: 10};
    invalidator.addCursor(cursor);
    assert.equal(invalidator._cursors[0], cursor);
  });

  test('.addCursor() twice', function() {
    var invalidator = new Meteor.SmartInvalidator();
    var cursor = {a: 10};
    invalidator.addCursor(cursor);
    invalidator.addCursor(cursor);
    assert.equal(invalidator._cursors[0], cursor);
    assert.equal(invalidator._cursors.length, 1);
  });

  test('.removeCursor()', function() {
    var invalidator = new Meteor.SmartInvalidator();
    var cursor = {a: 10};
    invalidator._cursors = [cursor];
    invalidator.removeCursor(cursor);
    assert.equal(invalidator._cursors.length, 0);
  });

  test('add cursor to the selector', function() {
    var invalidator = new Meteor.SmartInvalidator();
    var cursor = {a: 10, _selector: {aa: 10}};
    invalidator.addCursor(cursor);

    assert.deepEqual(invalidator._selectors, [{selector: cursor._selector, cursors: [cursor]}]);
  });

  test('add two cursors to the same selector', function() {
    var invalidator = new Meteor.SmartInvalidator();
    var cursor = {a: 10, _selector: {aa: 10}};
    var cursor2 = {a: 11, _selector: {aa: 10}};
    invalidator.addCursor(cursor);
    invalidator.addCursor(cursor2);

    assert.deepEqual(invalidator._selectors, [{selector: cursor._selector, cursors: [cursor, cursor2]}]);
  });

  test('add two cursors to two selectors', function() {
    var invalidator = new Meteor.SmartInvalidator();
    var cursor = {a: 10, _selector: {aa: 10}};
    var cursor2 = {a: 11, _selector: {bb: 10}};

    invalidator.addCursor(cursor);
    invalidator.addCursor(cursor2);

    assert.deepEqual(invalidator._selectors, [
      {selector: cursor._selector, cursors: [cursor]},
      {selector: cursor2._selector, cursors: [cursor2]},
    ]);
  });

  test('remove single cursor from a selector', function() {
    var invalidator = new Meteor.SmartInvalidator();
    var cursor = {a: 10, _selector: {aa: 10}};
    var cursor2 = {a: 11, _selector: {aa: 10}};
    invalidator.addCursor(cursor);
    invalidator.addCursor(cursor2);
    invalidator.removeCursor(cursor);

    assert.deepEqual(invalidator._selectors, [
      {selector: cursor._selector, cursors: [cursor2]}
    ]);
  });

  test('remove cursor and the selector', function() {
    var invalidator = new Meteor.SmartInvalidator();
    var cursor = {a: 10, _selector: {aa: 10}};
    var cursor2 = {a: 11, _selector: {bb: 10}};

    invalidator.addCursor(cursor);
    invalidator.addCursor(cursor2);
    invalidator.removeCursor(cursor);

    assert.deepEqual(invalidator._selectors, [
      {selector: cursor2._selector, cursors: [cursor2]}
    ]);
  });
});