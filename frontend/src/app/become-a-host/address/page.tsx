import { redirect } from "next/navigation";

/** The address prompt is now the "location" step of the wizard; start from the overview. */
export default function BecomeAHostAddressRedirect() {
  redirect("/become-a-host");
}
