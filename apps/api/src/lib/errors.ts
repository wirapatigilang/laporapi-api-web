export type FieldErrors = Record<string, string>;

/** Galat yang dikembalikan ke klien dengan bentuk { error: { code, message, fields? } }. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: FieldErrors,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }

  toBody() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields ? { fields: this.fields } : {}),
        ...(this.extra ?? {}),
      },
    };
  }
}

export const validationError = (fields: FieldErrors) =>
  new ApiError(422, "VALIDATION_ERROR", "Data tidak valid", fields);
