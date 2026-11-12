import { describe, expect, it, onTestFinished, vi } from "vitest";
import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync } from "node:fs";
import { Context } from "@deepseek-ai/cordis";
import type { ConfigEditor } from "@deepseek-ai/dsh-config-editor";
import type {
  WebRoute,
  WebResourceRoute,
} from "@deepseek-ai/dsh-host-webserver";
import type { LinkedDirectory } from "../src/shared/models/WorkspaceDirectories.js";
import type { ResolvedConfig } from "../src/host/config.js";
import { WorkspaceDirectoriesServiceImpl } from "../src/host/services/WorkspaceDirectoriesService.js";
import { AddirStorage } from "../src/host/services/AddirStorage.js";
import { resolveConfig } from "../src/host/config.js";
import { registerAddirRoutes } from "../src/host/api/httpRoutes.js";

interface ApiResponse {
  readonly ok?: boolean;
  readonly directories?: LinkedDirectory[];
  readonly entry?: LinkedDirectory;
  readonly removed?: boolean;
  readonly exists?: boolean;
  readonly isDirectory?: boolean;
  readonly config?: ResolvedConfig;
}

interface RequestResult {
  readonly status: number;
  readonly body: ApiResponse | undefined;
}

type RegisteredRoute = WebRoute | WebResourceRoute;
type ConfigEntry = Parameters<ConfigEditor["edit"]>[0];
type ConfigChange = Parameters<ConfigEditor["edit"]>[1];

function readBody(result: RequestResult): ApiResponse {
  if (result.body === undefined)
    throw new Error("The API response body is empty");
  return result.body;
}

describe("Addir REST API", () => {
  const testRoot = join(tmpdir(), `dsh-api-test-${Date.now()}`);
  mkdirSync(testRoot, { recursive: true });
  const mainDir = join(testRoot, "main");
  const extDir = join(testRoot, "external");
  mkdirSync(mainDir, { recursive: true });
  mkdirSync(extDir, { recursive: true });

  it("registers /api/dsh-workspace-manager routes and processes list, add, remove", async () => {
    const ctx = new Context();
    onTestFinished(() => ctx.fiber.dispose());
    const service = new WorkspaceDirectoriesServiceImpl(
      resolveConfig(),
      mainDir,
      new AddirStorage(":memory:"),
    );
    let registeredRoute: RegisteredRoute | undefined;
    const disposed = vi.fn();
    const registration = registerAddirRoutes(ctx, service);
    expect(registeredRoute).toBeUndefined();
    ctx.provide("webServer", {
      register: (route: RegisteredRoute) => {
        registeredRoute = route;
        return disposed;
      },
    });

    await registration.await();
    const route = registeredRoute;
    if (route === undefined || !("handler" in route))
      throw new Error("The HTTP route was not registered");
    expect(route.path).toBe("/api/dsh-workspace-manager");

    const simulateRequest = async (
      urlPath: string,
      method: string,
      body?: object,
    ): Promise<RequestResult> => {
      let status = 0;
      let responseData = "";
      const request = Object.assign(new EventEmitter(), {
        url: urlPath,
        method,
      }) as IncomingMessage;
      const response = {
        writeHead: (code: number) => {
          status = code;
        },
        end: (data?: string) => {
          if (data !== undefined) responseData = data;
        },
      } as ServerResponse;
      const responsePromise = route.handler(request, response);
      if (body !== undefined) {
        request.emit("data", Buffer.from(JSON.stringify(body)));
        request.emit("end");
      }
      await responsePromise;
      const parsedBody =
        responseData.length > 0
          ? (JSON.parse(responseData) as ApiResponse)
          : undefined;
      return { status, body: parsedBody };
    };

    const listRes = await simulateRequest("/api/dsh-workspace-manager/list", "GET");
    expect(listRes.status).toBe(200);
    expect(readBody(listRes).ok).toBe(true);
    expect(readBody(listRes).directories).toHaveLength(1);

    const addRes = await simulateRequest("/api/dsh-workspace-manager/add", "POST", {
      workspacePath: mainDir,
      path: extDir,
      alias: "ext",
      readOnly: true,
    });
    expect(addRes.status).toBe(200);
    expect(readBody(addRes).ok).toBe(true);
    expect(readBody(addRes).entry?.alias).toBe("ext");
    expect(readBody(addRes).entry?.readOnly).toBe(true);

    const listWorkspaceRes = await simulateRequest("/api/dsh-workspace-manager/list", "POST", {
      workspacePath: mainDir,
    });
    expect(listWorkspaceRes.status).toBe(200);
    expect(readBody(listWorkspaceRes).directories).toHaveLength(1);
    expect(readBody(listWorkspaceRes).directories?.[0]?.alias).toBe("ext");

    const removeRes = await simulateRequest("/api/dsh-workspace-manager/remove", "POST", {
      workspacePath: mainDir,
      pathOrAlias: "ext",
    });
    expect(removeRes.status).toBe(200);
    expect(readBody(removeRes).ok).toBe(true);
    expect(readBody(removeRes).removed).toBe(true);

    const validateRes = await simulateRequest("/api/dsh-workspace-manager/validate", "POST", {
      path: extDir,
    });
    expect(validateRes.status).toBe(200);
    expect(readBody(validateRes).exists).toBe(true);
    expect(readBody(validateRes).isDirectory).toBe(true);

    const replaceRes = await simulateRequest("/api/dsh-workspace-manager/replace", "POST", {
      workspacePath: mainDir,
      directories: [{ path: extDir, alias: "saved", readOnly: true }],
    });
    expect(replaceRes.status).toBe(200);
    expect(service.getDirectoriesForWorkspace(mainDir)[0]?.alias).toBe("saved");
    for (const directories of [
      [{ path: extDir, readOnly: "yes" }],
      [{ path: "missing", readOnly: false }],
    ]) {
      const result = await simulateRequest("/api/dsh-workspace-manager/replace", "POST", {
        workspacePath: mainDir,
        directories,
      });
      expect(result.status).toBe(400);
      expect(service.getDirectoriesForWorkspace(mainDir)[0]?.alias).toBe(
        "saved",
      );
    }
    expect((await simulateRequest("/api/dsh-workspace-manager/replace", "GET")).status).toBe(
      405,
    );
    const switches = {
      enableTools: false,
      enableContextInjection: true,
      enforceReadOnly: false,
    };
    expect(
      readBody(await simulateRequest("/api/dsh-workspace-manager/config", "GET")).config
        ?.enableTools,
    ).toBe(true);
    expect(
      (await simulateRequest("/api/dsh-workspace-manager/config", "POST", switches)).status,
    ).toBe(409);
    expect(
      (
        await simulateRequest("/api/dsh-workspace-manager/config", "POST", {
          enableTools: "yes",
        })
      ).status,
    ).toBe(400);

    const current = {
      defaultDirectories: [{ path: extDir }],
      enableTools: true,
    };
    let updated: object | undefined;
    const configEditor = {
      entries: () => [{ options: { name: "dsh-workspace-manager" } }],
      edit: async (_entry: ConfigEntry, change: ConfigChange) => {
        updated = change(current, {});
      },
    } as ConfigEditor;
    ctx.provide("configEditor", configEditor);
    expect(
      (await simulateRequest("/api/dsh-workspace-manager/config", "POST", switches)).status,
    ).toBe(200);
    expect(updated).toEqual({ ...current, ...switches });
    await registration.dispose();
    expect(disposed).toHaveBeenCalledOnce();
  });
});
