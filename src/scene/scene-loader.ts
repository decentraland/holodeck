import { Entity } from "@dcl/schemas"
import { parseUrn, resolveContentUrl } from "@dcl/urn-resolver"
import { LoadableScene } from "./SceneContext"

/**
 * This function downloads the deployed entity resolved from the URN.
 * Returns a LoadableScene with its baseUrl.
 */
export async function getLoadableSceneFromUrn(sceneUrn: string): Promise<LoadableScene> {
  const resolvedEntity = await parseUrn(sceneUrn)

  if (resolvedEntity === null || resolvedEntity.type !== 'entity') {
    throw new Error(`Could not resolve mappings for scene: ${sceneUrn}`)
  }

  const resolvedUrl = await resolveContentUrl(resolvedEntity)

  if (!resolvedUrl) {
    throw new Error('Could not resolve URL to download ' + sceneUrn)
  }

  const result = await fetch(resolvedUrl)
  const entity = (await result.json()) as Entity
  const baseUrl: string = resolvedEntity.baseUrl || new URL('.', resolvedUrl).toString()

  return {
    id: sceneUrn,
    entity,
    baseUrl,
  }
}
