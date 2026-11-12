import { describe, expect, it } from "vitest";
import { todoHostInput, todoHostOutput } from "../host-rewrite";

const url = (href: string) => ({ url: new URL(href) });

describe("to-do board host", () => {
  it("shows the board at the root of its own host", () => {
    expect(todoHostInput(url("https://todo.ormanipomeri.com/"))?.pathname).toBe(
      "/todo-board",
    );
    expect(
      todoHostOutput(url("https://todo.ormanipomeri.com/todo-board"))?.pathname,
    ).toBe("/");
  });

  it("leaves the main site and other paths alone", () => {
    expect(todoHostInput(url("https://ormanipomeri.com/"))).toBeUndefined();
    expect(
      todoHostInput(url("https://todo.ormanipomeri.com/todo-auth?token=x")),
    ).toBeUndefined();
    expect(
      todoHostOutput(url("https://ormanipomeri.com/todo-board")),
    ).toBeUndefined();
  });
});
