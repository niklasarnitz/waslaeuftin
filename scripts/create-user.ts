import { hashPassword } from "@waslaeuftin/helpers/password/HashHelper";
import { db } from "@waslaeuftin/server/db";
import readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Email: ", (email) => {
  rl.question("Password: ", (password) => {
    rl.close();

    console.log("Creating user...");

    // This is a bit of callback hell, but I'm currently too lazy to refactor this utility function
    hashPassword(password)
      .then((hashedPassword) => {
        db.user
          .create({
            data: {
              email: email,
              password: hashedPassword,
            },
          })
          .then(() => console.log(`User with E-Mail ${email} created`))
          .catch((error) => console.error(error));
      })
      .catch((error) => console.error(error));
  });
});
