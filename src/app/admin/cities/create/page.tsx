"use client";

import { InputFormField } from "@waslaeuftin/components/input-form-field";
import { Button } from "@waslaeuftin/components/ui/button";
import { Form } from "@waslaeuftin/components/ui/form";
import { useForm } from "react-hook-form";

export default function AdminCitiesCreate () {
    const form = useForm();

    return <Form {...form}><form onSubmit={(data) => {
        if('name' in data) {
            console.log(data)
        }
    }}><div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Stadt erstellen</h1>
        <InputFormField name="name" label="Name" placeholder="Musterstadt" control={form.control} />
        <Button type="submit">Erstellen</Button>
    </div></form></Form>
}