var assert = require('assert');
require('./loader')('lib/oplog.js');

suite('Oplog Processor', function() {
  test('insert', function(done) {
    var op = {
      "ns" : "db.aa",
      "op": 'i',
      "o" : {
        "_id" : 'the-id',
        "a" : 100
      }
    };

    Meteor.SmartCollection = {
      map: {
        aa: {
          opQueue: {
            insert: function(doc) {
              assert.deepEqual(doc, {_id: 'the-id', a: 100});
              done();
            }
          }
        }
      }
    };

    Meteor.SmartOplog.processor(op);
  });

  test('update', function(done) {
    var op = {
      "ns" : "db.aa",
      "op": 'u',
      "o2" : {
        "_id" : 'the-id'
      },
      "o" : {
        "$set" : {
          "b" : 300
        }
      }
    };

    Meteor.SmartCollection = {
      map: {
        aa: {
          opQueue: {
            update: function(id, modifier) {
              assert.equal(id, 'the-id');
              assert.deepEqual(modifier, {$set: {b: 300}});
              done();
            }
          }
        }
      }
    };

    Meteor.SmartOplog.processor(op);
  });

  test('remove', function(done) {
    var op = {
      "ns" : "db.aa",
      "op": 'd',
      "o" : {
        "_id" : 'the-id'
      }
    };

    Meteor.SmartCollection = {
      map: {
        aa: {
          opQueue: {
            remove: function(id) {
              assert.equal(id, 'the-id');
              done();
            }
          }
        }
      }
    };

    Meteor.SmartOplog.processor(op);
  });

  test('drop', function(done) {
    var op = {
      "ns" : "db.$cmd",
      "op": 'c',
      "o" : {
        "drop" : 'aa'
      }
    };

    Meteor.SmartCollection = {
      map: {
        aa: {
          opQueue: {
            multiRemove: function(selector) {
              assert.deepEqual(selector, {});
              done();
            }
          }
        }
      }
    };

    Meteor.SmartOplog.processor(op);
  });
});