"use client";

import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { Suspense } from "react";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@waslaeuftin/components/ui/card";
import { Form } from "@waslaeuftin/components/ui/form";
import { InputFormField } from "@waslaeuftin/components/input-form-field";
import { Button } from "@waslaeuftin/components/ui/button";

const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Die Eingabe darf nicht leer sein.")
    .email("Die Eingabe muss eine valide E-Mail Adresse sein."),
  password: z.string().min(1, "Die Eingabe darf nicht leer sein."),
});

type LoginFormData = z.infer<typeof LoginSchema>;

export default function SignIn() {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const searchParams = useSearchParams();

  const onValidData = async (data: LoginFormData) => {
    try {
      await signIn("credentials", {
        ...data,
        callbackUrl: searchParams.get("callbackUrl") ?? "/admin",
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Suspense>
      <main className="flex h-[100vh] w-full flex-row items-center justify-center">
        <Card className="p-8">
          <Form {...form}>
            <form
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onSubmit={form.handleSubmit(onValidData)}
            >
              <CardContent className="flex flex-col space-y-4 py-4">
                <h1 className="text-3xl font-bold">Einloggen</h1>
                <p className="text-gray-500">
                  Bitte loggen Sie sich mit Ihren Zugangsdaten ein.
                </p>

                <InputFormField
                  name="email"
                  label="E-Mail"
                  placeholder="maxmustermann@beispiel.de"
                  autoComplete="username"
                />
                <InputFormField
                  name="password"
                  label="Passwort"
                  type="password"
                  placeholder="•••••••••••"
                  autoComplete="current-password"
                />
                <Button type="submit" className="w-full">
                  Einloggen
                </Button>
              </CardContent>
            </form>
          </Form>
        </Card>
      </main>
    </Suspense>
  );
}
