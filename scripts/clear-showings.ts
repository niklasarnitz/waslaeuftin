import { db } from "@waslaeuftin/server/db";

await db.showing.deleteMany();

console.log('deleted all showings')
