/** Форма решает, когда проверять значение и показывать возвращённую ошибку. */
export type FieldValidator<TValue> = (value: TValue) => string | undefined;
