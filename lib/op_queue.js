// OpQueue is a queue implemetation for MongoDB write operations invalidations
// It queues updates for a given id
// If a selector based update or remove happning whole collection invalidation will be blocked

function OpQueue(invalidator) {
  this._debug = Npm.require('debug')('sc:opq:' + invalidator._collection.name);
  this._invalidator =  invalidator;
  this._idUpdateQueues = {};
  
  this._globalQueue = [];
  this._multiProcessing = false;
  this._debug('created');
}

OpQueue.prototype.insert = function(doc) {
  this._debug('insert doc:%j', doc);
  this._invalidator.insert(doc);
};

OpQueue.prototype.remove = function(id) {
  this._debug('remove id:%s', id);
  if(this._idUpdateQueues[id]) {
    this._idUpdateQueues[id].stop();
    delete this._idUpdateQueues[id];
  }
  this._invalidator.remove(id);
};

OpQueue.prototype.update = function(id, modifier) {
  this._debug('update id:%s modifier:%j', id, modifier);
  this._globalQueue.push(['u', id, modifier]);
  this._processQueue();
};

OpQueue.prototype.multiUpdate = function(selector, modifier) {
  this._debug('multiUpdate/multiRemove args: %j', arguments);
  //since we do polling we don't need to have polls in the global Queue
  //and we could remove any single update ops too
  this._globalQueue = [['p']];
  this._processQueue();
};

OpQueue.prototype.multiRemove = OpQueue.prototype.multiUpdate;

OpQueue.prototype._processQueue = function() {
  //if this is multiProcessing we don't need to process it
  if(this._multiProcessing || this._globalQueue.length == 0) return;

  var op = this._globalQueue.shift();
  if(op[0] == 'u') {
    this._processIdUpdateQueue(op[1], op[2]);
  } else if (_.keys(this._idUpdateQueues).length == 0){
    //only process if no such IdUpdateQueue are processing
    if(op[0] == 'p') {
      this._processPoll();
    } else {
      throw new Error('Unidentified OP:' +  op[0]);
    }
  } else {
    //send the op back to the top of the queue
    this._globalQueue.unshift(op);
  }
};

OpQueue.prototype._processIdUpdateQueue = function(id, modifier) {
  var self = this;
  if(!this._idUpdateQueues[id]) {
    this._idUpdateQueues[id] = new IdUpdateQueue(this._invalidator, afterCompleted);
    this._idUpdateQueues[id].push(id, modifier);
    this._idUpdateQueues[id].start();
  } else {
    this._idUpdateQueues[id].push(id, modifier);
  }

  function afterCompleted() {
    delete self._idUpdateQueues[id];
    self._processQueue();
  }
};

OpQueue.prototype._processPoll = function() {
  var self = this;
  self._multiProcessing = true;
  self._invalidator.poll(function() {
    self._multiProcessing = false;
    self._processQueue();
  });
};

// IdUpdateQueue will queue update operations for a given id and do them in sequence
// we can add items to the queue while its in operation
function IdUpdateQueue(invalidator, endCallback) {
  this._invalidator = invalidator;
  this._items = [];
  this._stopped = false;
  this._endCallback = endCallback;
}

IdUpdateQueue.prototype.push = function(id, modifier) {
  this._items.push([id, modifier]);
};

IdUpdateQueue.prototype.start = function() {
  var self = this;
  start();

  function start() {
    if(self._stopped) {
      self._endCallback(true);
    } else {
      var payload = self._items.shift();
      if(payload) {
        self._invalidator.update(payload[0], payload[1], start);
      } else {
        self._stopped = true;
        self._endCallback();
      }
    }
  }
};

IdUpdateQueue.prototype.stop = function() {
  this._stopped = true;
};

Meteor.SmartOpQueue = OpQueue;
Meteor.SmartOpQueue.IdUpdateQueue = IdUpdateQueue;