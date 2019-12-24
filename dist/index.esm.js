import { merge, queueScheduler, Subject, from } from 'rxjs';
import { observeOn, map, mergeMap, subscribeOn } from 'rxjs/operators';

function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  }
}

function _iterableToArray(iter) {
  if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance");
}

function combineEpics() {
  for (var _len = arguments.length, epics = new Array(_len), _key = 0; _key < _len; _key++) {
    epics[_key] = arguments[_key];
  }

  var merger = function merger() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return merge.apply(void 0, _toConsumableArray(epics.map(function (epic) {
      var output$ = epic.apply(void 0, args);
      return output$;
    })));
  };

  try {
    Object.defineProperty(merger, "name", {
      value: "combineEpics(".concat(epics.map(function (epic) {
        return epic.name || "<anonymous>";
      }).join(", "), ")")
    });
  } catch (e) {}

  return merger;
}

// @ts-nocheck
function createPlugin() {
  var QueueScheduler = queueScheduler.constructor;
  var uniqueQueueScheduler = new QueueScheduler(queueScheduler.SchedulerAction);
  var epic$ = new Subject();

  var epicPlugin = function epicPlugin(store) {
    store._mutations = new Proxy(store._mutations, {
      get: function get(mutations, mutationName) {
        var _mutation = mutations[mutationName];

        if (_mutation) {
          return _mutation;
        }

        return [function () {
          return undefined;
        }];
      }
    });
    var mutationSubject$ = new Subject();
    var stateSubject$ = new Subject();
    var mutation$ = mutationSubject$.asObservable().pipe(observeOn(uniqueQueueScheduler));
    var state$ = stateSubject$.asObservable().pipe(observeOn(uniqueQueueScheduler));
    var result$ = epic$.pipe(map(function (epic) {
      // run
      var output$ = epic(mutation$, state$, store);
      return output$;
    }), mergeMap(function (output$) {
      return from(output$).pipe(subscribeOn(uniqueQueueScheduler), observeOn(uniqueQueueScheduler));
    }));
    result$.subscribe(function (mutation) {
      if (!mutation) return;
      store.commit(mutation.type, mutation.payload);
    });
    store.subscribe(function observeMutations(mutation, state) {
      mutationSubject$.next(mutation);
      stateSubject$.next(Object.assign({}, state));
    });
  };

  epicPlugin.run = function (rootEpic) {
    epic$.next(rootEpic);
  };

  return epicPlugin;
}

export { combineEpics, createPlugin };
