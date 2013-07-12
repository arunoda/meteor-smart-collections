var assert = require('assert');
require('./loader');

suite('Invalidator - cursor releated methods', function() {
  test('.addCursor() once', function() {
    var invalidator = new Meteor.SmartInvalidator.constructor();
    var cursor = {a: 10};
    invalidator.addCursor(cursor);
    assert.equal(invalidator._cursors[0], cursor);
  });

  test('.addCursor() twice', function() {
    var invalidator = new Meteor.SmartInvalidator.constructor();
    var cursor = {a: 10};
    invalidator.addCursor(cursor);
    invalidator.addCursor(cursor);
    assert.equal(invalidator._cursors[0], cursor);
    assert.equal(invalidator._cursors.length, 1);
  });

  test('.removeCursor()', function() {
    var invalidator = new Meteor.SmartInvalidator.constructor();
    var cursor = {a: 10};
    invalidator._cursors.push(cursor);
    invalidator.removeCursor(cursor);
    assert.equal(invalidator._cursors.length, 0);
  });
});