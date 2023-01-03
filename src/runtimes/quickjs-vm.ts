import { getLoadableSceneFromUrn } from "../scene/scene-loader"
import { SceneContext } from "../scene/SceneContext"
import { withQuickJsVm } from "./vm/vm"

export async function loadRemoteVmScene(urn: string) {
  // resolve scene from its URN and create context
  const loadableScene = await getLoadableSceneFromUrn(urn)
  const sceneContext = new SceneContext(loadableScene)

  // Load the main script
  if (!loadableScene.entity.metadata?.main) {
    throw new Error('Scene does not have a .main field')
  }
  const codeUrl = sceneContext.resolveFileAbsolute(loadableScene.entity.metadata?.main)
  if (!codeUrl) {
    throw new Error('It seems like the main file of the scene is not deployed')
  }
  const codeFetch = await fetch(codeUrl)
  const code = await codeFetch.text()

  // create runtime
  await withQuickJsVm(async (opts) => {
    // prepare the VM with the ~system/EngineApi as described in https://adr.decentraland.org/adr/ADR-133
    opts.provide({
      error: sceneContext.logger.error,
      log: sceneContext.logger.log,
      require(module) {
        if (module === '~system/EngineApi') {
          return {
            async subscribe(event: string) {
              return {}
            },
            async sendBatch() {
              return { events: [] }
            },
            async crdtSendToRenderer(payload: { data: Uint8Array }): Promise<{ data: Uint8Array[] }> {
              // this code connects the ~system/EngineApi of the scripting scene with the renderer

              // there is a non-implemented feature in the vm.ts to convert vm handles into Uint8Arrays
              // and instead, objects are created. the following hack is slow but works
              const bytes = new Uint8Array(Object.values(payload.data))
              const data = await sceneContext.receiveBatch([bytes])
              return { data }
            },
          }
        }
        throw new Error('Unknown module ' + module)
      },
    })

    opts.eval(code)

    await opts.onStart()

    let start = performance.now()
    const updateIntervalMs = 30

    while (sceneContext.stopped.isPending) {
      const now = performance.now()
      const dtMillis = now - start
      start = now

      const dtSecs = dtMillis / 1000

      await opts.onUpdate(dtSecs)

      // wait for next frame
      const ms = Math.max((updateIntervalMs - (performance.now() - start)) | 0, 0)
      await sleep(ms)
    }

    // await for the scene to stop
    await sceneContext.stopped
  })

  // NOTE: this code is unreachable since nothing calls SceneContext.dispose()
}


async function sleep(ms: number): Promise<boolean> {
  await new Promise<void>((resolve) => setTimeout(resolve, Math.max(ms | 0, 0)))
  return true
}