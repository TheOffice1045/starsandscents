import { getSiteContent } from "@/lib/site-content-server";
import ContactClient from "./ContactClient";

export default async function ContactPage() {
  const { "contact.page": c } = await getSiteContent(["contact.page"]);
  return <ContactClient c={c} />;
}
