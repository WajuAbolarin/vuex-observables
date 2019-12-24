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
    store._mutations = new Proxy(store._mutations, {
      get(mutations, mutationName) {
        let _mutation = mutations[mutationName];
        if (_mutation) {
          return _mutation;
        }
        return [() => undefined];
      }
    });

    const mutationSubject$ = new Subject();
    const stateSubject$ = new Subject();

    const mutation$ = mutationSubject$
      .asObservable()
      .pipe(observeOn(uniqueQueueScheduler));

    const state$ = stateSubject$
      .asObservable()
      .pipe(observeOn(uniqueQueueScheduler));

    const result$ = epic$.pipe(
      map(epic => {
        // run
        const output$ = epic(mutation$, state$, store);
        return output$;
      }),
      mergeMap(output$ =>
        from(output$).pipe(
          subscribeOn(uniqueQueueScheduler),
          observeOn(uniqueQueueScheduler)
        )
      )
    );

    result$.subscribe(mutation => {
      if (!mutation) return;
      store.commit(mutation.type, mutation.payload);
    });

    store.subscribe(function observeMutations(mutation, state) {
      mutationSubject$.next(mutation);
      stateSubject$.next(Object.assign({}, state));
    });
  };

  epicPlugin.run = rootEpic => {
    epic$.next(rootEpic);
  };

  return epicPlugin;
}
