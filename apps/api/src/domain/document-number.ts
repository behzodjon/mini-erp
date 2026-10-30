/** Readable document numbers such as KAS-0001. */
export const formatDocumentNumber = (prefix: string, sequence: number): string =>
  `${prefix}-${String(sequence).padStart(4, "0")}`;
