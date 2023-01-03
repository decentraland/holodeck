import { PBBillboard, BillboardMode } from '@dcl/sdk/ecs'
import type { ComponentOperation } from '../component-operations'

export const putBillboardComponent: ComponentOperation = (entity, component) => {
  const newValue = component.getOrNull(entity.entityId) as PBBillboard | null
  const newBillboardMode = newValue ? (newValue?.billboardMode === BillboardMode.BM_ALL_AXES ? 7 : 2) : 0
  entity.billboardMode = newBillboardMode || 0
}
