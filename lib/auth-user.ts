import { auth } from "@clerk/nextjs/server";

export async function getRequestUserEmail(): Promise<string> {
  const session = await auth();
  const email = session.sessionClaims?.email;
  return typeof email === "string" ? email : "";
}
