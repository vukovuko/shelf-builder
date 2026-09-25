/**
 * Photo/sketch import rollout. While true, only admins see the upload button
 * and the API refuses everyone else; afterwards any logged-in user with a
 * verified email can use it.
 */
export const DESIGN_IMPORT_ADMIN_ONLY = true;

/** Long edge the browser shrinks uploads to before sending. */
export const UPLOAD_MAX_EDGE_PX = 2000;

/** Hard server-side ceiling on the decoded image. */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
