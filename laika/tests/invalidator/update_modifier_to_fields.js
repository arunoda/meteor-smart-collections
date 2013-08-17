var assert = require('assert');
global._ = require('../../../node_modules/underscore');
require('../loader')('lib/invalidator.js');

suite('Invalidator - .updateModifierToFields()', function() {
  test('update only operations', function() {
    var modifier = {$set: {aa: 10, bb: 20}};
    var fields = new Meteor.SmartInvalidator.updateModifierToFields(modifier);
    assert.deepEqual(fields, {
      remove: {},
      update: {aa: 1, bb: 1}
    });
  });

  test('remove only operations', function() {
    var modifier = {$unset: {aa: 10, bb: 20}};
    var fields = new Meteor.SmartInvalidator.updateModifierToFields(modifier);
    assert.deepEqual(fields, {
      update: {},
      remove: {aa: 1, bb: 1}
    });
  });

  test('multiple operations', function() {
    var modifier = {
      $set: {aa: 10, bb: 20},
      $inc: {cc: 20}
    };
    var fields = new Meteor.SmartInvalidator.updateModifierToFields(modifier);
    assert.deepEqual(fields, {
      remove: {},
      update: {aa: 1, bb: 1, cc: 1}
    });
  });

  test('update and remove operations', function() {
    var modifier = {$unset: {aa: 10, bb: 20}, $push: {bb: [20], ck: 30}, $set: {k: 20, ck: 29}};
    var fields = new Meteor.SmartInvalidator.updateModifierToFields(modifier);
    assert.deepEqual(fields, {
      update: {bb: 1, ck: 1, k: 1},
      remove: {aa: 1, bb: 1}
    });
  });

  test('handling dot', function() {
    var modifier = {$unset: {'aa.uu': 10, bb: 20}};
    var fields = new Meteor.SmartInvalidator.updateModifierToFields(modifier);
    assert.deepEqual(fields, {
      update: {},
      remove: {aa: 1, bb: 1}
    });
  });

  test('no modifiers - just direct update', function() {
    var modifier = {aa: 10, bb: 10};
    var fields = new Meteor.SmartInvalidator.updateModifierToFields(modifier);
    assert.deepEqual(fields, {
      update: {aa: 1, bb: 1},
      remove: {}
    });
  });

  test('empty $set', function() {
    var modifier = {$set: {}};
    var fields = new Meteor.SmartInvalidator.updateModifierToFields(modifier);
    assert.deepEqual(fields, {
      remove: {},
      update: {}
    });
  });
});