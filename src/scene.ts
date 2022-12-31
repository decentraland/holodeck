import * as BABYLON from '@babylonjs/core'

import { ComponentDefinition, Engine, Entity, WireMessage } from '@dcl/sdk/ecs'
import * as components from '@dcl/ecs/dist/components'
import { babylon, scene } from './renderer/setup/defaultScene'
import { SceneContext } from './scene/SceneContext'

const ctx = new SceneContext(scene)

export const engine = Engine({
  onChangeFunction(
    entity: Entity,
    component: ComponentDefinition<any>,
    componentId: number,
    op: WireMessage.Enum
  ) {
    ctx.processEcsChange(entity, component, op)
  },
})

export const Billboard = components.Billboard(engine)
export const Transform = components.Transform(engine)
export const MeshRenderer = components.MeshRenderer(engine)
export const TextShape = components.TextShape(engine)

babylon.onEndFrameObservable.add(async () => {
  await engine.update(babylon.getDeltaTime() / 1000)
})