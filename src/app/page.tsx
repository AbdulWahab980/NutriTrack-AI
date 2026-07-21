import { redirect } from "next/navigation";

export default function Home() {
  // Today's dashboard is the app's home surface.
  redirect("/today");
}
