var assert = require('assert');

suite('Cursor - Fields Filtering', function() {
  suite('fields variations', function() {
    //test variations of fields object
  });

  test('initial filtering', function(done, server) {
    var docs = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: 'aa', aa: 10, bb: 20});
      var docs = coll.find({}, {fields: {aa: 1}}).fetch();

      emit('return', docs);
    });

    assert.deepEqual(docs, [{_id: 'aa', aa: 10}]);
    done();
  });

  test('sending changes - added', function(done, server) {
    var docs = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var docs = [];
      coll.find({}, {fields: {aa: 1}}).observeChanges({
        added: function(id, doc) {
          docs.push(doc);
        }
      });
      coll.insert({_id: 'aa', aa: 10, bb: 20});

      setTimeout(function() {
        emit('return', docs);
      }, 10);
    });

    assert.deepEqual(docs, [{_id: 'aa', aa: 10}]);
    done();
  });

  test('sending changes - changed', function(done, server) {
    var docs = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var docs = [];
      coll.find({}, {fields: {aa: 1}}).observeChanges({
        added: function(id, doc) {
          docs.push(doc);
        },

        changed: function(id, doc) {
          docs.push(doc);
        }
      });

      coll.insert({_id: 'aa', aa: 10, bb: 20});
      coll.update({_id: 'aa'}, {$set: {aa: 30, bb: 40}});

      setTimeout(function() {
        emit('return', docs);
      }, 10);
    });

    assert.deepEqual(docs, [
      {_id: 'aa', aa: 10},
      {aa: 30}
    ]);
    done();
  });
});