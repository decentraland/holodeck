import * as BABYLON from '@babylonjs/core'
import { GLTFFileLoader, GLTFLoaderAnimationStartMode } from '@babylonjs/loaders'
import { GLTFLoader } from '@babylonjs/loaders/glTF/2.0'
import { PBGltfContainer } from '@dcl/sdk/ecs'
import { scene } from '../../renderer/setup/defaultScene'
import { probe } from '../../renderer/visual/ambientLights'
import { markAsCollider } from '../../renderer/visual/colliders'
import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'
import { SceneContext } from '../SceneContext'
import { isEntityPickable } from './pointer-events'

const sceneContextMap = new Map<string /*sceneId*/, WeakRef<SceneContext>>()

BABYLON.SceneLoader.OnPluginActivatedObservable.add(function (plugin) {
  if (plugin instanceof GLTFFileLoader) {
    plugin.animationStartMode = GLTFLoaderAnimationStartMode.NONE
    plugin.compileMaterials = true
    plugin.validate = false
    plugin.createInstances = true
    plugin.animationStartMode = 0
    plugin.preprocessUrlAsync = async function (url: string) {
      // HERE BE DRAGONS 🐉:
      //  To hack the GLTF loader to use Decentraland's file system, we must
      //  access private properties to get the parent context to resolve individual
      //  files.
      //
      //  This Hack prevents the engine from caching the entire GLB/GLTF because
      //  query parameters are added to them. it is RECOMMENDED that the engine
      //  caches all the files by their name (CIDv1)
      const loader: GLTFLoader = (plugin as any)._loader
      const file: string = (loader as any)._fileName
      const [_gltfFilename, strParams] = file.split('?')
      if (strParams) {
        const params = new URLSearchParams(strParams)
        const base = params.get('base') || ''
        const sceneId = params.get('sceneId')!
        const ctx = sceneContextMap.get(sceneId)?.deref()
        if (ctx) {
          const relative = url.replace(ctx.loadableScene.baseUrl, base ? base + '/' : '')
          const ret = ctx.resolveFile(relative)
          if (ret) {
            return ctx.loadableScene.baseUrl + ret
          }
          debugger
        }
      }
      throw new Error('Cannot resolve file ' + url)
    }
  }
})

export const putGltfContaierComponent: ComponentOperation = (entity, component) => {
  const newValue = component.getOrNull(entity.entityId) as PBGltfContainer | null
  const currentValue = entity.ecsComponentValues.gltfContainer
  entity.ecsComponentValues.gltfContainer = newValue || undefined

  // for simplicity of the example, we will remove the Gltf on every update.
  if (currentValue?.src != newValue?.src) {
    removeCurrentGltf(entity)

    if (newValue?.src) {
      const context = entity.context.deref()

      if (!context) return

      // store a WeakRef to the sceneContext to enable file resolver
      sceneContextMap.set(context.loadableScene.id, entity.context)

      let file = context.resolveFile(newValue.src)

      if (!file) {
        debugger
        return
      }

      const extension = newValue.src.toLowerCase().endsWith('.gltf') ? '.gltf' : '.glb'

      const base = newValue.src.split('/').slice(0, -1).join('/')
      file = file + '?sceneId=' + encodeURIComponent(context.loadableScene.id) + '&base=' + encodeURIComponent(base)

      BABYLON.SceneLoader.LoadAssetContainer(
        context.loadableScene.baseUrl,
        file,
        scene,
        (assetContainer) => {
          processGLTFAssetContainer(assetContainer, entity)

          // Fin the main mesh and add it as the BasicShape.nameInEntity component.
          assetContainer.meshes
            .filter(($) => $.name === '__root__')
            .forEach((mesh) => {
              mesh.parent = entity
              entity.gltfContainer = mesh
            })

          entity.gltfAssetContainer = assetContainer
        },
        null,
        (_scene, message, exception) => {
          debugger
          // const animator: Animator = entity.getBehaviorByName('animator') as Animator

          // if (animator) {
          //   animator.transformValue(animator.value!)
          // }
        },
        extension
      )
    }
  }
}

function removeCurrentGltf(entity: EcsEntity) {
  if (entity.gltfContainer) {
    entity.gltfContainer.setEnabled(false)
    entity.gltfContainer.parent = null
    entity.gltfContainer.dispose(true, true)
    delete entity.gltfContainer
  }
}

