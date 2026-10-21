
import { redirect } from "next/navigation";


// The dashboard checks the login. If nobody is signed in, it sends them to /login.
export default function Home() {

  redirect("/dashboard");
}
