const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});

/** Sort by name property alphanumerically */
export function naturalSort<T extends {title: string}>(list: Array<T>) {
  return list.sort((a, b) => naturalCollator.compare(a.title, b.title));
}

/** Sort by date property most recent first */
export const newestSort = <T>(list: Array<T>, key: keyof T) =>
  list.sort((a, b) => (b[key] as Date).getTime() - (a[key] as Date).getTime());
