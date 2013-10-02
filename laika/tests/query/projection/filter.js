var assert = require('assert');
require('../../common');
global._ = require('../../../../node_modules/underscore');
require('../../loader')('lib/projector');

suite('Projecor.filter', function() {
  test('without field filtering', function() {
    var projector = new Meteor.SmartProjector({});
    var filetedObject = projector.filter({aa: 10, bb: 20, _id: 1});
    assert.deepEqual(filetedObject, {_id: 1, aa: 10, bb: 20});
  });

  test('with include', function() {
    var projector = new Meteor.SmartProjector({}, {aa: 1, bb: 1});
    var filetedObject = projector.filter({aa: 10, bb: 20, cc: 20, _id: 1});
    assert.deepEqual(filetedObject, {_id: 1, aa: 10, bb: 20});
  });

  test('with include nested', function() {
    var projector = new Meteor.SmartProjector({}, {aa: 1, "bb.kk": 1});
    var filetedObject = projector.filter({aa: 10, bb: {kk: 20, ff: 40}, cc: 20, _id: 1});
    assert.deepEqual(filetedObject, {_id: 1, aa: 10, bb: {kk: 20}});
  });

  test('with include and exclude _id', function() {
    var projector = new Meteor.SmartProjector({}, {aa: 1, bb: 1, _id: 0});
    var filetedObject = projector.filter({aa: 10, bb: 20, cc: 20, _id: 1});
    assert.deepEqual(filetedObject, {aa: 10, bb: 20});
  });

  test('with exclude', function() {
    var projector = new Meteor.SmartProjector({}, {aa: 0, bb: 0});
    var filetedObject = projector.filter({aa: 10, bb: 20, cc: 20, _id: 1});
    assert.deepEqual(filetedObject, {cc: 20, _id: 1});
  });

  test('with exclude with nested', function() {
    var projector = new Meteor.SmartProjector({}, {aa: 0, "bb.cc": 0});
    var filetedObject = projector.filter({aa: 10, bb: {kk: 30, cc: 45}, cc: 20, _id: 1});
    assert.deepEqual(filetedObject, {cc: 20, _id: 1, bb: {kk: 30}});
  });

  suite('._pick', function() {
    test('pick first class field', function() {
      var doc = {aa: 10, bb: 20};
      var fileterFields = ['aa'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {aa: 10});
    });

    test('pick first class field - but not exists', function() {
      var doc = {bb: 20};
      var fileterFields = ['aa'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {});
    });

    test('pick nested field', function() {
      var doc = {aa: {cc: 10, ff: 13}, bb: 20};
      var fileterFields = ['aa.cc'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 10}});
    });

    test('pick nested field - full and half', function() {
      var doc = {aa: {cc: 10, ff: 13}, bb: 20};
      var fileterFields = ['aa', 'aa.ff'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 10, ff: 13}});
    });

    test('pick nested field - same parent', function() {
      var doc = {aa: {cc: 10, ff: 13, kk: 40}, bb: 20};
      var fileterFields = ['aa.cc', 'aa.kk'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 10, kk: 40}});
    });

    test('pick nested field - different parents', function() {
      var doc = {aa: {cc: 10, ff: 13, kk: 40}, bb: {y: 20, g: 10}};
      var fileterFields = ['aa.cc', 'bb.g'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 10}, bb: {g: 10}});
    });

    test('pick nested field - boolean value', function() {
      var doc = {aa: {cc: true, ff: 13, kk: 40}, bb: {y: 20, g: 10}};
      var fileterFields = ['aa.cc', 'bb.g'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: true}, bb: {g: 10}});
    });

    test('pick nested field - arrays ', function() {
      var doc = {aa: {cc: [10, 20], ff: 13, kk: 40}, bb: {y: 20, g: 10}};
      var fileterFields = ['aa.cc', 'bb.g'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: [10, 20]}, bb: {g: 10}});
    });

    test('pick nested field - manually set undefined ', function() {
      var doc = {aa: {cc: [10, 20], ff: 13, kk: 40}, bb: {y: 20, g: undefined}};
      var fileterFields = ['aa.cc', 'bb.g'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: [10, 20]}, bb: {g: undefined}});
    });

    test('pick nested field - not exists at end', function() {
      var doc = {aa: {cc: 10, ff: 13}, bb: 20};
      var fileterFields = ['aa.kk'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {});
    });

    test('pick nested field - not exists at middle', function() {
      var doc = {aa: {cc: 10, ff: 13}, bb: 20};
      var fileterFields = ['aa.kk.hhs'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {});
    });

    test('pick nested field - not exists at first', function() {
      var doc = {aa: {cc: 10, ff: 13}, bb: 20};
      var fileterFields = ['non.kk.hhs'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {});
    });

    test('pick nested field - not exists - with numbers', function() {
      var doc = {aa: {cc: 10}, bb: 20};
      var fileterFields = ['non.cc.hhs'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {});
    });

    test('pick nested field - not exits - with boolean', function() {
      var doc = {aa: {cc: false}, bb: 20};
      var fileterFields = ['non.cc.hhs'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {});
    });

    test('pick nested field - not exits - with array', function() {
      var doc = {aa: {cc: []}, bb: 20};
      var fileterFields = ['non.cc.hhs'];
      var picked = Meteor.SmartProjector.prototype._pick(doc, fileterFields);
      assert.deepEqual(picked, {});
    });
  });

  suite('._omit', function() {
    test('omit first class field', function() {
      var doc = {aa: 10, bb: 20};
      var fileterFields = ['aa'];
      var picked = Meteor.SmartProjector.prototype._omit(doc, fileterFields);
      assert.deepEqual(picked, {bb: 20});
    });

    test('nested field', function() {
      var doc = {aa: {cc: 20, aa: 50}, bb: 20};
      var fileterFields = ['aa.aa'];
      var picked = Meteor.SmartProjector.prototype._omit(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 20}, bb: 20});
    });

    test('nested field with null', function() {
      var doc = {aa: {cc: 20, aa: null}, bb: 20};
      var fileterFields = ['aa.aa'];
      var picked = Meteor.SmartProjector.prototype._omit(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 20}, bb: 20});
    });

    test('nested field with false', function() {
      var doc = {aa: {cc: 20, aa: false}, bb: 20};
      var fileterFields = ['aa.aa'];
      var picked = Meteor.SmartProjector.prototype._omit(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 20}, bb: 20});
    });

    test('nested field with true', function() {
      var doc = {aa: {cc: 20, aa: true}, bb: 20};
      var fileterFields = ['aa.aa'];
      var picked = Meteor.SmartProjector.prototype._omit(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 20}, bb: 20});
    });

    test('nested field with array', function() {
      var doc = {aa: {cc: 20, aa: 10}, bb: 20};
      var fileterFields = ['aa.aa'];
      var picked = Meteor.SmartProjector.prototype._omit(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 20}, bb: 20});
    });

    test('nested field - not exist', function() {
      var doc = {aa: {cc: 20, aa: false}, bb: 20};
      var fileterFields = ['aa.gdg'];
      var picked = Meteor.SmartProjector.prototype._omit(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 20, aa: false}, bb: 20});
    });

    test('nested field - not exist - with boolean', function() {
      var doc = {aa: {cc: 20, aa: false}, bb: 20};
      var fileterFields = ['aa.aa.dfr'];
      var picked = Meteor.SmartProjector.prototype._omit(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 20, aa: false}, bb: 20});
    });

    test('nested field - not exist - with boolean', function() {
      var doc = {aa: {cc: 20, aa: undefined}, bb: 20};
      var fileterFields = ['aa.aa.dfr'];
      var picked = Meteor.SmartProjector.prototype._omit(doc, fileterFields);
      assert.deepEqual(picked, {aa: {cc: 20, aa: undefined}, bb: 20});
    });
  });
});