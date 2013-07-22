var assert = require('assert');
require('./loader')('lib/session_view');

suite('SessionView', function() {
  test('added with no id', function(done) {
    var sv = new Meteor.SmartSessionView({
      sendAdded: function(coll, id, doc) {
        assert.equal(id, 'id');
        assert.deepEqual(doc, {aa: 10});
        done();
      }
    }, 'coll');

    sv.added('id', {aa: 10});
  });

  test('added with id', function(done) {
    var sv = new Meteor.SmartSessionView({
      sendChanged: function(coll, id, doc) {
        assert.equal(id, 'id');
        assert.deepEqual(doc, {aa: 10});
        done();
      }
    }, 'coll');

    sv._idMap['id'] = true;
    sv.added('id', {aa: 10});
  });

  test('changed with id', function(done) {
    var sv = new Meteor.SmartSessionView({
      sendChanged: function(coll, id, doc) {
        assert.equal(id, 'id');
        assert.deepEqual(doc, {aa: 10});
        done();
      }
    }, 'coll');

    sv._idMap['id'] = true;
    sv.changed('id', {aa: 10});
  });

  test('changed without id', function(done) {
    var sv = new Meteor.SmartSessionView({
      sendAdded: function(coll, id, doc) {
        assert.equal(id, 'id');
        assert.deepEqual(doc, {aa: 10});
        done();
      }
    }, 'coll');

    sv.changed('id', {aa: 10});
  });

  test('removed with id', function(done) {
    var sv = new Meteor.SmartSessionView({
      sendRemoved: function(coll, id, doc) {
        assert.equal(id, 'id');
        done();
      }
    }, 'coll');

    sv._idMap['id'] = true;
    sv.removed('id', {aa: 10});
  });

  test('removed without id', function(done) {
    var resultId;
    var sv = new Meteor.SmartSessionView({
      sendRemoved: function(coll, id) {
       resultId=id;
      }
    }, 'coll');

    sv.removed('id');
    assert.equal(resultId, null);
    done();
  });
});