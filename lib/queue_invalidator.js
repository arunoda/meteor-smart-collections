function QueueInvalidator(invalidator) {
  this._invalidator = invalidator;

  this._idQueues = {}; 
  this._globalQueue = [];
  this._idsProcessing = [];

  this._globalHook = null;
  this._globalProcessing = false;
}

QueueInvalidator.prototype.insert = function(id, doc) {
  this._invalidator.insert(id, doc);
};

//Todo update improvements - fetch one time for all the remaining requests
QueueInvalidator.prototype.update = function(id, mod) {
  var req = ['u', id, mod];
  if(this._globalProcessing || this._globalHook) {
    //if global is processing or ready to process, add these requests to it global queue too
    this._globalQueue.push(req);
  } else {
    this._ensureIdQueue(id);
    this._idQueues[id].push(['u', id, mod]);
    this._processNext(id);
  }
};

QueueInvalidator.prototype.remove = function(id) {
  this._idQueues[id] = [];
  this._invalidator.remove(id);
};

QueueInvalidator.prototype.updateMulti = function(selector, mod) {
  this._globalQueue.push(['mu', selector, mod]);
  this._processNext();
};

QueueInvalidator.prototype.removeMulti = function(selector) {
  this._globalQueue.push(['mr', selector]);
  this._processNext();
};

QueueInvalidator.prototype._processNext = function(id) {
  var self = this;
  if(!id) {
    //global processing
    if(this._globalHook || this._globalProcessing) {
      //hook is assigned or processing globally
      return;
    } else if (this._idsProcessing.length > 0) {
      //some ids are processing
      this._globalHook = function() {
        startGlobalProcessing();
        self._globalHook = null;
      };
    } else {
      //no ids are processing
      startGlobalProcessing();
    } 
  } else if(!this._globalProcessing && !this._isIdProcessing(id)) {
    //start id processing if not both
    // * id is not processing
    // * global is processing
    startProcessing(id);
  }

  function afterUpdated() {
    //remove id from processing
    var index = self._idsProcessing.indexOf(id);
    self._idsProcessing.splice(index, 1);

    if(self._idQueues[id].length > 0) {
      startProcessing(id);
    } else {
      if(self._idsProcessing.length == 0 && self._globalHook) {
        //if no such any ids are processing and there is a globalHook
        self._globalHook();
      }
    }
  }

  function startProcessing(id) {
    self._idsProcessing.push(id);
    var req = self._idQueues[id].shift();
    var fields = {}; //calculate fields here
    this._invalidator.update(req[1], fields, afterUpdated);
  }

  function startGlobalProcessing() {
    self._globalProcessing = true;
    while(true) {
      var res = this._globalQueue.shift();
      if(!res) {
        //nothing in the queue
        self._globalProcessing = false;
        break;
      } else if(res[0] == 'u') {
        //normal update in the global queue
        var id = res[1];
        self._ensureIdQueue(id);
        self._idQueues[id].push(res);
        if(!self._isIdProcessing(id)) {
          startProcessing(id);
        }
      } else  {
        //multi update or multi remove in the global queue
        if(self._idsProcessing.length > 0) {
          //if ids are processing, with above invocation
          self._globalProcessing = false;
          self._processNext();
        } else {
          //no ids are processing, ready to go
          if(res[0] == 'mu') {
            this._invalidator.multiUpdate(res[1], res[2], startGlobalProcessing);
          } else if(res[0] == 'mr') {
            this._invalidator.multiRemove(res[1], startGlobalProcessing);
          } else {
            throw new Error('Unknown Invalidate Request', JSON.stringify(res));
          }
        }
        break;
      }
    }
  }
};

QueueInvalidator.prototype._isIdProcessing = function(id) {
  var index = this._idsProcessing.indexOf(id);
  return index >= 0;
};

QueueInvalidator.prototype._ensureIdQueue = function(id) {
  if(!this._idQueues[id]) {
    this._idQueues[id] = [];
  }
};

Meteor.SmartQueueInvalidator = QueueInvalidator;