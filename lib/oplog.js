Meteor.SmartOplog = {};
Meteor.SmartOplog.processor = function(err, op) {
  if(err) {
    console.error('error fetching oplog: ', err.message);
  } else {
    var collectionName = op.ns.split('.')[1];
    var collection = Meteor.SmartCollection.map[collectionName];
    if(collection) {
      if(op.op == 'i') {
        collection.opQueue.insert(op.o);
      } else if(op.op == 'u') {
        collection.opQueue.update(op.o2._id, op.o);
      } else if(op.op == 'd') {
        collection.opQueue.remove(op.o._id);
      }
    }
  }
};
