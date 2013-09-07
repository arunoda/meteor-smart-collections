var assert = require('assert');

suite('Query - Cache', function() {
  suite('._getChanges', function() {
    test('new fields in newDoc', function(done, server) {
      var changes = server.evalSync(function() {
        var oldDoc = {aa: 10};
        var newDoc = {aa: 10, bb: 'cc'};

        var changes = Meteor.SmartQuery.prototype._getChanges(oldDoc, newDoc);
        emit('return', changes);
      });
      assert.deepEqual(changes, {bb: 'cc'});
      done();
    });

    test('changed fileds in newDoc', function(done, server) {
      var changes = server.evalSync(function() {
        var oldDoc = {aa: 10, bb: 'dd'};
        var newDoc = {aa: 10, bb: {a: 20}};

        var changes = Meteor.SmartQuery.prototype._getChanges(oldDoc, newDoc);
        emit('return', changes);
      });
      assert.deepEqual(changes, {bb: {a: 20}});
      done();
    });

    test('field not exists in the newDoc', function(done, server) {
      var changes = server.evalSync(function() {
        var oldDoc = {aa: 10, cc: 20};
        var newDoc = {aa: 10};

        var changes = Meteor.SmartQuery.prototype._getChanges(oldDoc, newDoc);
        emit('return', [_.keys(changes), changes.cc == undefined]);
      });
      assert.deepEqual(changes, [['cc'], true]);
      done();
    });
  });

  test('._rawAdded', function(done, server) {
    var results = server.evalSync(function() {
      var coll = new Meteor.SmartCollection('coll');
      var q = new Meteor.SmartQuery(coll, {});
      q._rawAdded({_id: 'aa', bb: 20});
      q._rawAdded({_id: 'bb', bb: 30});
      emit('return', q._docMap);
    });

    assert.deepEqual(results, {
      aa: {_id: 'aa', bb: 20},
      bb: {_id: 'bb', bb: 30}
    });
    done();
  });

  test('._rawRemoved', function(done, server) {
    var results = server.evalSync(function() {
      var coll = new Meteor.SmartCollection('coll');
      var q = new Meteor.SmartQuery(coll, {});
      q._rawAdded({_id: 'aa', bb: 20});
      q._rawAdded({_id: 'bb', bb: 30});
      q._rawRemoved('aa');
      emit('return', q._docMap);
    });

    assert.deepEqual(results, {
      bb: {_id: 'bb', bb: 30}
    });
    done();
  });

  suite('._rawChanges and cache', function() {
    test('adding new keys', function(done, server) {
      var results = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var q = new Meteor.SmartQuery(coll, {});
        q._rawAdded({_id: 'aa', bb: 20});
        q._rawChanged('aa', {cc: 30, dd: 40});
        emit('return', q._docMap);
      });

      assert.deepEqual(results, {
        aa: {_id: 'aa', bb: 20, cc: 30, dd: 40}
      });
      done();
    });

    test('update existing keys', function(done, server) {
      var results = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var q = new Meteor.SmartQuery(coll, {});
        q._rawAdded({_id: 'aa', bb: 20});
        q._rawChanged('aa', {bb: 30});
        emit('return', q._docMap);
      });

      assert.deepEqual(results, {
        aa: {_id: 'aa', bb: 30}
      });
      done();
    });

    test('remove keys', function(done, server) {
      var results = server.evalSync(function(done, server) {
        var coll = new Meteor.SmartCollection('coll');
        var q = new Meteor.SmartQuery(coll, {});
        q._rawAdded({_id: 'aa', bb: 20, jj: 50});
        q._rawChanged('aa', {jj: undefined});
        emit('return', q._docMap);
      });

      assert.deepEqual(results, {
        aa: {_id: 'aa', bb: 20}
      });
      done();
    });
  });
});