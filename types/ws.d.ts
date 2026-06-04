declare module "ws" {
  type MessageHandler = (data: Buffer | string) => void;
  type ErrorHandler = (error: Error) => void;

  export default class WebSocket {
    static readonly OPEN: number;
    readonly readyState: number;

    constructor(address: string);
    on(event: "open", listener: () => void): this;
    on(event: "message", listener: MessageHandler): this;
    on(event: "error", listener: ErrorHandler): this;
    on(event: "close", listener: () => void): this;
    send(data: string): void;
    close(): void;
  }
}
