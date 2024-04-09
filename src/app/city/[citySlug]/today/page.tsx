import moment from "moment-timezone";
import City from "../page";

export default function Page({ params }: { params: { citySlug?: string } }) {
  return (
    <City
      params={params}
      searchParams={{ date: moment().format("YYYY-MM-DD") }}
    />
  );
}
