// @ts-nocheck
import { Subject, of, queueScheduler, from } from "rxjs";
import { mergeMap, map, observeOn, subscribeOn } from "rxjs/operators";

export default function createPlugin() {
  const QueueScheduler = queueScheduler.constructor;
  const uniqueQueueScheduler = new QueueScheduler(
    queueScheduler.SchedulerAction
  );
  let epic$ = new Subject();
  const epicPlugin = store => {
    monkeyPatchStore(store);
    const actionSubject$ = new Subject();
    const stateSubject$ = new Subject();

    const action$ = actionSubject$
      .asObservable()
      .pipe(observeOn(uniqueQueueScheduler));

    const state$ = stateSubject$
      .asObservable()
      .pipe(observeOn(uniqueQueueScheduler));

    const result$ = epic$.pipe(
      map(epic => {
        const output$ = epic(action$, state$, store);
        return output$;
      }),
      mergeMap(output$ =>
        from(output$).pipe(
          subscribeOn(uniqueQueueScheduler),
          observeOn(uniqueQueueScheduler)
        )
      )
    );
    result$.subscribe(mutation => mutation && store.commit(mutation));
    store.subscribeAction(function observeActions(action, state) {
      actionSubject$.next(action);
      stateSubject$.next(Object.assign({}, state));
    });
  };

  epicPlugin.run = rootEpic => {
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
