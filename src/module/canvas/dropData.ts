import { DragDropType } from "@module/drag-drop-types.js";

  export async function dropCanvasData(
    canvas: foundry.canvas.Canvas,
    dropData: { type: string; x: number; y: number; payload: any }
  ) {
    switch (dropData.type) {
      case DragDropType.DAMAGE:
        await GURPS.modules.Damage.calculateAndSelectTargetsForDamage(canvas, dropData)

        return false
    }

    return true
  }
