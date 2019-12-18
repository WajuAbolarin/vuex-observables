import { queueScheduler, Subject, from } from 'rxjs';
import { observeOn, map, mergeMap, subscribeOn } from 'rxjs/operators';

function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function createPlugin() {
  var QueueScheduler = queueScheduler.constructor;
  var uniqueQueueScheduler = new QueueScheduler(queueScheduler.SchedulerAction);
  var epic$ = new Subject();

  var epicPlugin = function epicPlugin(store) {
    monkeyPatchStore(store);
    var actionSubject$ = new Subject();
    var stateSubject$ = new Subject();
    var action$ = actionSubject$.asObservable().pipe(observeOn(uniqueQueueScheduler));
    var state$ = stateSubject$.asObservable().pipe(observeOn(uniqueQueueScheduler));
    var result$ = epic$.pipe(map(function (epic) {
      var output$ = epic(action$, state$, store);
      return output$;
    }), mergeMap(function (output$) {
      return from(output$).pipe(subscribeOn(uniqueQueueScheduler), observeOn(uniqueQueueScheduler));
    }));
    result$.subscribe(function (mutation) {
      return mutation && store.commit(mutation);
    });
    store.subscribeAction(function observeActions(action, state) {
      actionSubject$.next(action);
      stateSubject$.next(Object.assign({}, state));
    });
  };

  epicPlugin.run = function (rootEpic) {
    epic$.next(rootEpic);
  };

  return epicPlugin;
}

function monkeyPatchStore(store) {
  store.dispatch = function dispatch(_type, _payload) {
    var this$1 = this;
    var ref = unifyObjectStyle(_type, _payload);
    var type = ref.type;
    var payload = ref.payload;
    var action = {
      type: type,
      payload: payload
    };
    var entry = this._actions[type];

    if (!entry) {
      entry = this._actions[type] = [function () {
        return Promise.resolve();
      }];
    }

    try {
      this._actionSubscribers.filter(function (sub) {
        return sub.before;
      }).forEach(function (sub) {
        return sub.before(action, this$1.state);
      });
    } catch (e) {
      {
        console.warn("[vuex] error in before action subscribers: ");
        console.error(e);
      }
    }

    var result = entry.length > 1 ? Promise.all(entry.map(function (handler) {
      return handler(payload);
    })) : entry[0](payload);
    return result.then(function (res) {
      try {
        this$1._actionSubscribers.filter(function (sub) {
          return sub.after;
        }).forEach(function (sub) {
          return sub.after(action, this$1.state);
        });
      } catch (e) {
        {
          console.warn("[vuex] error in after action subscribers: ");
          console.error(e);
        }
      }

      return res;
    });
  };
}

function unifyObjectStyle(type, payload, options) {
  if (isObject(type) && type.type) {
    options = payload;
    payload = type;
    type = type.type;
  }

  {
    assert(typeof type === "string", "expects string as the type, but found " + _typeof(type) + ".");
  }
  return {
    type: type,
    payload: payload,
    options: options
  };
}

function isObject(obj) {
  return obj !== null && _typeof(obj) === "object";
}

function assert(condition, msg) {
  if (!condition) {
    throw new Error("[vuex] " + msg);
  }
}

export default createPlugin;
