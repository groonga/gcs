# News

## v1.4.0 (booked at 2012-11-29)

 * Now "x-amzn-requestid" header is returned by the configuration API.
 * Support "rank" parameter for the search API partially. (Only simple sort is supported. Custom rank expressions are not available yet.)
 * Number of searchable documents is returned as a part of response from DescribeDomains action.
 * Error responses for CreateDomain, DeleteDomain, and other actions are now have better compatibility with Amazon CloudSearch.
 * Command line interface tools accept "-e" (or "--endpoint") option to specify the endpoint of the configuration API. For the gcs-post-sdf command, "--endpoint" has been renamed to "--document-endpoint".
 * The daemon is now configurable about port number, host name, etc.
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

