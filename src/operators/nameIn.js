import { filter } from "rxjs/operators";

export function ofType(args) {
  if (typeof args === "string") {
    args = args.split(",");
    function matchTypes(incomingType) {
      return args.includes(incomingType.type);
    }
    return filter(matchTypes);
  }
}
