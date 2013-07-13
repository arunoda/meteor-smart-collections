var assert = require('assert');
global._ = require('../../../node_modules/underscore');
require('../loader')('lib/invalidator.js');

suite('Invalidator - cursor releated methods', function() {
  test('.addCursor() once', function() {
    var invalidator = new Meteor.SmartInvalidator.constructor();
    var cursor = {a: 10};
    invalidator.addCursor('coll1', cursor);
    assert.equal(invalidator._cursors['coll1'][0], cursor);
  });

  test('.addCursor() twice', function() {
    var invalidator = new Meteor.SmartInvalidator.constructor();
    var cursor = {a: 10};
    invalidator.addCursor('coll1', cursor);
    invalidator.addCursor('coll1', cursor);
    assert.equal(invalidator._cursors['coll1'][0], cursor);
    assert.equal(invalidator._cursors['coll1'].length, 1);
  });

  test('.removeCursor()', function() {
    var invalidator = new Meteor.SmartInvalidator.constructor();
    var cursor = {a: 10};
    invalidator._cursors['coll1'] = [cursor];
    invalidator.removeCursor('coll1', cursor);
    assert.equal(invalidator._cursors['coll1'].length, 0);
  });
});