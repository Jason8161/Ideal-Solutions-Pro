import { Redirect, type Href } from "expo-router";

/** Legacy roster URL — My Crew is the employee list at /job-folder/crew. */
export default function CrewListRedirect() {
  return <Redirect href={"/job-folder/crew" as Href} />;
}
