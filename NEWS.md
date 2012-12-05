# News

## v1.4.0 (booked at 2012-12-26)

### API compatibility

 * Now "DocService/Endpoint" and "SearchService/Endpoint" disappear from domain statuses.
   You have to guess endpoints from the "arn" or other informations.
 * DefineIndexField never merge newly specified options with previously defined options.
   (In other words, now DefineIndexField always clear old options.)

### Command line interface

 * The option "--base-host" for the command bin/gcs is now obsolete.
   You don't need to give host name of the server to the server process anymre.

### Daemon

 * An environment variable GCS_BASE_HOST is now obsolete.
   You don't need to give host name of the server to the server process anymre.

## v1.4.0 (2012-11-29)

### API compatibility

 * Now "x-amzn-requestid" header is returned by the configuration API.
 * Support "rank" parameter for the search API partially. (Only simple sort is supported. Custom rank expressions are not available yet.)
 * Number of searchable documents is returned as a part of response from DescribeDomains action.
 * Error responses for CreateDomain, DeleteDomain, and other actions are now have better compatibility with Amazon CloudSearch.
 * "DocService/Arn", "SearchService/Arn" and "Processing" are returned as parts of domain statuses.
 * Now you can re-define existing index field with different type.
 * Now "facet enabled" and "result enabled" options of index fields are exclusive.
 * Creation and updated dates of index fields and domain options are stored correctly.
 * Update version of index fields are stored correctly.

### Command line interface tools

 * Command line interface tools accept "-e" (or "--endpoint") option to specify the endpoint of the configuration API. For the gcs-post-sdf command, "--endpoint" has been renamed to "--document-endpoint".

### Daemon

 * The daemon is now configurable about port number, host name, etc. See the file "/etc/default/gcs".
 * Log files (access.log, error.log and query.log) are available at /var/log/gcs for daemons.

## v1.3.0 (2012-10-29)

 * Now command line interface tools communicate with Groonga CloudSearch Server via HTTP.
 * Dashboard (administration console) is now separated to another project "gcs-console".

## v1.2.0 (2012-08-29)

 * Simple access-control mechanism based on IP ranges is now available.
 * Now search domains have their own unique IDs.
 * Support multiple values for an index fields.
 * Support facet returnable index fields.
 * Support "facet" parameter for the search API.
 * Support "bq" parameter (complex queries) for the search API.
 * Following command line interface tools are now available.
   * gcs-create-domain
   * gcs-delete-domain
   * gcs-describe-domain
   * gcs-configure-field (create, update, and delete)
   * gcs-configure-text-options (for synonyms)
   * gcs-configure-default-search-field (Groonga CloudSearch’s extension)
   * gcs-post-sdf

## v1.1.0 (2012-07-26)

 * New actions, "DeleteDomain", "DeleteIndexField" and "IndexDocuments" are available for the Configuration API.
 * Supports "delete" type batches by the documents API.

## v1.0.0 (2012-07-05)

 * Initial release.

