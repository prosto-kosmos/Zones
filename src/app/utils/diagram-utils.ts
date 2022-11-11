import * as go from 'gojs';

export const makeLayout = (horiz: boolean) => {
  if (horiz) {
    return new go.GridLayout({
      wrappingWidth: Infinity,
      alignment: go.GridLayout.Position,
      cellSize: new go.Size(1, 1),
      spacing: new go.Size(4, 4),
    });
  } else {
    return new go.GridLayout({
      wrappingColumn: 3,
      alignment: go.GridLayout.Position,
      cellSize: new go.Size(1, 1),
      spacing: new go.Size(4, 4),
    });
  }
};

export const defaultColor = (horiz: boolean) =>
  horiz ? 'rgba(255, 221, 51, 0.55)' : 'rgba(51,211,229, 0.5)'
;

export const defaultFont = (horiz: boolean) =>
  horiz ? 'bold 20px sans-serif' : 'bold 16px sans-serif'
;

export const highlightGroup = (e: go.InputEvent, grp: any, show: boolean) => {
  if (!grp) {
    return;
  }
  e.handled = true;
  if (show) {
    const tool = grp.diagram.toolManager.draggingTool;
    const map = tool.draggedParts || tool.copiedParts;
    if (grp.canAddMembers(map.toKeySet())) {
      grp.isHighlighted = true;
      return;
    }
  }
  grp.isHighlighted = false;
};

export const finishDrop = (e: go.InputEvent, grp: any) => {
  const ok = grp !== null
    ? grp.addMembers(grp.diagram.selection, true)
    : e.diagram.commandHandler.addTopLevelParts(e.diagram.selection, true);
  if (!ok) {
    e.diagram.currentTool.doCancel();
  }
};
