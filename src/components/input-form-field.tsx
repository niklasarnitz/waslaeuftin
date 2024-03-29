import {
  type FieldValues,
  type UseControllerProps,
  useController,
} from "react-hook-form";

import { type HTMLInputTypeAttribute } from "react";
import React from "react";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@waslaeuftin/components/ui/form";
import { cn } from "@waslaeuftin/app/lib/utils";
import { Input } from "@waslaeuftin/components/ui/input";
import { RequiredAsterisk } from "@waslaeuftin/components/required-asterisk";

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
