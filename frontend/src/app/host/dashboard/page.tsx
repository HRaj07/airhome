import { redirect } from "next/navigation";

/** The old host dashboard lives on as Airbnb's hosting area at /hosting. */
export default function HostDashboardRedirect() {
  redirect("/hosting");
}
