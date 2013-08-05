var assert = require('assert');

suite('Transform Server', function() {
  suite('Collection Level', function() {
    test('findOne', function(done, server, client) {
      var doc = server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});
        coll.insert({_id: 'bb', bb: 20});

        var doc = coll.findOne('bb');
        emit('return', doc);
      });

      assert.deepEqual(doc, {_id: 'bb', bb: 20, aa: 20});
      done();
    });

    test('fetch', function(done, server, client) {
      var docs = server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});
        coll.insert({_id: 'bb', bb: 20});

        var docs = coll.find('bb').fetch();
        emit('return', docs);
      });

      assert.deepEqual(docs, [{_id: 'bb', bb: 20, aa: 20}]);
      done();
    });

    test('alllow - insert', function(done, server, client) {
      server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});

        coll.allow({
          insert: function(userId, doc) {
            emit('triggered', doc);
          }
        })
        emit('return');
      });

      server.on('triggered', function(doc) {
        assert.deepEqual(doc, {_id: 'bb', bb: 20, aa: 20});
        done();
      });

      client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'bb', bb: 20});
        emit('return');
      });
    });

    test('deny - update', function(done, server, client) {
      server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});

        coll.deny({
          update: function(userId, doc) {
            emit('triggered', doc);
          }
        })
        coll.insert({_id: 'bb'});
        emit('return');
      });

      server.on('triggered', function(doc) {
        assert.deepEqual(doc, {_id: 'bb', aa: 20});
        done();
      });

      client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.update('bb', {$set: {bb: 20}});
        emit('return');
      });

    });

    test('deny - remove', function(done, server, client) {
      server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});

        coll.deny({
          remove: function(userId, doc) {
            emit('triggered', doc);
          }
        })
        coll.insert({_id: 'bb'});
        emit('return');
      });

      server.on('triggered', function(doc) {
        assert.deepEqual(doc, {_id: 'bb', aa: 20});
        done();
      });

      client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.remove('bb');
        emit('return');
      });

    });
  });

  suite('Allow Level', function() {
    test('with null', function(done, server, client) {
      server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});

        var docs = [];
        coll.deny({
          insert: function(userId, doc) {
            docs.push(doc);
            return false;
          }
        });

        coll.allow({
          insert: function(userId, doc) {
            docs.push(doc);
            emit('triggered', docs);
          },
          transform: null
        })
        emit('return');
      });

      server.on('triggered', function(doc) {
        assert.deepEqual(doc, [
          {_id: 'bb', bb: 20, aa: 20},
          {_id: 'bb', bb: 20}
        ]);
        done();
      });

      client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'bb', bb: 20});
        emit('return');
      });
    });

    test('with transform', function(done, server, client) {
      server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});

        var docs = [];
        coll.deny({
          insert: function(userId, doc) {
            docs.push(doc);
            return false;
          }
        });

        coll.allow({
          insert: function(userId, doc) {
            docs.push(doc);
            emit('triggered', docs);
          },
          transform: function(doc) {
            doc.cx = cx.findOne('aa').aa;
            return doc;
          }
        })
        emit('return');
      });

      server.on('triggered', function(doc) {
        assert.deepEqual(doc, [
          {_id: 'bb', bb: 20, aa: 20},
          {_id: 'bb', bb: 20, cx: 20}
        ]);
        done();
      });

      client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'bb', bb: 20});
        emit('return');
      });
    });
  });

  suite('Deny Level', function() {
    test('with null', function(done, server, client) {
      server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});

        var docs = [];
        coll.deny({
          insert: function(userId, doc) {
            docs.push(doc);
            return false;
          },
          transform: null
        });

        coll.allow({
          insert: function(userId, doc) {
            docs.push(doc);
            emit('triggered', docs);
          }
        })
        emit('return');
      });

      server.on('triggered', function(doc) {
        assert.deepEqual(doc, [
          {_id: 'bb', bb: 20},
          {_id: 'bb', bb: 20, aa: 20}
        ]);
        done();
      });

      client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'bb', bb: 20});
        emit('return');
      });
    });

    test('with transform', function(done, server, client) {
      server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});

        var docs = [];
        coll.deny({
          insert: function(userId, doc) {
            docs.push(doc);
            return false;
          },
          transform: function(doc) {
            doc.cx = cx.findOne('aa').aa;
            return doc;
          }
        });

        coll.allow({
          insert: function(userId, doc) {
            docs.push(doc);
            emit('triggered', docs);
          }
        })
        emit('return');
      });

      server.on('triggered', function(doc) {
        assert.deepEqual(doc, [
          {_id: 'bb', bb: 20, cx: 20},
          {_id: 'bb', bb: 20, aa: 20}
        ]);
        done();
      });

      client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'bb', bb: 20});
        emit('return');
      });
    });
  });

  suite('findOne Level', function() {
    test('with null', function(done, server, client) {
      var doc = server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});
        coll.insert({_id: 'bb', bb: 20});

        var doc = coll.findOne('bb', {transform: null});
        emit('return', doc);
      });

      assert.deepEqual(doc, {_id: 'bb', bb: 20});
      done();
    });

    test('with transform', function(done, server, client) {
      var doc = server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});
        coll.insert({_id: 'bb', bb: 20});

        var doc = coll.findOne('bb', {transform: function(doc) {
          doc.cx = cx.findOne('aa').aa;
          return doc;
        }});
        emit('return', doc);
      });

      assert.deepEqual(doc, {_id: 'bb', bb: 20, cx: 20});
      done();
    });
  });

  suite('find Level', function() {  
    test('with null', function(done, server, client) {
      var docs = server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});
        coll.insert({_id: 'bb', bb: 20});

        var docs = coll.find('bb', {transform: null}).fetch();
        emit('return', docs);
      });

      assert.deepEqual(docs, [{_id: 'bb', bb: 20}]);
      done();
    });

    test('with transform', function(done, server, client) {
      var docs = server.evalSync(function() {
        cx = new Meteor.SmartCollection('cx');
        cx.insert({_id: 'aa', aa: 20});

        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.aa = cx.findOne('aa').aa;
          return doc;
        }});
        coll.insert({_id: 'bb', bb: 20});

        var docs = coll.find('bb', {transform: function(doc) {
          doc.cx = cx.findOne('aa').aa;
          return doc;
        }}).fetch();
        emit('return', docs);
      });

      assert.deepEqual(docs, [{_id: 'bb', bb: 20, cx: 20}]);
      done();
    });
  });


});