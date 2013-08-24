var assert = require('assert');

suite('Query - Changes', function() {
  test('added', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {});

      //just wait for getting connected
      coll.remove('no-id');
      
      var addedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        }
      });

      setTimeout(function() {
        query.added({_id: 'aa', bb: "20"});
        emit('return', [addedDocs]);
      }, 50);
    });

    assert.deepEqual(results, [
      [{_id: 'aa', bb: "20"}]
    ]);
    done();
  });

  test('added twice - same', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {});

      //just wait for getting connected
      coll.remove('no-id');
      
      var addedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        }
      });

      setTimeout(function() {
        query.added({_id: 'aa', bb: "20"});
        query.added({_id: 'aa', bb: "20"});
        emit('return', [addedDocs]);
      }, 50);
    });

    assert.deepEqual(results, [
      [{_id: 'aa', bb: "20"}]
    ]);
    done();
  });

  test('added twice - diff', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {});

      //just wait for getting connected
      coll.remove('no-id');
      
      var addedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        }
      });

      setTimeout(function() {
        query.added({_id: 'aa', bb: "20"});
        query.added({_id: 'bb', bb: "20"});
        emit('return', [addedDocs]);
      }, 50);
    });

    assert.deepEqual(results, [
      [{_id: 'aa', bb: "20"}, {_id: 'bb', bb: "20"}]
    ]);
    done();
  });

  test('changed', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {});

      //just wait for getting connected
      coll.remove('no-id');
      
      var addedDocs = [];
      var changedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        },
        changed: function(id, fields) {
          changedDocs.push([id, fields]);
        }
      });

      setTimeout(function() {
        query.added({_id: 'aa', bb: "20"});
        query.changed('aa', {dd: 30});
        emit('return', [addedDocs, changedDocs]);
      }, 50);
    });

    assert.deepEqual(results, [
      [{_id: 'aa', bb: "20"}],
      [['aa', {dd: 30}]]
    ]);
    done();
  });

  test('changed - not existing', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {});

      //just wait for getting connected
      coll.remove('no-id');
      
      var addedDocs = [];
      var changedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        },
        changed: function(id, fields) {
          changedDocs.push([id, fields]);
        }
      });

      setTimeout(function() {
        query.added({_id: 'aa', bb: "20"});
        query.changed('cc', {dd: 30});
        emit('return', [addedDocs, changedDocs]);
      }, 50);
    });

    assert.deepEqual(results, [
      [{_id: 'aa', bb: "20"}],
      []
    ]);
    done();
  });

  test('removed', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {});

      //just wait for getting connected
      coll.remove('no-id');
      
      var addedDocs = [];
      var removedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        },
        removed: function(id) {
          removedDocs.push(id);
        }
      });

      setTimeout(function() {
        query.added({_id: 'aa', bb: "20"});
        query.removed('aa');
        emit('return', [addedDocs, removedDocs]);
      }, 50);
    });

    assert.deepEqual(results, [
      [{_id: 'aa', bb: "20"}],
      ['aa']
    ]);
    done();
  });

  test('removed - not existing', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {});

      //just wait for getting connected
      coll.remove('no-id');
      
      var addedDocs = [];
      var removedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        },
        removed: function(id) {
          removedDocs.push(id);
        }
      });

      setTimeout(function() {
        query.added({_id: 'aa', bb: "20"});
        query.removed('dd');
        emit('return', [addedDocs, removedDocs]);
      }, 50);
    });

    assert.deepEqual(results, [
      [{_id: 'aa', bb: "20"}],
      []
    ]);
    done();
  });
});