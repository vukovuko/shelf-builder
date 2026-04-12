declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string | Buffer | ArrayBufferView | ArrayBuffer);
    window: Window;
  }
}