export function processGLTFAssetContainer(assetContainer: BABYLON.AssetContainer, entity: EcsEntity) {
  assetContainer.meshes.forEach((mesh) => {
    if (mesh instanceof BABYLON.Mesh) {
      if (mesh.geometry && !assetContainer.geometries.includes(mesh.geometry)) {
        assetContainer.geometries.push(mesh.geometry)
      }
    }
    mesh.subMeshes &&
      mesh.subMeshes.forEach((subMesh) => {
        const mesh = subMesh.getMesh()
        if (mesh instanceof BABYLON.Mesh) {
          if (mesh.geometry && !assetContainer.geometries.includes(mesh.geometry)) {
            assetContainer.geometries.push(mesh.geometry)
          }
        }
      })
  })

  processColliders(assetContainer, entity)

  // Find all the materials from all the meshes and add to $.materials
  assetContainer.meshes.forEach((mesh) => {
    mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY
    if (mesh.material) {
      if (!assetContainer.materials.includes(mesh.material)) {
        assetContainer.materials.push(mesh.material)
      }
    }
  })

  // Find the textures in the materials that share the same domain as the context
  // then add the textures to the $.textures
  assetContainer.materials.forEach((material: BABYLON.Material | BABYLON.PBRMaterial) => {
    for (let i in material) {
      const t = (material as any)[i]

      if (i.endsWith('Texture') && t instanceof BABYLON.Texture && t !== probe.cubeTexture) {
        if (!assetContainer.textures.includes(t)) {
          // if (isSceneTexture(t)) {
          assetContainer.textures.push(t)
          // }
        }
      }
    }

    if ('reflectionTexture' in material) {
      material.reflectionTexture = probe.cubeTexture
    }

    if ('albedoTexture' in material) {
      if (material.alphaMode === 2) {
        if (material.albedoTexture) {
          material.albedoTexture.hasAlpha = true
          material.useAlphaFromAlbedoTexture = true
        }
      }
    }
  })

  for (let ag of assetContainer.animationGroups) {
    ag.stop()
    for (let animatable of ag.animatables) {
      animatable.weight = 0
    }
  }

  assetContainer.addAllToScene()
}

function disposeDelegate($: { dispose: Function }) {
  $.dispose()
}

function disposeNodeDelegate($: BABYLON.Node | null) {
  if (!$) return
  $.setEnabled(false)
  $.parent = null
  $.dispose(false)
}

function disposeSkeleton($: BABYLON.Skeleton) {
  $.dispose()
  $.bones.forEach(($) => {
    $.parent = null
    $.dispose()
  })
}

function disposeAnimatable($: BABYLON.Animatable | null) {
  if (!$) return
  $.disposeOnEnd = true
  $.loopAnimation = false
  $.stop()
  $._animate(0)
}

export function disposeAnimationGroups($: BABYLON.AnimationGroup) {
  $.animatables.forEach(disposeAnimatable)

  $.targetedAnimations.forEach(($) => {
    disposeAnimatable(scene.getAnimatableByTarget($.target))
  })

  $.dispose()
}

export function cleanupAssetContainer($: BABYLON.AssetContainer) {
  if ($) {
    $.removeAllFromScene()
    $.transformNodes && $.transformNodes.forEach(disposeNodeDelegate)
    $.rootNodes && $.rootNodes.forEach(disposeNodeDelegate)
    $.meshes && $.meshes.forEach(disposeNodeDelegate)
    // Textures disposals are handled by monkeyLoader.ts
    // NOTE: $.textures && $.textures.forEach(disposeDelegate)
    $.animationGroups && $.animationGroups.forEach(disposeAnimationGroups)
    $.multiMaterials && $.multiMaterials.forEach(disposeDelegate)
    $.sounds && $.sounds.forEach(disposeDelegate)
    $.skeletons && $.skeletons.forEach(disposeSkeleton)
    $.materials && $.materials.forEach(disposeDelegate)
    $.lights && $.lights.forEach(disposeDelegate)
  }
}

function processColliders($: BABYLON.AssetContainer, entity: EcsEntity) {
  for (let i = 0; i < $.meshes.length; i++) {
    let mesh = $.meshes[i]

    if (mesh.name.toLowerCase().endsWith('collider')) {
      mesh.checkCollisions = true
      mesh.visibility = 0
      mesh.isPickable = false
      markAsCollider(mesh)
    } else {
      mesh.isPickable = isEntityPickable(entity)
    }
  }
}
