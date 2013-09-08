Meteor.SmartOplog = {};
Meteor.SmartOplog.processor = function(op) {
  if(op.op == 'c' && op.o.drop) {
    //handling drop support
    var droppedCollection = op.o.drop;
    handleDropOp(droppedCollection);
  } else {
    var collectionName = op.ns.split('.')[1];
    handleNormalOP(collectionName, op);
  }
};

function handleNormalOP(collectionName, op) {
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

function handleDropOp(collectionName) {
  var collection = Meteor.SmartCollection.map[collectionName];
  if(collection) {
    collection.opQueue.multiRemove({});
  }
}
