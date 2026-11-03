// Типы для тестового провайдера Endemion ID. У oidc-provider своих типов нет, здесь только то, что нужно тестам
declare module "oidc-provider" {
  import type { IncomingMessage, Server, ServerResponse } from "node:http";

  export interface ProviderContext {
    path: string;
    method: string;
    status: number;
    req: IncomingMessage;
    res: ServerResponse;
    redirect(url: string): void;
  }

  export interface InteractionDetails {
    uid: string;
    grantId?: string;
    prompt: { name: string; details: { missingOIDCScope?: string[]; missingOIDCClaims?: string[] } };
    params: Record<string, string>;
    session?: { accountId: string };
  }

  export interface Grant {
    addOIDCScope(scope: string): void;
    addOIDCClaims(claims: string[]): void;
    save(): Promise<string>;
  }

  export default class Provider {
    constructor(issuer: string, configuration: Record<string, unknown>);
    use(middleware: (ctx: ProviderContext, next: () => Promise<void>) => Promise<void>): void;
    listen(port: number, host: string, callback: () => void): Server;
    interactionDetails(req: IncomingMessage, res: ServerResponse): Promise<InteractionDetails>;
    interactionResult(req: IncomingMessage, res: ServerResponse, result: Record<string, unknown>, options?: { mergeWithLastSubmission?: boolean }): Promise<string>;
    Grant: { new (payload: { accountId?: string; clientId: string }): Grant; find(id: string): Promise<Grant> };
  }
}
