export function formatDateSrLatn(dateLike: Date | string | number): string {
  const date = new Date(dateLike);
  return date.toLocaleDateString("sr-Latn-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
