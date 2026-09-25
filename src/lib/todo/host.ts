// todo.ormanipomeri.com serves the to-do board by itself. Login cookies belong
// to a single host, so the store's cookie never reaches the subdomain: a
// signed-in admin is handed over from the main site with a one-time token
// (/admin/todo/otvori → /todo-auth), which gives the subdomain its own cookie
// for the same session.
export const TODO_HOST = "todo.ormanipomeri.com";
export const TODO_ORIGIN = `https://${TODO_HOST}`;
export const MAIN_ORIGIN = "https://ormanipomeri.com";
