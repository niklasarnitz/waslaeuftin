"use client";

import { InputFormField } from "@waslaeuftin/components/input-form-field";
import { Button } from "@waslaeuftin/components/ui/button";
import { Form } from "@waslaeuftin/components/ui/form";
import { createCity } from "@waslaeuftin/helpers/serverActions";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export default function AdminCitiesCreate() {
  const form = useForm<{ name?: string }>();
  const router = useRouter();

  return (
    <Form {...form}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await createCity(form.getValues().name);

          router.push("/admin/cities");
        }}
      >
        <div className="space-y-4 p-4">
          <h1 className="text-2xl font-bold">Stadt erstellen</h1>
          <InputFormField
            name="name"
            label="Name"
            placeholder="Musterstadt"
            control={form.control}
          />
          <Button type="submit">Erstellen</Button>
        </div>
      </form>
    </Form>
  );
}
