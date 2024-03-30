import moment from "moment-timezone";
import { redirect } from "next/navigation";

export default function Page({
  params: { citySlug },
}: {
  params: { citySlug?: string };
}) {
  redirect(`/city/${citySlug}/?date=${moment().format("YYYY-MM-DD")}`);
}
