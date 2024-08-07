import type {Queue} from '@dbushell/carriageway';
import type {CacheItem} from '@src/types.ts';

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

/** Default `queue.sort` value function */
export const fetchSortValue = ({options: {media}}: CacheItem) => {
  switch (media) {
    case 'json':
    case 'rss':
      return 1;
    case 'image':
      return 2;
    case 'audio':
      return 4;
    default:
      return 3;
  }
};

/** Sort queue by mime type priority */
export const fetchSortQueue = (queue: Queue<CacheItem, Response>) => {
  queue.sort((a, b) => fetchSortValue(a) - fetchSortValue(b));
};
