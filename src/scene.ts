import * as BABYLON from '@babylonjs/core'

import { ComponentDefinition, Engine, Entity, WireMessage } from '@dcl/sdk/ecs'
import * as components from '@dcl/ecs/dist/components'
import { babylon } from './renderer/setup/defaultScene'

export const engine = Engine({
  onChangeFunction(
    entity: Entity,
    component: ComponentDefinition<any>,
    componentId: number,
    operation: WireMessage.Enum
  ) {
    // console.log(entity, component, componentId, operation)

  },
})

export const Billboard = components.Billboard(engine)
export const Transform = components.Transform(engine)
export const MeshRenderer = components.MeshRenderer(engine)
export const TextShape = components.TextShape(engine)

babylon.onEndFrameObservable.add(async () => {
  await engine.update(babylon.getDeltaTime() * 1000)
})

const babylonEntities = new Map<Entity, BABYLON.Node>()