var assert = require('assert');
require('./loader')('lib/validator');

suite('Validator', function() {
  test('logic - no deny - first allow', function() {
    var v = new Meteor.SmartValidator();
    v.register('deny', function() { return false; });
    v.register('deny', function() { return false; });
    v.register('allow', function() { return true; });

    assert.equal(v.evaluate(), true);
  });

  test('logic - no deny - last allow', function() {
    var v = new Meteor.SmartValidator();
    v.register('deny', function() { return false; });
    v.register('deny', function() { return false; });
    v.register('allow', function() { return false; });
    v.register('allow', function() { return true; });

    assert.equal(v.evaluate(), true);
  });

  test('logic - first deny', function() {
    var v = new Meteor.SmartValidator();
    v.register('deny', function() { return true; });
    v.register('deny', function() { return false; });
    v.register('allow', function() { return true; });

    assert.equal(v.evaluate(), false);
  });

  test('logic - no deny - n/e allow', function() {
    var v = new Meteor.SmartValidator();
    v.register('deny', function() { return false; });
    v.register('deny', function() { return false; });

    assert.equal(v.evaluate(), false);
  });

  test('logic - n/e deny - first allow', function() {
    var v = new Meteor.SmartValidator();
    v.register('allow', function() { return true; })

    assert.equal(v.evaluate(), true);
  });

  test('logic - n/e deny - n/e allow', function() {
    var v = new Meteor.SmartValidator();

    assert.equal(v.evaluate(), false);
  });

  test('getting args for deny', function(done) {
    var v = new Meteor.SmartValidator();

    v.register('deny', function(userId, doc) {
      assert.equal(userId, 'abc');
      assert.deepEqual(doc, {aa: 10});
      done();
    });

    v.evaluate(['abc', {aa: 10}], ['abc', {aa: 10}]);
  });

  test('getting args for allow', function(done) {
    var v = new Meteor.SmartValidator();

    v.register('allow', function(userId, doc) {
      assert.equal(userId, 'abc');
      assert.deepEqual(doc, {aa: 10});
      done();
    });

    v.evaluate(['abc', {aa: 10}], ['abc', {aa: 10}]);
  });

  test('n/e any - defaultResult == true', function() {
    var v = new Meteor.SmartValidator(true);

    assert.equal(v.evaluate(), true);
  });

  test('has deny - defaultResult == true', function() {
    var v = new Meteor.SmartValidator(true);
    v.register('deny', function() { return false; });
    assert.equal(v.evaluate(), false);
  });


  test('n/e any - defaultResult == false', function() {
    var v = new Meteor.SmartValidator(false);

    assert.equal(v.evaluate(), false);
  });
  
  test('change defaultResult later', function() {
    var v = new Meteor.SmartValidator(true);
    v.setDefaultResult(false);
    assert.equal(v.evaluate(), false);
  });
});