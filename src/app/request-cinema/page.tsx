"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { InputFormField } from "@waslaeuftin/components/input-form-field";
import { Button } from "@waslaeuftin/components/ui/button";
import { Form } from "@waslaeuftin/components/ui/form";

const RequestCinemaSchema = z.object({
  cinemaName: z.string().min(1, "Die Eingabe darf nicht leer sein."),
  city: z.string().min(1, "Die Eingabe darf nicht leer sein."),
  cinemaHomepageUrl: z.string().url("Die Eingabe muss eine gültige URL sein."),
});

type RequestCinemaFormData = z.infer<typeof RequestCinemaSchema>;

export default function RequestCinemaPage() {
  const form = useForm<RequestCinemaFormData>({
    resolver: zodResolver(RequestCinemaSchema),
  });

  const onValidData = async (data: RequestCinemaFormData) => {
    try {
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-4">
      <Form {...form}>
        <form
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onSubmit={form.handleSubmit(onValidData)}
        >
          <div className="flex flex-col space-y-4 py-4">
            <h1 className="text-3xl font-bold">Kino wünschen</h1>
            <p className="text-gray-500">
              Hier kannst du dir Kinos, die noch nicht bei waslaeuft.in
              verfügbar sind, wünschen.
            </p>

            <InputFormField
              name="cinemaName"
              label="Kino Name"
              placeholder="Filmpalast Musterstadt"
              control={form.control}
            />
            <InputFormField
              name="city"
              label="Stadt"
              placeholder="Musterstadt"
              control={form.control}
            />
            <InputFormField
              name="cinemaHomepageUrl"
              label="Kino Homepage URL"
              placeholder="https://www.filmpalast-musterstadt.de"
              control={form.control}
            />
            <Button type="submit" className="flex-1">
              Kino wünschen
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
