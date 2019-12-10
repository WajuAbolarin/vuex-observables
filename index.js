// @ts-nocheck
import { Subject, of, queueScheduler } from "rxjs";
import { mergeMap, map, observeOn, subscribeOn } from "rxjs/operators";

export function createPlugin(userEpic) {
  const QueueScheduler = queueScheduler.constructor;
  const uniqueQueueScheduler = new QueueScheduler(
    // @ts-ignore
    queueScheduler.SchedulerAction
  );
  let epic$ = new Subject();

  epic$.subscribe(function EpicSubscriber({ action, state, store }) {
    let _output = userEpic(of(action), state, store);
    _output.subscribe();
  });

  return function installPlugin(store) {
    monkeyPatchStore(store);

    store.subscribeAction(function observeActions(action, state) {
      state = Object.assign({}, state);
      epic$.next({ action, state, store });
    });
  };
}

function monkeyPatchStore(store) {
  store.dispatch = function dispatch(_type, _payload) {
    var this$1 = this;

    var ref = unifyObjectStyle(_type, _payload);
    var type = ref.type;
    var payload = ref.payload;

    var action = { type: type, payload: payload };
    var entry = this._actions[type];
    if (!entry) {
      entry = this._actions[type] = [() => Promise.resolve()];
    }

    try {
      this._actionSubscribers
        .filter(function(sub) {
          return sub.before;
        })
        .forEach(function(sub) {
          return sub.before(action, this$1.state);
        });
    } catch (e) {
      {
        console.warn("[vuex] error in before action subscribers: ");
        console.error(e);
      }
    }
    var result =
      entry.length > 1
        ? Promise.all(
            entry.map(function(handler) {
              return handler(payload);
            })
          )
        : entry[0](payload);

    return result.then(function(res) {
      try {
        this$1._actionSubscribers
          .filter(function(sub) {
            return sub.after;
          })
          .forEach(function(sub) {
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
    assert(
      typeof type === "string",
      "expects string as the type, but found " + typeof type + "."
    );
  }

  return { type: type, payload: payload, options: options };
}

function isObject(obj) {
  return obj !== null && typeof obj === "object";
}

function assert(condition, msg) {
  if (!condition) {
    throw new Error("[vuex] " + msg);
  }
}
