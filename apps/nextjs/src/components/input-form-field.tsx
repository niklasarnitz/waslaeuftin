import type { HTMLInputTypeAttribute } from "react";
import type { FieldValues, UseControllerProps } from "react-hook-form";
import React from "react";
import { useController } from "react-hook-form";

import { RequiredAsterisk } from "@waslaeuftin/components/required-asterisk";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@waslaeuftin/components/ui/form";
import { Input } from "@waslaeuftin/components/ui/input";
import { cn } from "@waslaeuftin/lib/utils";

type InputFormFieldProps<Values extends FieldValues> = {
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
} & UseControllerProps<Values>;

export const InputFormField = <Values extends FieldValues>(
  props: InputFormFieldProps<Values>,
) => {
  const { field, fieldState } = useController(props);

  return (
    <FormItem className="flex w-full flex-col justify-center">
      <FormLabel>
        {props.label} <RequiredAsterisk required={props.required} />
      </FormLabel>
      <FormControl>
        <Input
          className={cn("flex flex-col", props.className)}
          placeholder={props.placeholder ?? props.label}
          {...field}
          value={field.value ?? ""}
          disabled={props.disabled}
          type={props.type}
          autoComplete={props.autoComplete}
        />
      </FormControl>
      {fieldState.error?.message && (
        <FormMessage>{fieldState.error.message}</FormMessage>
      )}
      {props.description && (
        <FormDescription>{props.description}</FormDescription>
      )}
    </FormItem>
  );
};
