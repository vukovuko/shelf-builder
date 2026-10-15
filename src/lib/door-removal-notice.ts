import { toast } from "sonner";
import { useShelfStore } from "@/lib/store";

/**
 * Wraps a shelf-layout action so the customer is told when it removed doors.
 * The store drops doors whose compartments were renumbered; without a notice
 * they would just vanish from the model.
 */
export function withDoorRemovalNotice<Args extends unknown[]>(
  action: (...args: Args) => void,
) {
  return (...args: Args) => {
    const before = useShelfStore.getState().doorGroups.length;
    action(...args);
    if (useShelfStore.getState().doorGroups.length < before) {
      toast("Vrata su uklonjena jer se promenio raspored polica.");
    }
  };
}
