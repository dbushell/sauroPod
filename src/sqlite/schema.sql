CREATE TABLE `bookmarks` (
    `ids` text PRIMARY KEY NOT NULL,
    `position` integer NOT NULL,
    `progress` integer NOT NULL,
    `date` text NOT NULL
);

CREATE TABLE `podcasts` (
    `id` text PRIMARY KEY NOT NULL,
    `modified` text NOT NULL,
    `url` text NOT NULL,
    `title` text NOT NULL,
    `image` text NOT NULL,
    `count` integer NOT NULL,
    `latestId` text,
    `apiCache` text
);

CREATE TABLE `episodes` (
    `id` text PRIMARY KEY NOT NULL,
    `podcastId` text NOT NULL,
    `date` text NOT NULL,
    `url` text NOT NULL,
    `title` text NOT NULL,
    `duration` integer NOT NULL,
    `mimetype` text NOT NULL,
    `guid` text,
    `played` integer,
    FOREIGN KEY (`podcastId`) REFERENCES `podcasts`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE `artists` (
    `id` text PRIMARY KEY NOT NULL,
    `title` text NOT NULL,
    `path` text NOT NULL,
    `count` integer NOT NULL
);

CREATE TABLE `albums` (
    `id` text PRIMARY KEY NOT NULL,
    `artistId` text NOT NULL,
    `title` text NOT NULL,
    `path` text NOT NULL,
    `count` integer NOT NULL,
    FOREIGN KEY (`artistId`) REFERENCES `artists`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE `songs` (
    `id` text PRIMARY KEY NOT NULL,
    `artistId` text NOT NULL,
    `albumId` text NOT NULL,
    `title` text NOT NULL,
    `path` text NOT NULL,
    `duration` integer NOT NULL,
    `mimetype` text NOT NULL,
    FOREIGN KEY (`artistId`) REFERENCES `artists`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
    FOREIGN KEY (`albumId`) REFERENCES `albums`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE `meta` (
    `key` text PRIMARY KEY NOT NULL,
    `value` text NOT NULL,
    `type` text NOT NULL
);
