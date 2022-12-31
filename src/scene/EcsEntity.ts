import * as BABYLON from '@babylonjs/core'
import { ComponentDefinition, Entity, TransformType } from '@dcl/sdk/ecs'
import { componentPutOperations } from './component-operations'
import { SceneContext } from './SceneContext'
import { createDefaultTransform } from './transform-logic'

export type EcsComponents = Partial<{
  transform: TransformType
}>

function matrixWorldDidUpdate(entity: EcsEntity): void {
  if (entity.sendPositionsPending || entity.previousWorldMatrix.equals(entity.worldMatrixFromCache)) {
    // it is scheduled or it shares the same worldMatrix. Do nothing
  } else {
    entity.previousWorldMatrix.copyFrom(entity._worldMatrix)
    entity.sendPositionsPending = true
    queueMicrotask(entity.sendUpdatePositions)
  }
}

export class EcsEntity extends BABYLON.AbstractMesh {
  readonly isDCLEntity = true
  usedComponents = new Map<number, ComponentDefinition<unknown>>()

  sendPositionsPending = false
  previousWorldMatrix = BABYLON.Matrix.Zero()

  ecsComponentValues: EcsComponents = {}

  constructor(public entityId: Entity, public context: WeakRef<SceneContext>) {
    super(`ecs-${entityId.toString(16)}`)
    createDefaultTransform(this)

    BABYLON.MeshBuilder.CreateBox('box', {}).setParent(this)

    this.onAfterWorldMatrixUpdateObservable.add(matrixWorldDidUpdate as any)
  }

  sendUpdatePositions = () => {
    this.sendPositionsPending = false
    if (!this.isDisposed()) {
      this.previousWorldMatrix.copyFrom(this._worldMatrix)
      // this.context.onEntityMatrixChangedObservable.notifyObservers(this)
    }
  }

  putComponent(component: ComponentDefinition<unknown>) {
    this.usedComponents.set(component._id, component)
    componentPutOperations[component._id]?.call(null, this.entityId, this, component)
  }

  deleteComponent(component: ComponentDefinition<unknown>) {
    this.usedComponents.delete(component._id)
    componentPutOperations[component._id]?.call(null, this.entityId, this, component)
  }

  /**
   * Returns the children that extends EcsEntity, filtering any other Object3D
   */
  *childrenEntities(): Iterable<EcsEntity> {
    if (this._children)
      for (let i = 0; i < this._children.length; i++) {
        const element = this._children[i] as any
        if (element.isDCLEntity) {
          yield element
        }
      }
  }

  dispose(_doNotRecurse?: boolean | undefined, _disposeMaterialAndTextures?: boolean | undefined): void {
    // first dispose all components
    for (const [_, component] of this.usedComponents) {
      this.deleteComponent(component)
    }

    // and then proceed with the native engine disposal
    super.dispose(true, false)
  }

  getMeshesBoundingBox() {
    let children = this.getChildMeshes(false)
    let boundingInfo = children[0].getBoundingInfo()
    let min = boundingInfo.boundingBox.minimumWorld
    let max = boundingInfo.boundingBox.maximumWorld
    for (let i = 1; i < children.length; i++) {
      // Cameras/lights doesn't have any materials and may be outside of the scene.
      if (!children[i].material) continue
      boundingInfo = children[i].getBoundingInfo()
      min = BABYLON.Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld)
      max = BABYLON.Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld)
    }
    return new BABYLON.BoundingInfo(min, max)
  }
}

/**
 * Finds the closest parent that is or extends a EcsEntity
 * @param object the object to start looking
 */
export function findParentEntity(object: BABYLON.Node): EcsEntity | null {
  return findParentEntityOfType(object, EcsEntity)
}

/**
 * Finds the closest parent that is instance of the second parameter (constructor)
 * @param object the object to start looking
 * @param desiredClass the constructor of the kind of parent we want to find
 */
export function findParentEntityOfType<T extends EcsEntity>(
  object: BABYLON.Node,
  desiredClass: any // ConstructorOf<T>
): T | null {
  // Find the next entity parent to dispatch the event
  let parent: T | BABYLON.Node | null = object.parent

  while (parent && !(parent instanceof desiredClass)) {
    parent = parent.parent

    // If the element has no parent, stop execution
    if (!parent) return null
  }

  return (parent as any as T) || null
}
