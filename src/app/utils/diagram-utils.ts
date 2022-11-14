import * as go from 'gojs';
import { ZoneType } from '../enums/zone-type.enum';

export const zoneFill = (type: ZoneType) => {
  switch (type) {
  case ZoneType.type1:
    return 'rgba(52,98,237,0.2)'; // blue
  case ZoneType.type2:
    return 'rgba(4,135,32,0.2)'; // green
  case ZoneType.type3:
    return 'rgba(250,246,30,0.2)'; // yellow
  case ZoneType.type4:
    return 'rgba(255,18,30,0.2)'; // red
  default:
    return 'rgba(52,98,237,0.2)'; // blue
  }
};

export const zoneStroke = (type: ZoneType) => {
  switch (type) {
  case ZoneType.type1:
    return 'rgba(52,98,237,0.9)'; // blue
  case ZoneType.type2:
    return 'rgba(4,135,32,0.9)'; // green
  case ZoneType.type3:
    return 'rgba(250,246,30,0.9)'; // yellow
  case ZoneType.type4:
    return 'rgba(255,18,30,0.9)'; // red
  default:
    return 'rgba(52,98,237,0.9)'; // blue
  }
};

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
  if (grp !== null && !e.diagram.selection.all(n => n instanceof go.Group)) {
    grp.addMembers(grp.diagram.selection, true);
  } else {
    e.diagram.commandHandler.addTopLevelParts(e.diagram.selection, true);
  }
};
