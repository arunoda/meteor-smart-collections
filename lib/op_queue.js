// OpQueue is a queue implemetation for MongoDB write operations invalidations
// It queues updates for a given id
// If a selector based update or remove happning whole collection invalidation will be blocked

function OpQueue(invalidator) {
  this._invalidator =  invalidator;
  this._idUpdateQueues = {};

  this._globalQueue = [];
  this._multiProcessing = false;
}

OpQueue.prototype.insert = function(doc) {
  this._invalidator.insert(doc);
};

OpQueue.prototype.remove = function(id) {
  if(this._idUpdateQueues[id]) {
    this._idUpdateQueues[id].stop();
    delete this._idUpdateQueues[id];
  }
  this._invalidator.remove(doc);
};

OpQueue.prototype.update = function(id, modifier) {
  this._globalQueue.push(['u', id, modifier]);
  this._processQueue();
};

OpQueue.prototype.multiUpdate = function(selector, modifier) {
  this._globalQueue.push(['mu', selector, modifier]);
  this._processQueue();
};

OpQueue.prototype.multiRemove = function(selector) {
  this._globalQueue.push(['mr', selector]);
  this._processQueue();
};

OpQueue.prototype._processQueue = function() {
  //if this is multiProcessing we don't need to process it
  if(this._multiProcessing || this._globalQueue.length == 0) return;

  var op = this._globalQueue.shift();
  if(op[0] == 'u') {
    this._processIdUpdateQueue(op[1], op[2]);
  } else if (_.keys(self._idUpdateQueues).length == 0){
    //only process if no such IdUpdateQueue are processing
    if(op[0] == 'mu') {
      this._processMultiUpdate(op[1], op[2]);
    } else if(op[1] == 'mr') {
      this._processMultiRemove(op[1]);
    } else {
      throw new Error('Unidentified OP:' +  op[0]);
    }
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

OpQueue.prototype._processMultiUpdate = function(selector, modifier) {
  var self = this;
  self._multiProcessing = true;
  self._invalidator.multiUpdate(selector, modifier, function() {
    self._multiProcessing = false;
    self._processQueue();
  });
};

OpQueue.prototype._processMultiRemove = function(selector) {
  var self = this;
  self._multiProcessing = true;
  this._invalidator.multiRemove(selector, function() {
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