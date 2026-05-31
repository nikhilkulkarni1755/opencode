import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { Global } from "@opencode-ai/core/global"
import { Auth } from "@opencode-ai/core/auth"
import { EventV2 } from "@opencode-ai/core/event"
import { tmpdir } from "./fixture/tmpdir"
import { testEffect } from "./lib/effect"

const it = testEffect(Layer.empty)

function testLayer(dir: string) {
  return Auth.layer.pipe(
    Layer.provide(AppFileSystem.defaultLayer),
    Layer.provide(EventV2.defaultLayer),
    Layer.provide(Global.layerWith({ data: dir })),
  )
}

describe("Auth", () => {
  it.live("stores api credentials", () =>
    Effect.gen(function* () {
      const tmp = yield* Effect.acquireRelease(
        Effect.promise(() => tmpdir()),
        (tmp) => Effect.promise(() => tmp[Symbol.asyncDispose]()),
      )

      const [account, active] = yield* Effect.gen(function* () {
        const auth = yield* Auth.Service
        const account = yield* auth.create({
          serviceID: Auth.ServiceID.make("anthropic"),
          credential: new Auth.ApiKeyCredential({ type: "api", key: "sk-test" }),
        })
        const active = yield* auth.active(Auth.ServiceID.make("anthropic"))
        return [account, active] as const
      }).pipe(Effect.provide(testLayer(tmp.path)))

      expect(account).toBeDefined()
      if (!account) return
      expect(active?.id).toBe(account.id)
      expect(active?.credential).toEqual({ type: "api", key: "sk-test" })
    }),
  )
})
