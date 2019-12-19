import { merge } from "rxjs";
export default function combineEpics(...epics) {
  const merger = (...args) =>
    merge(
      ...epics.map(epic => {
        const output$ = epic(...args);
        return output$;
      })
    );
  try {
    Object.defineProperty(merger, "name", {
      value: `combineEpics(${epics
        .map(epic => epic.name || "<anonymous>")
        .join(", ")})`
    });
  } catch (e) {}
  return merger;
}
